# OAuth Google & Apple — configuration prod

Guide pas à pas pour activer la connexion sociale sur **ODOS** (Expo + Symfony).

Liens : [API prod](PROD_API_DOMAINE.md) · [audit DA](DA_APP_GAP.md)

---

## 1. Migration base de données (VPS)

Sur le VPS, après `git pull` :

```bash
cd ~/ODos   # ou /opt/odos
docker compose exec -T php php bin/console doctrine:migrations:migrate --no-interaction --env=prod
```

Migration concernée : `Version20260531120000` — colonnes `google_id`, `apple_id` sur `user`.

Vérification :

```bash
docker compose exec -T postgres psql -U odos -d odos -c '\d "user"' | grep -E 'google_id|apple_id'
```

---

## 2. Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) → projet **ODOS** (ou en créer un).
2. **APIs & Services → OAuth consent screen**
   - Type : **External** (ou Internal si Google Workspace)
   - App name : `ODOS`
   - Support email : `support@odos.world`
   - Scopes : `email`, `profile`, `openid`
3. **Credentials → Create credentials → OAuth client ID**

Créer **3 clients** (recommandé Expo) :

| Type | Usage | Redirect URI / notes |
|------|--------|----------------------|
| **Web application** | Expo Auth Session + vérif backend | Authorized redirect : `https://auth.expo.io/@manuel971/odos` (adapter slug/owner) |
| **Android** | APK EAS | Package `com.odos.front` + SHA-1 du keystore EAS |
| **iOS** | Build iOS | Bundle ID `com.odos.front` |

Récupérer les **Client IDs** (`*.apps.googleusercontent.com`).

### Backend (VPS `~/odos-config/.env`)

```dotenv
# Tous les client IDs autorisés, séparés par des virgules
GOOGLE_OAUTH_CLIENT_IDS=WEB_ID.apps.googleusercontent.com,ANDROID_ID.apps.googleusercontent.com,IOS_ID.apps.googleusercontent.com
```

Redémarrer PHP :

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build php
```

### Frontend (EAS + local)

`odos-front/.env` (dev) ou **secrets EAS** une fois les clients Google créés :

```dotenv
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=WEB_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=IOS_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=ANDROID_ID.apps.googleusercontent.com
```

> **Ne pas** mettre de chaînes vides `""` dans `eas.json` — EAS les rejette.  
> Soit tu ajoutes les vraies valeurs dans `eas.json` → `build.*.env`, soit tu utilises :

```bash
cd odos-front
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "xxx.apps.googleusercontent.com"
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value "yyy.apps.googleusercontent.com"
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value "zzz.apps.googleusercontent.com"
```

Les secrets projet sont injectés automatiquement à chaque build EAS.

SHA-1 Android (EAS) :

```bash
cd odos-front
eas credentials -p android
```

---

## 3. Apple Developer — Sign in with Apple

1. [developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers & Profiles**
2. **Identifiers** → App ID `com.odos.front` → activer **Sign In with Apple**
3. Pas de Service ID séparé nécessaire pour l’app native iOS (identityToken aud = bundle ID)

### Backend

```dotenv
APPLE_CLIENT_ID=com.odos.front
```

### Frontend

Déjà configuré dans `app.json` :

- `"usesAppleSignIn": true`
- Plugin `expo-apple-authentication`

Rebuild iOS obligatoire après activation :

```bash
cd odos-front
eas build --platform ios --profile preview
```

---

## 4. Endpoints API

| Méthode | URL | Body |
|---------|-----|------|
| POST | `/api/auth/google` | `{ "idToken": "..." }` |
| POST | `/api/auth/apple` | `{ "identityToken": "...", "email": "..." }` |

Réponse (identique à `/api/login`) :

```json
{ "token": "...", "refresh_token": "..." }
```

Rate limit : 10 requêtes / minute / IP.

---

## 5. Checklist prod

- [ ] Migration `google_id` / `apple_id` exécutée
- [ ] `GOOGLE_OAUTH_CLIENT_IDS` renseigné (web au minimum)
- [ ] `APPLE_CLIENT_ID=com.odos.front`
- [ ] EAS : `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` dans le profil de build
- [ ] Test login Google sur build preview (pas Expo Go seul si clients natifs requis)
- [ ] Test Sign in with Apple sur appareil iOS réel
- [ ] Compte existant email : liaison auto si même email Google

---

## 6. Dépannage

| Symptôme | Cause probable |
|----------|----------------|
| `Connexion Google non configurée sur le serveur` | `GOOGLE_OAUTH_CLIENT_IDS` vide |
| `Audience Google non autorisée` | Client ID du token absent de la liste backend |
| `Sign in with Apple indisponible` | Simulateur / Android / build sans entitlement |
| `Email Apple indisponible` | 2ᵉ connexion Apple sans email — utiliser compte email ou keychain reset |

---

*Mai 2026 — endpoints `SocialAuthController`, front `hooks/useSocialAuth.ts`.*
