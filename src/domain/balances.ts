// calcul des soldes d'un groupe

import type { Group, Expense, Balances } from './types';

export function computeBalances(group: Group, expenses: Expense[]): Balances {
  const balances: Balances = {};

  // Initialiser tous les membres du groupe à 0
  for (const member of group.members) {
    balances[member.id] = 0;
  }

  for (const expense of expenses) {
    const { paidBy, amount, split } = expense;

    // 1. Le payeur est crédité du montant total
    balances[paidBy] = (balances[paidBy] ?? 0) + amount;

    // 2. Chaque bénéficiaire est débité de sa quote-part
    if (split.mode === 'equal') {
      const share = amount / split.beneficiaries.length;
      for (const beneficiary of split.beneficiaries) {
        balances[beneficiary] = (balances[beneficiary] ?? 0) - share;
      }
    } else if (split.mode === 'weighted') {
      const totalWeight = Object.values(split.weights).reduce((a, b) => a + b, 0);
      for (const [memberId, weight] of Object.entries(split.weights)) {
        const share = (weight / totalWeight) * amount;
        balances[memberId] = (balances[memberId] ?? 0) - share;
      }
    } else if (split.mode === 'percentage') {
      for (const [memberId, percentage] of Object.entries(split.percentages)) {
        const share = (percentage / 100) * amount;
        balances[memberId] = (balances[memberId] ?? 0) - share;
      }
    }
  }

  // Arrondir à 2 décimales pour éviter les erreurs de virgule flottante
  for (const key of Object.keys(balances)) {
    balances[key] = Math.round(balances[key] * 100) / 100;
  }

  return balances;
}