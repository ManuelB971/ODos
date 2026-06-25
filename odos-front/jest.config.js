module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  collectCoverageFrom: [
    'context/interestcontext.tsx',
    'hooks/useActivities.ts',
    'hooks/useDebounce.ts',
    'hooks/useFavorites.ts',
    'hooks/useRecommendations.ts',
    'hooks/useSearchActivities.ts',
    'scripts/api.ts',
    'services/AuthService.ts',
    'components/map/MapExperience.tsx',
    'utils/errorHandling.ts',
    'utils/imageUrl.ts',
    'utils/jwt.ts',
    '!**/*.d.ts',
    '!**/*.test.{ts,tsx,js,jsx}',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/.expo/**',
    '!**/babel.config.js',
    '!**/jest.config.js',
    '!**/expo-env.d.ts',
  ],
  // ⚠️ Ne PAS activer `detectOpenHandles` ici : il force l'exécution en série
  // (un seul process, plus de workers parallèles) + tracing async_hooks, ce qui
  // fait passer la suite de ~2-3 min à ~10 min. Pour debugger une fuite de
  // handle ponctuelle, utiliser le script `pnpm test:debug`.
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'clover'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
