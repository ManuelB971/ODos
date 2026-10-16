# Audit RGPD — ODOS

État des lieux **juin 2026**, après les sprints social / parcours, complété en **octobre 2026** par l’[audit géolocalisation](#audit-géolocalisation--octobre-2026). Complète le [registre](RGPD_registre.md).

> **Juin 2026 :** traitement **T11 — Communauté & modération sociale** ajouté au registre (messages, amis, blocages, pièces jointes). Consentement explicite via `POST /api/social/consent`.

En bref : le code tient la route côté droits, sécurité de base et admin. Ce qui manque surtout, c'est l'exploitation prod (cron, HTTPS, CORS vérifié) et le contenu juridique complet (SIRET, mentions légales).

| | |
|---|---|
| Conforme (code + docs) | ~22 points |
| Urgent (prod / stores) | 3–4 points |
| À affiner sous 3 mois | ~6 points |
| Recommandé plus tard | ~5 points |

---

## Audit géolocalisation — octobre 2026

Périmètre : exploration de la carte (expo-location, mobile et web), stockage côté API, partage, droits, sous-traitants, App Store.

### Ce que fait le code (vérifié)

| Point | Constat |
|-------|---------|
| Consentement préalable | Exploration **désactivée par défaut** (`mapExplorationEnabled = false`). La position n'est demandée (`requestForegroundPermissionsAsync`, qui ouvre la demande du navigateur sur le web) qu'une fois le consentement in-app donné **et** l'interrupteur activé (`isMapExplorationActive()`). Refus possible sans bloquer l'app. |
| Collecte | Premier plan uniquement, carte ouverte (`watchPositionAsync`, précision `Balanced`, 80 m / 30 s). Pas de tâche en arrière-plan. |
| Minimisation | Les coordonnées sont converties **sur l'appareil** en geohash de précision 6 (≈ 1,2 km × 0,6 km). L'API n'accepte que les cellules du catalogue (zones contenant une activité publiée) : toute autre cellule, ou précision, est ignorée. Aucune latitude/longitude d'utilisateur n'est stockée ni journalisée. |
| Partage | Les cellules ne sont visibles que par leur propriétaire (`/api/me/exploration`). Aucun partage avec amis, groupes, forum ou profil public. Le profil public n'expose que le nombre de lieux marqués « visités » (marquage manuel), si le profil est public. |
| Recommandations | Le LLM et le filtrage collaboratif ne reçoivent aucune position. |
| Droits | Export (`GET /api/me/export`, cellules incluses), effacement (`DELETE /api/me`, cascade `user_map_cell`). |

### Corrigé dans cette PR

| Correctif | Référence |
|-----------|-----------|
| Désactiver l'exploration **retire le consentement** : cellules effacées et `mapExplorationConsentAt` remis à zéro (une réactivation redemande l'accord). Confirmation explicite dans Paramètres. | RGPD art. 7.3, 17.1.b |
| Le bouton « Refuser » de la fenêtre de consentement enregistre le refus (réglage repassé à désactivé) au lieu d'un « Plus tard » reposé à chaque ouverture de la carte. | Art. 4.11, 7 ; CNIL, lignes directrices consentement (refuser aussi simple qu'accepter) |
| Plus de ré-horodatage `lastVisitedAt` à chaque passage dans une cellule : seule la première visite est datée, aucune trace temporelle de présence. | Art. 5.1.c, 25 |
| Texte de consentement complété : finalité, granularité, caractère facultatif, retrait. | Art. 7.2, 13 |
| Politique de confidentialité (`app/legal.tsx`) réécrite : géolocalisation, communauté, push, bases légales par traitement, durées, sous-traitants (Contabo, OpenFreeMap, CARTO, Expo/Apple/Google), stockage web `localStorage`, droit de réclamation CNIL. | Art. 12, 13 |
| iOS : `NSLocationWhenInUseUsageDescription` précisé ; `privacyManifests` ajouté dans `app.json` (types de données collectées + `NSPrivacyAccessedAPITypes` de React Native). | Exigence Apple (Privacy manifest, mai 2024) |
| Registre art. 30 mis à jour (T10, T12, sous-traitants). | Art. 30 |
| Thème sombre de la carte : CARTO Dark Matter (gratuit pour un usage non commercial seulement) remplacé par OpenFreeMap Dark ; plus aucun appel à CARTO dans le build. | Art. 28 ; conditions CARTO |
| Comptes inactifs : `user.last_active_at` (mis à jour au plus une fois par jour à chaque émission de JWT, dont le rafraîchissement) et `app:inactive-users:purge` (36 mois par défaut, administrateurs exclus, `--dry-run`), appelée par `app:data-retention:purge`. La migration initialise les comptes existants à la date de mise en prod. | Art. 5.1.e ; CNIL, durées de conservation |
| Android : `ACCESS_FINE_LOCATION` et `ACCESS_BACKGROUND_LOCATION` bloquées (`android.blockedPermissions`, `tools:node="remove"` sur les déclarations injectées par expo-location et MapLibre). expo-location calcule « granted » sur la permission approximative, la précision `Balanced` suffit. | Art. 5.1.c, 25 |

