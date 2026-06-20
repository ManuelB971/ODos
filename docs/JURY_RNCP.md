# Jury RNCP — Concepteur Développeur d’Applications (ODOS)

Document de soutenance : **fiche 1 page** + **checklist tests manuels**.  
Dernière mise à jour : juin 2026.

**Références :** [ARCHITECTURE.md](ARCHITECTURE.md) · [fonctionnalites/README.md](fonctionnalites/README.md) · [RGPD_AUDIT_2026.md](RGPD_AUDIT_2026.md)

---

## 1. Fiche jury (1 page)

### Projet

| | |
|---|---|
| **Nom** | ODOS — découverte d’activités locales |
| **Stack** | Expo SDK 54 (React Native) · Symfony 7 / API Platform · PostgreSQL · Redis |
| **Prod** | API `https://api.odos-api.com` · APK preview EAS (profil `preview`) |
| **Admin** | EasyAdmin `/admin` + MFA (TOTP / SMS / WebAuthn) |

### Message clé (30 s)

> Application mobile connectée à une API sécurisée : parcours complet inscription → découverte (liste, carte MapLibre, recommandations) → engagement (favoris, notes, commentaires, badges) → compte et droits RGPD. Back-office pour alimenter le catalogue. MVP en preview interne ; OAuth et emails transactionnels activables post-soutenance.

### Parcours démo recommandé (15–20 min)

| # | Écran / action | Ce que tu montres |
|---|----------------|-------------------|
| 1 | Splash → **Login email** | JWT, session SecureStore, DA (spray, typo) |
| 2 | **Interests** (si compte neuf) | Personnalisation, alimente les reco |
| 3 | **Home** | Mini-carte MapLibre, reco « Pour vous », liste activités |
| 4 | **Carte** `/map` | Pins, filtre catégories, callout → fiche |
| 5 | **Fiche activité** | Détail, note, commentaire, itinéraire |
| 6 | **Favori** | Cœur + compte → Mes favoris |
| 7 | **Compte / Badges** | Profil, vitrine badges, paramètres |
| 8 | *(optionnel)* **Export RGPD** | Paramètres → partage JSON |
| 9 | *(optionnel)* **Communauté** | Consentement → message privé ou fil forum |
| 10 | *(optionnel)* **Parcours** | Ajouter activité → onglet Parcours → partager |
| 11 | *(navigateur)* **Admin** | MFA, CRUD activité ou badge, import CSV |

**Durée buffer :** 2 min pour questions / rechargement réseau.

### Limites connues (à dire au jury, pas à cacher)

| Sujet | État | Formulation oral |
|-------|------|------------------|
| OAuth Google / Apple | Désactivé (`SOCIAL_AUTH_ENABLED`) | Boutons visibles, activation après config stores |
| Mot de passe oublié | Code OK, **Brevo non branché** | Ne pas démo ; email à configurer sur VPS |
| Recommandations LLM | `LLM_ENABLED=false` en prod | Fallback métier sans cloud LLM |
| Carte | **Build natif** requis (pas Expo Go) | MapLibre + tuiles en ligne |
| Stores | Pas de publication | Preview interne + doc conformité en cours |
| Tests auto | Partiels | Jest + PHPUnit ciblés, CI sur `main`, **PHPStan L8** |

### Points forts à mettre en avant (grille RNCP)

- **Conception** : modèle de données, API REST, séparation mobile / API / admin ([ARCHITECTURE.md](ARCHITECTURE.md)).
- **Développement** : TypeScript strict, hooks React Query, Symfony services, migrations Doctrine.
- **Sécurité** : JWT + refresh, rate limit, MFA admin, sanitisation commentaires, RGPD export/suppression.
- **Exploitation** : Docker prod, CI GitHub, EAS Build, documentation exploitation ([CI_CD_V2_2026.md](CI_CD_V2_2026.md)).
- **Qualité** : Tests unitaires (carte, auth, API), Knip (dettes identifiées), `expo doctor`.

### Prérequis jour J

- [ ] APK preview installé (**build après fix deps SDK 54**).
- [ ] Compte démo + activités **publiées** en prod.
- [ ] Téléphone en **4G ou Wi‑Fi** stable (tuiles carte).
- [ ] Identifiants admin MFA prêts (onglet navigateur).
- [ ] Ne pas démo : OAuth, reset password, suppression compte.

---

## 2. Checklist tests manuels (avant / après build)

Cocher **OK** / **KO** / **N/A**. Tester sur **APK preview** + API prod sauf mention.

### A. Installation & démarrage

| # | Test | OK | KO | Notes |
|---|------|:--:|:--:|-------|
| A1 | App s’ouvre sans crash (icône → splash) | ☐ | ☐ | |
| A2 | Splash se termine, écran login ou home | ☐ | ☐ | |
| A3 | Polices / DA lisibles (pas de carrés vides) | ☐ | ☐ | |

