# Plan de lancement ODOS — VPS → App Store → vrais utilisateurs

> Document de pilotage partagé (toi + agents Claude). **À relire avant chaque session de travail** et à cocher au fur et à mesure.
> Créé le 15/10/2026. Jury RNCP terminé : plus de rédaction « jury », on met à jour les fichiers existants.

---

## 0. Décisions en attente

| # | Décision | Options | Impact | Statut |
|---|----------|---------|--------|--------|
| D1 | Compte Apple Developer | **Individuel** (immédiat, publié sous ton nom) / **Organisation** (structure juridique + D-U-N-S gratuit, quelques jours) | Nom affiché sur l'App Store, migration pénible après coup | ⏳ |
| D2 | Statut « trader » DSA (UE) | Trader → adresse + téléphone publics sur la fiche / Non-trader | Obligation Apple pour distribuer dans l'UE | ⏳ |
| D3 | Bundle identifier iOS | Garder `com.odos.front` / passer à `com.odos.app` | **Définitif** une fois l'app créée sur App Store Connect | ⏳ |
| D4 | Structure juridique | Aucune (perso) / micro-entreprise / SAS(U) | Conditionne D1 | ⏳ |
| D5 | Outil de crash reporting | Sentry (offre gratuite) / autre | Indispensable avant les vrais utilisateurs | ⏳ |

---

## 1. Phase VPS — optimisation et durcissement (≈ 2-3 jours)

