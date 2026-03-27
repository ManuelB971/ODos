# Plan de couverture vers 70%

## Etat actuel

Le run de tests est vert.

- Backend: tests OK
- Frontend: tests OK
- Exécution coverage globale: OK via `scripts/run-coverage.ps1`

Couverture actuelle:

- Backend (PHPUnit/Xdebug):
  - Classes: 2.63%
  - Methods: 7.86%
  - Lines: 7.23%
- Frontend (Jest):
  - Stmts: 2.71%
  - Branch: 2.58%
  - Funcs: 3.24%
  - Lines: 2.54%

## Objectif

Atteindre >= 70% de couverture globale (ou par périmètre défini dans le rendu).

## Strategie recommandee

1. Monter rapidement a 30-40% avec des tests unitaires peu couteux.
2. Stabiliser les flux metier critiques avec des tests d integration.
3. Cibler les zones faiblement couvertes qui pesent lourd en lignes.
4. Verrouiller le seuil avec un gate coverage en CI.

## Backlog tests priorise

### Lot A (impact rapide)

- Front:
  - `utils/jwt.ts`
  - `services/AuthService.ts`
  - `hooks/useFavorites.ts`
  - `hooks/useSearchActivities.ts`
  - `scripts/api.ts` (fonctions utilitaires et erreurs)
- Back:
  - `Service/LlmRankingService` (cas limites/cache/erreurs)
  - `State/RecommendationStateProvider` (user null, sans interets, avec interets)
  - `Repository` utilitaires simples

### Lot B (metier/API)

- Back integration:
  - auth (`/api/login`, `/api/me`)
  - endpoints ressources publiques/protegees
  - erreurs 401/403/422 standardisees
- Front integration:
  - context auth
  - mapping erreurs API -> UI

### Lot C (fiabilisation)

- Tests de non regression sur cas deja corriges.
- Ajout de seuils coverage dans scripts/CI.

## Cadence suggeree

- Sprint 1: Lots A -> viser 30-40%
- Sprint 2: Lot B -> viser 50-60%
- Sprint 3: Lot C + completement des trous -> viser >= 70%

## Commandes utiles

```powershell
# couverture complete
powershell -ExecutionPolicy Bypass -File .\scripts\run-coverage.ps1

# back uniquement
powershell -ExecutionPolicy Bypass -File .\scripts\run-coverage.ps1 -SkipFront

# front uniquement
powershell -ExecutionPolicy Bypass -File .\scripts\run-coverage.ps1 -SkipBack
```

Rapports:

- Backend HTML: `odos-back/var/coverage/html/index.html`
- Frontend HTML: `odos-front/coverage/lcov-report/index.html`

## Criteres de validation finale

- Tests verts localement et en CI
- Couverture >= 70% (regle explicite documentee)
- Rapport exportable fourni dans les livrables
