# Plan complet : intégrer un LLM dans les recommandations ODOS

## Contexte

L'application **ODOS** est une plateforme de découverte d'activités (Lyon / Paris).  
Le backend est en **Symfony** (API Platform, Docker, PostgreSQL), le front en **Expo / React Native**.

Aujourd'hui, l'endpoint `GET /api/recommendations` utilise `RecommendationStateProvider` qui filtre les activités publiées dont la catégorie correspond aux **intérêts** de l'utilisateur connecté. C'est un filtre par catégorie, sans notion de pertinence fine.

L'objectif est d'ajouter un **LLM** pour **re-ranker** (réordonner) les activités candidates et proposer des recommandations plus pertinentes — sans changer le modèle de données existant.

---

## Objectif

Améliorer la qualité de `/recommendations` en ajoutant un LLM pour **réordonner** des activités candidates déjà filtrées par les règles actuelles (intérêts utilisateur → catégorie + `isPublished`).

### Pourquoi re-rank plutôt que "générer des reco"

- **Stabilité** : le LLM ne "crée" pas d'activités, il classe parmi une liste connue.
- **Sécurité** : on vérifie que les IDs renvoyés appartiennent aux candidates.
- **Performance** : on limite le nombre de candidats et la taille du prompt.

---

## 1) État actuel du backend

`RecommendationStateProvider` (`odos-back/src/State/RecommendationStateProvider.php`) :

1. Récupère `user->getInterests()` (catégories).
2. Si pas d'intérêts → renvoie toutes les activités publiées (fallback).
3. Sinon → requête DB : activités publiées dont `category.id IN (:categoryIds)`, triées par `id DESC`.

> **Point d'insertion LLM** : juste après la récupération des candidates et avant le retour final.

---

## 2) Design cible : pipeline recommandations + LLM

### Étapes de la pipeline

```
1. Candidates (DB)
   └─ Règle actuelle (catégories + isPublished) conservée.

2. Tronquage / Limite candidats
   └─ max 50 candidates.

3. Re-ranking LLM (top-K)
   └─ Le LLM reçoit : intérêts (noms) + liste candidates (id + champs minimaux).
   └─ Le LLM renvoie un JSON strict ranked_ids (+ optionnellement scores/explications).

4. Validation stricte
   └─ Vérifier que ranked_ids ⊆ candidate_ids.
   └─ Compléter avec les manquants (fallback) si le LLM ne renvoie pas exactement K IDs.

5. Retour API
   └─ Entités Activity dans l'ordre LLM.
```

---

## 3) Contrat API LLM (prompt + JSON strict)

### Payload envoyé au LLM (exemple)

```json
{
  "user_interests": ["Music", "Travel", "Nature"],
  "candidates": [
    {
      "id": 12,
      "name": "Concert au Parc",
      "description": "Un concert en plein air dans le parc de la Tête d'Or...",
      "category": "Music",
      "city": "Lyon"
    }
  ]
}
```

### Contraintes à inclure dans le prompt système

- "**Réordonner uniquement** les IDs fournis."
- "Ne pas inventer d'IDs."
- "Réponse JSON **uniquement**."
- "Top-K = 15."

### Format de réponse JSON attendu

```json
{
  "ranked_ids": [12, 34, 5, 7],
  "explanations": {
    "12": "Concert en plein air, correspond à votre intérêt Music et Nature.",
    "34": "Randonnée en montagne, lié à votre intérêt Travel."
  }
}
```

> `explanations` est optionnel. Par défaut, ne pas l'afficher côté front pour limiter la latence. Si tu veux l'afficher ("pourquoi c'est recommandé ?"), c'est un bonus.

---

## 4) Stratégies performance & robustesse

### 4.1 Limites

| Paramètre | Valeur recommandée |
|---|---|
| `candidate_max` | 50 |
| `top_k` | 15 |
| `description_max_chars` | 300 (tronquer avant envoi) |
| `timeout LLM` | 3–5s (dev), 2–3s (prod) |

### 4.2 Cache (indispensable)

**Clé de cache** (exemple) :

```
sha256(user_id + ":" + sorted(interest_category_ids))
```

**TTL** : 15–60 minutes selon la fréquence de mise à jour des activités.

**Stock** : Redis (recommandé) ou cache Symfony fichier (dev).

