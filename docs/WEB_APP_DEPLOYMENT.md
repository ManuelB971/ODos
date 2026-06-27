# Web app ODOS — déploiement sur `app.odos.world`

> Document de référence (trace). Objectif : publier une **version web app** du front Expo, à
> partir du **même code source** que l'app mobile, hébergée sur un sous-domaine, sans dégrader la
> qualité ni introduire de régression côté mobile.

- **Statut :** **code implémenté & vérifié** (2026-06-27) — reste les étapes infra (DNS / HTTPS / déploiement), cf. §10.
- **Date :** 2026-06-27.
- **Décideur :** Manu.

### Ce qui a été implémenté (code, déjà dans le repo)

| Élément | Fichier | Détail |
|---------|---------|--------|
| Adapter carte web | `odos-front/components/map/MapLibreWeb.tsx` (créé) | Réplique `Map`/`Camera`/`Marker`/`GeoJSONSource`/`Layer` sur `maplibre-gl`. Import **dynamique** de la lib (SSR-safe), gestion du rechargement de style (clair/sombre), markers via `createPortal`. |
| Routage web | `odos-front/metro.config.js` | `@maplibre/maplibre-react-native` → `MapLibreWeb` sur web, stub léger en Expo Go, vrai natif sinon. |
| Dépendances | `odos-front/package.json` | `+ maplibre-gl@5.24.0`, `+ @types/react-dom@19` (dev), script `build:web`. |
| CORS | `odos-back/.env.example` | Exemple prod commenté `^https://app\.odos\.world$`. |
| Vhost nginx | `deploy/nginx/app.odos.world.conf` (créé) | Statique + fallback SPA + cache assets + instructions certbot. |

**Garde-fous web (R2)** : déjà en place avant ce chantier — `usePushNotifications`, `useNotificationResponse`, `useAppIconBadge` et le logout `AuthContext` sont tous gardés par `Platform.OS !== 'web'`. Rien à modifier.

**Vérifications passées** : `tsc` (0 erreur sur les fichiers touchés), `eslint` (clean), `MapExperience.test.tsx` (11/11), **`expo export -p web` → `dist/` généré** (toutes routes prérendues, aucun crash maplibre au prerender).

---

## 1. Objectif & contexte

ODOS = app mobile (Expo/React Native, builds EAS Android) + landing `odos.world` + API
`api.odos-api.com`. On ajoute une **cible web** servie en statique, réutilisant le code RN via
`react-native-web`.

