import React, { useEffect, useImperativeHandle, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export type BottomSheetState = 'collapsed' | 'half' | 'full';

export type BottomSheetProps = {
  children: React.ReactNode;
  /** État courant (contrôlé). */
  state: BottomSheetState;
  /** Callback lorsque l'utilisateur glisse vers un autre snap point. */
  onChangeState: (state: BottomSheetState) => void;
  /** Hauteurs en % de l'écran pour chaque état. Valeurs par défaut raisonnables. */
  snapHeights?: { collapsed: number; half: number; full: number };
  /** Position Y du haut du sheet (worklet → JS) pour caler les overlays carte. */
  onSheetTopY?: (topY: number) => void;
};

export type BottomSheetRef = {
  snapTo: (state: BottomSheetState) => void;
};

/**
 * Bottom sheet draggable à 3 snap points, 100 % Reanimated v3 worklets.
 *
 * - Spring physics doux (≈ iOS), pas de saut visuel.
 * - Drag gesture qui suit le doigt puis retombe sur le snap le plus proche
 *   (seuil vélocité pour skip un niveau si flick rapide).
 * - Handle visible en haut pour l'affordance.
 *
 * Implémenté sans `@gorhom/bottom-sheet` pour éviter d'alourdir le bundle —
 * la logique utile tient en ~80 lignes et reste prévisible.
 */
export const BottomSheet = React.forwardRef<BottomSheetRef, BottomSheetProps>(
  function BottomSheet({ children, state, onChangeState, snapHeights, onSheetTopY }, ref) {
    const colors = useOdosColors();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { height: windowHeight } = useWindowDimensions();

    const snaps = useMemo(() => {
      const s = snapHeights ?? { collapsed: 0.12, half: 0.45, full: 0.9 };
      return {
        collapsed: windowHeight * (1 - s.collapsed),
        half: windowHeight * (1 - s.half),
        full: windowHeight * (1 - s.full),
      };
    }, [snapHeights, windowHeight]);

    // `translateY` = position absolue du haut du sheet (0 = tout en haut de l'écran,
    // windowHeight = tout en bas / caché). On stocke la valeur en shared value.
    const translateY = useSharedValue(snaps[state]);
    const startY = useSharedValue(0);

    // Sync quand le state contrôlé change depuis le parent (ex. clic sur un pin → half)
    useEffect(() => {
      translateY.value = withSpring(snaps[state], SPRING_CONFIG);
    }, [state, snaps, translateY]);

    useImperativeHandle(ref, () => ({
      snapTo: (s: BottomSheetState) => {
        onChangeState(s);
      },
    }));

    const notifyChange = (next: BottomSheetState) => {
      if (next !== state) onChangeState(next);
    };

    const panGesture = Gesture.Pan()
      .onStart(() => {
        startY.value = translateY.value;
      })
      .onUpdate((e) => {
        const next = startY.value + e.translationY;
        // Clamp entre la position "full" (haut) et "collapsed" (bas)
        translateY.value = Math.max(snaps.full, Math.min(snaps.collapsed, next));
      })
      .onEnd((e) => {
        const velocity = e.velocityY;
        const current = translateY.value;

        // Détermine la cible la plus proche, en tenant compte de la vélocité.
        const distances: [BottomSheetState, number][] = [
          ['full', Math.abs(current - snaps.full)],
          ['half', Math.abs(current - snaps.half)],
          ['collapsed', Math.abs(current - snaps.collapsed)],
        ];
        distances.sort((a, b) => a[1] - b[1]);
        let target: BottomSheetState = distances[0][0];

        // Flick rapide vers le bas → snap plus bas ; vers le haut → snap plus haut.
        if (velocity > 900) {
          target = target === 'full' ? 'half' : target === 'half' ? 'collapsed' : 'collapsed';
        } else if (velocity < -900) {
          target = target === 'collapsed' ? 'half' : target === 'half' ? 'full' : 'full';
        }

        translateY.value = withSpring(snaps[target], SPRING_CONFIG);
        runOnJS(notifyChange)(target);
      });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    useAnimatedReaction(
      () => translateY.value,
      (y, prev) => {
        if (onSheetTopY && y !== prev) {
          runOnJS(onSheetTopY)(y);
        }
      },
      [onSheetTopY]
    );

    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, { height: windowHeight }, animatedStyle]}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </GestureDetector>
    );
  }
);

const SPRING_CONFIG = {
  damping: 22,
  stiffness: 220,
  mass: 0.9,
  overshootClamping: false,
} as const;

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      backgroundColor: colors.elevated,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 16,
    },
    handleWrap: {
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 6,
    },
    handle: {
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
    },
    content: {
      flex: 1,
    },
  });
}
