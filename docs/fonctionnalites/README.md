# Fonctionnalités ODOS

Index des fiches produit / technique par domaine.  
Chaque fiche décrit le principe, les routes API, les fichiers mobile et les liens RGPD le cas échéant.

---

## Parcours utilisateur (mobile)

| Fiche | Description |
|-------|-------------|
| [authentification-compte.md](authentification-compte.md) | Inscription, login JWT, session SecureStore |
| [centres-interet.md](centres-interet.md) | Sélection catégories (1–7), alimente les reco |
| [catalogue-activites.md](catalogue-activites.md) | Liste publique, fiche détail activité |
| [recherche-decouverte.md](recherche-decouverte.md) | Onglet Recherche, filtres et browse éditorial |
| [recommandations.md](recommandations.md) | Accueil « Pour vous », pipeline LLM |
| [carte-interactive.md](carte-interactive.md) | MapLibre plein écran, pins, bottom sheet |
| [exploration-carte.md](exploration-carte.md) | GPS, cellules geohash, % zone, badge Explorateur |
| [favoris.md](favoris.md) | Ajout / retrait, écran Mes favoris |
| [notes-activites.md](notes-activites.md) | Notation 1–5 étoiles |
| [commentaires.md](commentaires.md) | Fil d’avis, édition auteur |
| [badges-gamification.md](badges-gamification.md) | Badges, déblocage, vitrine profil |
| [profil-parametres.md](profil-parametres.md) | Compte, avatar, alias, bio, réglages |
| [rgpd-compte.md](rgpd-compte.md) | Export JSON, suppression compte, textes légaux |

---

## Opérations & technique

| Fiche | Description |
|-------|-------------|
| [admin-backoffice.md](admin-backoffice.md) | EasyAdmin, MFA, import CSV, modération |

---

## Documentation associée (hors dossier)

| Document | Sujet |
|----------|--------|
| [../DESIGN_JAKOB_FLOWS.md](../DESIGN_JAKOB_FLOWS.md) | Flows UX — loi de Jakob, audit parcours, grille réutilisable |
| [../DESIGN_DIRECTION.md](../DESIGN_DIRECTION.md) | DA mobile : tokens, typo, composants |
| [../AUDIT_UI_UX_FRONT.md](../AUDIT_UI_UX_FRONT.md) | Audit UI/UX front complet (CTA, pratiques oubliées, écarts DA) |
| [../DA_APP_GAP.md](../DA_APP_GAP.md) | Audit conformité DA écran par écran |
| [../GAMIFICATION.md](../GAMIFICATION.md) | Implémentation badges (modèle, tests, admin) |
| [../TODO_GAMIFICATION_BADGES.md](../TODO_GAMIFICATION_BADGES.md) | Plan de livraison gamification |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Vue d’ensemble stack, flux, modèle de données |
| [../RGPD_registre.md](../RGPD_registre.md) | Registre art. 30 |

---

## Arborescence

```
docs/fonctionnalites/
├── README.md
├── authentification-compte.md
├── centres-interet.md
├── catalogue-activites.md
├── recherche-decouverte.md
├── recommandations.md
├── carte-interactive.md
├── exploration-carte.md
├── favoris.md
├── notes-activites.md
├── commentaires.md
├── badges-gamification.md
├── profil-parametres.md
├── rgpd-compte.md
└── admin-backoffice.md
```

---

*Dernière mise à jour : juin 2026.*
