/**
 * maplibre-gl v6 est ESM-only : son Web Worker est un fichier séparé que la
 * lib localise via `import.meta.url`, ce que Metro ne sait pas émettre.
 * On le publie donc comme fichier statique (`public/` est copié tel quel dans
 * l'export web) et MapLibreWeb.tsx le désigne via `setWorkerUrl()`.
 * Lancé avant `expo start --web` et `expo export -p web`.
 */
/* global __dirname */
const fs = require('fs');
const path = require('path');

const src = require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs');
// Extension `.js` : servi en `application/javascript` par nginx (nosniff).
const dest = path.join(__dirname, '..', 'public', 'maplibre-gl-worker.js');

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log(`maplibre-gl worker → ${path.relative(process.cwd(), dest)}`);
