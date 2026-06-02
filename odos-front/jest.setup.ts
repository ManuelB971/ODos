import '@testing-library/jest-native/extend-expect';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('@/context/ThemeContext', () => {
  const { legacyColors } = require('@/constants/themes/palettes/default');
  const light = legacyColors.light;
  return {
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    useTheme: () => ({
      variantId: 'default',
      setVariantId: jest.fn(),
      preference: 'light',
      setPreference: jest.fn(),
      colorScheme: 'light',
      colors: light,
      isDark: false,
    }),
    useOdosColors: () => light,
  };
});
