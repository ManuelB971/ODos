# Rapport produit ODOS — Vision MVP 2 et différenciation

**Version :** 1.0 · **Date :** avril 2026 · **Périmètre :** dépôt ODOS (backend Symfony / API Platform, application mobile Expo)

**Documents de référence :** `implementation_plan.md`, `TASKS_REMAINING.md`, `planllm.md`, `guide_mise_en_production.md`, `README.md` (racine du dépôt).

---

## Instructions pour un modèle IA (génération de livrable)

**Objectif :** à partir de ce fichier unique, produire un **document final** (rapport de projet, mémoire, PDF, présentation) **cohérent**, **factuel** sur le dépôt ODOS, et **structuré** selon les attentes académiques ou professionnelles de l’utilisateur.

**Contraintes de rédaction :**

1. **Ne pas inventer** de fonctionnalités non décrites ici ; distinguer clairement **réalisé dans le code**, **documenté comme roadmap**, et **hypothèse produit**.
2. **Citer la structure du dépôt** : backend `odos-back/` (Symfony, API Platform, JWT, EasyAdmin) ; frontend **`odos-front/`** (Expo). Ne pas confondre les deux dossiers.
3. **Ton** : professionnel, français ; tableaux et listes autorisés ; éviter le dénigrement d’acteurs concurrents non nommés.
4. **Sortie attendue** (à adapter par l’utilisateur) : titre, résumé, introduction, état de l’art / contexte, solution technique, fonctionnalités utilisateur, différenciation, risques, conclusion, bibliographie / liens internes si demandé.
5. **MVP 2** : utiliser la définition des sections 3 et 4 du présent rapport comme fil conducteur.

**Données d’entrée additionnelles** que l’utilisateur peut fournir au modèle en même temps que ce fichier : nom du concurrent, captures d’écran, contraintes de pagination, norme de citation (APA, etc.).

---

## Résumé exécutif

ODOS est une plateforme de **découverte d’activités** (modèle User / Category / Activity, recommandations par centres d’intérêt). Le **premier périmètre MVP** visé par les documents de planification (intérêts, `/api/recommendations`, JWT, mobile) est **largement avancé dans le code** ; la checklist `TASKS_REMAINING.md` (février 2026) est **partiellement obsolète** et doit être **recadrée** par rapport à l’état réel du dépôt.

Le **MVP 2** proposé ici est la phase qui **consolide la différenciation** face à une offre concurrente récente : combiner **recommandations pertinentes** (y compris re-ranking LLM sur candidats réels), **confiance** (notes, commentaires), **engagement** (favoris), et **qualité de service** (limitation d’abus). Les priorités ci-dessous relient chaque chantier à des **indicateurs** et à un **niveau de risque** (technique, conformité, coût).

---

## 1. Contexte produit et objectifs business

### 1.1 Proposition de départ

- Offrir aux utilisateurs un parcours simple : **s’authentifier**, définir des **centres d’intérêt** (catégories), recevoir des **activités recommandées**, explorer le détail (lieu, catégorie), avec possibilité d’**administrer** le catalogue via EasyAdmin.

### 1.2 Objectifs business (à affiner en interne)

| Objectif | Indicateur possible |
|----------|---------------------|
| Rétention | Sessions récurrentes, taux de retour J+7 / J+30 |
| Confiance | Notes soumises, commentaires, taux d’activités notées |
| Différenciation | Part des utilisateurs utilisant recommandations + engagement social (favoris, avis) |
| Coût maîtrisé | Coût LLM / requête, taux de cache sur re-ranking |

---

## 2. État des lieux MVP (réalisé / en cours / dette)

### 2.1 Alignement avec la documentation historique

Le fichier `TASKS_REMAINING.md` liste encore comme non faites des tâches désormais **couvertes par le code** (à mettre à jour pour éviter les doublons de planification). L’`implementation_plan.md` reste une bonne référence **métier** (entités, endpoint recommandations).

### 2.2 Éléments effectivement présents dans le dépôt (Synthèse technique)

Les éléments suivants sont **observables dans le code** au moment de ce rapport (non exhaustif) :

