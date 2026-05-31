# Recommandations personnalisées

Fil « Pour vous » sur l’accueil : activités ordonnées selon les centres d’intérêt, avec re-classement LLM optionnel.

**Voir aussi :** [centres-interet.md](centres-interet.md) · [ARCHITECTURE.md](../ARCHITECTURE.md) §6

---

## Principe

1. L’utilisateur doit être **connecté** et avoir au moins **1 centre d’intérêt** sélectionné.
2. `GET /api/recommendations` (auth JWT) interroge le `RecommendationStateProvider`.
3. **Pipeline serveur :**
   - Candidats DB : activités publiées filtrées par catégories d’intérêt (ou tout le catalogue si aucun intérêt).
   - Re-classement via `LlmRankingService` + Ollama si `LLM_ENABLED=true`.
   - Fallback ordre DB si LLM indisponible ou désactivé.
4. Résultat mis en cache Redis (`llm_recommendations`, TTL configurable).

Le backend **ne fait jamais confiance** aux intérêts envoyés par le client — il lit `User.interests` côté serveur.

---

## API

| Méthode | Chemin | Auth | Rôle |
|---------|--------|------|------|
| GET | `/api/recommendations` | User (`ROLE_USER`) | `Activity[]` ordonnées |

---

## Mobile

| Fichier | Rôle |
|---------|------|
| `hooks/useRecommendations.ts` | React Query, clé `['recommendations', userId, interests]` |
| `app/(tabs)/index.tsx` | Section recommandations + refresh |
| `components/RecommendedActivities.tsx` | Présentation horizontale (si utilisé) |

**Cache client :** `staleTime` 2 min ; clé inclut `user.id` pour isoler les comptes sur un même appareil.

**Si aucun intérêt :** la section recommandations est vide ; l’utilisateur est invité à compléter [centres-interet.md](centres-interet.md).

---

## Configuration LLM (serveur)

| Variable | Rôle |
|----------|------|
| `LLM_ENABLED` | Active / désactive le re-ranking |
| `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_MODEL` | Connexion Ollama |
| `LLM_TOP_K`, `LLM_CANDIDATE_MAX` | Limites pipeline |
| `LLM_CACHE_TTL_SECONDS` | TTL cache Redis (défaut 1800 s) |

Admin : page `/admin/recommendations` pour tester le pipeline.

---

*Dernière mise à jour : mai 2026.*
