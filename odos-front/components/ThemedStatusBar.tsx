import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/context/ThemeContext';

export function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