| Domaine | Statut | Détail |
|---------|--------|--------|
| Modèle métier de base | Réalisé | Entités `Category`, `User` (intérêts), `Activity` (publication, catégorie, géoloc, etc.) |
| Recommandations | Réalisé | `GET /api/recommendations` via `RecommendationStateProvider` : candidats filtrés (intérêts + `isPublished`), puis **re-ranking** via `LlmRankingService` (désactivable, cache, repli si échec) |
| Authentification API | Réalisé | JWT (`/api/login`, firewall API) |
| Accès public / privé | Réalisé | Ex. activités et catégories en lecture publique ; recommandations réservées aux utilisateurs connectés (`security.yaml`) |
| Confiance / social | Réalisé | Notes (`ActivityRating` + API dédiée), commentaires (`Comment` + sanitization, contrôleurs), agrégation côté tests / logique métier associée |
| Favoris | Réalisé | API `FavoriteActivityController` (POST/DELETE sur favori par activité), relation côté `User` |
| Qualité de service | Réalisé | `UserActionThrottleService` pour limiter les abus sur certaines actions |
| Admin | Réalisé | EasyAdmin, évolutions sécurité (audit, MFA WebAuthn / SMS selon configuration — voir entités et subscribers dédiés) |
| Front mobile | En cours d’enrichissement | Écran détail activité avec favoris, notes, commentaires, appels API centralisés (`odos-front`) |

### 2.3 Dette et documentation

- **Dette documentaire :** synchroniser `TASKS_REMAINING.md` avec l’état réel (sinon risque de sous-prioriser des sujets déjà traités).
- **Dette produit :** tests automatisés front / parcours complets à renforcer selon priorités release.
- **Dette opérationnelle :** suivi des coûts et disponibilité du **service LLM** (timeouts, cache, bascule « off » documentée dans `planllm.md`).

---

## 3. Vision MVP 2 : valeur utilisateur et KPI

### 3.1 Définition du MVP 2

Le **MVP 2** n’est pas seulement « finir la checklist » : c’est la phase où ODOS **affiche clairement sa valeur** face à une application concurrente proche :

1. **Pertinence** : recommandations ordonnées par un pipeline **sûr** (candidats réels → LLM optionnel), pas une liste générique.
2. **Confiance** : avis et commentaires **utiles et sûrs** (sanitisation, modération / throttle).
3. **Engagement durable** : favoris et usage récurrent plutôt qu’un téléchargement ponctuel.
4. **Explicabilité (roadmap)** : rapprocher l’expérience de « pourquoi cette reco » (déjà une piste dans `planllm.md` ; affichage côté app = **hypothèse produit** à valider).

### 3.2 KPI proposés (MVP 2)

| KPI | Cible indicative | Mesure |
|-----|------------------|--------|
| Activation intérêts | % de comptes avec ≥ 1 intérêt renseigné | Analytics / base |
| Usage recommandations | Sessions avec appel `/api/recommendations` réussi | Logs API / analytics |
| Engagement | Favoris / utilisateur, notes et commentaires / activité consultée | Agrégats API |
| Qualité perçue | Note moyenne ou NPS (si mis en place) | Enquête ou in-app **hypothèse** |
| Coût LLM | € ou tokens / MAU | Monitoring fournisseur + cache hit-rate |

---

## 4. Fonctionnalités utilisateur — backlog priorisé

Légende : **Code** = présent dans le dépôt · **Roadmap** = prévu mais pas complet · **Hypothèse** = à valider avant développement important.

