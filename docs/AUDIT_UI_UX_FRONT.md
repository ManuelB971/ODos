# Audit UI/UX — Front mobile ODOS

Audit exhaustif du front Expo (`odos-front/`) croisé avec :

- [`DESIGN_DIRECTION.md`](DESIGN_DIRECTION.md) — direction artistique (palette, typo, formes, anti-patterns §10)
- [`DESIGN_JAKOB_FLOWS.md`](DESIGN_JAKOB_FLOWS.md) — flows familiers, hiérarchie CTA, empty states
- Grille **UI/UX Pro Max** — accessibilité, touch, performance, navigation (priorités 1→10)

**Complète** [`DA_APP_GAP.md`](DA_APP_GAP.md) (checklist DA écran par écran, plus ancienne).  
**Dernière révision :** juin 2026 · branche `dev` · ~33 écrans routés.

---

## 1. Synthèse exécutive

### Score global par domaine

| Domaine | Note | Verdict |
|---------|------|---------|
| Accessibilité | **5/10** | Bon sur login / CTAButton ; lacunes retour, listes, champs |
| Touch & interaction | **6/10** | CTAButton solide ; tabs 32 px, liens texte sans zone 44 pt |
| Performance | **6/10** | Mosaic search corrigé ; MapLibre accueil + recherche classic lourds |
| Style & cohérence | **7/10** | Tokens bien posés ; double voie classic / mosaicPop (~22 fichiers) |
| Layout & safe areas | **5/10** | Insets explicites sur ~21 % des écrans |
| Typo & couleur (DA) | **7/10** | Cormorant + DM Sans OK ; Courgette jamais utilisée ; hex hardcodés |
| Animation | **6/10** | Reanimated présent ; `useReducedMotion` quasi absent |
| Formulaires | **7/10** | Login / settings solides ; `InputField` label non relié au champ |
| Navigation | **7/10** | Tabs + stack familiers ; Favoris caché ; consent sans sortie |
| Hiérarchie CTA | **6/10** | `CTAButton` sur 10 écrans seulement ; beaucoup de Pressable custom |

### Trois constats majeurs

1. **CTA primaires inconsistants** — `CTAButton` (pill orange, loading, a11y) utilisé sur ~10 écrans ; le reste mélange `Pressable` avec `borderRadius: 8–16`, liens bleus discrets, ou icônes au même poids visuel que l’action principale.
2. **Pratiques UX oubliées** — empty states sans action suivante (Home reco, Messages, Search), erreurs sans « Réessayer », chargement chat vide, consent communauté sans « Plus tard », `+not-found` en anglais non thémé.
3. **DA partielle** — fonds page OK via tokens ; fuites hex (`#E2EEF8`, `#E0245E`, `#0f2340`), thèmes Ocean/Forest hors palette canonique, Courgette chargée mais inactive, rayons pill non respectés sur CTAs custom.

### Écrans de référence (à imiter)

| Écran | Pourquoi |
|-------|----------|
| `login.tsx` | CTA, validation, a11y tabs, keyboard, tokens |
| `interests.tsx` | Onboarding sticky CTA, sélection claire |
| `thread/create.tsx` | `InputField` + `CTAButton` + erreurs |
| `activity/[id].tsx` | Sticky « Y aller », feedback rating (sauf hero icon clutter) |
| `profile/[id].tsx` | Actions contextuelles, fermeture modal |

---

## 2. Méthode & périmètre

### Périmètre audité

- Toutes les routes `odos-front/app/**/*.tsx` (~33 écrans)
- Composants transverses impactant l’UX : `CTAButton`, `InputField`, `PopEmptyState`, `InlineToast`, `MosaicPopCard`, `MapExperience`, `SprayBackground`
- Thème : `context/ThemeContext.tsx`, `constants/themes/`, `components/pop/`

### Métriques mesurées (juin 2026)

