# Direction artistique ODOS — Landing → App mobile

Document de référence pour aligner l’**UX** et la **DA** de l’application mobile sur les choix visuels et éditoriaux de ce site vitrine.  
Dernière synthèse : **mai 2026** (d’après `index.html`, `styles.css`, `element/`).

---

## 1. Posture de marque

| Dimension | Choix sur la landing | À traduire dans l’app |
|-----------|----------------------|------------------------|
| Produit | Compagnon de **voyage intérieur** + découverte locale (pas agence de voyage) | Ton onboarding, empty states, push copy |
| Ressenti | Chaleureux, cultivé, mobile-first, **photo-first** | UI qui s’efface derrière images / carte |
| À éviter | SaaS générique, blanc pur partout, grille parfaite, animations marketing lourdes | Pas de violet/rose, pas de bleu roi corporate |

**Phrase guide (ton, pas à afficher partout)**  
*La chaleur dans les détails, la sobriété dans la structure.*

**Baseline multilingue (hero)**  
`ὁδός · La voie · The path · Chimen · Nzela` — héritage du nom, pas un slogan marketing répété sur chaque écran.

---

## 2. Palette (tokens canoniques)

Ne pas inventer de couleurs hors de cette liste.

### Primaires & sémantique

| Token | Hex | Usage |
|-------|-----|--------|
| `orange.primary` | `#F4A261` | CTA, logo, prix, accents forts — **jamais pour du corps de texte long** |
| `orange.hover` | `#E07D3A` | Press / hover CTA |
| `orange.soft` | `#F9C49A` | Fonds légers, hovers doux |
| `blue.action` | `#3B82F6` | Liens, nav active, boutons secondaires, focus |
| `teal.accent` | `#5FC2D8` | Badges, déco carte, chips secondaires |
| `text.primary` | `#11181C` | Corps, titres UI |
| `text.muted` | ~74 % mix `#11181C` + `#FDF8F2` | Descriptions, métadonnées |

### Surfaces (mode clair — référence landing)

| Token | Hex | Usage |
|-------|-----|--------|
| `bg.page` | `#FDF8F2` | Fond d’écran global — **jamais `#FFFFFF` en fond de page** |
| `bg.surface` | `#F5EDE0` | Cartes, sections alternées, bandeaux |
| `bg.elevated` | `#FFFFFF` | Modales, champs sur fond surface, éléments flottants uniquement |
| `border` | mix chaud ~14 % texte + fond | Séparateurs, contours cartes |

### Mode sombre (landing)

| Token | Hex |
|-------|-----|
| `bg.page` | `#171412` |
| `bg.surface` | `#211D1A` |
| `text.primary` | `#F4EFE9` |
| `text.muted` | `#C8BCB1` |
| `border` | `#3B342E` |

L’app doit **reprendre ces valeurs** (ou les centraliser dans un thème unique) plutôt que des gris iOS/Android par défaut.

---

## 3. Typographie — 3 registres, non interchangeables

| Police | Rôle | Landing | App mobile (recommandation) |
|--------|------|---------|------------------------------|
| **Cormorant Garamond** | Titres, citations, noms d’activités « éditoriaux » | `h1–h3`, `.section-title`, baseline hero en italique orange | Titres écran détail, citations, grandes accroches |
| **DM Sans** | UI, corps, labels, navigation | `--font`, boutons, FAQ, chips | **Police principale** : tabs, listes, formulaires, boutons |
| **Courgette** | Moments chaleureux, signature émotionnelle | `.hero-signature` uniquement | Onboarding, empty state bienveillant, **1 ligne max** par écran |

### Échelle indicative (DM Sans)

- Corps : 15–17 px, `line-height` ~1.65–1.75  
- Labels / eyebrow : 12 px, `letter-spacing` 0.12–0.18 em, **uppercase** pour `.section-eyebrow`  
- Titres section : Cormorant, ~28–40 px selon breakpoint  