| Priorité | Thème | Description | Impact | Effort | Risque | Critères d’acceptation (exemples) |
|----------|-------|-------------|--------|--------|--------|-----------------------------------|
| P0 | Stabilité reco + LLM | Garantir comportement prévisible si LLM indisponible ; monitoring | Élevé | Moyen | Moyen (coût, latence) | Repli DB ; logs ; limites timeout respectées |
| P0 | Confiance contenu | Commentaires / notes cohérents avec la sécurité (auth, throttle, sanitization) | Élevé | Faible–moyen | Moyen (RGPD, modération) | Pas de XSS ; utilisateur ne peut éditer que ses commentaires selon règles API |
| P1 | Parcours mobile | Cohérence liste → détail → favoris / avis sur toutes les activités pertinentes | Élevé | Moyen | Faible | Parcours testé sur iOS/Android cibles |
| P1 | Différenciation « intelligente » | Mettre en avant le **re-ranking** dans la communication produit (sans sur-promettre) | Élevé | Faible | Faible | Message produit aligné sur la réalité technique (`planllm.md`) |
| P2 | Explicabilité reco | Court texte ou libellé « Pour vous » basé sur intérêts / règles **Hypothèse** | Moyen | Moyen | Moyen | A/B test possible |
| P2 | Filtres contextuels (météo, budget, durée) | Enrichissement DTO / filtres API **Hypothèse** | Moyen | Élevé | Faible–moyen | Jeux de données suffisants |
| P2 | Listes partageables | Partage social de favoris ou d’itinéraires **Hypothèse** ; favoris utilisateur **Code** | Moyen | Moyen | Faible (vie privée) | Spécification URL / consentement |

---

## 5. Différenciation et concurrence

### 5.1 Cadre d’analyse (à compléter avec le nom réel du concurrent)

Pour l’application **similaire récemment lancée**, documenter de façon **factuelle et sourcée** (site officiel, fiche store, usage réel) :

- Cible (touristes, locaux, familles, etc.)
- Promesse marketing en une phrase
- Forces (UX, catalogue, prix, réseau, vitesse)
- Faiblesses possibles (personnalisation, preuve sociale, profondeur du contenu, dépendance à un partenaire unique, etc.)

### 5.2 Tableau comparatif (modèle)

| Critère | ODOS | Concurrent A *(à nommer)* | Statu quo (recherche web / bouche-à-oreille) |
|---------|------|---------------------------|---------------------------------------------|
| Personnalisation (intérêts) | Oui (catégories utilisateur) | *À compléter* | Faible |
| Ordre des suggestions | Filtrage + **re-ranking LLM** optionnel sur candidats réels | *À compléter* | Aucun |
| Preuve sociale | Notes + commentaires + favoris *(selon écrans)* | *À compléter* | Variable |
| Contrôle éditorial / admin | EasyAdmin, publication `isPublished` | *À compléter* | N/A |
| Coût pour l’éditeur | LLM + infra à monitorer | *À compléter* | Faible |

### 5.3 Phrase de positionnement (proposition)

> **ODOS aide les utilisateurs à découvrir des activités alignées sur leurs intérêts, avec des recommandations ordonnées de façon intelligente à partir d’un catalogue contrôlé, enrichi par la communauté (avis, commentaires, favoris).**

*(À adapter après validation marketing et nom du concurrent.)*

---

## 6. Risques et dépendances

| Risque | Mitigation |
|--------|------------|
| Coût / disponibilité LLM | Cache, timeout, désactivation (`LlmRankingService`), surveillance |
| Qualité des commentaires / réputation | Sanitization, throttle, modération progressive, CGU |
| RGPD | Finalités des données compte / avis / commentaires ; durées de conservation ; droit d’effacement **à cadrer juridiquement** |
| Concurrence agressive | Se concentrer sur 1–2 différenciateurs mesurables (reco + confiance) plutôt que disperser le backlog |
| Documentation désynchronisée | Mettre à jour `TASKS_REMAINING.md` ou le remplacer par une board unique |

---

## 7. Planning indicatif (jalons)

Les dates sont **indicatives** ; à ajuster selon ressources et releases store.

| Jalons | Contenu |
|--------|---------|
| J0–J+2 semaines | Recadrage backlog vs code ; mise à jour doc interne ; tableau concurrent complété |
| J+2–J+6 semaines | Durcissement reco (observabilité LLM) + parcours mobile prioritaire |
| J+6–J+12 semaines | Explicabilité légère et/ou filtres enrichis selon validation **Hypothèse** |

---

## 8. Critères de qualité de ce rapport

- Chaque priorité MVP 2 est reliée à un **signal** (KPI, risque, ou critère d’acceptation).
- Les éléments **non présents dans le code** sont étiquetés **Hypothèse** ou **Roadmap**.
- La concurrence est analysée **sans dénigrement** ; les comparaisons devront être **sourcées** lors du remplissage du tableau section 5.
- Le backlog est **actionnable** (priorités P0–P2).

