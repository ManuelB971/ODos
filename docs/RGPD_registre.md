# Registre des activités de traitement — ODOS

Registre art. 30 RGPD. Dernière mise à jour : **octobre 2026**.

Documents liés : [audit RGPD](RGPD_AUDIT_2026.md) · [rétention logs](LOG_RETENTION.md) · [incident](INCIDENT_RESPONSE.md) · [index docs](README.md)

---

## Traitements

| ID | Traitement | Finalité | Base légale | Données | Durée | Destinataires |
|----|---------|----------|-------------|---------|-------|---------------|
| T1 | Compte utilisateur mobile | Compte, auth, profil | Consentement + contrat | Email, hash MDP, alias, bio, avatar, `consentedAt` | Tant que compte actif ; suppression sous 30 j après demande | Contabo |
| T2 | Session JWT | Maintenir la session API | Contrat | JWT access + refresh | Access : 15 min ; refresh : 30 j + purge quotidienne | — |
| T3 | Intérêts, favoris & visites | Personnalisation, reco | Contrat | Catégories, IDs favoris, IDs activités visitées | Jusqu'à suppression compte | — |
| T4 | Commentaires & notes | Contenu communautaire | Contrat | Texte, note 1–5, métadonnées | Commentaires anonymisés à suppression ; notes supprimées | — |
| T5 | Géoloc activités | Carte / recherche | Intérêt légitime | Coordonnées activités (pas de données user directes) | Durée de vie des fiches | Fonds de carte : OpenFreeMap, CARTO (reçoivent l’IP et la zone affichée, jamais la position utilisateur) |
| T6 | Administration | Gestion contenu, modération | Intérêt légitime / obligation | Email admin pseudonymisé, hash, IP | Logs admin : **90 j** | — |
| T7 | MFA admin | Sécuriser le back-office | Intérêt légitime | Secret TOTP, téléphone admin (SMS) | Tant que compte admin actif | Twilio (si configuré) |
| T8 | Recommandations (filtrage collaboratif + LLM) | Classement activités personnalisé | Consentement / intérêt légitime | Intérêts, IDs favoris, IDs visites, métadonnées activités (jamais d'email) | Cache Redis : `LLM_CACHE_TTL_SECONDS` — données source jusqu'à suppression compte | LLM self-hosted (Ollama) — pas de transfert à des tiers |
| T9 | Gamification (badges) | Récompenses exploration, vitrine profil | Contrat / intérêt légitime | Badges obtenus, préférences affichage, compteurs vues fiches | Tant que compte actif | — |
| T10 | Exploration carte (GPS) | Progression % zones visitées, badges carte | Consentement explicite (opt-in, refus possible) | Cellules geohash précision 6 (≈ 1,2 × 0,6 km) limitées au catalogue d’activités, date de première visite, horodatage du consentement. Coordonnées GPS converties sur l’appareil, jamais transmises | Jusqu’au retrait du consentement (effacement immédiat à la désactivation) ou suppression du compte | Aucun (visible du seul titulaire) |
| T11 | Communauté & modération sociale | Forum, amis, messages, groupes, parcours partagés, blocage | Consentement explicite (`socialConsentedAt`) + contrat | Alias, avatar, bio, messages, statuts amitié, blocages, pièces jointes activité/parcours | Tant que compte actif ; blocages conservés jusqu'à déblocage ou suppression compte | Contabo |
| T12 | Notifications push | Messages, invitations, activité sociale | Consentement (autorisation système) | Jeton Expo de l’appareil, plateforme | Jusqu’à déconnexion, suppression du compte ou révocation | Expo (650 Industries, États-Unis) → Apple APNs / Google FCM — transfert hors UE (DPF / CCT à vérifier) |

---

## Mesures techniques

| Mesure | Implémentation |
|--------|----------------|
| Mots de passe | Hash Symfony (Argon2/bcrypt) |
| Rate limiting | Login 5/min/IP, inscription 3/h/IP |
| CORS | Origines restreintes via `CORS_ALLOW_ORIGIN` |
| JWT | Access 15 min + refresh 30 j ; logout invalide les refresh |
| Stockage mobile | SecureStore pour tokens |
| Effacement art. 17 | `UserDeletionService` — anonymisation commentaires, purge tokens et audit |
| Portabilité art. 20 | `GET /api/me/export` (JSON `odos-gdpr-export-v2`) — inclut favoris, visites, commentaires, badges |
| Logs applicatifs | `SensitiveDataProcessor` Monolog |
| Audit admin | Emails pseudonymisés + `adminEmailHash` en contexte JSON |

### Limites connues

- Access token JWT : pas de blocklist Redis — valide jusqu'à expiration (~15 min) après logout.
- `phoneNumber` admin et credentials WebAuthn : en clair en BDD (chiffrement recommandé).
- Textes légaux : embarqués dans l'app (`legal.tsx`) — URL publique HTTPS à prévoir pour les stores.

Détail : [RGPD_AUDIT_2026.md](RGPD_AUDIT_2026.md).

---

## Droits des personnes

| Droit | Mise en œuvre |
|-------|----------------|
| Accès / rectification | App Paramètres + `GET /api/me` |
| Portabilité | `GET /api/me/export` + partage depuis Paramètres |
| Effacement | `DELETE /api/me` avec `{"confirm": true}` |
| Opposition | contact@odos-app.fr |
| Réclamation CNIL | https://www.cnil.fr/fr/plaintes |

---

## Rétention automatisée

Voir [LOG_RETENTION.md](LOG_RETENTION.md) et `scripts/prod-cron-purge.sh`.

Commande agrégée : `app:data-retention:purge` (refresh tokens + audit admin 90 j).

---

## Violation de données

Voir [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) — notification CNIL ≤ **72 h**.

---

## Accessibilité

- **Admin :** labels ARIA, contraste, focus clavier, bandeau cookies (`admin-a11y.css`)
- **Mobile :** `accessibilityLabel` sur actions principales, cibles ≥ 44 px

Écarts : [RGPD_AUDIT_2026.md](RGPD_AUDIT_2026.md).

---

## Déploiement

[PROD_SANS_DOMAINE.md](PROD_SANS_DOMAINE.md)

---

## Contacts

| Rôle | Contact |
|------|---------|
| Responsable de traitement | ODOS — contact@odos-app.fr |
| Hébergeur | Contabo GmbH, Aschauer Straße 32a, 81549 München, Allemagne |
| Violation CNIL | notifications@cnil.fr |

### Sous-traitants et destinataires techniques

| Prestataire | Rôle | Données | Localisation | Contrat |
|-------------|------|---------|--------------|---------|
| Contabo GmbH | Hébergement VPS (API, BDD, web app) | Toutes | Allemagne (UE) | DPA à archiver |
| OpenFreeMap | Fond de carte (thème clair) | IP, zone affichée | À vérifier (CDN) | Service gratuit, sans DPA — envisager l’auto-hébergement |
| CARTO | Fond de carte (thème sombre) | IP, zone affichée | Espagne / CDN mondial, à vérifier | Conditions basemaps : usage non commercial |
| Expo (650 Industries) | Acheminement push / builds EAS | Jeton push, contenu de la notification | États-Unis | DPA + DPF à vérifier |
| Apple / Google | Livraison des notifications (APNs / FCM) | Jeton d’appareil | États-Unis | Conditions plateformes |
| Twilio | SMS OTP admin (si activé) | Téléphone admin | États-Unis | DPA à accepter si activé |

Pas d’outil d’analytics ni de crash reporting à ce jour (à ajouter ici si D5 est retenu).
