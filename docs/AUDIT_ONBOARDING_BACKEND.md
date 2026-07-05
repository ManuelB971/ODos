# Audit — Onboarding inscription (backend API) & dashboard admin

_Date : 2026-07-05 — périmètre : `odos-back` (scénario inscription/session) + EasyAdmin. MFA hors périmètre (désactivé en prod)._

## 1. Les scénarios audités

**A. Inscription mobile (API)**
```
POST /api/users {email, plainPassword, acceptTerms}
  → UserRegistrationProcessor (consentement + alias)
  → UserPasswordHasherProcessor (hash)
  → Doctrine persist  → 201
POST /api/login → JWT (json_login)  → GET /api/me
```

**B. Dashboard admin (EasyAdmin, MFA off)**
```
/admin (ROLE_ADMIN) → form_login (app_login) → session → DashboardController::index
```

Fichiers clés : [User.php](../odos-back/src/Entity/User.php), [UserRegistrationProcessor.php](../odos-back/src/State/UserRegistrationProcessor.php), [UserPasswordHasherProcessor.php](../odos-back/src/State/UserPasswordHasherProcessor.php), [SecurityController.php](../odos-back/src/Controller/SecurityController.php), [UserCrudController.php](../odos-back/src/Controller/Admin/UserCrudController.php), [security.yaml](../odos-back/config/packages/security.yaml), [services.yaml](../odos-back/config/services.yaml).

## 2. Bugs identifiés

### 🔴 BUG-B1 — Incohérence de politique de mot de passe front/back (inscription cassée)

**Constat.** Le backend impose sur `User::$plainPassword` :
- `Assert\Length(min: 8)`
- `Assert\Regex('/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).+$/')` → 1 majuscule + 1 minuscule + 1 chiffre + 1 caractère spécial.

Or le **front** ([login.tsx](../odos-front/app/login.tsx)) validait seulement `password.length >= 6`, avec un placeholder « Au moins 6 caractères » et un hint « 6 caractères minimum ». Un utilisateur saisissant `abcdef` (ou `Password1`) passe la validation client, envoie le POST, et le backend **rejette en 422**. L'UI invite donc activement à choisir des mots de passe que le serveur refuse.

**Correctif (côté front — le backend est la source de vérité de sécurité, on ne l'affaiblit pas) :**
- Nouveau validateur `isStrongPassword` alignant exactement la regex + longueur backend, appliqué **à l'inscription uniquement** (login reste permissif : les comptes existants ont déjà un mot de passe conforme, inutile de les bloquer).
- Placeholder + hint + message d'erreur (`auth.errors.passwordWeak`) mis à jour et traduits **fr / en / ar**.

### 🟠 BUG-B2 — Redirection MFA non gardée par le flag (piège admin quand MFA off)

[SecurityController::login()](../odos-back/src/Controller/SecurityController.php#L37-L43) : un admin **déjà authentifié** qui atteint `/login` est redirigé vers `app_admin_mfa` **sans vérifier `ADMIN_MFA_ENABLED`** :
```php
if ($this->isGranted('ROLE_ADMIN') && !$this->getSessionFlag()) {
    return $this->redirectToRoute('app_admin_mfa');
}
```
Le [AdminMfaSubscriber](../odos-back/src/EventSubscriber/AdminMfaSubscriber.php#L32), lui, est **correctement gardé** (`if (!$this->mfaEnabled) return;`) → le scénario nominal `/admin` fonctionne. Mais si l'admin navigue vers `/login` en étant connecté, il tombe sur un écran MFA impossible à valider (TOTP/SMS non configurés en prod) → **coincé**.

> Non corrigé : hors périmètre MFA sur ta consigne. **Recommandation** si tu veux le fermer : garder ce bloc derrière `ADMIN_MFA_ENABLED` (injecter le flag comme dans le subscriber), ou rediriger vers la cible par défaut quand MFA off.

### 🟡 BUG-B3 (mineur) — Utilisateur créé depuis EasyAdmin : consentement RGPD non horodaté

La logique `consentedAt` + alias par défaut vit dans [UserRegistrationProcessor](../odos-back/src/State/UserRegistrationProcessor.php), qui ne s'exécute **que sur le POST API**. Un utilisateur créé via [UserCrudController](../odos-back/src/Controller/Admin/UserCrudController.php) a `consentedAt = null` et `alias = null` (sauf saisie). Impact faible (cas exceptionnel), mais l'`alias` nul rend le compte non trouvable en recherche d'amis et le consentement n'est pas tracé. **Recommandation :** initialiser `consentedAt`/`alias` dans `persistEntity`.

## 3. Points vérifiés — SANS bug

- **Chaînage des processors** [services.yaml:56-63](../odos-back/config/services.yaml#L56-L63) : `UserRegistrationProcessor` **décore** `UserPasswordHasherProcessor`. L'opération `Post(processor: UserPasswordHasherProcessor)` invoque donc bien le décorateur → **le consentement `acceptTerms` est réellement vérifié** avant hash + persist. ✅
- **Garde MFA** : `AdminMfaSubscriber` respecte `ADMIN_MFA_ENABLED` → `/admin` accessible avec MFA off. ✅
- **Hachage mot de passe admin** : `persistEntity`/`updateEntity` de `UserCrudController` hashent `plainPassword`. ✅
- **Gardes admin** : anti-auto-démotion et anti-auto-suppression du compte admin courant. ✅
- **access_control** : `POST /api/users` en `PUBLIC_ACCESS`, `/admin` en `ROLE_ADMIN`, reste de l'API `IS_AUTHENTICATED_FULLY`. Cohérent. ✅
- **Unicité alias** : `AliasGenerator` dédoublonne contre la base (`findForUniqueAlias`) + suffixe incrémental → pas de collision `UniqueEntity` à l'inscription. ✅
- **Validation sur PATCH** (édition intérêts/ville) : `plainPassword` nul → contraintes ignorées (Symfony skip null) ; pas de blocage. ✅

## 4. Correctifs appliqués (front, alignement contrat backend)

| Fichier | Changement |
|---------|-----------|
| [app/login.tsx](../odos-front/app/login.tsx) | `isStrongPassword` (regex + min 8 = politique backend), appliqué à l'inscription ; message `passwordWeak` |
| [i18n/locales/fr.json](../odos-front/i18n/locales/fr.json) · [en.json](../odos-front/i18n/locales/en.json) · [ar.json](../odos-front/i18n/locales/ar.json) | placeholder + hint + clé `errors.passwordWeak` |

## 5. Validation

- JSON fr/en/ar : **valides**.
- `tsc --noEmit` : **0 erreur introduite** dans `login.tsx`.
- Aucun fichier backend modifié → **pas de régression PHPStan/PHPUnit** possible.

## 6. Recommandations

- **Tester le scénario complet** signup avec mot de passe faible (doit être refusé côté client avec message clair) puis fort (doit passer jusqu'à `/api/me`).
- **BUG-B2** : décider si on ferme le piège `/login`→MFA quand MFA off (une ligne à garder derrière le flag).
- **BUG-B3** : initialiser `consentedAt`/`alias` pour les créations admin si ce chemin est utilisé.
- **Source unique de la politique de mot de passe** : envisager d'exposer la regex via un endpoint de config ou un constant partagé documenté, pour éviter toute future dérive front/back (cf. [[onboarding-setuser-loop]] et le nouveau mémo).