| Métrique | Valeur |
|----------|--------|
| Occurrences `accessibilityLabel` | ~55 |
| Occurrences `<Pressable` | ~125 |
| Couverture label / Pressable | **~44 %** |
| `accessibilityHint` | **0** |
| Écrans avec `useSafeAreaInsets` / `SafeAreaView` | **7** (~21 %) |
| Fichiers `useReducedMotion` | **2** (`PopEmptyState`, `FriendRequest`) |
| Branches `isMosaicPop` / `cardStyle === 'mosaicPop'` | **~22 fichiers** |
| Écrans utilisant `CTAButton` | **10** |
| Écrans utilisant `PopEmptyState` | **8** |
| `FontFamily.accent` (Courgette) en UI | **0** |

### Grille UI/UX Pro Max appliquée

Priorités auditées dans l’ordre : (1) Accessibilité → (2) Touch → (3) Performance → (4) Style → (5) Layout → (6) Typo/couleur → (7) Animation → (8) Formulaires → (9) Navigation → (10) Data/charts (N/A sauf carte).

---

## 3. Boutons & CTA — hiérarchie insuffisante

> **Règle DA §6 + Jakob §3 :** un seul CTA primaire orange pill par zone ; secondaires en ghost bleu ou outline ; tertiaires en icônes seules.

### 3.1 Écrans sans CTA primaire visible

| Écran | État actuel | Attendu |
|-------|-------------|---------|
| **Home** `(tabs)/index.tsx` | « EXPLORER » / « VOIR TOUT » = petits liens bleus (`seeAllText` → `colors.primary`) ; pas de pill orange page-level | Un CTA « Explorer la carte » en pill orange OU renforcer le overlay carte existant comme unique primaire |
| **Search browse** `(tabs)/search.tsx` | Cartes cliquables = affordance implicite ; pas de bouton explicite | OK si cartes suffisent ; ajouter CTA sur empty |
| **Search vide** | Texte gris `emptyText` seul | CTA « Effacer la recherche » ou chip « Tout » |
| **Messages** `community/messages.tsx` | `PopEmptyState` sans `ctaLabel` / `onPressCta` | CTA « Trouver des amis » → onglet Amis |
| **Groups discover** `community/groups.tsx` | Sous-titre seul en empty | CTA « Créer un groupe » ou refresh |
| **Home reco vide** `index.tsx` | Texte italique gris ; pas de lien intérêts | CTA « Choisir mes intérêts » → `/interests` |
| **Badges non connecté** `badges.tsx` | Texte seul | `CTAButton` → `/login` |
| **+not-found** | Lien anglais non stylé | `CTAButton` « Retour à l'accueil » + thème ODOS |

### 3.2 CTA custom au lieu de `CTAButton` (poids visuel faible)

| Écran | Fichier | Problème | Fix |
|-------|---------|----------|-----|
| Favoris empty | `favorites.tsx` L146–149 | `exploreBtn` `borderRadius: 16` | `CTAButton` pill « Explorer les activités » |
| Group create | `group/create.tsx` L94–104 | Pressable `borderRadius: 12` | `CTAButton fullWidth` |
| Group detail | `group/[id].tsx` L141–164 | « Rejoindre » / « Discussion » custom ; rangée Inviter/Éditer/Quitter au même niveau | Primaire = `CTAButton` ; danger séparé |
| Group invitations | `group-invitations.tsx` | Accepter = petit chip | `CTAButton size="sm"` |
| Friends privacy | `friends.tsx` L56–70 | « Rendre public » pill `borderRadius: 8` | `CTAButton size="sm"` |
| Forum header | `forum.tsx` L23–37 | « Nouveau sujet » petit bouton `borderRadius: 10` | Promouvoir en pill ou FAB orange |
| Chat / thread send | `chat/[id].tsx`, `thread/[id].tsx` | Send 44×44 carré `borderRadius: 12`, même poids que « + » attach | Send orange circulaire ; attach outline (pattern WhatsApp) |
| Parcours share | `parcours/[id].tsx` | Partager = cercle outline seul | Ghost pill avec label « Partager » |

### 3.3 CTA qui volent la vedette (trop de primaires)

| Écran | Problème | Fix |
|-------|----------|-----|
| **Activity detail** `activity/[id].tsx` L514–550 | 3–4 icônes hero (parcours, partage, favori) même taille/cercle blanc que retour | Icônes tertiaires regroupées ou menu « … » ; sticky « Y aller » reste seul orange fort |
| **Activity detail** L576–596 | Pill « Lieu visité » orange-adjacent dans le scroll | Style secondaire outline / lien |
| **Group detail** | 4–5 actions même rangée | Hiérarchie : 1 orange + reste outline |
| **Home** | Bloc welcome serif + logo + baseline + carte + listes | Réduire chrome éditorial ou fusionner avec une seule accroche |

