# Audit RGPD — ODOS

État des lieux mai 2026, après les sprints 1–3. Complète le [registre](RGPD_registre.md).

En bref : le code tient la route côté droits, sécurité de base et admin. Ce qui manque surtout, c'est l'exploitation prod (cron, HTTPS, CORS vérifié) et le contenu juridique complet (SIRET, mentions légales).

| | |
|---|---|
| Conforme (code + docs) | ~22 points |
| Urgent (prod / stores) | 3–4 points |
| À affiner sous 3 mois | ~6 points |
| Recommandé plus tard | ~5 points |

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
