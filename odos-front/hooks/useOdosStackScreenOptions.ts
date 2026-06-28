import { useMemo } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { FontFamily } from '@/constants/theme';
import { useOdosColors } from '@/context/ThemeContext';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';

type OdosStackScreenOptionsInput = {
  title: string;
  headerShown?: boolean;
  headerBackTitle?: string;
  presentation?: NativeStackNavigationOptions['presentation'];
  headerLeft?: NativeStackNavigationOptions['headerLeft'];
};

/**
 * Options de header Stack alignées sur le thème ODOS actif (clair / sombre / mosaïque pop).
 */
export function useOdosStackScreenOptions({
  title,
  headerShown = true,
  headerBackTitle = 'Retour',
  presentation,
  headerLeft,
}: OdosStackScreenOptionsInput): NativeStackNavigationOptions {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();

  const ink = isMosaicPop ? pop.ink : colors.text;
  const paper = isMosaicPop ? pop.paper : colors.background;

  return useMemo(
    () => ({
      title,
      headerShown,
      headerBackTitle,
      presentation,
      headerLeft,
      headerStyle: { backgroundColor: paper },
      headerTintColor: ink,
      headerTitleStyle: {
        fontFamily: FontFamily.uiBold,
        fontSize: 17,
        color: ink,
      },
      headerShadowVisible: false,
    }),
    [title, headerShown, headerBackTitle, presentation, headerLeft, ink, paper],
  );
}