**Flow** :
1. Avant appel LLM → check cache.
2. Si cache hit → retour direct.
3. Si miss → appel LLM → set cache → retour.

### 4.3 Fallback en cas d'échec LLM

Si :
- LLM timeout
- réponse JSON invalide
- IDs non reconnus

Alors :
- fallback sur `candidates` triées par l'ordre DB actuel (`id DESC`).
- log l'erreur pour diagnostic, sans casser l'app.

---

## 5) Architecture LLM : local vs prod

### 5.1 Choix du "serveur LLM"

| | Local (dev) | Prod (futur) |
|---|---|---|
| **Option A** | **Ollama** en Docker (simple, gratuit, CPU ou GPU) | **vLLM** ou **TGI** sur GPU dédié |
| **Option B** | **LM Studio** (sans Docker, UI desktop) | **API managée** (OpenAI / Anthropic / Mistral) |
| Modèle | Petit (7B–8B quantisé) | 7B–13B quantisé ou API cloud |
| Latence | ~1–5s (CPU), <1s (GPU) | <1s (GPU) ou ~0.5–2s (API cloud) |

### 5.2 Recommandation hardware (prod self-host)

Pour du re-ranking avec un modèle 7B–8B quantisé :
- **GPU 16–24 Go VRAM** (NVIDIA L4, A10, RTX 4090)
- **RAM système** : 32 Go+
- **vLLM** pour servir efficacement avec batching

---

## 6) Intégration Docker — plan local (maintenant)

### 6.1 Architecture cible Docker (dev)

```
┌─────────────────────────────────────────────┐
│                Docker network               │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ odos-back│  │ postgres │  │   nginx   │ │
│  │ (Symfony)│  │          │  │           │ │
│  └────┬─────┘  └──────────┘  └───────────┘ │
│       │                                     │
│       │ HTTP (http://llm:11434)             │
│       ▼                                     │
│  ┌──────────┐  ┌──────────┐                 │
│  │   llm    │  │  redis   │  (optionnel)    │
│  │ (Ollama) │  │  (cache) │                 │
│  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────┘
```

### 6.2 Variables d'environnement à ajouter (`odos-back/.env`)

```env
# LLM Configuration
LLM_PROVIDER=ollama
LLM_BASE_URL=http://llm:11434
LLM_MODEL=mistral
LLM_TIMEOUT_MS=5000
LLM_TOP_K=15
LLM_CANDIDATE_MAX=50
LLM_ENABLED=true
```

---

## 7) Implémentation backend (étapes concrètes)

### 7.1 Étape 1 : extraire "candidates" dans le provider

Garder la requête DB actuelle. Transformer le résultat en :
- `candidates[]` (entités Activity)
- `candidate_ids[]`

### 7.2 Étape 2 : créer un DTO pour le LLM

Exemple : `CandidateForLlm { id, name, description, categoryName, city }`

### 7.3 Étape 3 : créer `LlmRankingService`

Méthodes :
- `rankActivities(interests[], candidates[]): int[]` (retourne IDs ordonnés)

Le service :
1. Construit le prompt (système + utilisateur).
2. Appelle l'API du modèle (Ollama / OpenAI / …).
3. Parse la réponse JSON.
4. Applique validation stricte (IDs ⊆ candidates).
5. Fallback si erreur.

### 7.4 Étape 4 : brancher dans `RecommendationStateProvider`

```
candidates = DB query (actuel)
if LLM_ENABLED:
    rankedIds = llmService.rankActivities(interests, candidates)
    return reorder(candidates, rankedIds)
else:
    return candidates (ordre DB)
```

### 7.5 Étape 5 : cache

- Avant appel LLM : check cache (clé = hash intérêts user).
- Après réponse : set cache (TTL configurable).

---

## 8) Fichiers à créer / modifier (Symfony)

| Fichier | Action |
|---|---|
| `src/Service/LlmRankingService.php` | **Créer** — client HTTP + prompt + parsing + validation |
| `src/DTO/CandidateForLlm.php` | **Créer** — DTO léger pour sérialiser vers le prompt |
| `src/State/RecommendationStateProvider.php` | **Modifier** — injecter `LlmRankingService`, appeler après DB |
| `config/services.yaml` | **Modifier** — déclarer les paramètres LLM (env vars) |
| `.env` | **Modifier** — ajouter les env vars LLM |
| `docker-compose.yml` (ou compose dédié) | **Modifier** — ajouter service `llm` (Ollama) |

