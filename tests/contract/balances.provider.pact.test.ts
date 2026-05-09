// EXERCICE 5 — Provider Pact

import { describe, it, beforeAll, afterAll } from 'vitest';
import { Verifier } from '@pact-foundation/pact';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { createApp } from '../../src/server';

const __dirname = dirname(fileURLToPath(import.meta.url));

let container: StartedPostgreSqlContainer;
let pool: Pool;
let server: http.Server;
let serverPort: number;

beforeAll(async () => {
  // 1. Démarrer Postgres via Testcontainers
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('splitto_pact')
    .withUsername('splitto')
    .withPassword('splitto')
    .start();

  pool = new Pool({ connectionString: container.getConnectionUri() });

  // 2. Appliquer les migrations
  const migrationPath = join(__dirname, '../../migrations/001-initial.sql');
  const migration = await readFile(migrationPath, 'utf-8');
  await pool.query(migration);

  // 3. Démarrer le vrai serveur Express
  const app = createApp(pool);
  server = http.createServer(app);

  await new Promise<void>(resolve => {
    server.listen(0, () => {
      serverPort = (server.address() as { port: number }).port;
      resolve();
    });
  });
}, 60_000);

afterAll(async () => {
  server.close();
  await pool.end();
  await container.stop();
});

describe('splitto-api — provider pact verification', () => {
  it('valide le contrat Pact avec splitto-frontend', async () => {
    await new Verifier({
      provider: 'splitto-api',
      providerBaseUrl: `http://localhost:${serverPort}`,
      pactUrls: [join(__dirname, '../../pacts/splitto-frontend-splitto-api.json')],
      logLevel: 'warn',

      stateHandlers: {
        // État 1 : groupe avec 3 membres et 2 dépenses
        'group-1 a 3 membres et 2 dépenses': async () => {
          await pool.query('TRUNCATE groups CASCADE');

          await pool.query(
            'INSERT INTO groups (id, name, currency) VALUES ($1, $2, $3)',
            ['group-1', 'Voyage Portugal', 'EUR'],
          );

          const members = [
            ['member-alice', 'group-1', 'Alice', 'alice@test.com'],
            ['member-bob', 'group-1', 'Bob', 'bob@test.com'],
            ['member-charlie', 'group-1', 'Charlie', 'charlie@test.com'],
          ];

          for (const [id, groupId, name, email] of members) {
            await pool.query(
              'INSERT INTO members (id, group_id, name, email) VALUES ($1, $2, $3, $4)',
              [id, groupId, name, email],
            );
          }

          // Dépense 1 : Alice paie 30€ pour tout le monde
          await pool.query(
            `INSERT INTO expenses
              (id, group_id, description, amount, currency, paid_by, paid_at,
               split_mode, split_data, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            ['exp-1', 'group-1', 'Restaurant', 30, 'EUR', 'member-alice',
             new Date('2024-01-10'), 'equal',
             JSON.stringify({ mode: 'equal', beneficiaries: ['member-alice', 'member-bob', 'member-charlie'] }),
             new Date()],
          );

          // Dépense 2
          await pool.query(
            `INSERT INTO expenses
              (id, group_id, description, amount, currency, paid_by, paid_at,
               split_mode, split_data, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            ['exp-2', 'group-1', 'Café', 0, 'EUR', 'member-bob',
             new Date('2024-01-11'), 'equal',
             JSON.stringify({ mode: 'equal', beneficiaries: ['member-bob'] }),
             new Date()],
          );
        },

        // État 2 : base vide
        'aucun groupe inexistant': async () => {
          await pool.query('TRUNCATE groups CASCADE');
        },
      },
    }).verifyProvider();
  }, 60_000);
});