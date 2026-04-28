# Tests unitaires front - ODOS

## Objectif

Mettre en place une base simple et maintenable pour tester la logique front (utils, services, hooks, context) avec Jest sur Expo.

## Stack de test

- `jest` + `jest-expo`
- `@testing-library/react-native`
- `@testing-library/jest-native`

Config principale :

- `jest.config.js`
- `jest.setup.ts`

Portée de coverage unitaire configurée :

- `context/interestcontext.tsx`
- `hooks/useActivities.ts`
- `hooks/useDebounce.ts`
- `hooks/useFavorites.ts`
- `hooks/useRecommendations.ts`
- `hooks/useSearchActivities.ts`
- `scripts/api.ts`
- `services/AuthService.ts`
- `utils/errorHandling.ts`
- `utils/imageUrl.ts`
- `utils/jwt.ts`

## Lancer les tests

Depuis `odos-front` :

- `pnpm test` : exécution standard
- `pnpm test:watch` : mode watch
- `pnpm test:ci` : mode CI (sans watch)
- `pnpm test:coverage` : rapport de couverture

## Tests actuellement en place

### Utils

- `utils/errorHandling.test.ts`
- `utils/jwt.test.ts`
- `utils/imageUrl.test.ts`

### Services / API

- `services/AuthService.test.ts`
- `scripts/api.test.ts`

### Hooks

- `hooks/useDebounce.test.tsx`
- `hooks/useActivities.test.ts`
- `hooks/useSearchActivities.test.ts`
- `hooks/useRecommendations.test.ts`
- `hooks/useFavorites.test.ts`

### Context

- `context/interestcontext.test.tsx`

## Résultat actuel

Dernière exécution `pnpm test:coverage` :

- 11 suites OK
- 33 tests OK
- 0 échec
- Coverage global (scope unitaire): `74.3%` statements, `73.78%` lines

## Convention recommandée pour la suite

- 1 fichier `*.test.ts(x)` par module testé
- Nommage des tests orienté comportement (`it('returns ...')`)
- Mocks ciblés (ne mocker que ce qui est nécessaire)
- Garder des tests courts et lisibles (cas nominaux + 1/2 cas limites)

## Prochaine étape suggérée

Ajouter des tests unitaires sur `context/AuthContext.tsx` puis sur les composants UI critiques (cards, formulaires, feedback utilisateur).
