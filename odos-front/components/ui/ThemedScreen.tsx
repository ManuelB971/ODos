import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useOdosColors } from '@/context/ThemeContext';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';

type ThemedScreenProps = {
  children: React.ReactNode;
  /** Bords de safe-area à respecter. Par défaut `['top']` (les tabs gèrent le bas). */
  edges?: Edge[];
  /** Désactive la SafeAreaView (écran déjà sous un header avec inset géré). */
  noSafeArea?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Conteneur d'écran unifié : applique le **fond thémé** (papier pop en Mosaïque
 * pop, sinon `colors.background`) + la **safe area**. Centralise le motif
 * `backgroundColor: isMosaicPop ? pop.paper : colors.background` dupliqué dans
 * de nombreux écrans (cf. AUDIT §7 « composants à extraire »). Adoption
 * progressive ; le spray reste optionnel par écran.
 */
export function ThemedScreen({ children, edges = ['top'], noSafeArea = false, style }: ThemedScreenProps) {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const backgroundColor = isMosaicPop ? pop.paper : colors.background;

  if (noSafeArea) {
    return <View style={[styles.flex, { backgroundColor }, style]}>{children}</View>;
  }

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor }, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
