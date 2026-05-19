# Procédure de réponse aux violations de données — ODOS

_Document interne — art. 33-34 RGPD. Délai réglementaire : **72 heures** pour notifier la CNIL si risque pour les droits des personnes._

## 1. Détection

Sources possibles :

- Alertes **Wazuh** / SIEM (`docker-compose.wazuh.yml`)
- Logs applicatifs (`var/log/prod.log`), Nginx (`odos_error.log`)
- Signalement utilisateur : contact@odos-app.fr
- Monitoring externe (uptime, 5xx, accès admin anormaux)

## 2. Qualification (≤ 4 h)

| Question | Action |
|----------|--------|
| Données personnelles concernées ? | Lister : emails, commentaires, tokens, logs admin |
| Violation confirmée ou suspicion ? | Si confirmée → activer cellule incident |
| Risque élevé pour les personnes ? | Détermine notification CNIL **et** utilisateurs |

**Responsable incident** : éditeur ODOS (contact@odos-app.fr) — à compléter avec nom / suppléant.

## 3. Confinement immédiat

1. Révoquer les tokens compromis : purge table `refresh_tokens`, rotation `JWT_PASSPHRASE` / clés si fuite de clé privée.
2. Bloquer IP / comptes admin suspects (pare-feu Contabo, désactivation compte).
3. Sauvegarder les preuves (logs, dumps horodatés) **avant** purge.
4. Changer mots de passe admin / secrets `.env` exposés.

## 4. Évaluation (≤ 24 h)

Documenter dans un registre d'incident :

- Date/heure de début estimée
- Vecteur (bruteforce, fuite backup, XSS, etc.)
- Nombre de personnes concernées (approx.)
- Données exposées (catégories)
- Mesures de correction déployées

## 5. Notification CNIL (≤ 72 h)

Si risque pour les droits et libertés :

- Portail : https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles
- Email : notifications@cnil.fr
- Contenu : description, catégories de données, nombre approximatif de personnes, conséquences probables, mesures prises / prévues.

## 6. Information des personnes concernées

Si **risque élevé** : email ou notification in-app, en langage clair :

- nature de l'incident ;
- données touchées ;
- mesures recommandées (changement mot de passe, vigilance) ;
- contact : contact@odos-app.fr.

## 7. Post-incident (≤ 2 semaines)

- Correctifs techniques (patch, durcissement CORS, rate limit, MFA admin).
- Mise à jour `docs/RGPD_registre.md` si le traitement change.
- Retour d'expérience interne.

## 8. Contacts utiles

| Entité | Contact |
|--------|---------|
| CNIL | notifications@cnil.fr |
| Hébergeur Contabo | Support client Contabo |
| ODOS | contact@odos-app.fr |
