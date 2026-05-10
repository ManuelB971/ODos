// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const maplibreStubPath = path.resolve(__dirname, 'components/map/MapLibreStub.tsx');

const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (process.env.MAPLIBRE_STUB === '1' && moduleName === '@maplibre/maplibre-react-native') {
    return { type: 'sourceFile', filePath: maplibreStubPath };
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
