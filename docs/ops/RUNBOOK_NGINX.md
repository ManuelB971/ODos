# Runbook — nginx hôte (HTTPS versionné, HSTS, CSP, limitation de débit)

Jusqu'ici le repo ne contenait que les blocs `listen 80` ; les blocs 443 avaient été
écrits par `certbot --nginx` directement sur le VPS, donc la prod dérivait du repo.
`deploy/nginx/` contient maintenant la configuration **complète** :

| Fichier du repo | Sur le VPS | Contenu |
|-----------------|------------|---------|
| `conf.d/odos-common.conf` | `/etc/nginx/conf.d/odos-common.conf` | `server_tokens off`, `log_format odos_metrics`, zones `limit_req` |
| `snippets/odos-proxy-api.conf` | `/etc/nginx/snippets/odos-proxy-api.conf` | `proxy_pass` vers l'API Docker |
| `snippets/odos-security-headers-web.conf` | `/etc/nginx/snippets/odos-security-headers-web.conf` | HSTS, CSP, Permissions-Policy de la web app |
| `api.odos-api.com.conf` | `/etc/nginx/sites-available/api.odos-api.com` | 80 → 443, HSTS, `limit_req` sur les routes d'authentification |
| `app.odos.world.conf` | `/etc/nginx/sites-available/app.odos.world` | 80 → 443, en-têtes de sécurité, cache des assets |

Routes limitées (chemins vérifiés dans `odos-back`) :

| Zone | Débit par IP | Routes |
|------|--------------|--------|
| `odos_auth` | 20/min, rafale 20 | `POST /api/login`, `/api/token/refresh`, `/api/auth/google`, `/api/auth/apple`, `/login` (EasyAdmin) |
| `odos_signup` | 6/min, rafale 10 | `POST /api/auth/password-reset/request` et `/confirm`, `POST /api/users` (inscription) |

Au-delà : `429`. Symfony garde ses propres limites (`rate_limiter.yaml`, plus strictes) ;
nginx coupe les rafales avant PHP. Seuils volontairement larges pour une classe derrière une seule IP.

Index : [docs/ops/](.)

---

## 1. Avant de remplacer : comparer avec la prod

Snapshot Contabo d'abord. Puis, en `odos` :

```bash
sudo cp -a /etc/nginx "/root/nginx-avant-ops-$(date +%F)"
sudo certbot certificates          # noms et chemins : live/api.odos-api.com, live/app.odos.world ?
ls -l /etc/letsencrypt/options-ssl-nginx.conf /etc/letsencrypt/ssl-dhparams.pem
cd /home/deploy/ODos               # à jour après le merge
sudo diff -u /etc/nginx/sites-available/api.odos-api.com deploy/nginx/api.odos-api.com.conf
sudo diff -u /etc/nginx/sites-available/app.odos.world  deploy/nginx/app.odos.world.conf
ls /etc/nginx/conf.d/ /etc/nginx/sites-enabled/
```

À vérifier dans le diff (et à reporter dans le repo par une PR si c'est voulu) :

- chemins `ssl_certificate` différents (certificat commun aux deux domaines, suffixe `-0001`…) ;
- `ssl_dhparam` absent sur le VPS → générer `sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048`
  ou retirer la ligne ;
- un `include` CrowdSec (bouncer nginx) ou autre réglage ajouté à la main.

## 2. Installer

```bash
cd /home/deploy/ODos
sudo install -m 644 deploy/nginx/conf.d/odos-common.conf /etc/nginx/conf.d/odos-common.conf
sudo install -m 644 deploy/nginx/snippets/odos-proxy-api.conf deploy/nginx/snippets/odos-security-headers-web.conf /etc/nginx/snippets/
sudo install -m 644 deploy/nginx/api.odos-api.com.conf /etc/nginx/sites-available/api.odos-api.com
sudo install -m 644 deploy/nginx/app.odos.world.conf   /etc/nginx/sites-available/app.odos.world
sudo ln -sf /etc/nginx/sites-available/api.odos-api.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/app.odos.world   /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` en échec : rien n'est rechargé, la prod continue avec l'ancienne config.
Corriger, ou revenir en arrière (§ 5).

## 3. Vérifier

```bash
# En-têtes : HSTS, CSP, pas de version dans Server, pas de X-Powered-By.
curl -sI https://app.odos.world/ | grep -iE '^(server|strict-transport|content-security|x-frame|permissions)'
curl -sI https://app.odos.world/_expo/ | grep -iE '^(strict-transport|cache-control)'
curl -sI https://api.odos-api.com/api/health | grep -iE '^(server|strict-transport|x-powered-by)'
curl -sI http://api.odos-api.com/api/health | head -n 1     # 301

# Limitation de débit, depuis le VPS en passant par 127.0.0.1 (CrowdSec ignore
# 127.0.0.1 : le test ne bannit pas l'IP publique du VPS).
for i in $(seq 1 30); do
  curl -s -o /dev/null -w '%{http_code}\n' --resolve api.odos-api.com:443:127.0.0.1 \
    -X POST -H 'Content-Type: application/json' -d '{}' https://api.odos-api.com/api/token/refresh
done | sort | uniq -c        # attendu : ~21 × 401/400 puis des 429
sudo grep 'limiting requests' /var/log/nginx/error.log | tail -n 2

# Renouvellement des certificats toujours possible avec la config versionnée :
sudo certbot renew --dry-run

# Logs de métriques (sans IP) :
sudo tail -n 2 /var/log/nginx/odos-metrics-api.log /var/log/nginx/odos-metrics-web.log
```

Dans un navigateur (navigation privée) : `https://app.odos.world`, connexion, puis la carte.
Console DevTools : **aucune** ligne « Refused to … because it violates the Content Security Policy ».
La carte doit afficher fonds, rues et points (worker `/maplibre-gl-worker.js` + tuiles OpenFreeMap).
La CSP a été rejouée localement sur l'export web avant la PR (aucune violation, worker
module chargé, tuiles `.pbf` récupérées depuis un worker).

## 4. HSTS

`max-age=31536000; includeSubDomains`, sans `preload`. Une fois l'en-tête reçu, le
navigateur refuse le HTTP pendant un an pour ce domaine : ne pas désactiver HTTPS
ensuite. Pas d'inscription à la liste preload (difficile à défaire).

## 5. Retour arrière

```bash
# CSP seulement (une fonctionnalité cassée par la CSP) : passer en rapport seul.
sudo sed -i 's/add_header Content-Security-Policy /add_header Content-Security-Policy-Report-Only /' \
  /etc/nginx/snippets/odos-security-headers-web.conf
sudo nginx -t && sudo systemctl reload nginx

# Tout : restaurer la copie du § 1.
sudo rsync -a --delete "/root/nginx-avant-ops-$(date +%F)/" /etc/nginx/
sudo nginx -t && sudo systemctl reload nginx
```

Puis corriger la CSP dans `deploy/nginx/snippets/odos-security-headers-web.conf` par une PR.
