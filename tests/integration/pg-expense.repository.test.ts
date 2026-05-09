import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PgExpenseRepository } from '../../src/infrastructure/pg-expense.repository';
import type { Expense } from '../../src/domain/types';

const __dirname = dirname(fileURLToPath(import.meta.url));

let container: StartedPostgreSqlContainer;
let pool: Pool;
let repo: PgExpenseRepository;

const GROUP_ID = 'group-test-1';
const OTHER_GROUP_ID = 'group-test-2';
const MEMBER_ID = 'member-alice';

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('splitto_test')
    .withUsername('splitto')
    .withPassword('splitto')
    .start();

  pool = new Pool({ connectionString: container.getConnectionUri() });

  const migrationPath = join(__dirname, '../../migrations/001-initial.sql');
  const migration = await readFile(migrationPath, 'utf-8');
  await pool.query(migration);

  repo = new PgExpenseRepository(pool);
}, 60_000);

afterAll(async () => {
  await pool.end();
  await container.stop();
});

beforeEach(async () => {
  await pool.query('TRUNCATE expenses CASCADE');
  await pool.query('TRUNCATE members CASCADE');
  await pool.query('TRUNCATE groups CASCADE');

  await pool.query(
    'INSERT INTO groups (id, name, currency) VALUES ($1, $2, $3)',
    [GROUP_ID, 'Groupe Test', 'EUR'],
  );
  await pool.query(
    'INSERT INTO groups (id, name, currency) VALUES ($1, $2, $3)',
    [OTHER_GROUP_ID, 'Autre Groupe', 'EUR'],
  );
  await pool.query(
    'INSERT INTO members (id, group_id, name, email) VALUES ($1, $2, $3, $4)',
    [MEMBER_ID, GROUP_ID, 'Alice', 'alice@test.com'],
  );
  await pool.query(
    'INSERT INTO members (id, group_id, name, email) VALUES ($1, $2, $3, $4)',
    ['member-bob', OTHER_GROUP_ID, 'Bob', 'bob@test.com'],
  );
});

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'exp-001',
  groupId: GROUP_ID,
  description: 'Courses',
  amount: 45.50,
  currency: 'EUR',
  paidBy: MEMBER_ID,
  paidAt: new Date('2024-06-15T12:00:00.000Z'),
  split: { mode: 'equal', beneficiaries: [MEMBER_ID] },
  createdAt: new Date('2024-06-15T12:01:00.000Z'),
  ...overrides,
});

describe('PgExpenseRepository — intégration', () => {

  it('1. save() puis findById() retourne l\'expense identique', async () => {
    const expense = makeExpense();
    await repo.save(expense);

    const found = await repo.findById(expense.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(expense.id);
    expect(found!.amount).toBe(expense.amount);
    expect(found!.description).toBe(expense.description);
    expect(found!.paidAt.toISOString()).toBe(expense.paidAt.toISOString());
    expect(found!.split).toEqual(expense.split);
  });

  it('2. findByGroupId() retourne uniquement les expenses du bon groupe', async () => {
    await repo.save(makeExpense({
      id: 'exp-g1-1',
      paidAt: new Date('2024-06-15T12:00:00.000Z'),
    }));
    await repo.save(makeExpense({
      id: 'exp-g1-2',
      description: 'Restaurant',
      paidAt: new Date('2024-06-16T12:00:00.000Z'),
    }));
    await repo.save(makeExpense({
      id: 'exp-g2-1',
      groupId: OTHER_GROUP_ID,
      paidBy: 'member-bob',
      split: { mode: 'equal', beneficiaries: ['member-bob'] },
    }));

    const result = await repo.findByGroupId(GROUP_ID);
    expect(result).toHaveLength(2);
    expect(result.every(e => e.groupId === GROUP_ID)).toBe(true);
  });

  it('3. findInDateRange() filtre correctement (bornes inclusives)', async () => {
    const jan1  = new Date('2024-01-01T00:00:00.000Z');
    const jan15 = new Date('2024-01-15T00:00:00.000Z');
    const jan31 = new Date('2024-01-31T00:00:00.000Z');
    const feb15 = new Date('2024-02-15T00:00:00.000Z');

    await repo.save(makeExpense({ id: 'e1', paidAt: jan1 }));
    await repo.save(makeExpense({ id: 'e2', paidAt: jan15 }));
    await repo.save(makeExpense({ id: 'e3', paidAt: jan31 }));
    await repo.save(makeExpense({ id: 'e4', paidAt: feb15 }));

    const result = await repo.findInDateRange(GROUP_ID, jan1, jan31);
    expect(result).toHaveLength(3);
    expect(result.map(e => e.id)).not.toContain('e4');
  });

  it('4. contrainte UNIQUE rejette un doublon', async () => {
    await repo.save(makeExpense());
    await expect(repo.save(makeExpense({ id: 'exp-duplicate' }))).rejects.toThrow();
  });

  it('5. transaction qui échoue rollback proprement', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO expenses
          (id, group_id, description, amount, currency, paid_by, paid_at,
           split_mode, split_data, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        ['tx-1', GROUP_ID, 'Test', 50, 'EUR', MEMBER_ID,
         new Date('2024-03-01'), 'equal',
         '{"mode":"equal","beneficiaries":["member-alice"]}', new Date()],
      );
      // Insertion qui va échouer (groupe inexistant)
      await client.query(
        `INSERT INTO expenses
          (id, group_id, description, amount, currency, paid_by, paid_at,
           split_mode, split_data, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        ['tx-2', 'groupe-inexistant', 'Test', 50, 'EUR', MEMBER_ID,
         new Date('2024-03-02'), 'equal',
         '{"mode":"equal","beneficiaries":["member-alice"]}', new Date()],
      );
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    const { rows } = await pool.query("SELECT * FROM expenses WHERE id LIKE 'tx-%'");
    expect(rows).toHaveLength(0);
  });
});