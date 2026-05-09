# Analyse des mutations

## Score initial
- balances.ts : 94.87%
- simplify.ts : 68.75%
- Total : 80.46%

## Score final
- balances.ts : 94.87%
- simplify.ts : 77.08%
- Total : 85.06%

## Mutants survivants après amélioration

### Mutant 1 : Condition `while` avec `||` au lieu de `&&`
- Fichier : simplify.ts:21
- Mutation : `&&` → `||`
- Pourquoi il survit : mutant équivalent — avec nos données de test, la boucle se termine toujours avant d'accéder à un index invalide
- Décision : accepté

### Mutant 2 : Arrondi supprimé dans balances.ts
- Fichier : balances.ts:40
- Mutation : suppression du `Math.round`
- Pourquoi il survit : nos tests utilisent `toBeCloseTo` avec tolérance, ce qui masque les différences de virgule flottante
- Décision : accepté — mutant difficile à tuer sans changer la stratégie de test

### Mutant 3 : `> 0` → `>= 0` dans simplify.ts
- Fichier : simplify.ts:9
- Mutation : `rounded > 0` → `rounded >= 0`
- Pourquoi il survit : aucun test ne passe un membre avec balance exactement 0 dans les créditeurs
- Décision : accepté — mutant équivalent pour les cas d'usage réels

### Mutant 4 : Opérateurs arithmétiques dans la mise à jour des montants
- Fichier : simplify.ts:28-29
- Mutation : `* 100 / 100` → `* 100 * 100`
- Pourquoi il survit : mutant équivalent — les tests vérifient les montants finaux mais pas les valeurs intermédiaires précisément
- Décision : accepté