### Règles

- Orange `#F4A261` : accents et **eyebrows** (`.section-eyebrow`), pas paragraphes entiers.  
- Longueur de ligne confortable : ~44–54 caractères pour les intros.

---

## 4. Formes, rayons, icônes

| Élément | Valeur landing | App |
|---------|----------------|-----|
| CTA principal | `border-radius: 100px` (pill) | Boutons primaires en pilule |
| Cartes | 20–24 px | Cartes activité, bottom sheets |
| Chips catégories | pill + bordure 1.5 px | Filtres carte / recherche |
| **Fonds d’icônes / numéros d’étapes** | `--r-md-icon` : border-radius **organique** (blob), légère rotation par item | Badges, étapes tutoriel, pictos features — **pas des carrés 16 px identiques** |

Exemple de forme blob (CSS) :

```css
border-radius: 62% 38% 58% 42% / 48% 52% 44% 56%;
```

Varier légèrement chaque tuile (rotation -5° à +5°) pour éviter l’effet « template IA symétrique ».

---

## 5. Texture & atmosphère

### Aérospray (`element/background.png`)

- Motif **pointillé / spray** orange + touches turquoise.  
- Usage landing : canvas global léger + sections (features, map, waitlist) en overlay.  
- **App** : fond de header onboarding, bandeau waitlist, ou splash — **toujours atténué** (opacité faible + dégradé vers `bg.page`) pour ne pas nuire à la lisibilité.

### Blobs hero (`hero-blob--1` turquoise, `--2` orange)

- Flous larges, opacité ~10–20 %.  
- **App** : halos derrière carte ou écran d’accueil, pas derrière le texte.

### Frise « vase » (méandre orange `#F4A261`)

- Motif antique méditerranéen, bandeau desktop gauche / mobile sous header.  
- **App** : optionnel en séparateur de section ou tab bar secondaire — très discret.

### Carte

- **MapLibre** = stack produit ; badge « MapLibre » sur la landing.  
- Pins orange / bleu / turquoise cohérents avec la palette.

---

## 6. Composants — correspondance landing ↔ app

| Composant landing | Comportement | Équivalent app |
|-------------------|--------------|----------------|
| Header verre (`backdrop-filter`) | Flou + fond semi-transparent | Barre de navigation / modal avec blur natif |
| Chips catégories | Scroll horizontal, actif = fond orange plein | Filtres carte, scroll horizontal |
| Cartes features | Fond surface, icône blob, hover léger | Grille « pourquoi ODOS » ou tooltips |
| Showcase téléphones | Mockup = **photo-first** | Captures réelles, pas illustrations génériques |
| Steps 1-2-3 | Numéros blob, étape 3 en orange accent | Onboarding 3 écrans |
| FAQ accordéon | Questions **toujours lisibles** (pas seulement au hover) | Aide in-app, même contraste |
| Bouton CTA orange pill | Ombre orangée `--shadow-cta` | Bouton primaire global |
| Bouton ghost bleu | Bordure + hover teal léger | Actions secondaires |
| Liste d’attente | Spray fort en fond de section | Pré-lancement / beta signup |

---

## 7. Motion & interaction

| Principe | Landing | App |
|----------|---------|-----|
| Durée | ~0.24–0.6 s, `cubic-bezier(0.22, 1, 0.36, 1)` | Transitions courtes, pas de scroll-jack |
| Entrée | `fadeUp` 20 px + délais décalés par carte | Stagger léger listes / cartes |
| Icônes | Micro-drift + scale au hover | Haptic léger + scale 1.05 max sur press |
| Reduced motion | Animations coupées si `prefers-reduced-motion` | Respect `AccessibilityInfo` / OS setting |
| Thème | system → light → dark (toggle) | Suivre système + override utilisateur |

---

## 8. Accessibilité & contraste

