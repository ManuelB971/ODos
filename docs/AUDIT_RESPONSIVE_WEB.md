# Audit & plan — Responsivité web ODOS (écrans larges)

> Objectif : la web app (`app.odos.world`) doit **s'épanouir** sur tablette/desktop, pas
> s'étirer. Audit poussé de l'existant + plan d'implémentation, croisant le skill
> **`high-end-visual-design`** (archétypes responsive, Editorial Luxury, macro-whitespace) et
> la **DA ODOS** ([DESIGN_DIRECTION.md](DESIGN_DIRECTION.md) : chaud, photo-first, Cormorant/DM Sans,
> palette `#FDF8F2`, CTA pill, formes blob).
>
> Base technique : app RN **mobile-first** rendue via react-native-web (mode `single`/SPA).
> Date : 2026-06-28.
>
> **État (2026-06-28)** : correctifs **Favoris + Recherche livrés** (cf. Partie 3) ; hook
> `useResponsive` créé ; **`ResponsiveShell` livré** et appliqué aux **colonnes de lecture**
> (Accueil, Compte, Paramètres, Communauté, Parcours) — cf. Niveau 0. **Niveau 1 livré** :
> bottom-tab → **rail latéral gauche** sur desktop + **bottom sheets recentrées** (≤ 480) via
> `useResponsiveSheet`. **Niveau 2 avancé** : **editorial split** (détail activité), **split
> carte/étapes** (`parcours/[id]`) et **carte + panneau latéral de résultats** (recherche). Reste
> (Niveau 2) : bento home, grille communauté 2 col.
>
> **→ Revue code complète + gaps précis : voir [Partie 4 — Audit de conformité](#partie-4--audit-de-conformité-revue-code-2026-06-28).**

---

## Partie 1 — AUDIT

### Verdict

**❌ Non responsive pour grand écran.** L'app est mobile-first **étirée plein viewport** sur web.
Sur un écran 1440–1920 px, l'UI mobile occupe toute la largeur : colonnes uniques démesurées,
longueur de ligne illisible, barre d'onglets en bas pleine largeur, cartes/photos géantes.

### Preuves dans le code

| # | Constat | Preuve |
|---|---------|--------|
| A1 | **Aucun conteneur `max-width` racine** : chaque écran prend tout le viewport | [app/_layout.tsx](../odos-front/app/_layout.tsx) — `Stack` sans wrapper largeur |
| A2 | **Aucun système de breakpoints** : layout ne réagit pas à la largeur | `useWindowDimensions`/`Dimensions` utilisés **2 fois seulement**, et **non** pour le layout : [search.tsx](../odos-front/app/(tabs)/search.tsx) (calcul carte) + [BottomSheet.tsx](../odos-front/components/map/BottomSheet.tsx) (hauteur sheet) |
| A3 | **`maxWidth` quasi absent** : seuls les écrans **auth** capent (480 px) | [login.tsx](../odos-front/app/login.tsx#L393), [forgot-password.tsx](../odos-front/app/forgot-password.tsx#L178), [reset-password.tsx](../odos-front/app/reset-password.tsx#L210) = `maxWidth: 480` ; ailleurs uniquement empty-states (300–320) et bulles chat (`%`) |
| A4 | **Listes single-column** (FlatList) sans grille → s'étirent à l'infini | home/reco, favoris, search results, communauté — largeur = parent |
| A5 | **Tab bar bottom** = idiome **mobile** conservé sur desktop (pleine largeur en bas) | [app/(tabs)/_layout.tsx](../odos-front/app/(tabs)/_layout.tsx) (tab bar custom) |
| A6 | **Cartes en `%` de la largeur parent** → géantes sur desktop | MosaicPopCard / [ActivityCard](../odos-front/components/map/ActivityCard.tsx) |
| A7 | **Bottom sheet / carte** plein écran : comportement mobile inadapté desktop | [BottomSheet.tsx](../odos-front/components/map/BottomSheet.tsx) |

### Impact par palier (heuristique)

| Largeur | État | Symptômes |
|---------|------|-----------|
| **< 600** (mobile) | ✅ OK | cible native, conforme |
| **600–1024** (tablette) | 🟠 dégradé | colonne unique trop large, **0 marge latérale**, whitespace absent |
| **> 1024** (desktop) | ❌ cassé | contenu pleine largeur, **longueur de ligne > 120 caractères** (DA §3 vise **44–54**), tab bar bottom, cartes/photos démesurées |

### Lecture au prisme du skill `high-end-visual-design`

- **Anti-pattern majeur** : le skill exige qu'un layout **se replie** en 1 colonne sous 768 px — ici
  le problème est **inverse** : l'app ne **s'élargit jamais** intelligemment au-dessus. Aucun
  archétype **Bento** ni **Editorial Split** pour le desktop.
- **Macro-whitespace** (`py-24`+, marges généreuses) : inexistant côté large → le contenu « colle »
  aux bords.
- **Longueur de ligne** non maîtrisée → viole DA §3 ET le confort de lecture éditorial.
- **Bon point** : la DA ODOS = archétype **« Editorial Luxury »** du skill (crèmes chaudes `#FDF8F2`,
  serif variable Cormorant, photo-first). On a donc **déjà la bonne identité** — il manque la
  **structure spatiale** desktop pour l'exprimer.

---

## Partie 2 — PLAN

### Principe directeur

> **« Mobile-first qui s'épanouit, pas qui s'étire. »** 3 paliers : mobile (plein), tablette
> (centré + marges chaudes), desktop (centré lisible, puis enrichi multi-colonnes sur les écrans
> qui le méritent). **Tout le desktop est gardé derrière `isDesktop` / `Platform.OS === 'web'`
> → le natif reste strictement inchangé** (non-régression par construction).

### Stratégie en 4 niveaux (du plus rentable au plus ambitieux)

#### Niveau 0 — Fondations (le quick win, ~1–2 j) ⭐

Règle ~80 % du ressenti pour un effort minime.

1. **Hook `useResponsive()`** ✅ **livré** ([hooks/useResponsive.ts](../odos-front/hooks/useResponsive.ts)) :
   s'appuie sur `useWindowDimensions` (re-render live au resize, SSR-safe en mode `single`). Expose
   `{ width, breakpoint, isPhone, isTablet, isDesktop, gridColumns }` avec seuils **600 / 1024 / 1440**.
2. **`ResponsiveShell`** ✅ **livré** ([components/layout/ResponsiveShell.tsx](../odos-front/components/layout/ResponsiveShell.tsx)) :
   conteneur **web-only** qui **centre** le contenu et le cape (`SHELL_MAX_WIDTH.reading = 760`),
   avec **marges chaudes** `bg.page` (le fond du parent reste plein-cadre derrière). Natif =
   passthrough strict (aucune `View` ajoutée → zéro impact). **Appliqué par écran** (pas en racine,
   pour ne pas brider les grilles de découverte capées indépendamment) : Accueil
   ([index.tsx](../odos-front/app/(tabs)/index.tsx)), Compte ([account.tsx](../odos-front/app/(tabs)/account.tsx)),
   Paramètres ([settings.tsx](../odos-front/app/settings.tsx)), Communauté (au niveau du layout
   [community/_layout.tsx](../odos-front/app/(tabs)/community/_layout.tsx) → couvre Forum/Amis/Messages/Groupes),
   Parcours ([parcours.tsx](../odos-front/app/(tabs)/parcours.tsx)).
   → L'app devient une **colonne lisible centrée**, longueur de ligne maîtrisée, chrome minimal
   (conforme DA §10). C'est l'équivalent du « mobile-portrait centré » de Twitter/Threads web.
   ⚠️ Ne **pas** caper les grilles favoris/recherche à 760 (elles veulent s'élargir) : leur passer
   `SHELL_MAX_WIDTH.wide` ou les laisser gérer leurs colonnes via `useResponsive()`.

#### Niveau 1 — Navigation desktop ✅ livré

- **Tab bar → rail latéral** ✅ ([app/(tabs)/_layout.tsx](../odos-front/app/(tabs)/_layout.tsx)) :
  sur desktop web la bottom-tab passe en **rail gauche** via `tabBarPosition: 'left'` (prop native
  React Navigation v7 — **pas de tab bar réinventée**), largeur 108, bordure droite, bouton central
  « Parcours » sans soulèvement. Gardé derrière `Platform.OS === 'web' && isDesktop` → la bottom bar
  reste sur phone/tablette **et tout le natif est inchangé**.
- **Bottom sheets → modale centrée** ✅ : hook `useResponsiveSheet`
  ([hooks/useResponsiveSheet.ts](../odos-front/hooks/useResponsiveSheet.ts)) — source unique qui, sur
  desktop web, recentre le backdrop et borne la feuille à `maxWidth 480` (tous coins arrondis).
  Adopté par les feuilles sociales (Activity/Conversation/Parcours pickers, partage parcours, Share,
  signalement) et la création de parcours. Natif / web mobile = comportement bottom-sheet inchangé.

#### Niveau 2 — Densification multi-colonnes (~3–5 j, écran par écran)

- **Écrans listes** (home reco, favoris, search results, communauté) → **grille responsive**
  via un composant `ResponsiveGrid` (1 col phone / 2 tablette / 3 desktop, `flexWrap` + largeur de
  colonne calculée). Pour la **home**, appliquer l'archétype **Asymmetrical Bento** du skill
  (cartes de tailles variées) avec la palette chaude.
- **Détail activité** ✅ → archétype **Editorial Split** sur desktop
  ([app/activity/[id].tsx](../odos-front/app/activity/[id].tsx)) : photo à gauche (`flex:1`, 560 px,
  coins arrondis) / infos + notation + description + commentaires à droite, le tout dans une rangée
  centrée `maxWidth 1180`. Gardé derrière `web + isDesktop` → mobile/natif inchangé. Photo-first = cœur de la DA.
- **Parcours `[id]`** ✅ → **split carte / étapes** sur desktop
  ([app/parcours/[id].tsx](../odos-front/app/parcours/[id].tsx)) : carte plein-hauteur à gauche
  (`flex:1`), liste des étapes à droite (≤ 440 px, scroll indépendant, bordure de séparation), façon
  Google Maps trajets. Idem gardé derrière `web + isDesktop`.
- **Carte de recherche** ✅ → **carte + panneau latéral de résultats** sur desktop
  ([components/map/MapExperience.tsx](../odos-front/components/map/MapExperience.tsx)) : liste des
  lieux filtrés à gauche (380 px), carte à droite ; clic sur un résultat = **focus carte** (le flow
  pin → callout → fiche reste intact). `sidePanel = web && isDesktop`, contenu carte enveloppé dans
  `mapColumn` (overlays repositionnés relativement à la colonne) → mobile/natif inchangé.

#### Niveau 3 — Raffinements DA & desktop (continu)

- **Macro-whitespace** latéral desktop ; **double-bezel** (DA §4 « Doppelrand ») sur les cartes
  clés ; intros à **44–54 caractères**.
- **États pointer** (hover scale 1.02–1.05, micro-drift d'icône — DA §7) **uniquement** sur
  `isDesktop` ; **focus visible** clavier (outline 3 px bleu action — DA §8) pour l'usage souris/clavier.
- **CTA** : pill orange + **button-in-button** (icône dans un cercle) comme le préconise le skill §4B.

### Cartographie écran par écran

| Écran | Actuel (web large) | Cible responsive | Niveau |
|-------|--------------------|--------------------|--------|
| Auth (login/reset) | déjà capé 480 ✅ | OK, polish double-bezel | 3 |
| Home / reco | ✅ **shell centré** (760) | reste : bento 2–3 col (Niv. 2) | 0 ✅ → 2 |
| Recherche (browse) | ✅ **cartes capées** (≤ 520 / ≤ 720), hero en `aspectRatio` | grille responsive complète | partiel |
| Recherche / carte | ✅ **carte + panneau latéral résultats** desktop | OK | 2 ✅ |
| Favoris | ✅ **colonnes responsives 2/3/4-5 + toggle Liste/Grille** | OK | ✅ fait |
| Communauté (forum/groupes/amis) | ✅ **shell centré** (layout) | reste : 2 col (Niv. 2) | 0 ✅ → 2 |
| Parcours (bibliothèque) | ✅ **shell centré** (760) | OK | 0 ✅ |
| Détail activité | ✅ **editorial split** (photo / infos) desktop | OK | 2 ✅ |
| Parcours `[id]` | ✅ **split carte / étapes** desktop | OK | 2 ✅ |
| Compte / réglages | ✅ **shell centré** (760) | OK | 0 ✅ |
| Navigation | ✅ **rail latéral** desktop (`tabBarPosition`) | OK | 1 ✅ |
| Modales / sheets | ✅ **modale centrée** (≤ 480) desktop (`useResponsiveSheet`) | OK | 1 ✅ |

### Implémentation technique (résumé)

- **Pas de media queries CSS** (on est en RN) → tout via `useWindowDimensions` (re-render au resize,
  natif sur web). Centraliser les seuils.
- Garde **`Platform.OS === 'web'`** (ou fichiers `.web.tsx`) pour `ResponsiveShell` et la nav desktop
  → **zéro impact natif** (cf. bi-modularité : préférer la couture B/.web aux `Platform.OS` épars).
- Réutiliser les **tokens DA** existants ([constants/theme.ts](../odos-front/constants/theme.ts)) — ne
  pas réinventer de couleurs.

### Vérification (recette)

1. Tester aux **3 largeurs** : `375` (phone), `834` (tablette), `1440` (desktop) en redimensionnant
   le navigateur — le layout doit basculer aux seuils 600/1024.
2. **Longueur de ligne** des intros ≤ ~54 caractères sur desktop.
3. **Non-régression native** : `pnpm test:ci` + run Android — la nav bottom et les écrans mobiles
   inchangés (tout le desktop est derrière `isDesktop`/`web`).
4. Checklist DA §10 + checklist skill §8 (whitespace, focus, hover, pas de couleurs corporate).

### Priorisation recommandée

1. **Niveau 0 d'abord** (shell centré + hook) → 80 % du ressenti pour 1–2 j. **À faire en premier.**
2. Puis **Niveau 1** (nav desktop), puis **Niveau 2** écran par écran (home → favoris → détail).
3. Niveau 3 en finition continue.

---

## Partie 3 — Audit ciblé : Recherche & Favoris (densité des cartes)

### Constat utilisateur
Cartes d'activité **trop grandes**, surtout en **Favoris** → impossible de voir toutes ses
activités likées d'un coup d'œil.

### Ce que rendent les écrans (thème `mosaicPop` par défaut)

| Écran | Rendu | Sizing |
|-------|-------|--------|
| **Favoris** [favorites.tsx](../odos-front/app/(tabs)/favorites.tsx#L160) | `FlatList` **`numColumns={2}` figé** + `MosaicPopCard variant="grid"` | carte `flex:1`, **photo carrée 1:1**, **aucun `maxWidth`** |
| **Recherche** (browse) [search.tsx](../odos-front/app/(tabs)/search.tsx#L314) | 1 `featured` (16:10) + **grille 2 col manuelle** (`gridLeft`/`gridRight`) | idem, viewport-relatif, non capé |
| **Recherche** (active) [search.tsx](../odos-front/app/(tabs)/search.tsx#L167) | `FlatList` de **`MosaicPopRow`** ✅ | **lignes compactes** — déjà dense |

### Cause racine
Le **nombre de colonnes est fixe (2)** et la carte fait `flex:1` → largeur = `(viewport − marges) ÷ 2`,
**jamais capée**. Sur web large : 2 cartes occupent toute la largeur → carte ≈ 700 px, photo carrée
≈ 700 px de haut → 1–2 favoris visibles par écran. Sur mobile c'est acceptable, mais la densité reste
faible pour une **collection** qu'on veut **scanner**.

### Atout déjà présent
`MosaicPopRow` (lignes compactes) existe déjà et est utilisé en recherche active → **le patron dense
est déjà codé**, il suffit de le réutiliser en Favoris.

### Correctifs — ✅ appliqués (2026-06-28)

1. **Colonnes responsives** ([favorites.tsx](../odos-front/app/(tabs)/favorites.tsx)) — `numColumns` issu de
   `useResponsive` : **2 (phone) / 3 (tablette) / 4–5 (desktop)** ; `key` du `FlatList` changée au
   changement de colonnes (exigence RN). → cartes ÷ 2–2,5 sur desktop.
2. **Toggle « Grille / Liste »** en Favoris — bascule dans le header ; la **liste** réutilise
   **`MosaicPopRow`** (lignes compactes) → **2–3× plus** d'items visibles. Réponse directe à
   « voir tous mes likes ».
3. **Recherche** ([search.tsx](../odos-front/app/(tabs)/search.tsx)) — conteneurs browse **bornés** :
   rangée 2 col `maxWidth: 520`, vedette / listes de résultats `maxWidth: 720`, le tout centré
   (`alignSelf: 'center'`). `heroCard` passé en **`aspectRatio`** (au lieu d'une largeur viewport
   non capée) ; variable `winW` figée supprimée.
4. **Anti-récurrence** — convention notée dans **CLAUDE.md** (§ Responsive web & grilles) +
   mémoire persistante : *jamais de `numColumns` figé, toujours `useResponsive()` + `maxWidth`*.

### Alignement DA & Jakob (pris en compte)

- **DA** ([DESIGN_DIRECTION.md](DESIGN_DIRECTION.md)) : les caps **préservent la longueur de ligne**
  (§3, 44–54 car.) et gardent les **marges chaudes** `bg.page` autour ; rayon carte 20 px conservé
  (§4) ; le toggle actif est en **orange accent** (§2, orange = CTA/accent, jamais du texte) ; la
  densité **ne casse pas le photo-first** (les cartes restent image-first).
- **Jakob** ([DESIGN_JAKOB_FLOWS.md](DESIGN_JAKOB_FLOWS.md)) : Favoris reste le pattern **familier**
  « cœur toggle + liste dédiée + état vide explicite » (§2). Le **toggle Grille/Liste** est un schéma
  connu (Pinterest/e-commerce) → renforce la **reconnaissance** (§3.6) **sans** modifier la
  navigation (tabs/stack intacts, §3.3). La vue **grille reste le défaut** → le **cœur de retrait**
  d'un favori demeure accessible (pas de régression du flow liste→détail→action, §4.2). Empty state
  et CTA inchangés.

### Non-régression (vérifiée)
- `tsc` (0 erreur sur les fichiers touchés) + `eslint` (clean).
- Colonnes responsives : **améliore aussi le natif** (3 col en tablette) **sans dégrader le phone** (2).
- Caps `maxWidth` + mode liste : **neutres sur phone** (largeur < seuils).
- Toggle densité : pur ajout d'UI, **aucune logique métier** ni flow touché.

---

## Partie 4 — Audit de conformité (revue code, 2026-06-28)

Audit de **vérification** de tout ce qui a été livré (Niveaux 0→2), par lecture du code, avec la
liste précise de ce qui **reste**. Méthode : recherche des primitives + de leurs usages réels,
classification des faux positifs.

### 4.1 Livré & vérifié dans le code ✅

| Brique | Primitive | Appliqué à (vérifié) |
|--------|-----------|----------------------|
| **Hook breakpoints** | [hooks/useResponsive.ts](../odos-front/hooks/useResponsive.ts) | seuils 600/1024/1440, `gridColumns` 2/3/4/5 |
| **Shell centré (Niv. 0)** | [components/layout/ResponsiveShell.tsx](../odos-front/components/layout/ResponsiveShell.tsx) | `index`, `account`, `settings`, `community/_layout` (⇒ forum/amis/messages/groupes), `parcours` **+ écrans secondaires** : `interests`, `onboarding-city`, `badges`, `legal`, `blocked-users`, `appearance`, `group-invitations` |
| **Grilles capées (Niv. 0/partiel)** | `useResponsive` + `maxWidth` | `favorites.tsx` (`numColumns` responsive + toggle dense), `search.tsx` (5 caps `maxWidth` intacts) |
| **Rail latéral (Niv. 1)** | `tabBarPosition: 'left'` natif RN-nav | [app/(tabs)/_layout.tsx](../odos-front/app/(tabs)/_layout.tsx) — `railNav = web && isDesktop` |
| **Sheets recentrés (Niv. 1)** | [hooks/useResponsiveSheet.ts](../odos-front/hooks/useResponsiveSheet.ts) (`SHEET_MAX_WIDTH`) | 7 feuilles : Activity/Conversation/Parcours pickers, ParcoursShare(Picker/Target), Share, Report + création parcours ; **+ action sheets globales** `OdosActionSheetView` (root/footer recentré) **+ chooser de pièces jointes** `group-chat/[id]` |
| **Editorial split (Niv. 2)** | styles `*Split` + `splitView` | [activity/[id].tsx](../odos-front/app/activity/[id].tsx) (photo ‖ infos) · [parcours/[id].tsx](../odos-front/app/parcours/[id].tsx) (carte ‖ étapes) |
| **Carte + panneau (Niv. 2)** | `sidePanel` + `mapColumn`/`panel` | [components/map/MapExperience.tsx](../odos-front/components/map/MapExperience.tsx) — liste de résultats à gauche, clic = focus carte (flow pin→callout→fiche préservé) |

**Non-régression (vérifiée)** : `tsc` = **0 nouvelle erreur** (les erreurs restantes — `appearance.tsx`,
`useThemes.ts`, `OdosModalContext.tsx`, `ThemeContext.tsx`, `authSession.ts` — sont **préexistantes**
et hors périmètre) ; `eslint` clean sur les fichiers touchés. Tout le desktop est derrière
`Platform.OS === 'web' && isDesktop` (ou passthrough natif du shell) → **natif strictement inchangé**.

### 4.2 Reste à faire (gaps identifiés)

| Prio | Gap | Détail | Effort |
|------|-----|--------|--------|
| ✅ ~~P1~~ | ~~7 écrans de lecture non centrés~~ | **Fait** : `interests`, `onboarding-city`, `badges`, `legal`, `blocked-users`, `appearance`, `group-invitations` enveloppés dans `ResponsiveShell` (les écrans à CTA collant — `interests`, `onboarding-city` — capent **scroll + barre sticky** ensemble ; `appearance`, racine `ScrollView`, reçoit un fond `bg.page` plein-cadre). | — |
| ✅ ~~P2~~ | ~~2 vraies feuilles non recentrées~~ | **Fait** : `OdosActionSheetView` recentré sur desktop (`root` centré, `footer` capé `SHEET_MAX_WIDTH`, carte d'actions à coins pleins) ; chooser `group-chat/[id]` migré sur `useResponsiveSheet`. | — |
| 🟢 P3 | **Niveau 2 restant** | **bento** home, **grille 2 col** communauté. *(Panneau latéral carte ✅ fait.)* | élevé |

### 4.3 Faux positifs écartés (ne pas re-signaler)

- `OdosDialogView` : **déjà centré** (`backdrop` `justifyContent:'center'`, `maxWidth: 400`) — conforme, rien à faire.
- `ActivityCommentsSection`, `chat/[id]`, `group/[id]` : les `flex-end` détectés sont l'**alignement des
  bulles de chat / barres d'action**, pas des bottom-sheets → hors périmètre.
- `favorites.tsx` : `numColumns={numColumns}` est **piloté par `useResponsive`** (`dense ? 1 : gridColumns`),
  ce n'est **pas** un `numColumns` figé → conforme à la convention.

### 4.4 Verdict

**🟢 Cœur responsive livré et sain** : les 3 niveaux ont leurs briques en place, factorisées
(2 hooks + 1 composant + 1 prop native), gardées derrière le desktop, sans régression native.
**Niveaux 0 et 1 complets** (P1 : tous les écrans de lecture centrés ; P2 : toutes les feuilles
recentrées). **Niveau 2 bien avancé** : 3 écrans denses livrés (détail activité, parcours `[id]`,
carte de recherche). **🟡 Reste** : **bento** home et **grille 2 col** communauté.

---

## Annexe — Pourquoi le shell centré d'abord

Sur une web app **derrière login**, l'objectif n'est pas une vitrine marketing pleine largeur
(ça, c'est la landing Render). C'est une **app utilitaire** : un conteneur centré lisible (≤ 760 px)
sur fond chaud résout immédiatement les pires symptômes (longueur de ligne, cartes géantes, vide
latéral) **sans toucher** à la logique des écrans. Les grilles multi-colonnes (Niveau 2) viennent
ensuite, là où la densité apporte vraiment (listes de découverte).
