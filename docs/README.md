# Documentation ODOS

Index des docs du dépôt. Dernière passe : **juin 2026**.

## Par où commencer

| Tu veux… | Lis ça |
|----------|--------|
| Lancer le projet en local | [README racine](../README.md) |
| **Cartographie architecture & données** | **[ARCHITECTURE.md](ARCHITECTURE.md)** |
| **TODO badges, exploration, UX commentaires** | **[TODO_GAMIFICATION_BADGES.md](TODO_GAMIFICATION_BADGES.md)** · **[GAMIFICATION.md](GAMIFICATION.md)** |
| **Fiches fonctionnalités (index complet)** | **[fonctionnalites/README.md](fonctionnalites/README.md)** |
| **Audit UI/UX front (Pro Max × Jakob, fusionné)** | **[AUDIT_UI_UX_FRONT.md](AUDIT_UI_UX_FRONT.md)** |
| **Flows UX (loi de Jakob)** | **[DESIGN_JAKOB_FLOWS.md](DESIGN_JAKOB_FLOWS.md)** |
| Déployer sur Contabo (IP sans domaine) | [PROD_SANS_DOMAINE.md](PROD_SANS_DOMAINE.md) |
| API prod `api.odos-api.com` (HTTPS) | [PROD_API_DOMAINE.md](PROD_API_DOMAINE.md) |
| Comprendre la CI/CD | [CI_CD_V2_2026.md](CI_CD_V2_2026.md) |
| Voir où on en est côté RGPD | [RGPD_AUDIT_2026.md](RGPD_AUDIT_2026.md) |
| Le registre art. 30 | [RGPD_registre.md](RGPD_registre.md) |
| **Soutenance jury RNCP (démo + tests)** | **[JURY_RNCP.md](JURY_RNCP.md)** |

---

## Conformité & sécurité

Ces fichiers vont ensemble. Le registre (`RGPD_registre.md`) reste la référence métier.

| Fichier | À quoi il sert |
|---------|----------------|
| [RGPD_AUDIT_2026.md](RGPD_AUDIT_2026.md) | État des lieux + ce qu'il reste à faire |
| [RGPD_registre.md](RGPD_registre.md) | Registre art. 30 — finalités, durées, bases légales |
| [LOG_RETENTION.md](LOG_RETENTION.md) | Combien de temps on garde les logs, cron, JWT, CORS |
| [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) | Que faire en cas de violation (72 h CNIL) |

Scripts liés : `scripts/prod-cron-purge.sh`  
Textes légaux in-app : `odos-front/app/legal.tsx`

---

## Déploiement & exploitation

| Fichier | À quoi il sert |
|---------|----------------|
| [PROD_SANS_DOMAINE.md](PROD_SANS_DOMAINE.md) | Mise en prod Contabo par IP |
| [PROD_API_DOMAINE.md](PROD_API_DOMAINE.md) | Sous-domaine API + Let's Encrypt |
| [CI_CD_V2_2026.md](CI_CD_V2_2026.md) | GitHub Actions, secrets, deploy |
| [../odos-config/env.prod.example](../odos-config/env.prod.example) | Modèle `.env` serveur |

Docker : `docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.wazuh.yml` (optionnel)

---

## Développement & qualité

| Sujet | Fichier |
|-------|---------|
| Plan couverture 70 % | [deliverables/PLAN-COUVERTURE-70.md](../deliverables/PLAN-COUVERTURE-70.md) |
| TODO badges & exploration | [TODO_GAMIFICATION_BADGES.md](TODO_GAMIFICATION_BADGES.md) |
| Fiches fonctionnalités | [fonctionnalites/](fonctionnalites/) (parcours, communauté, profil…) |
| Audit UI/UX (fusionné) | [AUDIT_UI_UX_FRONT.md](AUDIT_UI_UX_FRONT.md) |
| Flows Jakob | [DESIGN_JAKOB_FLOWS.md](DESIGN_JAKOB_FLOWS.md) |
| Soutenance jury RNCP | [JURY_RNCP.md](JURY_RNCP.md) |
| Idées LLM, trajets, forum (à juger) | [IDEES_POTENTIELLES.md](IDEES_POTENTIELLES.md) |

---

## Archive

Docs historiques — ne pas suivre pour l'exploitation courante.

| Fichier | Remplacé par |
|---------|--------------|
| [archive/CI_CD_V1.md](archive/CI_CD_V1.md) | [CI_CD_V2_2026.md](CI_CD_V2_2026.md) |

---

## Arborescence

```
docs/
├── README.md
├── ARCHITECTURE.md
├── AUDIT_UI_UX_FRONT.md
├── DESIGN_JAKOB_FLOWS.md
├── RGPD_AUDIT_2026.md
├── RGPD_registre.md
├── LOG_RETENTION.md
├── INCIDENT_RESPONSE.md
├── PROD_SANS_DOMAINE.md
├── CI_CD_V2_2026.md
├── TODO_GAMIFICATION_BADGES.md
├── fonctionnalites/          # 16 fiches produit (voir README du dossier)
├── IDEES_POTENTIELLES.md
└── archive/
    └── CI_CD_V1.md
```

---

## Maintenance (à cocher de temps en temps)

- [ ] Mettre à jour le registre si un nouveau traitement de données apparaît
- [ ] Cocher la checklist dans `PROD_SANS_DOMAINE.md` après chaque déploiement prod
- [ ] Actualiser l'audit RGPD quand un écart est corrigé
- [ ] Nommer le responsable incident dans `INCIDENT_RESPONSE.md`
- [ ] Garder `legal.tsx` aligné avec le registre (durées, sous-traitants, SIRET)
