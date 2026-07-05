# Audit sécurité des endpoints API — angle « version web »

_Date : 2026-07-05 — périmètre : surface API `/api` consommée par la SPA web (`app.odos.world`, react-native-web) et l'app native._

## Verdict global

**Base solide.** L'authentification est garantie par défaut (firewall attrape-tout), le CORS n'est pas ouvert, la surface publique est rate-limitée et le contrôle d'appartenance (ownership) est présent dans les contrôleurs. **Un seul risque élevé propre au web : le stockage des jetons en `localStorage`** (exposition XSS). Un point de config prod à verrouiller (CORS) et un durcissement (CSP + TTL) recommandés.

| Domaine | État |
|--------|------|
| Auth baseline (`/api`) | ✅ Bon |
| Autorisation / ownership (IDOR) | ✅ Bon (pattern sain) — passe dédiée recommandée |
| CORS | ✅ OK — ⚠️ verrouiller `CORS_ALLOW_ORIGIN` en prod |
| Rate-limiting surface publique | ✅ Bon |
| CSRF | ✅ N/A sur `/api` (JWT en header) |
| **Stockage jeton web** | 🔴 **`localStorage` (XSS)** |

---

## 1. Contrôle d'accès — baseline

Firewall [security.yaml](../odos-back/config/packages/security.yaml) : règle attrape-tout `- { path: ^/api, roles: IS_AUTHENTICATED_FULLY }` → **tout endpoint `/api` exige un jeton valide**, sauf exceptions explicites `PUBLIC_ACCESS`.

**Ressources API Platform (3) :**
- **Activity** — écritures verrouillées `ROLE_ADMIN`, lecture publique (corrigé, cf. AUDIT_FORUM_ACTIVITY_SECURITY.md). ✅
- **Category** — `Get` + `GetCollection` uniquement (lecture seule), publique en GET. Pas d'écriture exposée. ✅
- **User** — `GetCollection` (ADMIN), `/me` (USER), `Get`/`Patch`/`Delete` (`ADMIN or object == user`), `Post` public = inscription voulue. ✅

**Contrôleurs custom (~30)** : chaque route appelle `denyAccessUnlessGranted('ROLE_USER')` (ou `requireUser()`) puis agit sur l'utilisateur **issu du token**, pas d'un id client. Les suppressions/éditions vérifient l'auteur (`isAuthor || ROLE_ADMIN`, ex. Forum). ✅

## 2. Surface publique (sans authentification)

Endpoints en `PUBLIC_ACCESS` — c'est l'attaque-surface non authentifiée :

| Endpoint | Protection |
|----------|-----------|
| `POST /api/login` | Rate limit **5/min/IP** + JWT failure handler |
| `POST /api/users` (inscription) | Rate limit **3/h/IP** + validation forte |
| `POST /api/auth/google` · `/apple` | Rate limit social |
| `POST /api/auth/password-reset/{request,confirm}` | Rate limit dédié |
| `POST /api/token/refresh` | Refresh token en base |
| `GET /api/{themes,categories,activities,…/comments,…/rating}` | Lecture seule |
| `GET /api/docs`, `/api/health` | ⚠️ voir ci-dessous |

Rate-limiting confirmé dans [ApiRateLimitSubscriber](../odos-back/src/EventSubscriber/ApiRateLimitSubscriber.php). ✅

> ⚠️ **`/api/docs` public** : divulgue le schéma complet de l'API en prod (aide un attaquant à cartographier). Impact faible, mais envisager de le restreindre à `ROLE_ADMIN` ou au profil `dev`.

## 3. CORS (spécifique navigateur)

[nelmio_cors.yaml](../odos-back/config/packages/nelmio_cors.yaml) : `allow_origin: [%env(CORS_ALLOW_ORIGIN)%]`, `origin_regex: true`, **pas de wildcard**, `allow_credentials` **non activé** (correct : les jetons transitent par l'en-tête `Authorization`, pas par cookie).

> ⚠️ **Action prod** : le défaut `.env.example` (`localhost|127|192.168|10.x`) est un réglage **dev**. En prod, `CORS_ALLOW_ORIGIN` doit valoir `^https://app\.odos\.world$`. Un défaut trop large n'ouvre pas à `evil.com` (non matché), mais autoriserait des origines locales — à verrouiller.

## 4. 🔴 Risque #1 web : jetons en `localStorage`

Sur web, `safeStorage` retombe sur `localStorage` ([scripts/api.ts:35-48](../odos-front/scripts/api.ts#L35)) car `expo-secure-store` est indisponible dans le navigateur. Y sont stockés **l'access token (TTL `JWT_TOKEN_TTL=3600` = 1h)** et **le refresh token (`JWT_REFRESH_TTL=2592000` = 30j, `ttl_update: true` → glissant)**.

**Conséquence :** toute faille **XSS** sur `app.odos.world` permet d'exfiltrer les deux jetons. Le refresh glissant → prise de compte **persistante** (renouvelable indéfiniment). C'est le vecteur le plus critique côté web, indépendant de la solidité des endpoints.

**Atténuations (par ordre de rapport/coût) :**
1. **CSP stricte** sur le build web (réduit drastiquement la surface XSS) — mesure la plus rentable.
2. **Raccourcir l'access TTL** (ex. 900s) — le commentaire parle de « TTL court » mais 3600 reste long pour du `localStorage`.
3. À terme : servir les jetons web en **cookie `httpOnly` + `SameSite`** (inaccessibles au JS) — implique CORS `credentials` + protection CSRF ; refonte plus lourde, réservée au web.
4. Bornage/rotation stricte du refresh token (révocation à la moindre anomalie).

## 5. CSRF

`/api` est **stateless** (JWT en en-tête, pas de cookie de session) → **pas de vecteur CSRF**. Le back-office admin utilise une session avec `form_login: enable_csrf: true`. ✅

## 6. IDOR — pattern & angle mort

Pattern sain : l'autorisation dérive toujours de l'utilisateur du **token**, jamais d'un id fourni par le client. Les 3 lectures de `userId` depuis la requête ([ChatController](../odos-back/src/Controller/ChatController.php#L71), [GroupController](../odos-back/src/Controller/GroupController.php#L226), [ParcoursController](../odos-back/src/Controller/ParcoursController.php#L266)) désignent la **cible** d'une action (messager / inviter / partager), pas l'autorisateur.

> **Recommandé (non fait ici)** : passe IDOR dédiée sur les gros contrôleurs (`GroupController` 14 routes, `ParcoursController` 13 routes) pour confirmer que chaque mutation sur une ressource `{id}` vérifie l'appartenance/adhésion, comme le fait déjà le forum.

## Recommandations priorisées

1. 🔴 **Web** : CSP stricte sur le build web + raccourcir `JWT_TOKEN_TTL`. (mitige le risque `localStorage`)
2. 🟠 **Prod** : fixer `CORS_ALLOW_ORIGIN=^https://app\.odos\.world$`.
3. 🟡 Restreindre `/api/docs` hors dev.
4. 🟡 Passe IDOR ciblée sur `Group`/`Parcours`.