- Texte principal sur `#FDF8F2` : viser **WCAG AA** (ratio ≥ 4.5:1).  
- Overlays sombres : `#11181C`, pas `#000000`.  
- Cibles tactiles landing : boutons **min-height 48 px** — reproduire **≥ 44 pt** sur mobile.  
- Focus visible : outline 3 px (`--focus` / bleu action).  
- FAQ : couleur question = `text.primary` en permanence.

---

## 9. Voix & contenu (cohérence produit)

Aligné avec `docs/` (architecture, exploration carte, RGPD) :

- **Découverte locale** : carte, fiches, favoris, reco, avis — pas réservation / paiement in-app (pour l’instant).  
- **Exploration carte** : consentement GPS explicite, cellules geohash, pas de trace GPS brute.  
- **Transparence** : export / suppression compte, politique accessible.  
- **Contacts** : `support@odos.world`, partenaires `marketing@odos.world`.

Ton : direct, chaleureux, sans jargon SaaS (« synergies », « dashboard », etc.).

---

## 10. Anti-patterns (checklist avant chaque écran app)

- [ ] Fond d’écran = `#FDF8F2` (clair) ou `#171412` (sombre), pas blanc pur partout  
- [ ] Orange réservé aux CTA / accents, pas aux paragraphes  
- [ ] 3 polices respectent leur rôle (pas de Courgette en label technique)  
- [ ] Au moins une touche « éditoriale » (Cormorant ou spray) sur les écrans clés, pas sur chaque ligne  
- [ ] Formes d’icônes légèrement asymétriques  
- [ ] Images / carte au premier plan, chrome minimal  
- [ ] Animations courtes et optionnelles  
- [ ] Pas de palette violet / rose / bleu roi corporate  

---

## 11. Tokens React Native (extrait)

```ts
export const colors = {
  orangePrimary: "#F4A261",
  orangeHover: "#E07D3A",
  orangeSoft: "#F9C49A",
  blueAction: "#3B82F6",
  tealAccent: "#5FC2D8",
  textPrimary: "#11181C",
  bgPage: "#FDF8F2",
  bgSurface: "#F5EDE0",
  bgElevated: "#FFFFFF",
  // dark
  darkBgPage: "#171412",
  darkBgSurface: "#211D1A",
  darkText: "#F4EFE9",
};

export const fonts = {
  display: "CormorantGaramond_600SemiBold", // titres
  ui: "DMSans_400Regular",                 // corps
  accent: "Courgette_400Regular",            // touches chaleur
};

export const radius = {
  pill: 100,
  card: 20,
  modal: 24,
  iconBlob: "62% 38% 58% 42% / 48% 52% 44% 56%", // ou paths SVG
};
```

*(Noms Expo Google Fonts à adapter selon le chargement réel du projet `odos-front`.)*

---

## 12. Fichiers utiles dans ce dépôt

| Fichier | Contenu |
|---------|---------|
| `styles.css` | Implémentation complète (tokens, dark, composants) |
| `element/background.png` | Texture aérospray |
| `element/layer2.svg` | Logo |
| `docs/ARCHITECTURE.md` | Fonctionnalités produit |
| `docs/fonctionnalites/exploration-carte.md` | Carte & GPS |
| `docs/GAMIFICATION.md` | Badges |
| `legal/*.html` | Ton légal / transparence |

---

## 13. Prochaines étapes recommandées (app)

1. Créer un **theme unique** dans `odos-front` (light/dark) calqué sur le tableau §2.  
2. Auditer les écrans existants vs §10 (fond, orange, polices).  
3. Réutiliser `background.png` en asset `@2x/@3x` pour splash / onboarding.  
4. Harmoniser boutons primaires (pill orange) et liens (bleu action).  
5. Documenter les écarts restants dans un fichier `DA_APP_GAP.md` après audit.

---

*Ce document décrit la landing actuelle ; l’app peut aller plus loin sur la carte et les photos, à condition de garder la même palette et la même hiérarchie typographique.*
