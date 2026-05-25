# CI/CD — version 1 (archive)

**Historique uniquement.** Doc active : [CI_CD_V2_2026.md](../CI_CD_V2_2026.md)

---

## Contexte

Première version du pipeline pour le monorepo ODOS :

- Backend : `odos-back` (Symfony 7, PHP 8.2, Docker prod)
- Frontend : `odos-front` (Expo, pnpm)
- Local : Docker Compose (PostgreSQL, Redis, Nginx, Ollama)

Objectif à l'époque : CI fiable sur GitHub Actions + option de deploy backend sur un PaaS gratuit.

---

## Ce que la v1 faisait

| Couche | Rôle |
|--------|------|
| CI | Install, validate, lint, tests à chaque PR / push `main` |
| CD | Deploy API optionnel (Render, Fly.io, Railway, VPS) |
| Secrets | GitHub Secrets + variables PaaS, jamais dans le code |

**Contrainte :** sur un PaaS gratuit, Ollama n'est en général pas dispo. Il fallait `LLM_ENABLED=false` ou un LLM externe.

---

## Évolutions depuis

Tout ça est couvert par la V2 :

- cache Composer / pnpm
- deploy Contabo (`deploy-prod.yml`)
- artifacts coverage
- build Docker prod en CI

---

*Archivé mai 2026.*
