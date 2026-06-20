# Audit UI/UX — Front mobile ODOS (fusionné)

Audit unique du front Expo (`odos-front/`) — **fusion de l'ancienne revue code (V1) et de l'audit UI/UX Pro Max (V2)**, statuts re-vérifiés sur le code courant.

Croisé avec :

- **[UI/UX Pro Max](file:///C:/Users/MANUEL/.claude/skills/ui-ux-pro-max/SKILL.md)** — grille priorités 1→10, 99 guidelines UX, anti-patterns, archétypes produit (skill global)
- [`DESIGN_JAKOB_FLOWS.md`](DESIGN_JAKOB_FLOWS.md) — flows familiers, hiérarchie CTA, empty states (matrice §7, itérations §7.1–7.3)
- [`DESIGN_DIRECTION.md`](DESIGN_DIRECTION.md) — direction artistique (palette, typo, formes, anti-patterns §10)

**Complète** [`DA_APP_GAP.md`](DA_APP_GAP.md) (checklist DA écran par écran).
**Dernière révision :** 2026-06-20 · branche `dev` · ~35 écrans routés · skill Pro Max chargé + revue code.

> **Fusion** de l'ancienne revue code ligne-à-ligne (ex-V1) **et** de l'audit Pro Max (ex-`AUDIT_UI_UX_FRONT_V2.md`, supprimé). Document unique désormais ; ne plus maintenir de fichiers séparés.

---

## 0. Méthode

### Skill UI/UX Pro Max

- Skill global : `C:\Users\MANUEL\.claude\skills\ui-ux-pro-max\` (contenu chargé ; le `scripts/search.py` est un **pointeur cassé** — voir annexe pour réparation, mais la grille SKILL.md suffit).
- Grille appliquée : priorités **1→10** (Accessibilité → Charts), avec les ID de règles (`#touch-target-size`, `#empty-states`, `#deep-linking`, etc.).
- Archétypes produit ODOS : **Local Events & Discovery**, **Hyperlocal Services**, **Social Media App**.

### Périmètre

| Zone | Contenu |
|------|---------|
| Routes | `odos-front/app/**/*.tsx` (~35 écrans) |
| Thème | `ThemeContext`, `constants/themes/`, `usePop.ts`, `appearance.tsx` |
| Composants UX | `CTAButton`, `InputField`, `PopEmptyState`, `InlineToast`, `MosaicPopCard`, `ActivityCard`, `HapticTab`, `MapExperience` |
| Social / parcours / modération | `(tabs)/community/*`, `parcours/*`, `chat/*`, `profile/[id]`, `blocked-users`, signalement forum |

### Métriques (juin 2026, re-mesurées)

| Métrique | Valeur |
|----------|--------|
| `accessibilityLabel` | ~55 occurrences |
| `<Pressable` | ~150+ |
| Couverture label / Pressable | **~44 %** |
| `accessibilityHint` | **0** |
| Safe areas explicites (`useSafeAreaInsets`/`SafeAreaView`) | **~21 %** des écrans |
| `useReducedMotion` | **2** composants |
| Branches `isMosaicPop` | **~30 fichiers** |
| Écrans utilisant `CTAButton` | **10** |
| `PopEmptyState` | **8** écrans |
| `FontFamily.accent` (Courgette) en UI | **0** |

---

## 1. Design system Pro Max recommandé pour ODOS

| Archétype Pro Max | Pattern | Style | Couleurs | Effets clés |
|-------------------|---------|-------|----------|-------------|
| **Local Events & Discovery** | Hero + Feature-Rich | Vibrant & Block + Motion | City vibrant + catégories + accent carte | Scroll animé, transitions |
| **Hyperlocal Services** | Conversion + Feature-Rich | Minimalism + Vibrant Block | Marqueurs lieu + confiance | Reveals carte, fiches lieu |
| **Social Media App** | Feature-Rich Showcase | Vibrant Block + Motion | Couleurs engagement | Badges unread, motion scroll |

**Alignement DA ODOS :** chaleur éditoriale + cartes image-first + onglet Parcours central (Spotify) + social (Instagram/WhatsApp) — direction **validée** par Pro Max. L'écart restant est surtout **exécution** (tokens, touch, feedback, deep links, a11y).

### Anti-patterns Pro Max (severity HIGH) — état ODOS

| Archétype | À éviter | État ODOS |
|-----------|----------|-----------|
| Hyperlocal | Pas de carte, avis cachés | Carte ✓ · avis ✓ · raccourcis listes désormais OK (cœur + parcours sur cartes) |
| Local Events | Couleurs ternes, faible énergie | mosaicPop OK · classic parfois gris sur empty states |
| Social | Skeuomorphisme lourd, a11y ignorée | Risque **icon-only sans labels** persistant |

---

## 2. Synthèse exécutive — scores Pro Max

| Prio | Catégorie | Note | Verdict |
|------|-----------|------|---------|
| 1 | Accessibilité | **5/10** | Auth + CTAButton OK ; listes, hints (0), reduced motion faibles |
| 2 | Touch & interaction | **5/10** | Tabs 32 px ; **HapticTab mort** ; CTAs custom sans loading uniforme |
| 3 | Performance | **6/10** | Mosaïque corrigée ; MapLibre home lourd ; loading hétérogène |
| 4 | Style | **6/10** | Double skin classic/pop ; plusieurs primaires par écran |
| 5 | Layout & safe areas | **5/10** | Insets manquants sur ~79 % des écrans |
| 6 | Typo & couleur | **6/10** | Tokens OK ; hex hardcodés ; **bug persistance variant** |
| 7 | Animation | **5/10** | Reanimated présent ; reduced motion quasi absent |
| 8 | Forms & feedback | **6/10** | Login solide ; empty/error sans recovery |
| 9 | Navigation | **7/10** | Tabs Jakob OK ; deep links / push routing absents |
| 10 | Charts / carte | **5/10** | Pins sans label SR descriptif |

### Trois constats majeurs

1. **A11y icon-only + reduced motion** — ~44 % des Pressables labellés, `accessibilityHint` à 0, `useReducedMotion` sur 2 composants. C'est le bloc le plus critique avant release (Pro Max P1).
2. **Modularité thème fragile** — ~30 fichiers `if (isMosaicPop)`, **bug `readVariantId`** (ocean/forest perdus au restart), hex éparpillés, `CTAButton` hors pop.
3. **Engagement & raccourcis incomplets** — `HapticTab` mort, pas de toast généralisé, empty states sans CTA (Home reco / Messages / Search / Favoris), deep linking non configuré.

### Écrans de référence (à imiter)

| Écran | Pourquoi |
|-------|----------|
| `login.tsx` | CTA, validation, a11y, keyboard, tokens |
| `interests.tsx` | Onboarding sticky CTA |
| `thread/create.tsx` | `InputField` + `CTAButton` + erreurs |
| `activity/[id].tsx` | Sticky « Y aller » (réduire clutter hero) |
| `profile/[id].tsx` | Actions contextuelles + `CTAButton` |
| `forum.tsx` / `groups.tsx` | `PopEmptyState` + CTA (modèle à généraliser) |

---

## 3. Déjà livré depuis les audits V1/V2 (vérifié sur le code, 2026-06-20)

| Domaine | Livré | Statut |
|---------|-------|--------|
| **Parcours « playlists »** | Onglet **central** (5 tabs), bibliothèque [`parcours.tsx`](../odos-front/app/(tabs)/parcours.tsx) + `ParcoursCard` ; pochette photo + **visibilité public/privé** (enum back + migration `Version20260620120000`) ; création **aléatoire** ; lecture seule gated `canEdit` | ✅ |
| **Partage parcours** | [`ParcoursShareTargetSheet`](../odos-front/components/social/ParcoursShareTargetSheet.tsx) (amis + groupes → carte) en DM **et** groupe ; découplage partage / co-édition | ✅ |
| **Co-édition parcours** | Invitation **explicite réservée aux amis** (`POST/DELETE /api/parcours/{id}/collaborators`) ; liste collaborateurs + retrait (propriétaire) | ✅ |
| **Favoris sur cartes de listes** | Cœur + **ajout-à-un-parcours** sur [`MosaicPopCard`](../odos-front/components/cards/MosaicPopCard.tsx) (autonome via [`useFavoriteToggle`](../odos-front/hooks/useFavoriteToggle.ts), clé `['favoriteIds']` partagée avec la fiche) et [`ActivityCard`](../odos-front/components/map/ActivityCard.tsx) via [`ActivityCardQuickActions`](../odos-front/components/cards/ActivityCardQuickActions.tsx) | ✅ |
| **Blocage utilisateur** | `POST/DELETE /api/users/{id}/block`, écran [`blocked-users.tsx`](../odos-front/app/blocked-users.tsx), `useBlocks`, bouton sur `profile/[id]` ; **appliqué partout** : chat, recherche, partage activité, forum, profil, demandes d'ami ; le blocage **révoque la co-édition parcours** (sans effacer les étapes) | ✅ |
| **Signalement forum** | `ForumReport` + `ForumReportController` + `useForumReport` + `ReportContentModal` sur threads & réponses | ✅ |
| **Pull-to-refresh** | Étendu : forum, amis, groupes, **messages**, parcours, blocked-users, thread, group-invitations | ✅ |
| **Social unifié** | `UserAvatar` / `UserLink` (chat, forum, profils, recherche) | ✅ |
| **Crash recherche mosaïque** | FlatList virtualisée | ✅ |

> ⚠️ **Signalement incomplet** : le modèle `ForumReport` ne cible que `thread`/`reply`. **Aucun chemin de signalement** pour messages privés, messages de groupe, commentaires d'activité, profils — voir §9 (modération UGC, exigence stores).

---

## 4. P1 — Accessibilité (CRITICAL)

Règles Pro Max : `#aria-labels`, `#form-labels`, `#reduced-motion`, `#color-contrast`, `#escape-routes`, `#voiceover-sr`

| Règle | État | Fichiers / détail |
|-------|------|-------------------|
| Labels icon-only | 🟡 ~44 % | Messages, search chips, parcours ↑/↓, group actions, retours hero |
| `accessibilityHint` | ❌ **0** | Toute l'app |
| Label SR dérivé du label visuel | ❌ | `InputField.tsx` — seul le **toggle mot de passe** est labellé ; le champ lui-même n'hérite pas de `label` |
| Reduced motion | 🟡 2 composants | `PopEmptyState`, `FriendRequest` ; manque global (Skeleton, CTAButton, Splash, MapPin) |
| Consent piège | ❌ | `community/_layout.tsx` — seul « J'accepte », **pas de « Plus tard »** ni `accessibilityViewIsModal` |
| Touch ≥ 44 pt | 🟡 | Tab slot `minHeight: 32` ; CTAs forum/friends ~8 px padding vertical |
| `+not-found` | ❌ | Anglais, fond blanc par défaut, pas de tokens ni CTA |
| `accessibilityLiveRegion` toasts/erreurs | ❌ | `InlineToast`, bannières login |
| Couleur seule pour info | 🟡 | Chips actifs OK visuel ; vérifier état `selected` SR |

### Corrections P1

1. `InputField` : propager `accessibilityLabel={label}` sur le champ + hint si `helperText` ; `accessibilityLiveRegion` sur l'erreur.
2. Listes sociales : label de ligne = « {alias}, message non lu » / « {activité}, {ville} ».
3. Consent social : bouton **« Plus tard »** (ferme, garde la tab sans social) + `accessibilityViewIsModal`.
4. Hook `useA11yAction(label, hint?)` pour les icon-only récurrents (↑/↓ parcours, actions groupe).
5. `useReducedMotion()` global (durée 0) → Skeleton, CTAButton, Splash, MapPin.
6. `+not-found` : FR + tokens + `CTAButton` « Retour à l'accueil ».

---

## 5. P2 — Touch & interaction (CRITICAL)

Règles : `#touch-target-size`, `#loading-buttons`, `#haptic-feedback`, `#press-feedback`, `#primary-action`, `#gesture-alternative`

### Touch targets

| Zone | Problème | Fix |
|------|----------|-----|
| Tab bar | `minHeight: 32` (`_layout.tsx` L208) | Porter à **44 pt** |
| Forum / Friends CTAs | Padding ~8 px vertical | `CTAButton size="sm"` ou `hitSlop` |
| Parcours reorder/delete | Icônes seules | `hitSlop` + `accessibilityLabel` |

### Haptique

- [`components/HapticTab.tsx`](../odos-front/components/HapticTab.tsx) **existe, toujours pas branché** → `tabBarButton: HapticTab` dans `_layout.tsx`.
- Ajouter haptic sur : favori (cartes), envoi message, acceptation ami.

### CTA custom → `CTAButton` (poids visuel faible)

| Écran | Fichier | Problème | Fix |
|-------|---------|----------|-----|
| Favoris empty | `favorites.tsx` | `exploreBtn` `borderRadius: 16` | `CTAButton` pill « Explorer » |
| Group create | `group/create.tsx` | Pressable `borderRadius: 12` | `CTAButton fullWidth` |
| Group detail | `group/[id].tsx` | « Rejoindre »/« Discussion » custom ; rangée Inviter/Éditer/Quitter au même niveau | 1 primaire `CTAButton` ; danger séparé |
| Group invitations | `group-invitations.tsx` | Accepter = petit chip | `CTAButton size="sm"` |
| Friends privacy | `friends.tsx` | « Rendre public » pill `borderRadius: 8` | `CTAButton size="sm"` |
| Forum header | `forum.tsx` | « Nouveau sujet » `borderRadius: 10` | Pill ou FAB orange |
| Chat / thread send | `chat/[id].tsx`, `thread/[id].tsx` | Send 44×44 carré, même poids que « + » attach | Send orange circulaire ; attach outline (pattern WhatsApp) |
| Parcours create | `parcours.tsx` | Modal créer = Pressable | `CTAButton` |

### Hiérarchie CTA — trop de primaires (`#primary-action`)

| Écran | Problème | Fix |
|-------|----------|-----|
| `activity/[id].tsx` | 3–4 icônes hero (parcours, partage, favori) même poids que retour | Menu « … » ; seul orange = sticky « Y aller » |
| `group/[id].tsx` | 4–5 actions même rangée | 1 primaire + reste outline/danger |
| Home | Bloc welcome serif + logo + baseline + carte + listes | Réduire le chrome éditorial |

---

## 6. P3 — Performance (HIGH)

Règles : `#virtualize-lists`, `#progressive-loading`, `#image-optimization`

| Point | État | Conseil |
|-------|------|---------|
| Search mosaïque | ✅ FlatList | Modèle à généraliser |
| Search **classic** | ❌ `ScrollView` + `.map()` | `FlatList` pour les résultats |
| Home MapLibre preview (classic) | ❌ MapLibre + ~40 markers dans FlatList | Placeholder léger (`MosaicPopMap`) |
| Chat loading | ❌ Liste vide pendant fetch (`ListEmptyComponent` null si `isLoading`) | Skeleton messages |
| Loading patterns | 🟡 Mix skeleton / spinner / texte | Règle : skeleton > 1 s, spinner action < 1 s |
| Favoris | 🟡 Charge tout le catalogue puis filtre | Endpoint dédié (archi) |
| Debounce recherche | ✅ `useDebounce` 250 ms | — |

---

## 7. P4–P6 — Style, layout, typo & modularité thèmes

### Style (P4)

- Double système **classic / mosaicPop** : cohérent en intention, fragile en maintenance.
- `messages.tsx` : fond `colors.background` (classic) alors que `isMosaicPop` est importé — **incohérence de fond** en mode pop.
- Courgette (`FontFamily.accent`) : chargée, **0 usage** (cible : 1 ligne sur 2–3 empty states onboarding).

### Layout (P5)

- Pas de `ScreenContainer` commun (safe area + spray + fond).
- Vérifier `paddingBottom` des listes vs tab bar fixe (`#fixed-element-offset`).
- Safe areas explicites sur ~21 % des écrans seulement.

### Modularité thème — bug P0 `readVariantId` (TOUJOURS OUVERT)

```typescript
// context/ThemeContext.tsx L82–91 — seul 'default' est relu ; ocean/forest perdus au restart
async function readVariantId(): Promise<ThemeVariantId> {
  try {
    if (!(await SecureStore.isAvailableAsync())) return 'default';
    const raw = await SecureStore.getItemAsync(VARIANT_STORAGE_KEY);
    if (raw === 'default') return raw;   // ← ocean / forest tombent dans le fallback
  } catch { /* fallback */ }
  return 'default';
}
```

**Fix :** valider `raw` contre les slugs du registry (comme `readCardStyle`).

### Fuites hex → tokens (P6)

| Hex | Fichier | Token cible |
|-----|---------|-------------|
| `#E0245E` | `MosaicPopCard.tsx` L200–201 (cœur favori) | `colors.danger` ou `colors.favorite` |
| `#E2EEF8`, `#0f2340`, `#b91c1c` | `search.tsx` | `colors.surface` / shadow token / `colors.danger` |
| `#FFF8E1`, `#FFD54F`, `#E07D3A` | `index.tsx` (bandeau promo) | `colors.accentSoft` + border token / `colors.accent` |
| `#6E7B4F` | `MosaicPopMap.tsx`, `usePop.ts` (olive pop) | documenter extension ou `colors.olive` |
| `#eef6ff`, `#1d4ed8` | `InlineToast.tsx` | palettes info/warning **light-only → tokens** (cassent dark) |
| `#16a34a` | `reset-password`, `forgot-password` | `colors.success` (à créer ou teal) |
| `#fff`/`#000` | favorites, account, interests, activity, index, login | `colors.onAccent` / shadow token thémé |

### Composants à extraire (design system interne)

| Composant | Rôle |
|-----------|------|
| `ThemedScreen` | Fond + spray + safe area + variant |
| `ScreenHeader` | Retour + titre + actions (a11y) |
| `EmptyState` (`variant: classic | pop`) | CTA obligatoire |
| `PopCTAButton` / `CTAButton variant="pop"` | CTA unifié pop + classic |
| `OdosListRow` | Row standard listes sociales |
| `useMotionConfig()` | Reduced motion centralisé |

### Legacy à supprimer

- `app/(tabs)/styles.ts` — **toujours présent**, palette hardcodée (`#FAF0CA`, `#2A9D8F`, fond `#fff`), route masquée (`href: null`).

### Thèmes alternatifs

| Thème | Problème |
|-------|----------|
| **Ocean** | `#f0f6fc`, `#0f2340`, `#1a6ba5` — hors palette canonique |
| **Forest** | Tons verts — hors landing |
| → | Documenter comme « variantes utilisateur » ou recaler sur tokens §2 |

### Matrice QA thèmes

Tester **10 écrans clés** × `{default, ocean, forest} × {classic, mosaicPop}` en light + dark.

---

## 8. P7 — Animation & engagement

Règles : `#duration-timing` (150–300 ms), `#reduced-motion`, `#success-feedback`, `#haptic-feedback`

### Présent ✓

- Reanimated : CTAButton, PopEmptyState, FriendRequest ; like forum optimiste ; reorder parcours optimiste ; onglet Parcours central.

### Manquant

| Interaction | Priorité |
|-------------|----------|
| `HapticTab` + haptics clés | P1–P2 |
| `useReducedMotion` global | P1 |
| Toast succès généralisé (partage, blocage, parcours) | P2 |
| Skeleton uniforme (pas « Chargement… ») | P2 |
| Bulle chat pending + retry | P2 |
| Drag-to-reorder parcours (actuellement ↑/↓) | P3 |
| Séparateurs de date / typing indicator chat | P3 |
| Shared element hero liste→détail | P4 |

```typescript
// constants/motion.ts (proposé)
export const Motion = { fast: 150, normal: 250, slow: 400, scalePress: 0.97 };
// useMotionConfig() → durée 0 si reduced motion
```

---

## 9. P8 — Forms & feedback (+ modération UGC)

Règles : `#empty-states`, `#error-recovery`, `#success-feedback`, `#sheet-dismiss-confirm`, `#inline-validation`

### Empty states & feedback

| Écran | Manque |
|-------|--------|
| Home reco vide | CTA → `/interests` |
| Search 0 résultat | Reset + chip « Tout » |
| Messages | CTA → Amis |
| Favoris erreur | « Réessayer » |
| Favoris empty | `PopEmptyState` + `CTAButton` |
| Group create | `InputField` + compteur caractères |
| Pickers parcours | Confirm dismiss si modifications non enregistrées |
| Actions sociales | Généraliser `InlineToast` (succès) |

**Modèle :** `login.tsx`, `thread/create.tsx`.

### Modération UGC — signalement incomplet (HIGH, conformité stores)

Le signalement couvrait initialement le seul **forum**. **Étendu le 2026-06-20** à tout l'UGC via l'entité backend `ContentReport` (parallèle à `ForumReport`) :

| Surface | État | Implémentation |
|---------|------|----------------|
| Messages privés (chat) | ✅ | `POST /api/chat-messages/{id}/report` + bouton « Signaler » sur bulle reçue |
| Messages de groupe | ✅ | `POST /api/group-messages/{id}/report` + bouton bulle |
| Commentaires d'activité | ✅ | `POST /api/comments/{id}/report` + action dans `ActivityCommentsSection` |
| Profils utilisateur | ✅ | `POST /api/users/{id}/report` + lien sur `profile/[id]` (à côté de Bloquer) |

Back : `ContentReportService` (dédup, refus self-report), throttle `content_report_` (15/j), `ContentReportCrudController` (EasyAdmin, masquer commentaire / traiter / rejeter). Front : `useContentReport` + `ReportContentModal` réutilisé. Tests : `ContentReportServiceTest`.

> Blocage = ✅ complet et appliqué partout. Signalement = ✅ **forum + chat + groupe + commentaires + profils**.

---

## 10. P9 — Navigation & raccourcis

Règles : `#deep-linking`, `#bottom-nav-limit`, `#nav-state-active`, `#persistent-nav`, `#state-preservation`

### OK

- 5 tabs (Jakob) · Parcours central · badge unread Communauté · retour stack · pull-to-refresh étendu.

### Manques

| Raccourci | État | Action |
|-----------|------|--------|
| Deep links | 🟡 `scheme: "odosfront"` dans `app.json` mais **pas de config `linking`** | Expo Router `linking` |
| Push → écran | ❌ Token only | Notification response listener |
| Favoris | ❌ Tab `href: null` (caché) | Lien explicite Compte + option header Home |
| Tap avatar chat → profil | 🟡 Partiel | `UserAvatar` navigable partout |
| Friends shares | 🟡 Read-only | Tap → activité/parcours |
| Share natif | 🟡 Modal custom | `Share.share()` + copier lien |
| Swipe delete | ❌ Absent | Favoris, conversations, étapes parcours |
| Stats Visites (Account) | ❌ Non cliquable | → carte / exploration |

---

## 11. P10 — Carte & données

- Pins sans `accessibilityLabel` descriptif (« {nom}, {catégorie} »).
- Callout : hint double-tap fermer.
- Progression exploration : pas de `accessibilityLiveRegion`.

---

## 12. Scorecard écran par écran

Échelle : **1** insuffisant · **3** acceptable · **5** prêt release · Colonnes : **CTA** · **UX** · **DA** · **Jakob**

| Route | CTA | UX | DA | Jakob | Notes |
|-------|-----|----|----|-------|-------|
| `(tabs)/index` Home | 3 | 3 | 4 | 4 | Skeleton ✓ ; empty reco sans CTA ; MapLibre classic lourd |
| `(tabs)/search` | 2 | 3 | 3 | 4 | Display serif ✓ ; banner `#E2EEF8` ; classic `ScrollView` |
| `(tabs)/parcours` | 3 | 4 | 4 | 5 | **Nouveau** ; modal créer non-`CTAButton` ; loading texte |
| `(tabs)/favorites` | 3 | 4 | 3 | 4 | Caché des tabs ; explore btn non pill |
| `(tabs)/account` | 4 | 4 | 5 | 4 | Spray ✓ ; menu clair |
| `community/_layout` | 3 | 3 | 4 | 3 | **Consent sans « Plus tard »** |
| `community/forum` | 4 | 4 | 4 | 5 | PopEmptyState + create ✓ ; pull-refresh ✓ |
| `community/friends` | 3 | 4 | 4 | 5 | UserSearchBar ✓ ; shares non cliquables |
| `community/messages` | 2 | 3 | 3 | 4 | Empty sans CTA Amis ; fond classic en pop |
| `community/groups` | 4 | 4 | 4 | 5 | Créer ✓ ; discover empty faible |
| `activity/[id]` | 4 | 5 | 4 | 5 | Meilleur écran ; hero icons clutter |
| `map` | 4 | 4 | 4 | 5 | MapExperience ; pins sans label SR |
| `login` | 5 | 5 | 5 | 5 | **Référence** |
| `interests` | 5 | 5 | 5 | 5 | Onboarding ✓ |
| `settings` | 4 | 5 | 4 | 5 | Toggle visibilité ✓ |
| `appearance` | 3 | 4 | 4 | 4 | **Bug persistance variant** |
| `badges` | 2 | 3 | 4 | 4 | Pas CTA login |
| `profile/[id]` | 5 | 4 | 5 | 5 | Bloquer ✓ ; pas de « Signaler » |
| `blocked-users` | 4 | 4 | 4 | 5 | **Nouveau** ; débloquer ✓ |
| `chat/[id]` | 3 | 4 | 4 | 5 | WhatsApp ; loading vide |
| `group-chat/[id]` | 3 | 4 | 4 | 5 | Idem chat ; attachments ✓ |
| `thread/[id]` | 3 | 4 | 4 | 5 | Locked ✓ ; report ✓ |
| `thread/create` | 5 | 5 | 5 | 5 | — |
| `group/[id]` | 3 | 4 | 3 | 4 | Trop de boutons égaux |
| `group/create` | 3 | 3 | 3 | 4 | CTA custom |
| `group-invitations` | 3 | 3 | 3 | 4 | Empty plain ; pull-refresh ✓ |
| `parcours/[id]` | 4 | 4 | 4 | 5 | Partage + co-édition ✓ ; reorder sans label |
| `+not-found` | 1 | 1 | 1 | 2 | **Non localisé** |

**Moyenne pondérée :** ~3,7 / 5 — **beta solide**, pas encore homogène release (a11y + thème variant + empty states).

---

## 13. Matrice croisée Jakob × DA

(Synchronisée avec [`DESIGN_JAKOB_FLOWS.md`](DESIGN_JAKOB_FLOWS.md) §7, itération §7.3.)

| Flow | Modèle | Verdict | Écart principal |
|------|--------|---------|-----------------|
| Onboarding login / intérêts | Apps grand public | ✅ | — |
| Accueil → fiche activité | Airbnb / TripAdvisor | ✅ | Reco empty sans CTA |
| Recherche browse | Spotify chips | 🟡 | Empty sans action ; classic non virtualisé |
| Favoris | e-commerce | 🟡 | **Tab caché** |
| Communauté → Amis/Messages/Groupes/Forum | Instagram / WhatsApp / Reddit | ✅ | Messages empty sans CTA ; consent sans « Plus tard » |
| Chat 1-to-1 | WhatsApp | ✅ | Send pas assez primaire ; loading vide |
| Profil public | Instagram | ✅ | Pas de « Signaler » |
| Parcours (bibliothèque + détail) | Spotify / Google Maps | ✅ | Reorder/delete sans label a11y |
| Partage parcours / activité | Maps share | ✅ | Share natif manquant |
| Blocage | Instagram / Discord | ✅ | — |
| Consentement communauté | Accepter + plus tard | ❌ | **Accept seul** |

---

## 14. Backlog priorisé / Checklist pre-delivery

### CRITICAL (avant release) — ✅ traité 2026-06-20

- [x] `InputField` : `accessibilityLabel={label}` sur le champ + `aria-live` erreur
- [x] `accessibilityLabel` icon-only (parcours ↑/↓ + retrait, retours hero activity/settings)
- [x] `useReducedMotion` global via `constants/motion.ts` (Skeleton, CTAButton)
- [x] Touch ≥ 44 pt (tab slot `minHeight: 44`)
- [x] Empty states + action (Home reco → intérêts, Messages → amis, Search → reset)
- [x] Erreur + retry (home reco, favoris)
- [x] **Fix `readVariantId`** (valide contre `BUNDLED_THEMES`)
- [x] Consent communauté « Plus tard » + `accessibilityViewIsModal` + `onRequestClose`
- [x] `+not-found` FR + tokens + `CTAButton`

### HIGH — ✅ traité 2026-06-20

- [x] Brancher `HapticTab` (`tabBarButton`) + haptics favori / message / ami (`utils/haptics`)
- [x] Hex → token (`#E0245E` → `colors.danger` dans `MosaicPopCard`)
- [x] Supprimer `app/(tabs)/styles.ts`
- [x] **Étendre le signalement** : chat, group-chat, commentaires, profils (entité `ContentReport`)
- [x] Deep linking (auto Expo Router via scheme) + push routing (`useNotificationResponse`)
- [x] Fond pop sur `messages.tsx`
- [x] Migrer les CTAs custom → `CTAButton` **pop-aware** (forum, group/create, group/[id], favoris explore)
- [x] `ThemedScreen` **pop-aware + safe-area** (extraction design-system ; adopté sur `blocked-users`)

### MEDIUM (polish) — ✅ traité 2026-06-20

- [x] Swipe delete sur **étapes parcours** (`ReanimatedSwipeable`, contrôle visible conservé). _Favoris (grille 2-col, non idiomatique → cœur) et conversations (pas d'API delete) écartés à dessein._
- [x] Optimistic chat : bulle « Envoi… » + **retry** à l'échec (DM + groupe)
- [x] Bouton **suppression parcours** (owner). _Drag-to-reorder différé : pas de dep dispo, les ↑/↓ labellés restent (plus accessibles)._
- [x] Activity hero : icônes sociales regroupées sous menu « … » (cœur seul visible)
- [x] Courgette : `+not-found`, empty reco Home, empty Favoris
- [x] Pins carte : `accessibilityLabel` descriptif (« {nom}, {catégorie} ») sur `MapPin`

---

## 15. Plan d'action — 3 sprints

| Sprint | Durée | Focus | Livrables |
|--------|-------|-------|-----------|
| **A — Confiance** | 3–5 j | P1 + P8 CRITICAL | Fix variant, empty + retry, consent « Plus tard », a11y listes/InputField, HapticTab, useReducedMotion, `+not-found` |
| **B — Système** | 5–7 j | P4 + P6 | `ThemedScreen`, `PopCTAButton`, hex → tokens, supprimer `styles.ts`, fond pop messages, QA thèmes |
| **C — Engagement & modération** | 5–7 j | P7 + P9 + UGC | Deep links, push routing, toasts, optimistic chat, swipe, **signalement chat/commentaires/profils** |

---

## 16. Points forts (ne pas régresser)

- Tabs ≤ 5 + **Parcours central** (Spotify / engagement Pro Max)
- Cartes image-first + MapLibre (Hyperlocal must-have map)
- **Cœur favori + ajout-à-un-parcours sur les cartes** (`ActivityCardQuickActions`, `MosaicPopCard` autonome)
- Blocage complet **appliqué partout** + révocation co-édition parcours
- `PopEmptyState` forum / groupes / parcours ; pull-to-refresh étendu
- `UserAvatar` / `UserLink` unifiés ; sticky « Y aller » fiche activité
- Skin mosaicPop = différenciation Vibrant Block

---

## 17. Références

| Document | Rôle |
|----------|------|
| [DESIGN_JAKOB_FLOWS.md](DESIGN_JAKOB_FLOWS.md) | Flows §7 + itérations §7.1–7.3 |
| [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md) | Tokens, typo, anti-patterns §10 |
| [DA_APP_GAP.md](DA_APP_GAP.md) | Checklist DA écran par écran |
| [fonctionnalites/README.md](fonctionnalites/README.md) | Fiches fonctionnelles |
| Skill Pro Max | `~/.claude/skills/ui-ux-pro-max/SKILL.md` |

---

## Annexe — Skill Pro Max : réparation locale

Le `scripts/` du skill est un **pointeur cassé** (la CLI `search.py` ne tourne pas) ; le contenu `SKILL.md` reste exploitable tel quel. Pour réparer la CLI :

```powershell
npx -y skills add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max --agent claude-code -g

py "C:\Users\MANUEL\.claude\skills\ui-ux-pro-max\scripts\search.py" "local activities discovery social" --design-system -p "ODOS" -f markdown
```

---

## 18. Suivi

Mettre à jour ce document après chaque sprint DA/UX ; cocher §14 et synchroniser §7 de `DESIGN_JAKOB_FLOWS.md` + `DA_APP_GAP.md`.

**Prochaine revue recommandée :** après Sprint A (P1 CRITICAL) ou avant soumission dossier stores.

---

*Audit fusionné V1 (revue code) + V2 (UI/UX Pro Max) × Jakob — re-vérifié sur le code `odos-front/` le 2026-06-20.*
