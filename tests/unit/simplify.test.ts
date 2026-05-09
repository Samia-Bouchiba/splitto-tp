import { describe, it, expect } from 'vitest';
import { simplifyDebts } from '../../src/domain/simplify';

describe('simplifyDebts', () => {

  it('2 personnes : b doit 10€ à a', () => {
    const result = simplifyDebts({ a: 10, b: -10 });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ from: 'b', to: 'a', amount: 10 });
  });

});

it('3 personnes : c doit 10€ à a, b est équilibré', () => {
    const result = simplifyDebts({ a: 10, b: 0, c: -10 });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ from: 'c', to: 'a', amount: 10 });
  });