### 3.4 Écrans où `CTAButton` est bien utilisé ✓

`login.tsx` · `forgot-password.tsx` · `reset-password.tsx` · `interests.tsx` · `favorites.tsx` (gate auth) · `activity/[id].tsx` (sticky geo) · `profile/[id].tsx` · `account.tsx` (logout) · `settings.tsx` · `thread/create.tsx`

---

## 4. Pratiques UX oubliées

### 4.1 Navigation & wayfinding

| Pratique | Statut | Détail |
|----------|--------|--------|
| Tabs 4–5 racines (Jakob §4.1) | 🟡 | **Favoris masqué** (`_layout.tsx` `href: null`) — accessible via Compte seulement |
| Retour prévisible | 🟡 | Présent mais **sans `accessibilityLabel`** sur activity, settings, appearance |
| Deep linking | ✅ | Routes Expo file-based OK |
| Titre de section Communauté | 🟡 | Top tabs Forum/Amis/Messages/Groupes sans en-tête « Communauté » |
| Écran 404 localisé | ❌ | `+not-found.tsx` en anglais, fond blanc par défaut, pas de tokens |
| État actif navigation | ✅ | Tab bar + chips (partiel) |

### 4.2 Feedback (loading / succès / erreur)

| Pratique | Statut | Fichiers concernés |
|----------|--------|-------------------|
| Skeleton > spinner long | ✅ | Home (`Skeleton`), favorites |
| Spinner plein écran | 🟡 | Search, badges, group — OK |
| **Liste vide pendant chargement** | ❌ | `chat/[id].tsx`, `group-chat/[id].tsx` — `ListEmptyComponent` null si `isLoading` |
| **Erreur + Réessayer** | ❌ | `index.tsx` reco, `favorites.tsx` L119–128 |
| Toast succès action | ❌ | `InlineToast` **uniquement** sur throttle rating (`activity/[id].tsx`) |
| Confirmation destructive | ✅ | `group/[id].tsx` leave/delete, `settings.tsx` suppression compte |
| Optimistic UI chat | 🟡 | Pas de bulle pending visible à l’envoi |

### 4.3 Empty states (Jakob §4.5 — toujours une action suivante)

| Écran | Composant | CTA manquant |
|-------|-----------|--------------|
| Home reco | Texte | → `/interests` |
| Search | `emptyText` | Reset recherche / chip Tout |
| Messages | `PopEmptyState` | → Amis |
| Groups discover | `PopEmptyState` | Créer / refresh |
| Group invitations | Texte brut | `PopEmptyState` + CTA |
| Favorites | Custom empty | Utiliser `PopEmptyState` + `CTAButton` |
| Badges (0) | Hint faible | CTA exploration |

**Écrans avec empty state complet ✓ :** forum, friends (recherche), groups (mes groupes), chat, thread, parcours.

### 4.4 Formulaires

| Pratique | Statut | Détail |
|----------|--------|--------|
| Labels visibles | ✅ | `InputField`, settings |
| Label relié au champ (SR) | ❌ | `InputField.tsx` — pas de `accessibilityLabel` dérivé du `label` |
| Validation inline au blur | 🟡 | Login OK ; group create = TextInput brut |
| Compteur caractères | 🟡 | Settings bio ✓ ; group create / thread content ✗ |
| Autocomplete sémantique | 🟡 | Login email/password partiel |
| Sheet dismiss avec changements | 🟡 | Pickers parcours — pas de confirm unsaved |
| Focus premier champ invalide | ❌ | Non implémenté globalement |

### 4.5 Accessibilité

