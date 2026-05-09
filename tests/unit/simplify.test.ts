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

  it('1 créditeur, 3 débiteurs : 3 settlements exacts', () => {
    const result = simplifyDebts({ alice: 60, bob: -20, charlie: -20, dave: -20 });
    expect(result).toHaveLength(3);
    expect(result.every(s => s.to === 'alice')).toBe(true);
    expect(result.every(s => s.amount === 20)).toBe(true);
  });

  it('amounts résiduels mis à jour correctement après chaque settlement', () => {
    
    const result = simplifyDebts({ a: 50, b: -30, c: -20 });
    expect(result).toHaveLength(2);
    const bSettlement = result.find(s => s.from === 'b');
    const cSettlement = result.find(s => s.from === 'c');
    expect(bSettlement).toEqual({ from: 'b', to: 'a', amount: 30 });
    expect(cSettlement).toEqual({ from: 'c', to: 'a', amount: 20 });
  });

  it('2 créditeurs, 2 débiteurs : settlements couvrent toutes les dettes', () => {
    // a: +20, b: +10, c: -15, d: -15
    const result = simplifyDebts({ a: 20, b: 10, c: -15, d: -15 });
    const totalSettled = result.reduce((sum, s) => sum + s.amount, 0);
    expect(Math.abs(totalSettled - 30)).toBeLessThan(0.01);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('settlement amount est toujours positif', () => {
    const result = simplifyDebts({ a: 100, b: -60, c: -40 });
    expect(result.every(s => s.amount > 0)).toBe(true);
  });

  it('settlement avec montants partiels : les résiduels sont correctement mis à jour', () => {
   
    const result = simplifyDebts({ a: 15, b: -10, c: -5 });
    expect(result).toHaveLength(2);
    expect(result.find(s => s.from === 'b')).toEqual({ from: 'b', to: 'a', amount: 10 });
    expect(result.find(s => s.from === 'c')).toEqual({ from: 'c', to: 'a', amount: 5 });
  });

  it('créditeur partiellement remboursé reçoit de plusieurs débiteurs', () => {
    // a: +30, b: -10, c: -10, d: -10
    // 3 settlements de 10 chacun
    const result = simplifyDebts({ a: 30, b: -10, c: -10, d: -10 });
    expect(result).toHaveLength(3);
    expect(result.every(s => s.to === 'a' && s.amount === 10)).toBe(true);
  });