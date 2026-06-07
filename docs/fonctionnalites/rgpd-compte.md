# Droits RGPD & mentions légales

Export des données, effacement du compte et textes légaux in-app (art. 15, 17, 20 RGPD).

**Voir aussi :** [RGPD_registre.md](../RGPD_registre.md) · [RGPD_AUDIT_2026.md](../RGPD_AUDIT_2026.md) · [profil-parametres.md](profil-parametres.md)

---

## Principe

1. L’utilisateur connecté peut **exporter** l’ensemble de ses données personnelles en JSON.
2. Il peut **supprimer** son compte avec confirmation explicite (`{"confirm": true}`).
3. Les textes CGU, politique de confidentialité et mentions légales sont embarqués dans l’app (`/legal`).

Le registre art. 30 (`RGPD_registre.md`) reste la référence juridique pour finalités et durées.

---

## API (JWT)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| GET | `/api/me/export` | Export JSON format `odos-gdpr-export-v2` |
| DELETE | `/api/me` | Effacement compte (`confirm: true` obligatoire) |

---

## Contenu export (`odos-gdpr-export-v2`)

Inclut notamment :

- Identité et profil (`email`, alias, bio, dates consentement)
- Centres d’intérêt, favoris et **activités visitées** (`visitedActivities`)
- Notes, commentaires (contenu + métadonnées)
- Badges obtenus et préférences d’affichage
- Exploration carte : cellules visitées, consentement, paramètres
- Horodatage `exportedAt`

Service : `UserDataExportService`.

---

## Suppression compte

Service : `UserDeletionService`.

| Donnée | Traitement |
|--------|------------|
| Compte `User` | Suppression |
| Avatar | Fichier supprimé |
| Commentaires | Anonymisation (auteur effacé, contenu conservé si modération) |
| Notes / favoris / badges / exploration | Cascade ORM |
| Refresh tokens | Invalidation |

Après suppression : logout client + purge cache React Query + SecureStore.

---

## Mobile

| Fichier | Rôle |
|---------|------|
| `app/settings.tsx` | Boutons export (partage JSON) et suppression (double alerte) |
| `app/legal.tsx` | CGU, confidentialité, mentions (`?section=`) |
| `scripts/api.ts` | `exportMyData`, `deleteMyAccount` |

**Export UX :** génération JSON → `Share.share()` natif (enregistrement / envoi).

---

## Textes légaux

- Dernière mise à jour affichée : **mars 2026** dans `legal.tsx`.
- Maintenir alignés avec le registre (durées, sous-traitants, SIRET) — checklist dans [docs/README.md](../README.md).

---

## Incident & logs

- Procédure violation : [INCIDENT_RESPONSE.md](../INCIDENT_RESPONSE.md)
- Rétention logs : [LOG_RETENTION.md](../LOG_RETENTION.md)

---

*Dernière mise à jour : juin 2026.*