| Pratique | Statut | Détail |
|----------|--------|--------|
| `accessibilityLabel` icon-only | 🟡 | ~44 % des Pressables ; retours hero non labellés |
| `accessibilityHint` | ❌ | 0 occurrence dans l’app |
| Touch ≥ 44 pt | 🟡 | Tab icon slot `minHeight: 32` ; forum/friends boutons ~8 px padding vertical |
| `accessibilityLiveRegion` toasts/erreurs | ❌ | `InlineToast`, bannières login |
| Reduced motion | 🟡 | 2 composants seulement |
| Focus visible (web) | ❌ | Pas d’outline 3 px (DA §8) |
| Modal consent trap | 🟡 | Pas de `accessibilityViewIsModal` explicite ; **pas de bouton fermer / Plus tard** |
| Couleur seule pour info | 🟡 | Chips actifs OK visuellement ; vérifier SR selected state |

### 4.6 Consentements & sorties (RGPD / Jakob §3.7)

| Flow | Problème |
|------|----------|
| **Consent communauté** `community/_layout.tsx` | Modal bloquante : seul « J'accepte » — **pas de « Plus tard »** ni retour arrière |
| GPS exploration | `ExplorationConsentModal` — à vérifier séparément (composant map) |
| Profil public | Toggle settings ✓ (récent) |

### 4.7 Contenu & ton ODOS (DA §9)

| Pratique | Statut |
|----------|--------|
| Français partout | ❌ `+not-found` anglais |
| Pas de jargon SaaS | ✅ globalement |
| Courgette (chaleur émotionnelle, 1 ligne max) | ❌ police chargée, **jamais utilisée** en UI |
| Emoji comme icône structurelle | 🟡 `thread/[id].tsx` 🔒 dans texte verrouillé — acceptable ponctuel |

### 4.8 Performance UX

| Pratique | Statut | Détail |
|----------|--------|--------|
| Virtualiser longues listes | 🟡 | Mosaic search ✓ ; classic search `ScrollView` + `.map()` ✗ |
| Lazy images | 🟡 | Mix `Image` / `expo-image` |
| Map preview accueil | ❌ | Mode classic : MapLibre + 40 markers dans FlatList |
| Font gate blank screen | 🟡 | `_layout.tsx` `return null` jusqu’aux fonts |
| Debounce recherche | ✅ | `useDebounce` 250 ms |

---

## 5. Non-conformité DA (Direction Artistique)

Référence tokens canoniques : [`DESIGN_DIRECTION.md`](DESIGN_DIRECTION.md) §2–4, §10.

### 5.1 Anti-patterns §10 — tableau de conformité

| Critère §10 | Conformité | Exemples d’écart |
|-------------|------------|------------------|
| Fond page `#FDF8F2` / `#171412`, pas blanc pur partout | 🟡 | `+not-found` fond blanc ; tests mocks `#fff` |
| Orange réservé CTA / accents, pas paragraphes | ✅ | Globalement OK |
| 3 polices dans leur rôle | 🟡 | **Courgette inactive** ; `favorites` titre sans Cormorant |
| Touche éditoriale (Cormorant / spray) écrans clés | 🟡 | Search ✓ ; Activity detail titre ✓ ; Home welcome ✓ ; Messages ✗ |
| Formes blob icônes | 🟡 | Badges `BlobFrame` ✓ ; chips / tabs = rectangles |
| Photo / carte au premier plan | ✅ | Fiches activité, map |
| Animations courtes | ✅ | Pas de scroll-jack |
| Pas violet / rose / bleu roi corporate | 🟡 | **`#E0245E` cœur favori** ; **`#E2EEF8` bannière search** ; thèmes Ocean `#0f2340` |

### 5.2 Hex hardcodés dans `app/` (production)

| Hex | Fichier | Usage | Token attendu |
|-----|---------|-------|---------------|
| `#E2EEF8` | `search.tsx` L655 | Fond bannière horizontal | `colors.surface` ou mix teal doux |
| `#0f2340` | `search.tsx` L481+ | Ombres cartes | `colors.text` @ opacity |
| `#b91c1c` | `search.tsx` L758 | Texte erreur | `colors.danger` |
| `#FFF8E1`, `#FFD54F` | `index.tsx` L566–568 | Bandeau promo | `colors.accentSoft` + border token |
| `#E07D3A` | `index.tsx` L574 | Texte accent inline | `colors.accent` (hover) |
| `#fff` / `#ffffff` | `favorites`, `account`, `interests`, `activity` | Icônes onAccent | `colors.onAccent` |
| `#000` | `index`, `activity`, `login` | shadowColor | shadow token thémé |
| `#16a34a` | `reset-password`, `forgot-password` | Icône succès | `colors.success` (à créer ou teal) |
| `#fff` stroke | `parcours/[id].tsx` L300 | Bordure pin | `colors.elevated` |

