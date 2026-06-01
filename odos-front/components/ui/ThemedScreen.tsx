import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useOdosColors } from '@/context/ThemeContext';

type ThemedScreenProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function ThemedScreen({ children, style }: ThemedScreenProps) {
  const colors = useOdosColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