---

## 9) Mise à jour front (optionnelle)

Le front actuel (`useRecommendations` → `GET /api/recommendations`) affiche déjà la liste.

### Option A (minimum — rien à changer)
La qualité vient du nouvel ordre des entités renvoyées. Le front n'a rien à faire.

### Option B (améliorée)
Si tu renvoies `explanations[id]` dans la réponse API, le front peut afficher :
- Un petit texte "Pourquoi c'est recommandé ?" sous chaque carte.
- Garde ça **court** (1 phrase max).

---

## 10) Sécurité & conformité

- **Ne jamais envoyer** de secrets (tokens JWT, mots de passe, email utilisateur) au LLM.
- **Minimiser PII** : n'envoyer que noms de catégories et features d'activités publiques.
- **Logger uniquement** : timings, user_id (ou hash), IDs candidates et IDs classés. Pas de descriptions complètes.
- **Rate limiting** côté backend (même interne) pour éviter abus.
- **RGPD** : si LLM cloud (OpenAI, etc.), cadrer le traitement des données dans la politique de confidentialité.

---

## 11) Plan de déploiement — Local (maintenant)

1. Ajouter le container **Ollama** dans Docker Compose.
2. Télécharger un modèle (ex. `ollama pull mistral`).
3. Créer `LlmRankingService` dans Symfony.
4. Brancher le re-rank dans `RecommendationStateProvider` :
   - DB candidates → LLM re-rank → validation → retour.
5. Ajouter cache (Redis ou fichier Symfony).
6. Activer fallback automatique si LLM en erreur.
7. Tester :
   - Utilisateur sans intérêts (fallback toutes activités).
   - Utilisateur avec intérêts multiples.
   - Latence endpoint `/recommendations` (<5s acceptable en dev).
   - Logs LLM + validation.

---

## 12) Plan de déploiement — Prod (futur)

1. **Séparer l'infra LLM** de l'app (VM ou serveur GPU dédié).
2. **Choisir modèle** et stratégie : vLLM/TGI + GPU, ou API managée.
3. **Cache robuste** : Redis cluster ou managé.
4. **Garde-fous** :
   - Circuit breaker (si LLM tombe → fallback DB direct).
   - Monitoring (latence p95, taux erreurs JSON, taux fallback).
5. **Option async** (si latence trop haute) :
   - Pré-calcul des reco lors du changement d'intérêts via job Symfony Messenger.
   - L'endpoint `/recommendations` lit la donnée pré-calculée (latence basse).
6. **Scaling** :
   - Plusieurs instances vLLM derrière un load balancer si besoin.
   - Autoscaling GPU si cloud (AWS/GCP).

---

## Résumé visuel

```
┌──────────────────────────────────────────────────────────────┐
│                        UTILISATEUR                           │
│                     (app mobile Expo)                        │
└──────────────────────────┬───────────────────────────────────┘
                           │ GET /api/recommendations
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                   SYMFONY BACKEND                            │
│                                                              │
│  RecommendationStateProvider                                 │
│  ┌────────────────────┐                                      │
│  │ 1. DB : candidates │ (catégories user + isPublished)      │
│  │    (max 50)        │                                      │
│  └────────┬───────────┘                                      │
│           │                                                  │
│           ▼                                                  │
│  ┌────────────────────┐    ┌───────────┐                     │
│  │ 2. Cache check     │───▶│   Redis   │                     │
│  └────────┬───────────┘    └───────────┘                     │
│           │ miss                                             │
│           ▼                                                  │
│  ┌────────────────────┐    ┌───────────┐                     │
│  │ 3. LLM re-rank     │───▶│  Ollama   │ (ou API cloud)     │
│  │    (top-K=15)       │    │  (Docker) │                     │
│  └────────┬───────────┘    └───────────┘                     │
│           │                                                  │
│           ▼                                                  │
│  ┌────────────────────┐                                      │
│  │ 4. Validation      │ (IDs ⊆ candidates, fallback si KO)  │
│  └────────┬───────────┘                                      │
│           │                                                  │
│           ▼                                                  │
│  ┌────────────────────┐                                      │
│  │ 5. Retour JSON     │ (activités réordonnées)              │
│  └────────────────────┘                                      │
└──────────────────────────────────────────────────────────────┘
```
