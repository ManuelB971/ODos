# Profil & paramètres

Gestion du profil utilisateur : avatar, alias, bio, exploration carte, liens légaux.

**Voir aussi :** [authentification-compte.md](authentification-compte.md) · [rgpd-compte.md](rgpd-compte.md) · [exploration-carte.md](exploration-carte.md)

---

## Principe

1. **Écran Compte** (`/account`) : vue d’ensemble (avatar, stats favoris / intérêts, vitrine badges, menu).
2. **Écran Paramètres** (`/settings`) : édition profil, avatar, interrupteurs, zone RGPD.
3. Toute modification est validée **côté serveur** avant mise à jour de l’état local.

---

## API (JWT)

| Méthode | Chemin | Rôle |
|---------|--------|------|------|
| GET | `/api/me` | Lecture profil |
| PATCH | `/api/users/{id}` | Alias, bio, intérêts, `hideBadgesOnProfile`, `mapExplorationEnabled` |
| POST | `/api/me/avatar` | Upload multipart (`file`, JPG/PNG/WEBP, 2 Mo max) |
| DELETE | `/api/me/avatar` | Suppression avatar |
| PATCH | `/api/me/exploration/settings` | `{ enabled: true \| false }` — exploration carte |

---

## Mobile

| Fichier | Rôle |
|---------|------|
| `app/(tabs)/account.tsx` | Hero profil, menu, logout |
| `app/settings.tsx` | Édition complète + RGPD |
| `scripts/api.ts` | `updateProfile`, `uploadAvatar`, `deleteAvatar`, etc. |

**Champs profil :**

| Champ | Contraintes |
|-------|-------------|
| Alias (`alias`) | 2–60 car., lettres/chiffres/espaces/`-_'.` |
| Bio | 500 car. max, strip `<`/`>` côté client et serveur |
| Avatar | `expo-image-picker`, throttle **10 s** entre uploads |

**Affichage nom :** `displayName` API (alias ou local-part email).

**Paramètres exploration :** interrupteur « Exploration de la carte » → voir [exploration-carte.md](exploration-carte.md).

**Liens légaux :** navigation vers `/legal?section=cgu|privacy|mentions`.

---

## Sécurité avatar

- Pas de paramètre `userId` : action toujours sur l’utilisateur JWT (anti-IDOR).
- Nom de fichier généré serveur ; whitelist MIME + taille.

---

## RGPD (depuis Paramètres)

- Export données : [rgpd-compte.md](rgpd-compte.md)
- Suppression compte : double confirmation in-app

---

*Dernière mise à jour : mai 2026.*
