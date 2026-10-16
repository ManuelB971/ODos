module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // maplibre-gl v6 (web uniquement) référence `import.meta.url`, invalide
          // dans les bundles Metro (scripts classiques) : on active le polyfill.
          web: { unstable_transformImportMeta: true },
        },
      ],
    ],
  };
};