### Risques restants

| Niveau | Risque | Action | Référence |
|--------|--------|--------|-----------|
| 🔴 Élevé | Les durées annoncées (logs 30/90 j, refresh tokens, comptes inactifs 3 ans) ne sont pas appliquées : cron de purge jamais installé sur le VPS. | Installer `scripts/prod-cron-purge.sh` + logrotate (cf. PLAN_LANCEMENT §1). | Art. 5.1.e |
| 🔴 Élevé | Mentions légales incomplètes (identité de l'éditeur, statut, adresse, SIRET). | **Juridique** : compléter `legal.tsx` une fois la structure choisie (D1). | LCEN art. 6-III |
| 🔴 Élevé | Notifications push via Expo (États-Unis) : transfert hors UE sans DPA vérifié. | **Juridique** : accepter le DPA d'Expo, vérifier son adhésion au Data Privacy Framework, garder la preuve. | Art. 28, 44–46 |
| 🟠 Moyen | OpenFreeMap (seul fournisseur de tuiles) reçoit l'IP et la zone affichée, sans contrat. | Héberger les tuiles soi-même (PMTiles sur le VPS) pour supprimer ce destinataire. | Art. 28 |
| 🟠 Moyen | Preuve du consentement limitée à un horodatage, sans version du texte ; il est remis à zéro au retrait. | Journal de consentement (date, version du texte, action) conservé à part, sans donnée de position. | Art. 7.1 |
| 🟠 Moyen | `NSAllowsArbitraryLoads` / `usesCleartextTraffic` encore actifs. | Retirer (déjà au plan de lancement §2), la prod est en HTTPS. | Art. 32 ; review Apple |
| 🟡 Faible | Jetons push jamais purgés quand l'appareil n'est plus utilisé. | Purge des jetons non mis à jour depuis 90 j dans `app:data-retention:purge`. | Art. 5.1.c, e |
| 🟡 Faible | AIPD : la géolocalisation « à large échelle » figure sur la liste CNIL des traitements soumis à AIPD. Non requise à l'échelle bêta (données agrégées, opt-in). | Documenter la décision ; refaire l'analyse au-delà de quelques milliers d'utilisateurs actifs. | Art. 35 ; liste CNIL (délibération 2018-327) |

### Actions hors code

1. **URL publique de la politique** : la route web `/legal?section=privacy` est accessible sans connexion. Après déploiement, `https://app.odos.world/legal?section=privacy` peut servir d'URL pour App Store Connect et Google Play.
2. **Fiche « App Privacy » (Apple) / « Data safety » (Google)** : déclarer localisation approximative, email, identifiant utilisateur, photos, contenus utilisateur, identifiant d'appareil — liés à l'utilisateur, sans suivi publicitaire, pour le fonctionnement de l'app. Doit rester cohérent avec `privacyManifests`.
3. **DPA** à accepter ou archiver : Contabo, Expo ; Twilio si le SMS admin est activé.
4. Désigner le responsable incident (cf. [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md)).

---

## Droits des personnes

| Point | Art. | Statut | Implémentation |
|-------|------|--------|----------------|
| Portabilité | 20 | OK | `GET /api/me/export` — profil, intérêts, favoris, commentaires, notes (JSON) |
| Export in-app | 20 | Partiel | Paramètres → partage JSON ; pas d'email auto ni CSV |
| Effacement | 17 | OK | `DELETE /api/me` + `UserDeletionService` |
| Anonymisation commentaires | 17 | OK | Contenu `[supprimé]`, `author` null, `isHidden` true |
| Purge tokens & audit | 17 | OK | Refresh tokens + `admin_audit_log` liés à l'email |
| Consentement inscription | 7 | OK | Checkbox CGU + `consentedAt` |
| Consentement notifications | 7 | N/A | Push non implémenté |
| Registre art. 30 | 30 | OK | [RGPD_registre.md](RGPD_registre.md) |

---

## Sécurité des données

| Point | Statut | Détail |
|-------|--------|--------|
| Rate limit login (5/min/IP) | OK | `ApiRateLimitSubscriber` |
| Rate limit inscription (3/h/IP) | OK | Idem |
| Purge refresh tokens expirés | OK code | `app:refresh-token:purge` |
| Purge admin audit (90 j) | OK code | `app:admin-audit:purge` |
| Cron rétention VPS | À faire ops | Script prêt : `scripts/prod-cron-purge.sh` — [LOG_RETENTION.md](LOG_RETENTION.md) |
| Logrotate Nginx / Symfony | À faire ops | Documenté, pas vérifié sur l'hôte |
| CORS sans wildcard | OK code | `CORS_ALLOW_ORIGIN` dans `.env` prod |
| CORS prod configuré | À vérifier ops | Adapter IP/domaine admin réel |
| JWT TTL court (15 min) | OK | `JWT_TOKEN_TTL=900` |
| Logout invalide refresh | OK | `POST /api/logout` |
| Blocklist JWT access | Partiel | Access token valide ~15 min après logout |
| Masquage logs sensibles | OK | `SensitiveDataProcessor` Monolog |
| Emails audit pseudonymisés | OK | `AdminAuditLogger` + `EmailPseudonymizer` |
| Anciens logs audit en clair | Risque | Pas de migration rétroactive |
| Emails dans messages de log | Partiel | Processor ne masque pas tout |
| Chiffrement phone / WebAuthn | Non | En clair en BDD — à chiffrer si possible |
| HTTPS production | À planifier | HTTP par IP documenté — requis stores |

---

## Mentions légales & transparence

| Point | Statut | Détail |
|-------|--------|--------|
| CGU in-app | OK | `odos-front/app/legal.tsx` + inscription |
| Politique confidentialité in-app | OK | Idem |
| Mentions légales in-app | Partiel | Manque SIRET, forme juridique, RCS |
| Art. 13 complet | Partiel | Sous-traitants, CNIL, durées à aligner avec registre |
| URL publique `/privacy` | Non | Requis stores — texte embarqué APK seulement |
| Bandeau cookies admin | OK | `_cookie_banner.html.twig` |
| Stockages mobile documentés | OK | SecureStore JWT dans politique |
| Procédure violation 72 h | OK | [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) |
| Responsable incident nommé | À compléter | Placeholder dans la procédure |
| `GET /api/legal/*` | Non | Textes embarqués mobile uniquement |

---

## Accessibilité

| Point | Statut |
|-------|--------|
| Labels & ARIA login/MFA admin | OK |
| Contraste `text-muted` admin | OK — `admin-a11y.css` |
| Focus clavier visible | OK |
| Tableaux dashboard EasyAdmin | Partiel |
| `accessibilityLabel` mobile (écrans clés) | OK partiel |
| MapPin / carte complète | Non |
| Audit VoiceOver / TalkBack | Non formalisé |
| Cibles tactiles ≥ 44 px | OK |

---

## Déjà en place

- Hachage mots de passe (Argon2/bcrypt Symfony)
- MFA admin (TOTP + SMS OTP + WebAuthn)
- Audit log admin
- Soft-delete / anonymisation commentaires
- Politique mot de passe (8 car., maj, min, chiffre, spécial)
- Sanitisation commentaires (`strip_tags` serveur)
- Rate limiting commentaires / notes / avatar (Redis)

---

## Ce qu'il reste à faire

### Avant prod / stores

1. Installer le cron rétention + vérifier `/var/log/odos-retention.log`
2. Vérifier `CORS_ALLOW_ORIGIN` et secrets sur le VPS
3. Compléter mentions légales (SIRET, statut) dans `legal.tsx`
4. Enrichir politique confidentialité (sous-traitants, CNIL, durées)
5. Domaine + HTTPS (Let's Encrypt) pour les stores

### Sous 3 mois

6. Décider blocklist JWT Redis ou accepter la fenêtre 15 min (documenter dans le registre)
7. Export : email async + CSV si besoin métier
8. Nommer responsable + suppléant incident
9. logrotate Nginx sur l'hôte
10. Lien confidentialité footer admin EasyAdmin
11. Pseudonymiser les anciens `admin_audit_log`
12. Renforcer masquage emails dans Monolog

### Plus tard

13. Chiffrement `phoneNumber` / WebAuthn credentials
14. Endpoint API legal versionné
15. Accessibilité mobile complète (MapPin, favoris, carte)
16. Audit RGAA Tab/Shift+Tab toutes pages admin
17. DPIA si LLM cloud ou géoloc à grande échelle

---

## Liens

| | |
|---|---|
| Registre art. 30 | [RGPD_registre.md](RGPD_registre.md) |
| Rétention logs | [LOG_RETENTION.md](LOG_RETENTION.md) |
| Incident | [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) |
| Déploiement | [PROD_SANS_DOMAINE.md](PROD_SANS_DOMAINE.md) |
| Index docs | [README.md](README.md) |

Contact RGPD : contact@odos-app.fr  
CNIL violation : notifications@cnil.fr

---

## Historique

| Date | Événement |
|------|-----------|
| Audit initial | 8 urgents, 11 affinements, 6 recommandations |
| Sprints 1–3 | Droits, rate limit, CORS, docs, a11y admin, legal in-app |
| Mai 2026 | Clôture code — écarts ops/juridique documentés |
| Octobre 2026 | Audit géolocalisation : retrait du consentement = effacement, refus persistant, minimisation des horodatages, politique et manifeste iOS mis à jour |