---

## 9. Annexes — Fichiers utiles dans le dépôt

| Fichier | Usage |
|---------|--------|
| `implementation_plan.md` | Modèle de données et recommandations (vision initiale MVP) |
| `TASKS_REMAINING.md` | Checklist historique — **à réconcilier avec le code** |
| `planllm.md` | Design du re-ranking LLM et contraintes de sécurité |
| `guide_mise_en_production.md` | Déploiement et exploitation |
| `README.md` (racine) | Stack, Docker, démarrage |
| `README_GENERATION_RAPPORT_MVP2.md` | Mode d’emploi pour mettre à jour ce type de rapport |

---

## 10. Prochaines actions concrètes

1. **Nommer et documenter** le concurrent (section 5) avec sources.
2. **Mettre à jour** `TASKS_REMAINING.md` pour refléter l’état actuel du dépôt (ou archiver ce fichier).
3. **Trancher** les sujets **Hypothèse** (explicabilité, filtres, partage) via une courte phase de discovery (5–8 interviews utilisateurs ou test sur cohorte).
4. **Définir** un propriétaire métier pour les KPI section 3.2 et la fréquence de revue.

---

## 11. Annexe — Cahier des charges (synthèse projet 2025–2026)

*Source : cahier des charges initial du projet ; stack actuelle sans Supabase.*

| Thème | Contenu |
|-------|---------|
| **Objectif** | Client **Expo** conservé ; backend **Symfony API REST** ; **PostgreSQL** ; pas de secrets hardcodés ; **JWT** (access + refresh en exigence forte). |
| **Inclus** | API REST, migration données, CI/CD, tests (unitaires + intégration), documentation, monitoring & logs. |
| **MUST** | Auth JWT + refresh, CRUD activités & catégories, recommandations (TF.js côté client possible + API), favoris / notes / commentaires, suppression clés exposées. |
| **SHOULD** | Import/export CSV, logs recommandations, dashboard admin. |
| **COULD** | Microservice ML, notifications push, A/B testing. |
| **Sécurité** | DTO + validateurs, CORS, HTTPS, rate limiting, politique mot de passe, RGPD (minimisation, consentement, export & suppression). |
| **ML** | TensorFlow.js côté client ; évolution possible vers re-ranking **serveur** (LLM) — aligné avec `planllm.md`. |

---

## 12. Annexe — Plan technique MVP initial (`implementation_plan.md`)

**Entités prévues :** `Category` (nom unique), `User` (email, rôles, password, intérêts ManyToMany → Category), `Activity` (nom, description, lat/lon, city, catégorie).

**Recommandations :** `GET /api/recommendations` via `RecommendationStateProvider` — filtrage par intérêts utilisateur ; fallback si pas d’intérêts.

**Sécurité (schéma initial) :** `/api/login` public ; GET `/api/activities` public ; `/api/recommendations` pour utilisateurs connectés ; défaut `/api` authentifié.

**Fixtures de test :** utilisateurs `admin@odos.com` / `user@odos.com` ; catégories et activités de démo.

**Tests automatisés visés :** anonyme sur `/api/recommendations` → 401 ; utilisateur avec intérêts → filtrage Sport/Nature uniquement.

---

## 13. Annexe — Checklist historique `TASKS_REMAINING.md` (réconciliation)

*Dernière MAJ fichier source : février 2026. Beaucoup d’items y sont encore cochés « non fait » alors qu’ils sont **implémentés** dans le dépôt (entités, JWT, recommandations, front, etc.).*

**À utiliser comme archive**, pas comme vérité opérationnelle. Se référer au **tableau section 2.2** du présent rapport pour l’état réel.

**Reste typiquement ouvert (à valider dans le code au moment d’une release) :** couverture de tests exhaustive, CI/CD GitHub Actions complet, features **COULD** du cahier, perfectionnement ML offline/online.

---

## 14. Annexe — LLM et recommandations (`planllm.md` — synthèse)

**Principe :** re-**classement** (re-ranking) des activités **déjà sélectionnées** en base (même catégories + `isPublished`), pas génération d’activités fictives.

