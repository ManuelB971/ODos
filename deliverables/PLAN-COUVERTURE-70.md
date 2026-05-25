# Plan couverture 70 %

Objectif : monter la couverture de tests back et front. Les tests passent déjà au vert — c'est surtout le pourcentage qui est bas.

---

## Où on en est

| | Back (PHPUnit) | Front (Jest) |
|---|----------------|--------------|
| Lignes / stmts | ~7 % | ~2,5 % |
| Méthodes / funcs | ~8 % | ~3 % |

Run complet : `scripts/run-coverage.ps1`

---

## Comment on monte

1. Viser 30–40 % avec des tests unitaires rapides (utils, hooks, services)
2. Couvrir les flux critiques en intégration (auth, favoris, erreurs API)
3. Combler les gros fichiers peu testés
4. Bloquer en CI avec un seuil quand on est proche de 70 %

---

## Backlog par lot

### Lot A — impact rapide

**Front :**

- `utils/jwt.ts`
- `services/AuthService.ts`
- `hooks/useFavorites.ts`
- `hooks/useSearchActivities.ts`
- `scripts/api.ts` (utils + gestion erreurs)

**Back :**

- `LlmRankingService` (cache, erreurs, cas limites)
- `RecommendationStateProvider` (user null, sans intérêts, avec intérêts)
- repositories simples

### Lot B — métier / API

**Back intégration :**

- auth (`/api/login`, `/api/me`)
- endpoints publics vs protégés
- erreurs 401 / 403 / 422

**Front intégration :**

- context auth
- mapping erreurs API → UI

### Lot C — verrouillage

- tests de non-régression sur bugs déjà corrigés
- seuils coverage dans scripts / CI

---

## Cadence suggérée

- Sprint 1 : Lot A → ~30–40 %
- Sprint 2 : Lot B → ~50–60 %
- Sprint 3 : Lot C → ≥ 70 %

---

## Commandes

```powershell
# tout
powershell -ExecutionPolicy Bypass -File .\scripts\run-coverage.ps1

# back seulement
powershell -ExecutionPolicy Bypass -File .\scripts\run-coverage.ps1 -SkipFront

# front seulement
powershell -ExecutionPolicy Bypass -File .\scripts\run-coverage.ps1 -SkipBack
```

Rapports :

- Back : `odos-back/var/coverage/html/index.html`
- Front : `odos-front/coverage/lcov-report/index.html`

---

## Critères de fin

- Tests verts en local et en CI
- Couverture ≥ 70 % (seuil documenté)
- Rapport exportable dans les livrables
