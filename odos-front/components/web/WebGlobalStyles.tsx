import { useEffect } from 'react';
import { Platform } from 'react-native';

import { EASE_OUT } from '@/constants/webMotion';

/**
 * Règles CSS globales **web only**, injectées une fois dans `<head>` :
 * comportements qu'aucun style RN ne sait exprimer (pseudo-classes, media queries).
 *
 * - Focus clavier visible partout (`:focus-visible`, anneau bleu action 3 px — DA §8).
 * - Curseur main + transitions douces sur tout ce qui est cliquable (`tabindex="0"` =
 *   `Pressable` react-native-web).
 * - États de survol / appui pour les éléments marqués `data-odos` (cf. `webInteraction`).
 * - Marqueurs de carte : survol et focus.
 * - `prefers-reduced-motion` : animations et transitions coupées (a11y).
 *
 * Natif : ne rend rien.
 */
const CSS = `
:root { --odos-ease: ${EASE_OUT}; --odos-focus: #3B82F6; }
html, body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
::selection { background: #F9C49A; color: #11181C; }

[tabindex="0"], [role="button"], [role="link"], [role="tab"], a { cursor: pointer; -webkit-tap-highlight-color: transparent; }
[aria-disabled="true"] { cursor: default; }
[tabindex="0"], [role="button"], [role="tab"] {
  transition: background-color 180ms var(--odos-ease), border-color 180ms var(--odos-ease),
    box-shadow 180ms var(--odos-ease), opacity 180ms var(--odos-ease), transform 180ms var(--odos-ease);
}
:focus-visible { outline: 3px solid var(--odos-focus) !important; outline-offset: 2px; }
input:focus-visible, textarea:focus-visible { outline-offset: 0; }

/* Cartes : légère élévation au survol, enfoncement à l'appui. */
[data-odos="lift"]:hover { transform: translateY(-3px); }
[data-odos="lift"]:active { transform: translateY(0) scale(0.985); transition-duration: 90ms; }
/* Chips et lignes de liste : fond légèrement teinté. */
[data-odos="chip"]:hover { filter: brightness(0.96); }
[data-odos="chip"]:active { transform: scale(0.96); transition-duration: 90ms; }
[data-odos="row"]:hover { transform: translateX(3px); }
[data-odos="row"]:active { transform: scale(0.99); transition-duration: 90ms; }

/* Rail / barre d'onglets : survol discret. */
[role="tab"]:hover { background-color: rgba(244, 162, 97, 0.10); border-radius: 16px; }

/* Marqueurs MapLibre : positionnés par transform à chaque frame de pan/zoom —
   jamais de transition dessus, sinon ils traînent derrière la carte. */
.maplibregl-marker { transition: none !important; }
/* La pastille (enfant) grandit au survol et au focus clavier. */
.maplibregl-marker > * { transition: transform 180ms var(--odos-ease); transform-origin: 50% 100%; }
.maplibregl-marker:hover > *, .maplibregl-marker:focus-visible > * { transform: translateY(-2px) scale(1.08); }
.maplibregl-marker:focus-visible { outline-offset: 4px; border-radius: 999px; }

* { scrollbar-width: thin; scrollbar-color: rgba(17, 24, 28, 0.22) transparent; }
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-thumb { background: rgba(17, 24, 28, 0.22); border-radius: 8px; }
*::-webkit-scrollbar-track { background: transparent; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important; animation-delay: 0ms !important;
    transition-duration: 0.01ms !important;
  }
  [data-odos]:hover, .maplibregl-marker:hover > * { transform: none !important; }
}
`;

const STYLE_ID = 'odos-web-ux';

export function WebGlobalStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }, []);
  return null;
}
