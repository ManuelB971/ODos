# Authentification & session

Connexion, inscription et gestion de la session JWT dans l’app mobile ODOS.

**Voir aussi :** [profil-parametres.md](profil-parametres.md) · [rgpd-compte.md](rgpd-compte.md) · [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## Principe

1. L’utilisateur s’inscrit ou se connecte via un écran unifié (`/login`).
2. Le backend renvoie un **access token** (JWT Lexik) et un **refresh token** (Gesdinet).
3. Les tokens sont stockés dans **expo-secure-store** ; Axios les injecte sur chaque requête `/api/*`.
4. En cas de 401, le client tente un refresh automatique avant déconnexion.
5. `AuthContext` expose `user`, `isAuthenticated`, `setUser`, `logout`.

---

## API

| Méthode | Chemin | Auth | Rôle |
|---------|--------|------|------|
| POST | `/api/users` | Public | Inscription (`email`, `plainPassword`, `acceptTerms`) |
| POST | `/api/login` | Public | Connexion → `{ token, refresh_token }` |
| POST | `/api/token/refresh` | Public | Renouvellement du JWT |
| POST | `/api/logout` | JWT | Invalidation du refresh token |
| GET | `/api/me` | User | Profil courant (favoris, intérêts, badges…) |

Inscription : le `UserRegistrationProcessor` hash le mot de passe et enregistre le consentement CGU (`termsAcceptedAt`).

---

## Mobile

| Fichier | Rôle |
|---------|------|
| `app/login.tsx` | Écran login / signup (switch, validation email, CGU) |
| `services/AuthService.ts` | `signUp`, `signIn`, helpers logout |
| `context/AuthContext.tsx` | État session, bootstrap au démarrage |
| `scripts/api.ts` | Intercepteurs JWT + refresh sur 401 |

**Validation côté client :** email format valide, mot de passe ≥ 6 caractères, acceptation CGU obligatoire à l’inscription.

**Après connexion :** redirection vers l’accueil ; le cache React Query est invalidé au changement de compte pour éviter les fuites inter-utilisateurs.

---

## Sécurité

- JWT stateless côté API ; routes sensibles protégées par `ROLE_USER`.
- Throttle login / inscription via `UserActionThrottleService` (voir config Symfony).
- Aucun mot de passe stocké en clair ; hash Symfony PasswordHasher.

---

## RGPD

- Consentement CGU horodaté à l’inscription (traitement **T1** — voir [RGPD_registre.md](../RGPD_registre.md)).
- Suppression compte : [rgpd-compte.md](rgpd-compte.md).

---

*Dernière mise à jour : mai 2026.*
