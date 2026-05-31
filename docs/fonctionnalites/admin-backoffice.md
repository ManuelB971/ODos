# Back-office admin

Interface d’administration EasyAdmin pour opérateurs : catalogue, modération, badges, import, audit.

**Voir aussi :** [ARCHITECTURE.md](../ARCHITECTURE.md) · [badges-gamification.md](badges-gamification.md)

---

## Principe

1. Surface web **`/admin`** distincte de l’API mobile.
2. Authentification **session Symfony** + **MFA obligatoire** (TOTP, SMS ou WebAuthn).
3. CRUD sur les entités métier partagées avec API Platform (`Activity`, `Category`, `User`, `Comment`, badges…).
4. Actions spécifiques : import CSV activités, attribution manuelle de badges, export logs audit.

---

## Accès & sécurité

| Élément | Détail |
|---------|--------|
| URL | `/admin`, `/login`, `/admin/mfa` |
| Auth | Formulaire + second facteur |
| Rôles | `ROLE_ADMIN` |
| Audit | `AdminAuditSubscriber` → `admin_audit_log` |

Configuration : `config/packages/security.yaml`.

---

## Fonctionnalités admin

| Menu / route | Rôle |
|--------------|------|
| Dashboard `/admin` | Accueil EasyAdmin |
| Activités | CRUD, publication, photos, coords |
| Catégories | Taxonomie |
| Utilisateurs | Comptes mobile |
| Commentaires | Modération (`isHidden`) |
| Badges | CRUD définitions + `/admin/badges/{id}/award` |
| Importer activités | `/admin/activities/import` + template CSV |
| Recommandations | `/admin/recommendations` — test pipeline LLM |
| Export CSV logs | `/admin/logs/export.csv` |

---

## Import CSV activités

| Fichier | Rôle |
|---------|------|
| `ActivityImportController` | Upload + validation |
| `ActivityImportService` | Persistance batch |
| Template | `GET /admin/activities/import/template.csv` |

Colonnes typiques : nom, description, catégorie, ville, lat/lon, prix, URL image, publié.

---

## Upload fichiers

| Type | Emplacement |
|------|-------------|
| Photos activités | `public/uploads/activities/` |
| Avatars (via API user) | `public/uploads/avatars/` |
| Images badges | `public/uploads/badges/` |

---

## Exploitation

- Purge données / tokens : commande `app:data-retention:purge` (cron prod — voir [LOG_RETENTION.md](../LOG_RETENTION.md)).
- Seed badges : `app:badges:seed-defaults`.

---

## Séparation admin / API

EasyAdmin et `/api/*` partagent le modèle Doctrine ; la logique sensible (suppression compte, throttle, gamification) reste dans les **services** Symfony, pas uniquement dans les CRUD.

---

*Dernière mise à jour : mai 2026.*