### 5.3 Hex hardcodés dans `components/` (impact UI)

| Hex | Fichier | Problème DA |
|-----|---------|-------------|
| `#E0245E` | `MosaicPopCard.tsx` L170–171 | **Rose interdit** §10 — utiliser `colors.danger` |
| `#6E7B4F` | `MosaicPopMap.tsx`, `usePop.ts` | Olive pop — documenter extension ou mapper `teal.accent` |
| `#eef6ff`, `#1d4ed8`, etc. | `InlineToast.tsx` L115–124 | Palettes info/warning **light-only** — cassent dark mode |
| `#FFFFFF` | `ActivityCard.tsx`, `ActivityPinsLayer.tsx` | Texte pin — OK sur fond image ; préférer token |
| `#000` shadows | Map, FavoriteCard, MapPin, BottomSheet | Acceptable si opacity faible ; unifier token |

### 5.4 Typographie

| Règle DA | État | Action |
|----------|------|--------|
| **Cormorant** titres éditoriaux | 🟡 | Manque : `favorites` `pageTitle`, en-têtes faibles |
| **DM Sans** UI / corps | ✅ | `FontFamily.ui` majoritaire |
| **Courgette** 1 ligne chaleur | ❌ | Chargée `_layout.tsx`, **0 usage** — empty states onboarding |
| Eyebrow uppercase 12 px | 🟡 | Account, settings partiels |
| Orange sur eyebrows seulement | ✅ | Chips, prix OK |

### 5.5 Formes & rayons

| Élément | DA | App |
|---------|-----|-----|
| CTA primaire | `border-radius: 100px` pill | `CTAButton` ✓ ; custom 8–16 ✗ |
| Cartes | 20–24 px | ~20–22 ✓ |
| Chips | pill + bordure 1.5 px | Search ✓ |
| Icônes blob | organique + rotation | Badges ✓ ; reste carré |

### 5.6 Texture & atmosphère

| Élément | DA | App |
|---------|-----|-----|
| Aérospray atténué | Header onboarding, splash | `SprayBackground` sur Account ✓ ; Home volontairement sans |
| Blobs hero | Halos carte | Partiel map |
| Header verre blur | Nav / modal | ❌ pas implémenté (DA_APP_GAP) |
| Frise méandre | Optionnel discret | ❌ absent |

### 5.7 Thèmes alternatifs (Appearance)

| Thème | Problème |
|-------|----------|
| **Default** | Aligné `#FDF8F2` / `#F4A261` ✓ |
| **Ocean** | `#f0f6fc`, `#0f2340`, `#1a6ba5` — **hors palette canonique** |
| **Forest** | Tons verts — hors landing |
| **Mosaic Pop** | Extension DA cohérente (encre + orange + olive) |

→ Documenter Ocean/Forest comme « variantes utilisateur » ou les recaler sur tokens §2.

### 5.8 Fichier legacy

| Fichier | Action |
|---------|--------|
| `app/(tabs)/styles.ts` | `#FAF0CA`, `#f5f5f5`, `#2A9D8F`, fond `#fff` — **supprimer ou migrer** |

---

## 6. Scorecard écran par écran

Échelle : **1** insuffisant · **3** acceptable · **5** prêt release  
Colonnes : **CTA** clarté · **UX** complétude · **DA** · **Jakob** familiarité

