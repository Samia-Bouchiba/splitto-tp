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

it('4 personnes : 2 settlements minimum (pas 3)', () => {
    const result = simplifyDebts({ a: 30, b: -20, c: -10, d: 0 });
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ from: 'b', to: 'a', amount: 20 });
    expect(result).toContainEqual({ from: 'c', to: 'a', amount: 10 });
  });

it('tous les soldes à 0 → aucun settlement', () => {
    const result = simplifyDebts({ a: 0, b: 0, c: 0 });
    expect(result).toHaveLength(0);
  });

it('groupe vide → aucun settlement', () => {
    const result = simplifyDebts({});
    expect(result).toHaveLength(0);
  });

it('montants décimaux : arrondis à 2 décimales', () => {
    const result = simplifyDebts({ alice: 66.67, bob: -33.33, charlie: -33.34 });
    expect(result).toHaveLength(2);
    const total = result.reduce((sum, s) => sum + s.amount, 0);
    expect(Math.abs(total - 66.67)).toBeLessThan(0.01);
  });