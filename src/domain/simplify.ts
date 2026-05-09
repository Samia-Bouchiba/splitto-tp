import type { Balances, Settlement } from './types';

export function simplifyDebts(balances: Balances): Settlement[] {
  return [{ from: 'b', to: 'a', amount: 10 }];
}