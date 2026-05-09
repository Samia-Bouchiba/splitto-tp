// EXERCICE 3 — Les 5 types de doubles de test (taxonomie Meszaros)

import { describe, it, expect, vi } from 'vitest';
import { ExpenseService } from '../../src/domain/expense.service';
import type { ExpenseRepository } from '../../src/ports/expense.repository';
import type { EmailNotifier } from '../../src/ports/notifier';
import type { Clock } from '../../src/ports/clock';
import type { IdGenerator } from '../../src/ports/id-generator';
import type { Logger } from '../../src/ports/logger';
import type { Expense, CreateExpenseInput } from '../../src/domain/types';

const dummyLogger: Logger = {
  info: (_msg: string) => {},
  error: (_msg: string) => {},
};

const FIXED_DATE = new Date('2024-06-15T10:00:00.000Z');
const stubClock: Clock = {
  now: () => FIXED_DATE,
};

const FIXED_ID = 'expense-abc-123';
const stubIdGen: IdGenerator = {
  next: () => FIXED_ID,
};


class FakeExpenseRepository implements ExpenseRepository {
  private readonly store = new Map<string, Expense>();

  async save(expense: Expense): Promise<void> {
    this.store.set(expense.id, expense);
  }

  async findById(id: string): Promise<Expense | null> {
    return this.store.get(id) ?? null;
  }

  async findByGroupId(groupId: string): Promise<Expense[]> {
    return Array.from(this.store.values()).filter(e => e.groupId === groupId);
  }

  async findInDateRange(groupId: string, from: Date, to: Date): Promise<Expense[]> {
    return Array.from(this.store.values()).filter(
      e => e.groupId === groupId && e.paidAt >= from && e.paidAt <= to,
    );
  }
}


const makeInput = (overrides: Partial<CreateExpenseInput> = {}): CreateExpenseInput => ({
  groupId: 'group-1',
  description: 'Dîner au restaurant',
  amount: 50,
  currency: 'EUR',
  paidBy: 'alice',
  paidAt: new Date('2024-06-01'),
  split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
  ...overrides,
});


describe('ExpenseService.create() — les 5 doubles', () => {

  it('retourne une expense avec les bonnes valeurs (STUB clock + idGen)', async () => {
    const fakeRepo = new FakeExpenseRepository();
    const spyCalls: Array<{ groupId: string; message: string }> = [];
    const spyNotifier: EmailNotifier = {
      notifyGroupMembers: async (groupId, message) => {
        spyCalls.push({ groupId, message });
      },
    };

    const service = new ExpenseService(
      fakeRepo,
      spyNotifier,
      stubClock,    
      stubIdGen,    
      dummyLogger,  
    );

    const expense = await service.create(makeInput({ amount: 50 }));

    expect(expense.id).toBe(FIXED_ID);
    expect(expense.createdAt).toEqual(FIXED_DATE);
    expect(expense.amount).toBe(50);
    expect(expense.description).toBe('Dîner au restaurant');
  });

  it('le FAKE repo contient bien l\'expense après save', async () => {
    const fakeRepo = new FakeExpenseRepository(); // FAKE

    const spyCalls: Array<{ groupId: string; message: string }> = [];
    const spyNotifier: EmailNotifier = {
      notifyGroupMembers: async (groupId, message) => {
        spyCalls.push({ groupId, message });
      },
    };

    const service = new ExpenseService(fakeRepo, spyNotifier, stubClock, stubIdGen, dummyLogger);
    await service.create(makeInput({ amount: 50 }));

    const saved = await fakeRepo.findById(FIXED_ID);
    expect(saved).not.toBeNull();
    expect(saved!.id).toBe(FIXED_ID);
    expect(saved!.amount).toBe(50);
  });

  it('le SPY notifier est appelé si amount >= 100', async () => {
    const fakeRepo = new FakeExpenseRepository();
    const spyCalls: Array<{ groupId: string; message: string }> = [];
    const spyNotifier: EmailNotifier = {
      notifyGroupMembers: async (groupId, message) => {
        spyCalls.push({ groupId, message });
      },
    };

    const service = new ExpenseService(fakeRepo, spyNotifier, stubClock, stubIdGen, dummyLogger);
    await service.create(makeInput({ amount: 150, description: 'Billet avion' }));

    expect(spyCalls).toHaveLength(1);
    expect(spyCalls[0].groupId).toBe('group-1');
    expect(spyCalls[0].message).toContain('Billet avion');
  });

  it('le MOCK notifier n\'est PAS appelé si amount < 100', async () => {
    const fakeRepo = new FakeExpenseRepository();
    const mockNotifier: EmailNotifier = {
      notifyGroupMembers: vi.fn(),
    };

    const service = new ExpenseService(fakeRepo, mockNotifier, stubClock, stubIdGen, dummyLogger);
    await service.create(makeInput({ amount: 49 }));

    expect(mockNotifier.notifyGroupMembers).not.toHaveBeenCalled();
  });

  it('le MOCK notifier est appelé exactement 1 fois si amount === 100', async () => {
    const fakeRepo = new FakeExpenseRepository();
    const mockNotifier: EmailNotifier = {
      notifyGroupMembers: vi.fn().mockResolvedValue(undefined),
    };

    const service = new ExpenseService(fakeRepo, mockNotifier, stubClock, stubIdGen, dummyLogger);
    await service.create(makeInput({ amount: 100 }));

    expect(mockNotifier.notifyGroupMembers).toHaveBeenCalledTimes(1);
    expect(mockNotifier.notifyGroupMembers).toHaveBeenCalledWith(
      'group-1',
      expect.stringContaining('Dîner au restaurant'),
    );
  });
});
