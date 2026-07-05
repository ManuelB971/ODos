# Audit — Onboarding inscription & bascule de session

_Date : 2026-07-05 — périmètre : `odos-front` (parcours post-inscription)._

## 1. Le parcours attendu

```
login (signup) ──> /interests ──> /onboarding-city ──> / (tabs)
       │               │                  │
   setUser         choix goûts        choix ville
```

Écrans concernés :
- [app/login.tsx](../odos-front/app/login.tsx) — inscription + connexion auto
- [app/interests.tsx](../odos-front/app/interests.tsx) — étape 1 : centres d'intérêt
- [app/onboarding-city.tsx](../odos-front/app/onboarding-city.tsx) — étape 2 : ville
- [app/(tabs)/_layout.tsx](../odos-front/app/(tabs)/_layout.tsx) — **garde d'onboarding** (redirige tant que le parcours est incomplet)
- [utils/onboardingRoute.ts](../odos-front/utils/onboardingRoute.ts) — logique de routage (`getOnboardingRoute` / `hasCompletedOnboarding`)

## 2. La bascule logique réelle (avant correction)

Point clé souvent oublié : `signUp` **connecte immédiatement** l'utilisateur (POST `/api/users` → `signIn` → tokens + `/api/me`) et `setUser` remplit le contexte **avant** de naviguer. Donc **`user` est TOUJOURS défini** dès l'écran `/interests`.

Or `interests.tsx` utilisait `user` (truthy/falsy) comme discriminant « onboarding vs édition ». Comme `user` est toujours vrai, la logique était cassée.

## 3. Bugs identifiés

### 🔴 BUG-1 — Boucle infinie : l'inscription ne peut pas se terminer (bloquant)

**Cause :** `interests.tsx > handleContinue` enregistrait les intérêts côté serveur (`updateUserInterests`) et dans `InterestContext`, mais **ne mettait jamais à jour `user.interests` dans `AuthContext`**.

Conséquence, à la fin du parcours :
1. `onboarding-city` fait `setUser({ ...user, homeCity })` → `user.interests` reste `[]`.
2. Retour sur `/` → le garde [(tabs)/_layout.tsx:42-48](../odos-front/app/(tabs)/_layout.tsx#L42-L48) évalue `hasCompletedOnboarding(user)`.
3. `getOnboardingRoute` voit `interests.length === 0` → renvoie `/interests`.
4. **L'utilisateur est renvoyé sur l'écran des intérêts** → boucle, jamais d'accès à l'app.

> Le garde de reprise (bonne pratique) rend le bug **bloquant** : sans lui, l'utilisateur atteignait quand même `/` avec un état incohérent.

**Correctif :** après `updateUserInterests`, refléter la sélection dans le user d'auth :
```ts
setUser({ ...user, interests: selectedCategories });
```

### 🟠 BUG-2 — Écran d'intérêts en mode « édition » pendant l'inscription

`{!user ? <Étape 1/2> : null}` et `{user ? <retour> : <vide>}` : comme `user` est toujours vrai, **l'indicateur d'étapes « 1/2 » ne s'affichait jamais** (code mort) et **un bouton retour** apparaissait — retour piégeux car `login` a été détruit par `router.replace`.

**Correctif :** discriminant correct = **parcours terminé ou non**, pas « user existe » :
```ts
const isOnboarding = !user || !hasCompletedOnboarding(user);
```
- onboarding → indicateur d'étapes visible, pas de retour ;
- édition depuis le compte → retour classique.

### 🟠 BUG-3 — Édition des intérêts depuis le compte → renvoi sur l'onboarding ville

`handleContinue` faisait **toujours** `router.replace('/onboarding-city')`. Un utilisateur déjà onboardé qui modifie ses intérêts depuis `Compte` ([account.tsx:197](../odos-front/app/(tabs)/account.tsx#L197)) était envoyé sur l'écran d'onboarding ville au lieu de revenir en arrière.

**Correctif :**
```ts
if (isOnboarding) router.replace(ONBOARDING_CITY_HREF);
else router.back();
```

## 4. Points vérifiés — SANS bug

- **Garde de reprise** [(tabs)/_layout.tsx](../odos-front/app/(tabs)/_layout.tsx) : reprend correctement un onboarding interrompu au redémarrage (via `/api/me`). ✅
- **Catalogue de villes vide** : `onboarding-city` + le garde laissent passer l'utilisateur (`cities.length === 0`) au lieu de l'enfermer. ✅
- **Édition ville** : gérée séparément dans [settings.tsx](../odos-front/app/settings.tsx) (updateProfile + setUser) ; `onboarding-city` n'est utilisé QUE dans le flux d'onboarding. ✅
- **Fuite inter-comptes** : `InterestContext` / `CityContext` se ré-hydratent sur changement de `user.id`. ✅
- **`homeCity`** : déjà correctement propagé via `setUser` dans `onboarding-city`. ✅

## 5. Correctifs appliqués

Fichier : [app/interests.tsx](../odos-front/app/interests.tsx)

| # | Correctif |
|---|-----------|
| BUG-1 | `setUser({ ...user, interests: selectedCategories })` après enregistrement serveur |
| BUG-2 | `isOnboarding = !user \|\| !hasCompletedOnboarding(user)` pilote l'indicateur d'étapes et le bouton retour |
| BUG-3 | Navigation conditionnelle : onboarding → ville, édition → `router.back()` |

## 6. Validation

- `npx tsc --noEmit` : **0 erreur introduite** (35 erreurs pré-existantes, fichiers non liés, inchangées).
- `jest utils/onboardingRoute.test.ts` : **3/3 verts**.

## 7. Recommandations (non bloquant)

- **Tester le scénario complet** signup → intérêts → ville → home en simulateur/APK pour confirmer la fin de boucle (`/verify`).
- **Ajouter un test** couvrant : après onboarding complet, `hasCompletedOnboarding(user)` est vrai côté contexte (garde-fou contre une régression de BUG-1).
- **Source de vérité** : envisager de rafraîchir le `user` via `/api/me` (ou `checkAuth`) après les mutations profil, plutôt que des `setUser({ ...user, X })` locaux — évite tout futur écart entre contexte et serveur.
- Le CTA « Choisir mes intérêts » de [index.tsx:364](../odos-front/app/(tabs)/index.tsx#L364) est de fait inatteignable (le garde redirige avant), à nettoyer ou à conserver comme filet de sécurité.
