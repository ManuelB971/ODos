# Guide — Générer un rapport complet (vision MVP 2 & différenciation)

**Fichier tout-en-un pour IA :** [`RAPPORT_ODOS_MVP2_2026.md`](RAPPORT_ODOS_MVP2_2026.md) regroupe le rapport MVP 2, les instructions pour un modèle génératif, et des annexes synthétisant les autres docs du dépôt — à privilégier pour **un seul copier-coller** vers un LLM.

Ce document sert de **mode d’emploi** pour produire un rapport produit / stratégique **complet**, en tenant compte de ce qui dépasse le MVP initial, des **nouvelles fonctionnalités utiles pour les utilisateurs**, et du **contexte concurrentiel** (application similaire récemment lancée).

Il s’appuie sur la documentation et le code du dépôt ODOS (recommandations, LLM de re-ranking, social léger, etc.).

---

## 1. Objectif du rapport à produire

Le rapport doit répondre clairement à :

| Question | Ce que le lecteur doit en retirer |
|----------|-----------------------------------|
| **Où en est le produit ?** | Périmètre MVP livré vs reste à faire (voir `TASKS_REMAINING.md`, `implementation_plan.md`). |
| **Qu’est-ce que le « MVP 2 » ?** | La **prochaine vague de valeur** : pas seulement « finir le backlog », mais **pourquoi** ces priorités (utilisateur, métier, technique). |
| **Pourquoi ODOS vs une app concurrente ?** | Proposition de valeur **explicite** : ce que vous faites mieux, différemment, ou en plus (données, confiance, personnalisation, communauté, etc.). |
| **Quelles fonctionnalités utilisateur prioriser ?** | Liste **priorisée** (impact / effort / risque), avec critères de succès mesurables. |

---

## 2. Définir le MVP 2 (cadre)

**MVP** (dans ce projet) : parcours recommandations par centres d’intérêt, API sécurisée, admin, mobile Expo — tel que décrit dans `implementation_plan.md` et `TASKS_REMAINING.md`.

**MVP 2** : à traiter comme **la phase qui consolide la différenciation** après un premier usage viable. Exemples de thèmes déjà présents ou en cours dans le dépôt (à adapter au rapport final) :

- **Recommandations plus intelligentes** : re-ranking par LLM sur des candidats déjà filtrés (`planllm.md`, service `LlmRankingService`) — pertinence sans inventer de fausses activités.
- **Confiance & engagement** : notes agrégées sur les activités, commentaires modérés/sanitisés (entités et contrôleurs dédiés côté back) — utile pour se distinguer d’une app « liste froide ».
- **Qualité de service** : limitation d’abus (throttling des actions utilisateur) pour préserver l’expérience collective.

Le rapport ne doit pas **inventer** des features : chaque ligne doit être soit **déjà dans le code / la doc**, soit **explicitement marquée comme hypothèse à valider** (interviews, analytics, test A/B).

---

## 3. Analyse concurrentielle (structure minimale)

Pour l’apparition d’un concurrent proche, documenter au minimum :

1. **Cible utilisateur** : qui ? (touriste, local, famille, solo, etc.)
2. **Promesse principale** : quelle phrase résume leur produit ?
3. **Forces observées** : UX, catalogue, prix, réseau, vitesse d’exécution…
4. **Faiblesses / angles d’attaque** : manque de personnalisation, pas de preuve sociale, contenu statique, etc.
5. **Positionnement ODOS** : 3 à 5 **différenciateurs** vérifiables (ex. : explicabilité des reco via LLM sur candidats réels, communauté, qualité du contenu, focus géographique).

Sortie attendue : un **tableau comparatif** (ODOS vs concurrent A vs statu quo « papier / Google Maps ») + une **phrase de positionnement** en une ligne.

---

## 4. Plan type du « rapport complet »

Utiliser les sections suivantes comme squelette (titres ajustables) :

1. **Résumé exécutif** (1 page max)
2. **Contexte produit & objectifs business**
3. **État des lieux MVP** (réalisé / en cours / dette technique légère)
4. **Vision MVP 2** : objectifs utilisateur + indicateurs (KPI)
5. **Fonctionnalités utilisateur** (backlog priorisé avec critères d’acceptation)
6. **Différenciation & concurrence**
7. **Risques & dépendances** (API LLM, coûts, conformité RGPD des commentaires, etc.)
8. **Planning indicatif** (jalons, pas de faux précision si incertain)
9. **Annexes** : liens vers docs internes (`planllm.md`, `guide_mise_en_production.md`, etc.)

---

## 5. Idées de fonctionnalités « intéressantes utilisateur » (pistes alignées ODOS)

À intégrer au backlog **uniquement** après tri par valeur / coût. Pistes cohérentes avec l’architecture actuelle :

| Idée | Valeur utilisateur | Lien technique / doc |
|------|--------------------|----------------------|
| **Pourquoi cette reco ?** | Réduit la frustration « boîte noire » | LLM qui classe parmi des IDs réels (`planllm.md`) |
| **Avis & note sur une activité** | Aide au choix, confiance | Agrégats de notes, modération |
| **Commentaires** | Engagement, questions avant de réserver | Sanitisation, API dédiées |
| **Filtres contextuels** (météo, durée, budget) | Gain de temps | Extension des DTO / filtres API |
| **Listes / favoris partageables** | Viralité légère, mémorisation | À spécifier si pas encore en base |

Pour chaque idée : **problème utilisateur**, **comportement attendu**, **données nécessaires**, **risques** (modération, RGPD).

---

## 6. Processus de génération du document (méthode)

1. **Collecter** : relire `implementation_plan.md`, `TASKS_REMAINING.md`, `planllm.md`, et le guide prod si déploiement concerné.
2. **Cartographier** : lister ce qui est **déjà mergeable / en branche** vs **spec pure**.
3. **Prioriser** : matrice impact × effort ; isoler le **minimum** pour répondre à la concurrence (souvent 1–2 différenciateurs forts plutôt que dix features moyennes).
4. **Rédiger** : remplir le plan type (section 4).
5. **Valider** : relecture métier + technique (faisabilité API, coût LLM, charge modération).

---

## 7. Critères de qualité du rapport

- Chaque **priorité MVP 2** est reliée à un **signal utilisateur** ou **objectif mesurable**.
- La **concurrence** est nommée sans dénigrement factuel ; les comparaisons sont **sourcées** (site, store, usage réel).
- Les features **non encore développées** sont clairement étiquetées **hypothèse** ou **roadmap**.
- Le document est **actionnable** : une équipe peut en déduire des tickets et un ordre de développement.

---

## 8. Références internes (dépôt ODOS)

| Fichier | Usage |
|---------|--------|
| `implementation_plan.md` | Modèle de données, recommandations, sécurité MVP |
| `TASKS_REMAINING.md` | Checklist MVP et priorités historiques |
| `planllm.md` | Design LLM re-ranking, contraintes de sécurité |
| `guide_mise_en_production.md` | Contraintes déploiement / exploitation |
| `README.md` (racine) | Stack, Docker, démarrage |

---

## 9. Prochaine action concrète

Ouvrir un nouveau document (par ex. `RAPPORT_ODOS_MVP2_YYYY.md`) en copiant la structure de la **section 4**, puis remplir **section 3 (concurrent)** et **section 5 (backlog)** en premier — ce sont les parties qui conditionnent le reste du rapport.

---

*Document généré pour le dépôt ODOS — à maintenir lorsque la définition de « MVP 2 » ou le paysage concurrentiel évolue.*
