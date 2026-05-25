# Réponse aux violations de données

Que faire si des données personnelles sont compromises. Délai CNIL : **72 h** si risque pour les personnes.

Index : [docs/README.md](README.md) · Registre : [RGPD_registre.md](RGPD_registre.md)

---

## Qui fait quoi

| Rôle | Personne | Contact |
|------|----------|---------|
| Responsable incident | _À compléter — ex. Manuel_ | contact@odos-app.fr |
| Suppléant | _À compléter_ | contact@odos-app.fr |
| Responsable de traitement | ODOS | contact@odos-app.fr |

---

## 1. Détection

Sources possibles :

- alertes Wazuh / SIEM (`docker-compose.wazuh.yml`)
- logs Symfony (`var/log/prod.log`), Nginx (`odos_error.log`)
- signalement utilisateur : contact@odos-app.fr
- monitoring externe (uptime, 5xx, accès admin bizarres)

---

## 2. Qualifier (dans les 4 h)

| Question | Action |
|----------|--------|
| Données perso touchées ? | Lister : emails, commentaires, tokens, logs admin |
| Violation confirmée ou simple suspicion ? | Si confirmée → activer la cellule incident |
| Risque élevé pour les personnes ? | Détermine notification CNIL **et** utilisateurs |

---

## 3. Confiner tout de suite

1. Révoquer les tokens compromis — purge `refresh_tokens`, rotation clés JWT si fuite de la clé privée
2. Bloquer IP / comptes admin suspects (pare-feu Contabo, désactivation compte)
3. Sauvegarder les preuves (logs, dumps horodatés) **avant** toute purge
4. Changer mots de passe admin et secrets `.env` exposés

```bash
docker compose exec -T php php bin/console app:data-retention:purge --env=prod
```

---

## 4. Évaluer (dans les 24 h)

Noter dans un registre d'incident interne :

- date/heure de début estimée
- vecteur (bruteforce, fuite backup, XSS…)
- nombre de personnes concernées (approx.)
- données exposées
- mesures déjà déployées

---

## 5. Notifier la CNIL (dans les 72 h)

Si risque pour les droits et libertés :

- https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles
- ou notifications@cnil.fr

Contenu : description, catégories de données, nombre approximatif de personnes, conséquences probables, mesures prises ou prévues.

---

## 6. Prévenir les personnes concernées

Si **risque élevé** : email ou notification in-app, en langage clair :

- nature de l'incident
- données touchées
- mesures recommandées (changement mot de passe, vigilance)
- contact : contact@odos-app.fr

---

## 7. Après coup (dans les 2 semaines)

- correctifs techniques (patch, CORS, rate limit, MFA)
- mise à jour du [registre](RGPD_registre.md) si le traitement change
- mise à jour de l'[audit RGPD](RGPD_AUDIT_2026.md) si nouvel écart
- retour d'expérience interne

---

## Contacts

| | |
|---|---|
| CNIL | notifications@cnil.fr |
| Contabo | support client |
| ODOS | contact@odos-app.fr |

---

## Registre des incidents

Fichier interne (hors dépôt public si données sensibles) :

| Date | Réf. | Gravité | CNIL notifiée | Personnes informées | Clôture |
|------|------|---------|---------------|---------------------|---------|
| — | — | — | — | — | — |