### 1.1 Audit (lecture seule) — fait le 15/10/2026 (sans sudo)
- [x] Inventaire : Ubuntu 24.04.4, 8 vCPU, 23 Go RAM (3,3 Go utilisés), disque 387 Go (10 %), pas de swap, uptime 23 semaines
- [x] SSH durci (cf. 1.3)
- [x] Ports publics testés depuis l'extérieur : 22, 80, 443 **et 8000** ouverts ; 5432/6379/9200/5601/55000/11434 fermés
- [x] Wazuh : ~2,2 Go RAM (indexer 1,3 Go, manager 0,66 Go, dashboard 0,2 Go), images 6,4 Go, versions de sept. 2025 non mises à jour
- [x] TLS : `api.odos-api.com` expire le 24/12/2026, `app.odos.world` le 25/11/2026, `certbot.timer` actif
- [x] UFW actif, entrant refusé par défaut ; autorisés : 22, 80, 443 et 8000 (à retirer)
- [x] `certbot renew --dry-run` : renouvellement OK pour les 2 domaines
- [x] Sauvegardes : uniquement les dumps `predeploy-*.sql` créés par le workflow, **dernier le 05/07/2026**, aucun cron, stockés sur le même serveur, uploads non sauvegardés
- [x] Logs Docker : `odos.filebeat` 270 Mo, `odos-php-1` 112 Mo, `wazuh.indexer` 13 Mo (croissance sans limite)
- [x] `auth.log` : **92 587 tentatives SSH échouées** (bruteforce permanent ; neutralisé par l'auth par clé, CrowdSec à ajouter)

### 1.2 Constats de l'audit (par priorité)

**🔴 Critique**
- [ ] **Port 8000 exposé sur Internet** (nginx Docker en HTTP clair, contourne le nginx hôte/TLS ; Docker contourne aussi UFW). UFW l'autorise en plus explicitement (`8000/tcp ALLOW IN Anywhere`, v4 + v6). Correctif : publier `127.0.0.1:8000:80` dans `docker-compose.prod.yml` **et** `ufw delete allow 8000/tcp`
- [ ] **MFA admin désactivée en prod** (`ADMIN_MFA_ENABLED=false`) alors que `/admin` est public. Analyse du code (15/10) :
  - le flux impose TOTP **puis** SMS (Twilio non payé) → impossible de l'activer tel quel, d'où la désactivation
  - le secret TOTP de prod est **la valeur d'exemple publique** de `.env.example`
  - `/admin/mfa/totp/setup` est exempté de la MFA et affiche le secret à tout admin connecté par mot de passe
  - `ADMIN_MFA_PIN` et `ADMIN_MFA_REQUIRE_BIOMETRIC` ne sont utilisés nulle part dans le flux (WebAuthn non implémenté)
  - la page de setup envoyait le secret à un service tiers (`api.qrserver.com`) pour dessiner le QR
  - [x] Code (15/10) : `ADMIN_MFA_SMS_ENABLED` (défaut 0 → TOTP seul), `ADMIN_MFA_TOTP_SETUP_ENABLED` (défaut 0 → page setup en 404), clé affichée en saisie manuelle au lieu du QR tiers, tests `tests/AdminMfaServiceTest.php` (vecteurs RFC 6238)
  - [x] Commit `f4c36d7` poussé sur `main` le 15/10 (déploiement auto après CI)
  - [ ] Vérifier que la CI et le déploiement sont passés (GitHub → Actions)
  - [ ] Activation en prod (en `odos`, fichiers de `deploy`) :
    1. Générer le secret : `head -c 20 /dev/urandom | base32 | tr -d '='`
    2. `sudo -u deploy nano /home/deploy/odos-config/.env` → `ADMIN_MFA_TOTP_SECRET=<nouveau>`, `ADMIN_MFA_SMS_ENABLED=0`, `ADMIN_MFA_TOTP_SETUP_ENABLED=1` (laisser `ADMIN_MFA_ENABLED=false`)
    3. `cd /home/deploy/ODos && sudo -u deploy docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d php`
    4. Ouvrir `https://api.odos-api.com/admin/mfa/totp/setup`, saisir la clé dans Google Authenticator, vérifier un code
    5. Remettre `ADMIN_MFA_TOTP_SETUP_ENABLED=0` et passer `ADMIN_MFA_ENABLED=1`, relancer l'étape 3
    6. Tester `/admin` en navigation privée en gardant la session actuelle ouverte (retour arrière : `ADMIN_MFA_ENABLED=false` + étape 3)
  - [x] Bug : après `POST /login`, redirection vers `/` (aucune route → 404) quand aucune page cible n'est mémorisée → `default_target_path: admin` dans `security.yaml` + `tests/SecurityConfigTest.php` (non commité)
  - [ ] Plus tard : secret TOTP par admin en base (ex. `scheb/2fa-bundle`) si plusieurs admins
- [ ] **Redémarrage en attente depuis des mois** : noyau 6.8.0-106 en cours, 13 noyaux + `libc6` installés non appliqués. Correctif : reboot planifié (snapshot avant)

- [ ] **Pas de vraie sauvegarde** : aucune sauvegarde planifiée depuis le 05/07/2026, rien hors du serveur, volume `odos_public_uploads` jamais sauvegardé. Correctif : dump Postgres + archive uploads quotidiens (cron/timer), rétention 7 j / 4 sem., copie hors VPS (stockage objet ou PC), **test de restauration**

**🟠 Important**
- [ ] Mot de passe Postgres par défaut `odos_secret` (réseau interne Docker uniquement, mais à changer) → `.env` de `~/odos-config`
- [ ] `LLM_ENABLED=true` alors que le conteneur Ollama ne tourne pas → `false` (ou démarrer le profil `llm`, en gardant le port fermé)
- [ ] Logs Docker sans rotation (`json-file` sans `max-size`) et aucun conteneur limité en mémoire → `/etc/docker/daemon.json` + `mem_limit`
- [ ] Fuite de versions : `X-Powered-By: PHP/8.2.32`, `Server: nginx/1.24.0` → `expose_php = Off`, `server_tokens off`
- [ ] Pas de HSTS sur l'API / la web app → `Strict-Transport-Security` dans le nginx hôte
- [ ] Redis sans mot de passe (interne uniquement) → `requirepass` (optionnel)

**🟡 À planifier**
- [ ] 10,6 Go de cache de build Docker récupérables (`docker builder prune`)
- [ ] 53 paquets à mettre à jour (aucun marqué sécurité) → `apt upgrade` avant le reboot
- [ ] Volume Docker anonyme `57546eef…` à identifier
- [ ] ⚠️ `app.odos.world` **bloqué par un filtre Fortinet/FortiGuard** sur le réseau du PC de Manuel (le DNS public pointe bien vers le VPS). Les testeurs derrière un réseau d'école/entreprise filtré pourraient être bloqués aussi → à tester sur d'autres réseaux, envisager une soumission de recatégorisation à FortiGuard

### 1.2 bis Correctifs repérés dans le repo
- [ ] `docker-compose.yml` : Ollama publie `11434:11434` sur toutes les interfaces → lier à `127.0.0.1` (profil `llm` actuellement inactif en prod)

### 1.3 Durcissement (chaque étape validée par toi + snapshot Contabo avant)
- [x] Utilisateur admin `odos` (sudo + docker), SSH par clé uniquement, root désactivé, `AllowUsers odos deploy` (`/etc/ssh/sshd_config.d/00-hardening.conf`)
- [ ] Vérifier un déploiement GitHub Actions après durcissement SSH
- [ ] Verrouiller le mot de passe root : `sudo passwd -l root`
- [ ] Retirer `sudo` de `deploy` (CI) : adapter l'étape `sudo chown www-data /var/www/odos-web` de `deploy-prod.yml` (droits de groupe sur le web root à la place)
- [ ] Identifier les 2 clés de `/home/deploy/.ssh/authorized_keys` (GitHub Actions + ?) et retirer celle qui n'a plus d'usage
- [ ] UFW : 22 (ou port custom), 80, 443 uniquement
- [ ] CrowdSec (logs nginx hôte + sshd) + bouncer firewall
- [ ] `unattended-upgrades` (patchs sécurité automatiques)
- [ ] Docker : limites mémoire par conteneur, rotation des logs (`max-size`)
- [ ] Tailscale (optionnel) pour l'accès admin/monitoring

### 1.4 Monitoring léger à la place de Wazuh
Nouveau fichier `docker-compose.monitoring.yml` (tout lié à `127.0.0.1`, accès par tunnel SSH ou Tailscale) :

| Besoin | Outil |
|--------|-------|
| Métriques serveur / conteneurs | node-exporter, cAdvisor |
| Postgres / Redis / Nginx / PHP-FPM | postgres_exporter, redis_exporter, nginx-exporter, php-fpm-exporter |
| Disponibilité + expiration TLS de l'API et de la web app | blackbox-exporter |
| Logs nginx + Symfony | Loki + Grafana Alloy (remplace filebeat) |
| Tableaux de bord | Grafana |
| Alertes (API down, disque > 85 %, RAM, TLS < 15 j, restarts) | Alertmanager → email ou Discord |
| Détection d'intrusion | CrowdSec (cf. 1.3) |

- [ ] Déployer la pile en parallèle de Wazuh
- [ ] Valider les alertes (test de panne volontaire)
- [ ] Arrêter et supprimer Wazuh (`docker-compose.wazuh.yml`), garder les exports dans `deliverables/`
- [ ] Mettre à jour `CLAUDE.md`, `README.md`, `docs/INCIDENT_RESPONSE.md`, `docs/LOG_RETENTION.md`

---

## 2. Phase préparation App Store / Play Store (en parallèle de la phase 1)

### Déjà en place ✅
- Suppression de compte RGPD dans l'app (exigée par Apple)
- Signalement + blocage d'utilisateurs (exigés pour le contenu généré par les utilisateurs)
- Page légale `app/legal.tsx`

### À faire
- [ ] Trancher D1 à D4
- [ ] `odos-front/app.json` : retirer `NSAllowsArbitraryLoads: true` (iOS) et `usesCleartextTraffic: true` (Android), la prod est en HTTPS
- [ ] Ajouter le crash reporting (D5)
- [ ] Politique de confidentialité accessible par URL publique (exigée par Apple et Google)
- [ ] Mettre à jour CGU / mentions légales (modération forum/commentaires, DSA/LCEN)
- [ ] Mettre à jour `docs/RGPD_registre.md` (sous-traitants : Contabo, Twilio, Expo/EAS, crash reporting)
- [ ] Préparer la fiche « App Privacy » (Apple) et « Data safety » (Google)
- [ ] Captures d'écran, description, mots-clés, icône 1024 px
- [ ] Compte de démonstration pour l'équipe de review Apple

---

## 3. Phase Apple

- [ ] **Toi** : paiement Apple Developer Program (99 €/an), selon D1
- [ ] Créer l'app sur App Store Connect (bundle id selon D3)
- [ ] `eas build --platform ios --profile production`
- [ ] `eas submit --platform ios` → TestFlight
- [ ] Test interne TestFlight (toi + proches)
- [ ] Soumission à la review Apple

---

## 4. Phase bêta — vrais utilisateurs

- [ ] Recruter les testeurs (objectif ≥ 12 pour Google, à revérifier : test fermé 14 jours obligatoire pour les comptes perso récents)
- [ ] TestFlight externe (iOS) + test fermé Google Play (Android)
- [ ] Formulaire de retours (lien dans l'app ou message d'accueil)
- [ ] Revue hebdomadaire des retours + crashs → issues GitHub priorisées
- [ ] Critères de sortie de bêta (à définir : taux de crash, retours bloquants corrigés…)

---

## 5. Environnement agentique

Agents définis dans `.claude/agents/` (versionnés, donc identiques sur PC et VPS après `git pull`).

| Agent | Où | Rôle |
|-------|----|------|
| `infra-vps` | VPS | Phase 1 : audit, durcissement, monitoring |
| `release-stores` | PC | Phases 2-3 : builds EAS, App Store Connect, conformité aux règles des stores |
| `beta-testeurs` | PC | Phase 4 : testeurs, retours, crashs, issues |
| `pilotage` | PC | Ce plan, échéancier, décisions, admin/juridique |

### Garde-fous
- Lecture libre ; modification réversible = proposée puis appliquée ; action risquée (SSH, pare-feu, base de données, suppression) = **accord explicite + snapshot Contabo avant**
- Aucun paiement, aucune soumission store sans ton accord
- Secrets jamais dans le repo (restent dans `~/odos-config`)
- Chaque intervention VPS notée dans le journal ci-dessous

### Automatisations prévues
- [ ] Lundi : audit VPS automatique (mises à jour, IP bannies, disque, TLS, sauvegarde)
- [ ] Vendredi : revue de ce plan (avancé / bloqué / prochaines étapes)

---

## 6. Journal

| Date | Qui | Action | Résultat |
|------|-----|--------|----------|
| 15/10/2026 | Claude | Création du plan | — |
| 15/10/2026 | Manuel | Inventaire comptes VPS | Seul utilisateur : `deploy` (groupes sudo, docker), app dans `/home/deploy/ODos`, secrets `~/odos-config`, sauvegardes `~/odos-backups`, 2 clés SSH autorisées. Rien dans `/root`. |
| 15/10/2026 | Manuel + Claude | Création de `odos` (sudo, docker) + clé du PC ; `00-hardening.conf` (root et mots de passe interdits, `AllowUsers odos deploy`) | Vérifié depuis le PC : root refusé, auth par mot de passe plus proposée, `odos` OK. Conteneurs actifs : odos-php/nginx/postgres/redis + wazuh.manager/dashboard/indexer + odos.filebeat. Annulation : supprimer `00-hardening.conf` puis `systemctl restart ssh` (console VNC Contabo si besoin). |
| 15/10/2026 | Claude | Audit VPS en lecture seule (compte `odos`, sans sudo) + scan des ports depuis l'extérieur | 3 critiques (port 8000 public, MFA admin off, reboot en attente), 6 importants — voir 1.2. Aucun changement effectué. |
| 15/10/2026 | Manuel | Audit partie sudo (UFW, certbot, sauvegardes, logs, auth.log) | UFW autorise 8000 ; TLS OK ; sauvegardes non planifiées (dernière 05/07) → passé en critique ; 92 587 échecs SSH. |
| 15/10/2026 | Claude | Correctif MFA admin (TOTP seul, setup verrouillable, plus de QR tiers) + tests | 24 nouveaux tests OK, PHPStan OK, lint Twig OK. 3 tests Gamification échouent en local hors Docker (`DATABASE_URL` absent, sans rapport). Non commité, non déployé. |
