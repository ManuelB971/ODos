# Centres d’intérêt

Sélection des catégories préférées pour personnaliser les recommandations et l’expérience utilisateur.

**Voir aussi :** [recommandations.md](recommandations.md) · [profil-parametres.md](profil-parametres.md)

---

## Principe

1. Les **catégories** (`Category`) servent à la fois de taxonomie activités et de centres d’intérêt utilisateur.
2. Relation many-to-many `user_interests` (`User` ↔ `Category`).
3. Au moins **1** et au plus **7** catégories sélectionnables.
4. Les intérêts alimentent le pipeline `GET /api/recommendations` côté serveur.

---

## API

| Méthode | Chemin | Auth | Rôle |
|---------|--------|------|------|
| GET | `/api/categories` | Public | Liste des catégories |
| GET | `/api/me` | User | Intérêts courants (objets ou IRIs) |
| PATCH | `/api/users/{id}` | User (soi-même) | `{ interests: ["/api/categories/1", …] }` |

---

## Mobile

| Fichier | Rôle |
|---------|------|
| `app/interests.tsx` | Écran sélection (chips, compteur, CTA sticky) |
| `context/InterestContext.tsx` | Cache local noms de catégories |
| `scripts/api.ts` | `fetchCategories`, `updateUserInterests` |

**Flux :**

1. Chargement catégories au montage.
2. Pré-sélection depuis le contexte / profil utilisateur.
3. Sauvegarde → `PATCH /api/users/{id}` + mise à jour `InterestContext` + invalidation recommandations.

**Onboarding :** proposé après inscription ou depuis le profil (entrée menu « Mes intérêts »).

---

## Impact produit

- Sans intérêt : pas de section « Pour vous » sur l’accueil.
- Avec intérêt : candidats filtrés par catégorie avant re-classement LLM.

---

## RGPD

- Traitement lié au profil utilisateur (finalité personnalisation) — voir registre art. 30.

---

*Dernière mise à jour : mai 2026.*