| Route | CTA | UX | DA | Jakob | Notes |
|-------|-----|----|----|-------|-------|
| `(tabs)/index` Home | 3 | 3 | 4 | 4 | Skeleton ✓ ; empty reco faible ; MapLibre classic lourd |
| `(tabs)/search` | 2 | 3 | 3 | 4 | Display serif ✓ ; banner `#E2EEF8` ; mosaic FlatList ✓ |
| `(tabs)/favorites` | 3 | 4 | 3 | 4 | Caché des tabs ; explore btn non pill |
| `(tabs)/account` | 4 | 4 | 5 | 4 | Spray ✓ ; menu clair |
| `(tabs)/community` layout | 3 | 3 | 4 | 3 | Consent sans dismiss |
| `community/forum` | 4 | 4 | 4 | 5 | PopEmptyState + create ✓ |
| `community/friends` | 3 | 4 | 4 | 5 | UserSearchBar ✓ ; privacy banner |
| `community/messages` | 2 | 3 | 4 | 4 | Empty sans CTA Amis |
| `community/groups` | 4 | 4 | 4 | 5 | Créer ✓ ; discover empty faible |
| `activity/[id]` | 4 | 5 | 4 | 5 | Meilleur écran ; hero icons clutter |
| `map` | 4 | 4 | 4 | 5 | MapExperience |
| `login` | 5 | 5 | 5 | 5 | **Référence** |
| `forgot-password` | 5 | 4 | 5 | 5 | — |
| `reset-password` | 5 | 4 | 5 | 5 | — |
| `interests` | 5 | 5 | 5 | 5 | Onboarding ✓ |
| `settings` | 4 | 5 | 4 | 5 | Dense iOS-like ; toggle visibilité ✓ |
| `appearance` | 3 | 4 | 4 | 4 | Expose palettes non canoniques |
| `legal` | 3 | 3 | 4 | 4 | Long scroll |
| `badges` | 2 | 3 | 4 | 4 | Pas CTA login |
| `profile/[id]` | 5 | 4 | 5 | 5 | Actions sociales ✓ |
| `chat/[id]` | 3 | 4 | 4 | 5 | Pattern WhatsApp ; loading vide |
| `group-chat/[id]` | 3 | 4 | 4 | 5 | Idem chat |
| `thread/[id]` | 3 | 4 | 4 | 5 | Locked ✓ |
| `thread/create` | 5 | 5 | 5 | 5 | — |
| `group/[id]` | 3 | 4 | 3 | 4 | Trop de boutons égaux |
| `group/create` | 3 | 3 | 3 | 4 | CTA custom |
| `group-invitations` | 3 | 3 | 3 | 4 | Empty plain |
| `parcours/[id]` | 4 | 4 | 4 | 5 | Share discret |
| `+not-found` | 1 | 1 | 1 | 2 | Non localisé |

**Moyenne pondérée (CTA+UX+DA+Jakob) :** ~3,6 / 5 — **acceptable beta**, pas encore homogène release.

---

## 7. Inventaire composants transverses

| Composant | Rôle | Conformité | Priorité fix |
|-----------|------|------------|--------------|
| `CTAButton` | Primaire pill | ✅ DA | Étendre usage |
| `InputField` | Champs formulaire | 🟡 label SR | P1 |
| `PopEmptyState` | Empty Jakob | ✅ | Ajouter CTAs manquants |
| `InlineToast` | Feedback rate limit | 🟡 hex light | P2 thème |
| `SprayBackground` | Texture DA | ✅ | Optionnel search header |
| `MosaicPopCard` | Carte mosaic | 🟡 rose heart, SVG perf | P2 |
| `MapExperience` | Carte plein écran | 🟡 pas clustering | P3 |
| `ThemedScreen` | Wrapper écran | ❌ sous-utilisé | P3 |
| `BlobFrame` | Icônes blob | ✅ badges | Étendre onboarding |

---

## 8. Backlog priorisé

### P0 — Bloquants UX / a11y (1–2 j)

- [ ] `accessibilityLabel="Retour"` sur tous les back buttons custom
- [ ] Consent communauté : bouton **« Plus tard »** (ferme modal, garde tab sans social)
- [ ] Tab icon slot `minHeight: 44` ; labels mosaic ≥ 11 sp
- [ ] `InputField` : propager `accessibilityLabel={label}`, erreur `accessibilityLiveRegion`
- [ ] Chat / group-chat : indicateur chargement dans liste (pas empty null)

### P1 — Conversion & Jakob (2–3 j)

- [ ] Empty states + CTA : Home reco → intérêts ; Messages → Amis ; Search → reset
- [ ] Migrer CTAs custom → `CTAButton` : favorites explore, group create/detail, forum create
- [ ] Activity hero : regrouper icônes sociales (menu ou barre secondaire)
- [ ] Favoris : remettre onglet visible OU entrée Compte très explicite (decision produit)
- [ ] `+not-found` : français + tokens + `CTAButton`