**Pipeline :** candidats DB → tronquage (ex. max 50) → appel LLM (JSON `ranked_ids`) → validation stricte (IDs ⊆ candidats) → complétion si besoin → réponse API.

**Robustesse :** timeouts courts ; **cache Redis** sur clé utilisateur + intérêts ; désactivation `LLM_ENABLED` ; repli ordre base si échec LLM.

**Payload candidat :** id, name, description tronquée, catégorie, ville ; **extension possible** : moyenne et nombre d’avis (`CandidateForLlm`) pour informer le classement.

**Sécurité prompt :** pas d’invention d’IDs ; réponse JSON stricte.

---

## 15. Annexe — Fonctionnalités « confiance & social » (état code)

*À intégrer dans tout livrable « valeur utilisateur ».*

| Fonctionnalité | Backend | Front (Expo) |
|----------------|---------|----------------|
| **Favoris** | `POST/DELETE /api/activities/{id}/favorite` | Liste d’IDs via `/api/me`, toggle sur fiche activité |
| **Notes 1–5** | `GET/PUT/DELETE /api/activities/{id}/rating` ; agrégats `ratingAverage`, `ratingCount` sur `Activity` | Écran détail : moyenne + sélection d’étoiles + retrait de note |
| **Commentaires** | `GET/POST .../comments` ; `PATCH/DELETE /api/comments/{id}` (soft-delete `isHidden`) | Liste + saisie + édition / suppression auteur |
| **Anti-abus** | `UserActionThrottleService` (cache), sanitization texte | Gestion erreurs / retry UX |

---

## 16. Annexe — Mise en production (`guide_mise_en_production.md` — points clés)

- Stack : Symfony + API Platform + JWT ; Expo ; **PostgreSQL** (les exemples MySQL du guide sont à **harmoniser** avec le projet).
- Variables : `APP_ENV`, `APP_SECRET`, `DATABASE_URL`, JWT, `CORS_ALLOW_ORIGIN`, HTTPS obligatoire pour les tokens.
- Commandes : `composer install --no-dev`, `cache:clear` prod, `doctrine:migrations:migrate`.
- Mobile : `EXPO_PUBLIC_API_URL` figée au build EAS ; builds Android/iOS via `eas build`.

---

## 17. Annexe — Stack & exploitation (`README.md` racine — extrait)

- **Dépôt :** backend Symfony (`odos-back`), front Expo (`odos-front`), Docker Compose (PHP, Nginx, Postgres, Redis, Ollama optionnel), stack **SIEM Wazuh** optionnelle (`docker-compose.wazuh.yml`).
- **Démarrage Docker :** `docker compose up` ; JWT ; migrations ; commande `app:ensure-admin` documentée.
- **Endpoints usuels :** API `http://localhost:8000`, doc API, admin `/admin`.

---

## 18. Annexe — Référence rapide API (pour diagrammes ou glossaire)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| POST | `/api/login` | JWT |
| POST | `/api/token/refresh` | Refresh token |
| GET | `/api/me` | Profil utilisateur courant |
| GET | `/api/recommendations` | Recommandations personnalisées (auth) |
| GET | `/api/activities`, `/api/activities/{id}` | Catalogue |
| GET/PUT/DELETE | `/api/activities/{id}/rating` | Notes agrégées + note utilisateur |
| GET/POST | `/api/activities/{id}/comments` | Commentaires paginés |
| PATCH/DELETE | `/api/comments/{id}` | Édition / masquage commentaire |

---

## 19. Génération PDF (hors IA)

Le script [`generate_readme_pdf.py`](generate_readme_pdf.py) dans le même dossier permet de convertir un `.md` en `.pdf` (fpdf2, police Arial Windows). Exemple :

```bash
python Document copy/generate_readme_pdf.py "Document copy/RAPPORT_ODOS_MVP2_2026.md" "Document copy/RAPPORT_ODOS_MVP2_2026.pdf"
```

*(Adapter les chemins selon l’environnement.)*

---

*Document rédigé pour le dépôt ODOS — consolidé pour alimentation d’un modèle IA ou un rapport final ; à faire évoluer avec les releases et le paysage concurrentiel.*
