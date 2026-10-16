import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { webScreenEnter, webTabFocus } from '@/constants/webMotion';

type FocusNavigation = {
  addListener: (event: 'focus', callback: () => void) => () => void;
};

type Props = {
  navigation: FocusNavigation;
  children: React.ReactElement;
};

/** Focus reçu juste après le montage : c'est l'entrée elle-même, pas un retour. */
const MOUNT_FOCUS_MS = 120;

/**
 * `screenLayout` des navigateurs (web only) : donne une continuité visuelle aux
 * changements d'écran, qui sinon « sautent » d'un coup sur le web.
 *
 * - Nouvel écran (Stack) : fondu + glissé vers le haut (`webScreenEnter`).
 * - Retour sur un onglet déjà monté : fondu court rejoué à chaque focus
 *   (`webTabFocus`), sans démonter l'écran (état et défilement conservés).
 *
 * Branché seulement si `Platform.OS === 'web'` (cf. `webScreenLayout`).
 */
function WebScreenLayout({ navigation, children }: Props) {
  const mountedAt = useRef(Date.now());
  const [epoch, setEpoch] = useState(-1);

  useEffect(
    () =>
      navigation.addListener('focus', () => {
        if (Date.now() - mountedAt.current < MOUNT_FOCUS_MS) return;
        setEpoch((e) => e + 1);
      }),
    [navigation],
  );

  const motion = epoch < 0 ? webScreenEnter() : webTabFocus(epoch);
  return <View style={[styles.fill, motion]}>{children}</View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

/** Prop `screenLayout` à passer aux navigateurs : `undefined` en natif. */
export const webScreenLayout =
  Platform.OS === 'web'
    ? (props: { navigation: unknown; children: React.ReactElement }) => (
        <WebScreenLayout navigation={props.navigation as FocusNavigation}>
          {props.children}
        </WebScreenLayout>
      )
    : undefined;
