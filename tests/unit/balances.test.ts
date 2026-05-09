import { describe, it, expect } from 'vitest';
import { computeBalances } from '../../src/domain/balances';
import type { Group, Expense } from '../../src/domain/types';

const makeGroup = (memberIds: string[]): Group => ({
  id: 'group-1',
  name: 'Test Group',
  currency: 'EUR',
  members: memberIds.map(id => ({ id, name: id, email: `${id}@test.com` })),
});

const makeExpense = (
  overrides: Partial<Expense> & Pick<Expense, 'amount' | 'paidBy' | 'split'>
): Expense => ({
  id: 'exp-1',
  groupId: 'group-1',
  description: 'Test',
  currency: 'EUR',
  paidAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

describe('computeBalances — cas obligatoires', () => {

  it('1. groupe vide de dépenses → tous les soldes sont 0', () => {
    const group = makeGroup(['alice', 'bob', 'charlie']);
    expect(computeBalances(group, [])).toEqual({ alice: 0, bob: 0, charlie: 0 });
  });

  it('2. dépense equal — le payeur EST bénéficiaire', () => {
    const group = makeGroup(['alice', 'bob', 'charlie']);
    const expense = makeExpense({
      amount: 30, paidBy: 'alice',
      split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] },
    });
    const result = computeBalances(group, [expense]);
    expect(result.alice).toBe(20);
    expect(result.bob).toBe(-10);
    expect(result.charlie).toBe(-10);
  });

  it('3. dépense equal — le payeur N\'EST PAS bénéficiaire', () => {
    const group = makeGroup(['alice', 'bob', 'charlie']);
    const expense = makeExpense({
      amount: 30, paidBy: 'alice',
      split: { mode: 'equal', beneficiaries: ['bob', 'charlie'] },
    });
    const result = computeBalances(group, [expense]);
    expect(result.alice).toBe(30);
    expect(result.bob).toBe(-15);
    expect(result.charlie).toBe(-15);
  });

  it('4. plusieurs dépenses qui se compensent partiellement', () => {
    const group = makeGroup(['alice', 'bob', 'charlie']);
    const result = computeBalances(group, [
      makeExpense({ id: 'e1', amount: 30, paidBy: 'alice',
        split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] } }),
      makeExpense({ id: 'e2', amount: 15, paidBy: 'bob',
        split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] } }),
    ]);
    expect(result.alice).toBe(15);
    expect(result.bob).toBe(0);
    expect(result.charlie).toBe(-15);
  });

  it('5. dépense weighted avec poids non-uniformes', () => {
    const group = makeGroup(['alice', 'bob']);
    const expense = makeExpense({
      amount: 100, paidBy: 'alice',
      split: { mode: 'weighted', weights: { alice: 1, bob: 3 } },
    });
    const result = computeBalances(group, [expense]);
    expect(result.alice).toBe(75);
    expect(result.bob).toBe(-75);
  });

  it('6. dépense percentage avec arrondis (100€ entre 3)', () => {
    const group = makeGroup(['alice', 'bob', 'charlie']);
    const expense = makeExpense({
      amount: 100, paidBy: 'alice',
      split: { mode: 'percentage', percentages: { alice: 33.33, bob: 33.33, charlie: 33.34 } },
    });
    const result = computeBalances(group, [expense]);
    const total = result.alice + result.bob + result.charlie;
    expect(Math.abs(total)).toBeLessThan(0.01); // somme ≈ 0
    expect(result.alice).toBeCloseTo(66.67, 1);
    expect(result.bob).toBeCloseTo(-33.33, 1);
    expect(result.charlie).toBeCloseTo(-33.34, 1);
  });
});

describe('computeBalances — cas limites', () => {

  it('liste vide de dépenses → soldes tous à 0', () => {
    const group = makeGroup(['alice', 'bob']);
    expect(computeBalances(group, [])).toEqual({ alice: 0, bob: 0 });
  });

  it('dépense de 0€ → autorisée, soldes inchangés', () => {
    const group = makeGroup(['alice', 'bob']);
    const expense = makeExpense({
      amount: 0, paidBy: 'alice',
      split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
    });
    const result = computeBalances(group, [expense]);
    expect(result.alice).toBe(0);
    expect(result.bob).toBe(0);
  });

  it('dépense avec un seul bénéficiaire (le payeur lui-même) → solde 0', () => {
    const group = makeGroup(['alice', 'bob']);
    const expense = makeExpense({
      amount: 50, paidBy: 'alice',
      split: { mode: 'equal', beneficiaries: ['alice'] },
    });
    const result = computeBalances(group, [expense]);
    expect(result.alice).toBe(0);
    expect(result.bob).toBe(0);
  });

  it('membre supprimé figurant dans une ancienne dépense → toujours calculé', () => {
    const group = makeGroup(['alice', 'bob']); 
    const expense = makeExpense({
      amount: 30, paidBy: 'alice',
      split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] },
    });
    const result = computeBalances(group, [expense]);
    expect(result.charlie).toBeCloseTo(-10, 1);
    const total = (result.alice ?? 0) + (result.bob ?? 0) + (result.charlie ?? 0);
    expect(Math.abs(total)).toBeLessThan(0.01);
  });
});