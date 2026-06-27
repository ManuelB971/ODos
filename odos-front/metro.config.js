// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const maplibreStubPath = path.resolve(__dirname, 'components/map/MapLibreStub.tsx');
const maplibreWebPath = path.resolve(__dirname, 'components/map/MapLibreWeb.tsx');

// Le natif MapLibre s'appuie sur des TurboModules indisponibles sur web et en
// Expo Go. On substitue donc le module `@maplibre/maplibre-react-native` :
//   - web              → MapLibreWeb.tsx (vraie carte maplibre-gl, DOM)
//   - MAPLIBRE_STUB=1  → MapLibreStub.tsx (stub léger pour Expo Go)
// En build natif standard (Android/iOS), aucune substitution → vrai module natif.
function maplibreReplacement(platform) {
  if (platform === 'web') return maplibreWebPath;
  if (process.env.MAPLIBRE_STUB === '1') return maplibreStubPath;
  return null;
}

const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@maplibre/maplibre-react-native') {
    const replacement = maplibreReplacement(platform);
    if (replacement) {
      return { type: 'sourceFile', filePath: replacement };
    }
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