### P2 — DA & thème (2–3 j)

- [ ] Remplacer hex `search.tsx` (`#E2EEF8`, `#0f2340`, `#b91c1c`)
- [ ] `MosaicPopCard` : `#E0245E` → `colors.danger`
- [ ] `InlineToast` : palettes via tokens light/dark
- [ ] Supprimer `(tabs)/styles.ts` legacy
- [ ] `favorites` titre → `FontFamily.display` ; explore → pill
- [ ] Courgette : 1 ligne sur 2–3 empty states clés
- [ ] Safe area hook appliqué aux tabs racine + headers custom

### P3 — Perf & polish (3–5 j)

- [ ] Home classic : remplacer MapLibre preview par placeholder léger (comme `MosaicPopMap`)
- [ ] Search classic : `FlatList` pour résultats
- [ ] Standardiser `expo-image` URLs distantes
- [ ] `useReducedMotion` dans `CTAButton`, animations map
- [ ] Map marker clustering
- [ ] Header blur natif (DA §6)
- [ ] Recaler ou documenter thèmes Ocean / Forest

---

## 9. Matrice croisée Jakob × DA

| Flow (Jakob doc) | Attendu | Écart principal |
|------------------|---------|-----------------|
| Accueil feed | Scroll vertical, cartes image-first | OK ; reco empty sans CTA |
| Recherche | Champ haut + chips + résultats | OK ; empty sans action |
| Favoris tab | Liste dédiée | **Tab caché** |
| Compte / réglages | Sections groupées | OK settings |
| Social amis | Recherche alias | OK friends |
| Chat 1-to-1 | Bulles + composer | OK ; send pas assez primaire |
| Forum | Threads + réponses | OK forum |
| Liste → détail | Tap carte | OK activités |
| Consentement | Accepter + refuser / plus tard | **Accept seul** communauté |

---

## 10. Fichiers index (audit juin 2026)

### Écrans

`odos-front/app/(tabs)/index.tsx` · `search.tsx` · `favorites.tsx` · `account.tsx` · `_layout.tsx` · `community/_layout.tsx` · `community/forum.tsx` · `friends.tsx` · `messages.tsx` · `groups.tsx` · `activity/[id].tsx` · `map.tsx` · `login.tsx` · `forgot-password.tsx` · `reset-password.tsx` · `interests.tsx` · `settings.tsx` · `appearance.tsx` · `legal.tsx` · `badges.tsx` · `profile/[id].tsx` · `chat/[id].tsx` · `group-chat/[id].tsx` · `thread/[id].tsx` · `thread/create.tsx` · `group/[id].tsx` · `group/create.tsx` · `group-invitations.tsx` · `parcours/[id].tsx` · `+not-found.tsx`

### Composants clés

`components/ui/CTAButton.tsx` · `InputField.tsx` · `components/pop/PopEmptyState.tsx` · `components/cards/MosaicPopCard.tsx` · `components/InlineToast.tsx` · `components/map/MapExperience.tsx` · `constants/themes/tokens.ts` · `context/ThemeContext.tsx`

### Docs associés

| Document | Lien |
|----------|------|
| Direction artistique | [`DESIGN_DIRECTION.md`](DESIGN_DIRECTION.md) |
| Flows Jakob | [`DESIGN_JAKOB_FLOWS.md`](DESIGN_JAKOB_FLOWS.md) |
| Gap DA (legacy) | [`DA_APP_GAP.md`](DA_APP_GAP.md) |
| Fiches fonctionnelles | [`fonctionnalites/README.md`](fonctionnalites/README.md) |

---

## 11. Suivi

Mettre à jour ce document après chaque sprint DA/UX. Cocher le backlog §8 et synchroniser les statuts dans `DA_APP_GAP.md` § « Écrans audités ».

**Prochaine revue recommandée :** après implémentation P0 + P1, ou avant soumission dossier CDA.

---

*Audit réalisé avec la grille UI/UX Pro Max (checklist priorités 1–10) et revue code `odos-front/` — juin 2026.*
