# Badges & gamification

Système de badges : règles automatiques, vitrine profil, notifications de déblocage.

**Documentation technique complète :** [GAMIFICATION.md](../GAMIFICATION.md) · **Exploration carte :** [exploration-carte.md](exploration-carte.md)

---

## Principe

1. **Catalogue badges** (`badge_definition`) : nom, description, image, type de règle, seuil JSON.
2. **Attribution automatique** quand l’utilisateur remplit une condition (favoris, commentaire, note, vues fiches, % carte).
3. **Attribution manuelle** possible depuis l’admin.
4. L’utilisateur choisit quels badges afficher sur son profil ; modale à chaque nouveau déblocage.

---

## Règles automatiques V1

| Code (seed) | Déclencheur | Seuil |
|-------------|-------------|-------|
| `first_discovery` | Ouverture fiche activité | 1 vue |
| `five_favorites` | Ajout favori | 5 favoris |
| `first_comment` | Publication commentaire | 1 |
| `first_rating` | Publication note | 1 |
| `map_explorer_25` | Sync exploration carte | 25 % zone |

Seed :

```bash
docker compose exec php php bin/console app:badges:seed-defaults
```

---

## API (JWT)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| GET | `/api/me/badges` | earned, available, profileDisplayed, unseenCount |
| GET | `/api/me/badges/available` | Catalogue actif non obtenu |
| PATCH | `/api/me/badges/{id}/display` | Affichage profil + ordre |
| POST | `/api/me/badges/{id}/seen` | Marquer notification lue |
| POST | `/api/me/badges/seen-all` | Tout marquer vu |
| POST | `/api/me/gamification/events` | `{ type: "activity_viewed", context: { activityId } }` |

Les actions métier (favori, commentaire, note, sync carte) peuvent renvoyer `unlockedBadges` directement.

---

## Mobile

| Fichier | Rôle |
|---------|------|
| `app/badges.tsx` | Écran « Mes badges » (earned + locked + toggles) |
| `app/(tabs)/account.tsx` | Vitrine badges sur le profil |
| `hooks/useBadges.ts` | React Query `BADGES_QUERY_KEY` |
| `context/BadgeUnlockContext.tsx` | Modale globale déblocage |
| `components/badges/BadgeUnlockModal.tsx` | UI nouveau badge |

**Préférences :** interrupteur global « masquer badges sur le profil » (`hideBadgesOnProfile` sur `User`).

---

## Admin

- CRUD **Badges** (EasyAdmin) + upload image (`public/uploads/badges/`, max 2 Mo).
- Action **Attribuer** → `/admin/badges/{id}/award`.

---

## RGPD

- Traitement **T9 — Gamification** dans [RGPD_registre.md](../RGPD_registre.md).
- Export `odos-gdpr-export-v2` : section badges et préférences d’affichage.
- Suppression compte : cascade `user_badge`, `user_badge_display`, `user_activity_view`.

---

*Dernière mise à jour : mai 2026.*