### B. Authentification

| # | Test | OK | KO | Notes |
|---|------|:--:|:--:|-------|
| B1 | Login email + mot de passe valide → home | ☐ | ☐ | |
| B2 | Login identifiants invalides → message d’erreur | ☐ | ☐ | |
| B3 | Inscription nouveau compte (CGU cochées) | ☐ | ☐ | Optionnel |
| B4 | Boutons Google / Apple **grisés** (pas de crash) | ☐ | ☐ | |
| B5 | Mot de passe oublié | ☐ | ☐ | N/A si Brevo off |
| B6 | Fermer app, rouvrir → session conservée | ☐ | ☐ | |
| B7 | Déconnexion → retour login | ☐ | ☐ | |

### C. Parcours découverte

| # | Test | OK | KO | Notes |
|---|------|:--:|:--:|-------|
| C1 | Home : mini-carte affiche des pins | ☐ | ☐ | Réseau requis |
| C2 | Home : section recommandations (ou état vide clair) | ☐ | ☐ | |
| C3 | CTA « Explorer » → carte plein écran `/map` | ☐ | ☐ | |
| C4 | Carte : recherche filtre les pins | ☐ | ☐ | |
| C5 | Carte : chip catégorie filtre | ☐ | ☐ | |
| C6 | Tap pin → callout activité | ☐ | ☐ | |
| C7 | Re-tap même pin → callout fermé | ☐ | ☐ | |
| C8 | Tap callout → fiche `/activity/[id]` | ☐ | ☐ | |
| C9 | Onglet Recherche : liste + navigation fiche | ☐ | ☐ | |

### D. Engagement

| # | Test | OK | KO | Notes |
|---|------|:--:|:--:|-------|
| D1 | Ajouter / retirer favori sur fiche | ☐ | ☐ | |
| D2 | Compte → Mes favoris synchronisés | ☐ | ☐ | |
| D3 | Noter activité (1–5) | ☐ | ☐ | |
| D4 | Publier commentaire | ☐ | ☐ | |
| D5 | Badges : écran liste + détail si débloqué | ☐ | ☐ | |

### E. Compte & paramètres

| # | Test | OK | KO | Notes |
|---|------|:--:|:--:|-------|
| E1 | Modifier alias / bio | ☐ | ☐ | |
| E2 | Changer avatar (photo) | ☐ | ☐ | |
| E3 | Thème clair / sombre / système | ☐ | ☐ | |
| E4 | CGU / confidentialité (`/legal`) | ☐ | ☐ | |
| E5 | Export données JSON (RGPD) | ☐ | ☐ | Optionnel jury |

### F. Social & parcours (optionnel)

| # | Test | OK | KO | Notes |
|---|------|:--:|:--:|-------|
| F1 | Onglet Communauté : consentement puis forum ou messages | ☐ | ☐ | |
| F2 | Onglet Parcours : créer / ouvrir un parcours | ☐ | ☐ | |
| F3 | Partager une activité en chat (carte cliquable) | ☐ | ☐ | |
| F4 | Paramètres → utilisateurs bloqués | ☐ | ☐ | |

### G. Carte avancée (optionnel)

| # | Test | OK | KO | Notes |
|---|------|:--:|:--:|-------|
| G1 | Consentement exploration GPS | ☐ | ☐ | |
| G2 | Progression zone / badge explorateur | ☐ | ☐ | |

### H. Admin (navigateur)

| # | Test | OK | KO | Notes |
|---|------|:--:|:--:|-------|
| H1 | Login admin + MFA | ☐ | ☐ | |
| H2 | Liste / édition activité | ☐ | ☐ | |
| H3 | Création ou import activité | ☐ | ☐ | Optionnel |

### I. Régression stabilité

| # | Test | OK | KO | Notes |
|---|------|:--:|:--:|-------|
| I1 | Pas de crash après login (home avec carte) | ☐ | ☐ | |
| I2 | 5 min d’usage (navigation tabs + carte) | ☐ | ☐ | |
| I3 | Mode avion → message erreur réseau clair | ☐ | ☐ | |
| I4 | Recherche mosaïque pop : scroll sans crash | ☐ | ☐ | Fix FlatList juin 2026 |

---

## 3. En cas de KO le jour J

| Symptôme | Piste |
|----------|--------|
| Crash à l’ouverture | Rebuild APK après `fix(front): align Expo SDK 54` ; vérifier commit du build EAS |
| Crash après login | MapLibre sur home — tester sans réseau / logs `adb logcat` |
| Carte blanche | Réseau, URL tuiles, permissions |
| 401 partout | Token expiré, API prod, horloge téléphone |
| Liste vide | Activités non publiées, API down, migration DB |

**Lien build EAS :** projet `manuel971/odos` sur [expo.dev](https://expo.dev).

---

*Imprimer la section 1 pour la soutenance ; section 2 pour la veille du jury.*
