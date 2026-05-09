import type { Balances, Settlement } from './types';

export function simplifyDebts(balances: Balances): Settlement[] {
  const settlements: Settlement[] = [];

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [id, balance] of Object.entries(balances)) {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded > 0) creditors.push({ id, amount: rounded });
    else if (rounded < 0) debtors.push({ id, amount: Math.abs(rounded) });
  }

  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.round(Math.min(creditor.amount, debtor.amount) * 100) / 100;

    settlements.push({ from: debtor.id, to: creditor.id, amount });

    creditor.amount = Math.round((creditor.amount - amount) * 100) / 100;
    debtor.amount = Math.round((debtor.amount - amount) * 100) / 100;

    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }

  return settlements;
}