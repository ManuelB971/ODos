# 🚀 Guide de Mise en Production — ODOS

> **Stack :** Symfony 7.4 (API Platform + Lexik JWT) · React Native / Expo · MySQL/PostgreSQL

---

## Phase 1 — Backend (Symfony)

### Étape 1 : Choisir un hébergeur

| Hébergeur | Prix | Simplicité | Recommandé si |
|---|---|---|---|
| [Railway.app](https://railway.app) | ~5 €/mois | ⭐⭐⭐ Très simple | Débutant, projet scolaire |
| [Render.com](https://render.com) | Gratuit limité / ~7 € | ⭐⭐⭐ Simple | MVP, projet perso |
| VPS OVH / Hetzner | ~5-10 €/mois | ⭐⭐ Technique | Contrôle total |

> 💡 **Recommandation :** Commence par **Railway** ou **Render** pour aller vite.

---

### Étape 2 : Variables d'environnement sur le serveur

Ne jamais commiter le `.env` avec de vraies valeurs. Configurer ces variables directement dans le dashboard de l'hébergeur :

```dotenv
APP_ENV=prod
APP_SECRET=<chaine_aleatoire_tres_longue_32_chars>
DATABASE_URL=mysql://user:password@host:3306/odos_prod
JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=<ta_passphrase_securisee>
CORS_ALLOW_ORIGIN=https://odos.com   # URL publique de ton Front
```

> ⚠️ Vérifier que `config/jwt/private.pem` et `public.pem` sont bien dans le `.gitignore` !

---

### Étape 3 : Générer les clés JWT sur le serveur

À faire UNE FOIS directement sur le serveur (ou via le CLI de l'hébergeur) :

```bash
php bin/console lexik:jwt:generate-keypair
```

---

### Étape 4 : Préparer Symfony pour la prod

```bash
# Installer les dépendances sans les packages de dev
composer install --optimize-autoloader --no-dev

# Vider le cache en mode prod
php bin/console cache:clear --env=prod

# Exécuter les migrations
php bin/console doctrine:migrations:migrate --no-interaction
```

---

### Étape 5 : Activer HTTPS / TLS

> **Obligatoire** pour protéger les tokens JWT en transit.

- **Railway / Render** : HTTPS est **automatique**, rien à faire.
- **VPS** : Installer [Caddy](https://caddyserver.com/) (plus simple) ou **Nginx + Certbot** :

```bash
# Certbot + Nginx (sur Ubuntu/Debian)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.odos.com
```

---

## Phase 2 — Frontend (Expo)

### Étape 6 : Installer EAS CLI et se connecter

```bash
npm install -g eas-cli
eas login
eas build:configure
```

---

### Étape 7 : Configurer les variables d'environnement

Créer un fichier `.env.production` à la racine de `odos-front` :

```dotenv
EXPO_PUBLIC_API_URL=https://api.odos.com
```

> ℹ️ Cette valeur est **figée au moment du build**. Si l'URL du back change, il faut rebuilder l'app.

---

### Étape 8 : Builder l'application mobile

```bash
# Android (APK ou AAB pour le Play Store)
eas build --platform android --profile production

# iOS (nécessite un compte Apple Developer = 99 $/an)
eas build --platform ios --profile production
```

---

### Étape 9 : (Optionnel) Déployer la version Web

```bash
# Générer le bundle web statique
npx expo export --platform web
```

| Hébergeur web | Prix | Commande |
|---|---|---|
| [Vercel](https://vercel.com) | Gratuit | `npx vercel deploy` |
| [Netlify](https://netlify.com) | Gratuit | glisser/déposer le dossier `dist/` |
| GitHub Pages | Gratuit | via GitHub Actions |

---

## Phase 3 — Checklist pré-lancement

### Backend ✅
- [ ] `APP_ENV=prod` configuré
- [ ] **HTTPS** activé (certificat valide)
- [ ] Migrations exécutées sans erreur
- [ ] Pas de fixtures/données de test en prod
- [ ] Clés JWT générées et hors Git
- [ ] `CORS_ALLOW_ORIGIN` limité à l'URL du Front uniquement
- [ ] Logs configurés (Monolog → fichier ou service externe)
- [ ] Endpoint `/api/login` répond bien en HTTPS

### Frontend ✅
- [ ] `EXPO_PUBLIC_API_URL` pointe vers `https://api.odos.com`
- [ ] Build EAS créé avec le profil `production`
- [ ] Aucun `console.log` de debug sensible
- [ ] Icône de l'app configurée (`app.json` → `icon`)
- [ ] Écran de démarrage (splash screen) configuré
- [ ] APK testé sur un vrai appareil Android

---

## Ordre d'exécution recommandé

```
1.  Déployer Symfony + BDD sur Railway ou Render
2.  Générer les clés JWT sur le serveur
3.  Lancer les migrations Doctrine
4.  Vérifier que https://api.odos.com/api/login répond (code 401 = OK)
5.  Créer .env.production côté Expo avec la bonne URL HTTPS
6.  Builder l'app avec EAS (Android en premier, plus simple)
7.  Tester l'APK sur un vrai téléphone
8.  (Optionnel) Déployer la version Web sur Vercel/Netlify
9.  (Optionnel) Soumettre sur Google Play / App Store
```

---

## Ressources utiles

- [Documentation EAS Build](https://docs.expo.dev/build/introduction/)
- [Documentation Lexik JWT Bundle](https://github.com/lexik/LexikJWTAuthenticationBundle)
- [Railway — Déployer un projet PHP](https://docs.railway.app/guides/php)
- [Render — Déployer PHP/Symfony](https://render.com/docs/deploy-symphony)
- [Certbot — HTTPS gratuit avec Let's Encrypt](https://certbot.eff.org/)