Le terrain est déjà préparé :
- `app.json` → `web.output: "static"` : `expo export -p web` produit un site statique.
- `metro.config.js` route déjà `@maplibre/maplibre-react-native` vers un **stub** sur
  `platform === 'web'` → le bundle web compile sans crash (mais sans carte réelle aujourd'hui).
- `expo-secure-store` a un fallback `localStorage` web.
- Le CORS backend est piloté par une **regex env** (`CORS_ALLOW_ORIGIN`), pas de hardcode.

## 2. Décisions validées

| Sujet | Choix |
|-------|-------|
| Sous-domaine | **`app.odos.world`** (landing reste `odos.world`, API reste `api.odos-api.com`) |
| Hébergement | **VPS nginx** (vhost statique, comme l'API) |
| Carte | **Intégration `maplibre-gl` complète** (parité fonctionnelle, pas de version dégradée) |

## 3. Pré-requis bloquant — HTTPS de l'API

Une web app en `https://app.odos.world` **ne peut pas** appeler une API en `http://`
(mixed-content bloqué par le navigateur). Le bloc 443 certbot est prévu mais marqué « phase 2 »
dans `deploy/nginx/api.odos-api.com.conf`. **À finir avant la mise en ligne web.**

---

## 4. Plan de travail (workstreams)

### A — Adapter carte web `maplibre-gl` (chantier principal)

Remplacer le stub par une vraie carte web. Le resolver metro pointe déjà
`@maplibre/maplibre-react-native` vers un fichier unique sur web ; on l'implémente réellement.

- **Dépendance (web only) :** `pnpm add maplibre-gl` + `import 'maplibre-gl/dist/maplibre-gl.css'`.
  Importé uniquement depuis le fichier résolu sur `platform === 'web'` → **jamais dans le bundle
  natif**.
- **Fichier :** créer `odos-front/components/map/MapLibreWeb.tsx` ; faire pointer le resolver de
  `metro.config.js` vers ce fichier sur web (garder l'ancien stub léger pour `MAPLIBRE_STUB=1` /
  Expo Go).
- **API à répliquer** (signatures exactes utilisées dans `MapExperience.tsx`,
  `ActivityPinsLayer.tsx`, `ExplorationVisitedLayer.tsx`, `ParcoursRouteLayer.tsx`) :

| Composant | Implémentation maplibre-gl |
|-----------|----------------------------|
| `Map` | `new maplibregl.Map({ container, style: mapStyle })` dans un `<div>`. Mapper `attribution`/`logo`/`compass`/`scaleBar` (controls), `onDidFinishLoadingStyle` → event `style.load`. Exposer l'instance via React context aux enfants. |
| `Camera` | `forwardRef<CameraRef>` → `easeTo`, `fitBounds`, `setCamera` délèguent aux méthodes homonymes de maplibre-gl. `initialViewState` → `jumpTo` au montage. |
| `Marker` | `new maplibregl.Marker({ element, anchor })` à `lngLat` ; `element` = nœud DOM où l'on rend les `children` React (`MapPin`) via `ReactDOM.createPortal`. `onPress` → click. |
| `GeoJSONSource` + `Layer` | Impératif sur `style.load` : `map.addSource(id, {type:'geojson', data})` puis `map.addLayer({id,type,source,paint,layout})`. `setData` au changement de `data` ; cleanup `removeLayer`/`removeSource` ; ré-ajout après changement de style (déjà géré via `key={styleVersion}`). |

Réutiliser le type `CameraRef` déjà défini dans `MapLibreStub.tsx`. Les styles URL
(`maplibreStyle.ts` — OpenFreeMap, Carto) sont des styles GL standards compatibles maplibre-gl.

### B — Build web & env

- Script `package.json` : `"build:web": "expo export -p web"` → dossier `dist/`.
- `EXPO_PUBLIC_API_URL=https://api.odos-api.com` au moment du build web prod.
- Fallback SPA nginx pour les routes profondes d'`expo-router` (cf. D).

### C — Backend : CORS

- Ajouter `https://app.odos.world` à la regex `CORS_ALLOW_ORIGIN` (env prod du VPS, consommée par
  `config/packages/nelmio_cors.yaml`). **Pas de wildcard.**

### D — VPS nginx : vhost + déploiement

- **DNS :** A record `app.odos.world` → IP VPS.
- **Vhost** `deploy/nginx/app.odos.world.conf` :
  ```nginx
  server {
      listen 80;
      server_name app.odos.world;
      root /var/www/odos-web;
      index index.html;
      location /.well-known/acme-challenge/ { root /var/www/certbot; }
      location / { try_files $uri $uri/ /index.html; }   # fallback SPA
  }
  ```
  Puis HTTPS via `certbot -d app.odos.world`.
- **Déploiement :** `pnpm build:web` → rsync/scp `dist/` vers `/var/www/odos-web`. Optionnel :
  job GitHub Actions (le repo a déjà `.github/workflows/ci.yml`).

---

## 5. Risques & non-régression ⚠️

L'enjeu central : **ne pas dégrader le mobile** en ajoutant la cible web, et garantir une qualité
web acceptable. Chaque risque ci-dessous a une parade.

| # | Risque | Impact | Parade / mitigation |
|---|--------|--------|---------------------|
| R1 | `maplibre-gl` (lib DOM) fuit dans le bundle **natif** | Crash APK au démarrage | Import isolé dans `MapLibreWeb.tsx`, résolu par metro **uniquement** sur `platform === 'web'`. Vérif : build/run Android + inspection du bundle (aucune ref `maplibre-gl`). |
| R2 | `expo-notifications` (push) non supporté pareil sur web | Exception au boot web | **Guard `Platform.OS !== 'web'`** sur les hooks push (`useNotificationResponse`, `useAppIconBadge`, enregistrement token, badge). Aucune modif du chemin natif. |
| R3 | Régression mobile via modifs partagées | Casse fonctionnelle Android | **Aucune logique métier modifiée** : on n'ajoute que des branches web (`Platform.OS`) et un fichier carte web. Lancer `pnpm test:ci` + `pnpm lint` avant/après. |
| R4 | Parité carte incomplète (zones visitées, parcours, callout) | UX web dégradée | L'adapter réplique **exactement** les 5 composants consommés ; recette visuelle sur `/map` et `/parcours/[id]` (pins, callout, recenter, calque visité, tracé, light/dark). |
| R5 | Mixed-content (web HTTPS → API HTTP) | App web non fonctionnelle | Pré-requis bloquant : HTTPS API (certbot) **avant** mise en ligne. |
| R6 | CORS trop permissif | Faille sécurité | Origin **exact** `https://app.odos.world` dans la regex, jamais de wildcard (respecte la consigne du fichier nelmio). |
| R7 | RTL arabe cassé sur web | UX dégradée AR | `I18nManager.forceRTL` ne s'applique pas pareil sur web ; vérifier le rendu AR et compléter le CSS `direction: rtl` si besoin (lié à la migration i18n en cours). |
| R8 | Auth sociale native (Apple/Google) inopérante sur web | — | Déjà neutralisée par `SOCIAL_AUTH_ENABLED=false`. Pas de régression. |
| R9 | `expo-secure-store` sur web | Stockage tokens | Fallback `localStorage` déjà en place ; revérifier login/refresh sur web. |
| R10 | Routes profondes `expo-router` → 404 au refresh | Navigation cassée | Fallback SPA nginx `try_files … /index.html`. Test : refresh sur une route profonde. |
| R11 | Responsive desktop (UI pensée mobile-portrait) | UX desktop médiocre | Web app livrée en **layout mobile** d'abord (largeur contrainte / centré) ; responsive desktop = itération ultérieure, hors périmètre v1. |
| R12 | Géoloc fine web | Carte/exploration | `expo-location` utilise l'API navigateur (nécessite HTTPS — satisfait) ; vérifier la demande de permission web. |
| R13 | Perf bundle web (carte + tfjs + i18n) | Temps de chargement | Lazy-load la carte si besoin ; mesurer le poids du `dist/`. Non bloquant v1. |

### Principe de non-régression

> **On n'écrit que du code additif et conditionné `Platform.OS === 'web'`.** Aucun chemin natif
> n'est modifié dans sa logique. Tout partage de composant reste iso-comportement sur mobile.

## 6. Adaptation web spécifique

- **Layout** : conserver le rendu mobile (colonne portrait), centré sur desktop. Pas de refonte
  desktop en v1.
- **Inputs** : clavier/souris (hover, focus) — vérifier les `Pressable`/`onPress` (déjà
  compatibles RN-web).
- **i18n / RTL** : FR/EN OK ; AR à recetter (direction RTL en CSS web).
- **Navigation** : URLs web (au lieu du scheme `odosfront://`) gérées par `expo-router`.

## 7. Vérification (recette end-to-end)

1. **Carte web (dev)** : `pnpm web` → écran `/map` : carte maplibre-gl, pins cliquables, callout,
   recentrage, calque zones visitées, tracé parcours, bascule light/dark.
2. **Build statique** : `pnpm build:web` → `dist/` sans erreur ; `npx serve dist` + navigation sur
   routes profondes (refresh → pas de 404).
3. **Non-régression native** : `pnpm test:ci` (force-exit), `pnpm lint`, build/run Android
   (carte native intacte, `maplibre-gl` absent du bundle natif).
4. **API HTTPS + CORS** : depuis la web app déployée → login + activités/reco + une requête
   authentifiée (favoris) sans erreur CORS ni mixed-content (console navigateur propre).
5. **Garde-fous web** : démarrage web sans exception `expo-notifications` ; login/refresh OK
   (secure-store → localStorage).

## 8. Rollback

- La cible web est **isolée** : pour annuler, retirer le vhost `app.odos.world` (nginx) et l'origin
  CORS. Le code (fichier carte web + guards `Platform.OS`) reste inerte côté mobile et n'impacte
  pas les builds EAS.

---

## 9. Fichiers concernés

| Fichier | Action |
|---------|--------|
| `odos-front/components/map/MapLibreWeb.tsx` | **Créer** — adapter maplibre-gl |
| `odos-front/metro.config.js` | Pointer le resolver web vers `MapLibreWeb.tsx` |
| `odos-front/package.json` | `maplibre-gl` + script `build:web` |
| Hooks push (`useNotificationResponse.ts`, `useAppIconBadge.ts`, enregistrement token) | Guard `Platform.OS !== 'web'` |
| `config/packages/nelmio_cors.yaml` (via env `CORS_ALLOW_ORIGIN`) | Autoriser `https://app.odos.world` |
| `deploy/nginx/app.odos.world.conf` | **Créer** — vhost statique + SPA fallback |
| `deploy/nginx/api.odos-api.com.conf` | Activer HTTPS (certbot) |

---

## 10. Étapes manuelles à réaliser (pas à pas)

> Le code est prêt. Voici, dans l'ordre, ce qu'il **te** reste à faire (infra + déploiement).
> Pré-requis : accès SSH au VPS (sudo) et accès au panneau DNS du domaine `odos.world`.

### Étape 0 — Installer les nouvelles dépendances en local (une fois)

Déjà fait sur cette machine. Sur toute autre machine / en CI :
```bash
cd odos-front
pnpm install      # récupère maplibre-gl + @types/react-dom (déjà dans package.json)
```

### Étape 1 — HTTPS de l'API (pré-requis bloquant)

Sans ça, la web app (HTTPS) ne pourra pas appeler l'API. Sur le VPS :
```bash
sudo certbot --nginx -d api.odos-api.com
sudo nginx -t && sudo systemctl reload nginx
# Vérifie :
curl -I https://api.odos-api.com        # doit répondre 200/301, certificat valide
```

### Étape 2 — DNS du sous-domaine web

Chez ton registrar / panneau DNS de `odos.world`, crée :
```
Type: A     Nom: app     Valeur: <IP publique du VPS>     TTL: 3600
```
Attends la propagation, puis vérifie :
```bash
nslookup app.odos.world        # doit renvoyer l'IP du VPS
```

### Étape 3 — Autoriser la web app dans le CORS de l'API

Sur le VPS, dans le fichier d'env **prod** de l'API (celui qui définit `CORS_ALLOW_ORIGIN`,
hors-repo) — ajoute l'origin exact de la web app. Deux cas :
- Si seule la web app appelle l'API en prod :
  ```
  CORS_ALLOW_ORIGIN='^https://app\.odos\.world$'
  ```
- Si tu veux garder d'autres origines, mets-les en alternatives regex :
  ```
  CORS_ALLOW_ORIGIN='^https://(app\.odos\.world|autre\.exemple\.com)$'
  ```
Puis recharge l'API (selon ton setup Docker) :
```bash
cd ~/ODos
docker compose exec php php bin/console cache:clear
docker compose restart php        # ou `up -d` selon ton déploiement
```
> ⚠️ **Jamais de wildcard `*`** : l'API sert des requêtes authentifiées (JWT).

### Étape 4 — Builder la web app

En local (ou en CI), depuis `odos-front/` :
```bash
EXPO_PUBLIC_API_URL=https://api.odos-api.com pnpm build:web
```
> ⚠️ La variable `EXPO_PUBLIC_API_URL` est **figée dans le build** : elle DOIT pointer vers
> l'API HTTPS de prod. Le résultat est le dossier `odos-front/dist/`.

### Étape 5 — Déployer les fichiers sur le VPS

```bash
# Depuis ta machine, à la racine de odos-front :
rsync -avz --delete dist/ <user>@<IP_VPS>:/var/www/odos-web/
# (ou scp -r dist/* … si rsync indisponible)
```
Sur le VPS, assure-toi que nginx peut lire le dossier :
```bash
sudo chown -R www-data:www-data /var/www/odos-web
```

### Étape 6 — Activer le vhost nginx

Sur le VPS :
```bash
sudo cp ~/ODos/deploy/nginx/app.odos.world.conf /etc/nginx/sites-available/app.odos.world
sudo ln -sf /etc/nginx/sites-available/app.odos.world /etc/nginx/sites-enabled/
sudo mkdir -p /var/www/odos-web
sudo nginx -t && sudo systemctl reload nginx
```

### Étape 7 — HTTPS du sous-domaine web

```bash
sudo certbot --nginx -d app.odos.world
sudo nginx -t && sudo systemctl reload nginx
```

### Étape 8 — Recette finale (navigateur)

Ouvre `https://app.odos.world` et vérifie :
1. La page se charge (pas d'écran blanc), console navigateur **sans erreur CORS / mixed-content**.
2. **Login** fonctionne (token stocké, `/api/me` OK).
3. Écran **carte** (`/search`) : la carte maplibre-gl s'affiche, pins cliquables, callout au tap,
   bouton recentrer, calque zones visitées (si activé), bascule clair/sombre.
4. **Parcours** (`/parcours/[id]`) : carte + tracé + pins numérotés.
5. **Refresh** sur une route profonde (ex. `/activity/123`) → pas de 404 (fallback SPA).

### (Optionnel) Étape 9 — Automatiser le déploiement

Ajouter un job GitHub Actions (`.github/workflows/`) : `pnpm build:web` puis `rsync` vers le VPS
(via secret SSH). Non requis pour la v1 — le déploiement manuel (étapes 4-5) suffit.

### Redéploiements futurs (résumé)

Une fois l'infra en place, publier une nouvelle version = **étapes 4 + 5** uniquement :
```bash
EXPO_PUBLIC_API_URL=https://api.odos-api.com pnpm build:web
rsync -avz --delete dist/ <user>@<IP_VPS>:/var/www/odos-web/
```
