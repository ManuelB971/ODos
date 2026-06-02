import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor, act } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import * as ReactNative from 'react-native';

jest.unmock('@/context/ThemeContext');

import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { defaultTheme } from '@/constants/themes/palettes/default';

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

function Probe() {
  const { colors, colorScheme, preference, isDark } = useTheme();
  return (
    <>
      <Text testID="colorScheme">{colorScheme}</Text>
      <Text testID="preference">{preference}</Text>
      <Text testID="isDark">{String(isDark)}</Text>
      <Text testID="background">{colors.background}</Text>
      <Text testID="text">{colors.text}</Text>
    </>
  );
}

describe('ThemeProvider resolvePalette', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    mockSecureStore.isAvailableAsync.mockResolvedValue(true);
    mockSecureStore.getItemAsync.mockImplementation(async (key: string) => {
      if (key === 'odos_theme_preference') return 'system';
      if (key === 'odos_theme_variant') return 'default';
      return null;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exposes light palette when preference is system and OS is light', async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('colorScheme').props.children).toBe('light');
    });
    expect(screen.getByTestId('background').props.children).toBe(defaultTheme.light.background);
    expect(screen.getByTestId('text').props.children).toBe(defaultTheme.light.text);
    expect(screen.getByTestId('isDark').props.children).toBe('false');
  });

  it('exposes dark palette when preference is dark', async () => {
    mockSecureStore.getItemAsync.mockImplementation(async (key: string) => {
      if (key === 'odos_theme_preference') return 'dark';
      if (key === 'odos_theme_variant') return 'default';
      return null;
    });

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('colorScheme').props.children).toBe('dark');
    });
    expect(screen.getByTestId('background').props.children).toBe(defaultTheme.dark.background);
    expect(screen.getByTestId('isDark').props.children).toBe('true');
  });

  it('follows system dark mode when preference is system', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('colorScheme').props.children).toBe('dark');
    });
    expect(screen.getByTestId('background').props.children).toBe(defaultTheme.dark.background);
  });

  it('updates palette when setPreference is called', async () => {
    function PreferenceSwitcher() {
      const { setPreference } = useTheme();
      return (
        <>
          <Probe />
          <Text testID="switch" onPress={() => setPreference('dark')}>
            switch
          </Text>
        </>
      );
    }

    render(
      <ThemeProvider>
        <PreferenceSwitcher />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('colorScheme').props.children).toBe('light');
    });

    await act(async () => {
      screen.getByTestId('switch').props.onPress();
    });

    await waitFor(() => {
      expect(screen.getByTestId('colorScheme').props.children).toBe('dark');
    });
    expect(screen.getByTestId('background').props.children).toBe(defaultTheme.dark.background);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('odos_theme_preference', 'dark');
  });
});
