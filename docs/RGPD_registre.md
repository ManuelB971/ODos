# Registre des activités de traitement — ODOS

_Document interne — art. 30 RGPD. Dernière mise à jour : mai 2026 (Sprint 2)._

| ID | Traitement | Finalité | Base légale | Données | Durée de conservation | Destinataires / sous-traitants |
|----|------------|----------|-------------|---------|----------------------|--------------------------------|
| T1 | Compte utilisateur mobile | Création de compte, authentification, profil | Consentement (inscription) + exécution du contrat | Email, mot de passe (hash), alias, bio, avatar, `consentedAt` | Tant que le compte est actif ; suppression sous 30 j après demande | Hébergement Contabo |
| T2 | Session JWT | Maintenir la session API | Exécution du contrat | JWT access (TTL court) + refresh token | Access : `JWT_TOKEN_TTL` (défaut 15 min) ; refresh : `JWT_REFRESH_TTL` (défaut 30 j) + purge quotidienne | — |
| T3 | Centres d'intérêt & favoris | Personnalisation, recommandations | Exécution du contrat | Catégories, IDs activités favorites | Jusqu'à suppression compte | — |
| T4 | Commentaires & notes | Contenu communautaire sur activités | Exécution du contrat | Texte commentaire, note 1–5, métadonnées | Commentaires anonymisés à la suppression compte ; notes supprimées | — |
| T5 | Géolocalisation activités | Affichage carte / recherche | Intérêt légitime (information sur lieux publics) | Coordonnées activités (non données utilisateur directes) | Durée vie des fiches activités | — |
| T6 | Administration | Gestion contenu, modération, sécurité | Intérêt légitime / obligation légale | Email admin pseudonymisé en audit, hash en contexte JSON, IP | Logs admin : **90 j** (`app:admin-audit:purge` + cron) | — |
| T7 | MFA admin (TOTP + SMS) | Sécuriser l'accès back-office | Intérêt légitime (sécurité) | Secret TOTP, numéro téléphone admin (si SMS activé) | Tant que compte admin actif | Twilio (si configuré) |
| T8 | Recommandations LLM (optionnel) | Classement d'activités | Consentement / intérêt légitime selon déploiement | Centres d'intérêt, métadonnées activités (pas d'email) | Cache LLM : `LLM_CACHE_TTL_SECONDS` | Fournisseur LLM self-hosted ou cloud (à documenter) |

## Mesures techniques

- Mots de passe : hash Symfony (Argon2/bcrypt).
- API : HTTPS en production, rate limiting login (5/min/IP) et inscription (3/h/IP).
- CORS : origines restreintes via `CORS_ALLOW_ORIGIN` (plus de wildcard `/api`).
- JWT : access token court + refresh ; `POST /api/logout` invalide les refresh tokens.
- Stockage mobile : SecureStore pour tokens.
- Effacement : `UserDeletionService` (anonymisation commentaires, purge refresh tokens et logs audit).
- Portabilité : `GET /api/me/export`.
- Logs : `SensitiveDataProcessor` Monolog (masquage password/token/Authorization).
- Audit admin : emails pseudonymisés (`j***@domaine.com`) + `adminEmailHash` en contexte.

## Droits des personnes

| Droit | Mise en œuvre |
|-------|----------------|
| Accès / rectification | App Paramètres + `GET /api/me` |
| Portabilité | `GET /api/me/export` + partage depuis l'app |
| Effacement | `DELETE /api/me` avec `{"confirm": true}` |
| Opposition | Contact : contact@odos-app.fr |

## Rétention automatisée

Voir `docs/LOG_RETENTION.md` et script `scripts/prod-cron-purge.sh`.

## Violation de données

Voir `docs/INCIDENT_RESPONSE.md` (notification CNIL ≤ 72 h).

## Accessibilité (Sprint 3)

- Admin : labels ARIA, contraste `text-muted`, focus clavier, bandeau cookies session (`admin-a11y.css`).
- Mobile : `accessibilityLabel` sur actions icônes, cibles tactiles ≥ 44 px (CTA `sm` inclus).

## Déploiement sans domaine

Voir `docs/PROD_SANS_DOMAINE.md`.

## Contacts

- **Responsable de traitement** : ODOS — contact@odos-app.fr  
- **Hébergeur** : Contabo GmbH, Aschauer Straße 32a, 81549 München, Allemagne  
