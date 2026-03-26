module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-router|@expo-google-fonts/.*|@unimodules/.*|unimodules|@react-navigation/.*|@tanstack/react-query)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
