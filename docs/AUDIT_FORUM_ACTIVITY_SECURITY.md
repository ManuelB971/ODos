# Audit & correctifs — Forum, exposition API Activity, whitelist images

_Date : 2026-07-05 — périmètre : `odos-back`. Suite des recommandations prioritaires._

## Résumé

| Tâche | Statut | Gravité |
|-------|--------|---------|
| 1. Borne `Length(max: 4000)` sur le contenu des fils forum | ✅ Fait | Moyenne (abus/DoS stockage) |
| 2. Audit exposition `POST/PATCH` d'`Activity` aux non-admins | ✅ **Vuln confirmée + corrigée** | 🔴 Élevée (élévation de privilège) |
| 3. Whitelist URL (`https://`, `/uploads/`) sur les champs image admin | ✅ Fait (optionnel) | Faible (defense-in-depth) |
| 4. Tests : `CommentContentSanitizer` étendu + contenu de fil trop long | ✅ Fait | — |

Validation : **PHPUnit 10/10 verts** sur les fichiers touchés (+ suite complète : seuls 3 échecs **pré-existants et environnementaux** — `GamificationServiceTest` exige `DATABASE_URL`, fourni en Docker/CI). **PHPStan niveau 8 : 0 erreur.**

---

## Tâche 2 — 🔴 Exposition des écritures Activity (vulnérabilité)

**Constat.** [Activity.php](../odos-back/src/Entity/Activity.php) déclarait :
```php
#[ApiResource(
    normalizationContext: ['groups' => ['activity:read']],
    denormalizationContext: ['groups' => ['activity:write']]
)]  // ← aucune `operations`, aucun `security`
```
Sans `operations`, API Platform génère **toutes** les opérations par défaut (`GetCollection`, `Get`, `Post`, `Put`, `Patch`, `Delete`) **sans contrôle**. Or [security.yaml](../odos-back/config/packages/security.yaml) n'expose en `PUBLIC_ACCESS` que `GET /api/activities` ; le reste tombe sur la règle attrape-tout `- { path: ^/api, roles: IS_AUTHENTICATED_FULLY }`.

**Conséquence :** tout utilisateur **authentifié (ROLE_USER)** pouvait `POST` / `PATCH` / `PUT` / `DELETE` une activité via l'API — création et falsification du catalogue, suppression de contenus. La création légitime passe pourtant uniquement par l'admin (EasyAdmin) et l'import.

**Correctif.** Opérations déclarées explicitement, écritures verrouillées :
```php
operations: [
    new GetCollection(),                              // lecture publique (firewall)
    new Get(),
    new Post(security:   "is_granted('ROLE_ADMIN')"),
    new Put(security:    "is_granted('ROLE_ADMIN')"),
    new Patch(security:  "is_granted('ROLE_ADMIN')"),
    new Delete(security: "is_granted('ROLE_ADMIN')"),
]
```
Lecture publique préservée (le firewall autorise déjà `GET /api/activities`). Aucun flux applicatif ne faisait d'écriture API (favoris/notes/commentaires passent par des contrôleurs custom dédiés).

> **Reco de suivi :** appliquer la même vérification aux autres entités `ApiResource` — toute ressource sans `operations`/`security` explicite hérite d'écritures ouvertes. Voir le mémo [[apiresource-default-operations-open]].

---

## Tâche 1 — Borne de taille du contenu des fils

[ForumThreadController::create](../odos-back/src/Controller/ForumThreadController.php) ne validait que la présence du contenu (`'' === trim($content)`), **sans maximum** → un fil pouvait stocker plusieurs Mo. Les **réponses** étaient déjà bornées (`Length(min: 2, max: 2000)`), pas les fils.

Ajout, aligné sur le front (`CONTENT_MAX = 4000` dans [thread/create.tsx](../odos-front/app/thread/create.tsx)) :
```php
$contentViolations = $this->validator->validate($content, [
    new Assert\Length(min: 2, max: 4000, /* messages */),
]);
if (count($contentViolations) > 0) {
    return $this->json([...], Response::HTTP_UNPROCESSABLE_ENTITY); // 422
}
```
Contenu manquant → `400` (inchangé) ; contenu **trop long** → `422`.

---

## Tâche 3 — Whitelist URL sur les champs image admin (optionnel)

Champs concernés : `Activity.imageUrl` ([ActivityCrudController](../odos-back/src/Controller/Admin/ActivityCrudController.php)) et `BadgeDefinition.imageUrl` ([BadgeDefinitionCrudController](../odos-back/src/Controller/Admin/BadgeDefinitionCrudController.php)).

Contrainte attachée **au champ de formulaire** (et non à l'entité, pour ne pas casser l'import qui peut porter des URLs externes historiques) :
```php
->setFormTypeOption('constraints', [
    new Assert\Regex(pattern: '#^(https://|/uploads/)#', message: '…'),
])
```
Bloque `javascript:`, `data:`, `http:`… Le `RegexValidator` de Symfony ignore `null`/`''` → le champ reste optionnel (téléversement possible à la place).

---

## Tâche 4 — Tests (unit-only, sans DB)

- [CommentContentSanitizerTest](../odos-back/tests/CommentContentSanitizerTest.php) : +4 cas (blanc/tags seuls → `''`, strip d'attributs `onclick`/`href`, collapse d'espaces répétés, texte déjà propre inchangé).
- [ForumThreadContentValidationTest](../odos-back/tests/ForumThreadContentValidationTest.php) (nouveau) : la contrainte de contenu (identique à celle du contrôleur) **rejette** `> 4000` et un contenu de 2 Mo, **rejette** `< 2`, **accepte** `4000` et un message normal.

> La suite étant unit-only (pas de kernel HTTP/DB), le « → 422 » n'est pas asserté par un test fonctionnel : on teste la **règle de validation** exactement telle qu'appliquée par le contrôleur (qui renvoie 422 sur violation). Un vrai test `WebTestCase` nécessiterait d'introduire une base de tests, hors du dispositif actuel.

## Fichiers modifiés

- `src/Entity/Activity.php` — opérations + sécurité écritures
- `src/Controller/ForumThreadController.php` — borne 4000 + 422
- `src/Controller/Admin/ActivityCrudController.php` · `BadgeDefinitionCrudController.php` — whitelist image
- `tests/CommentContentSanitizerTest.php` · `tests/ForumThreadContentValidationTest.php`
