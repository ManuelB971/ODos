import { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Navigation } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CTAButton } from '@/components/ui/CTAButton';
import { PopSurface } from '@/components/pop/PopSurface';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import type { OdosColorPalette } from '@/context/ThemeContext';
import { useOdosColors } from '@/context/ThemeContext';
import { useMotionConfig } from '@/constants/motion';

/** Hauteur de base du footer (hors safe area) pour le padding du scroll parent. */
export const ACTIVITY_DIRECTIONS_FOOTER_SCROLL_PADDING = 136;

export function activityDirectionsScrollPadding(composerActive: boolean, bottomInset: number): number {
  const inset = Math.max(bottomInset, 12);
  return composerActive ? inset + 20 : ACTIVITY_DIRECTIONS_FOOTER_SCROLL_PADDING + inset;
}

type Props = {
  latitude: number;
  longitude: number;
  name: string;
  city?: string | null;
  /** Clavier ouvert / zone commentaire active — le footer se range pour laisser la place. */
  composerActive?: boolean;
};

export function ActivityDirectionsFooter({
  latitude,
  longitude,
  name,
  city,
  composerActive = false,
}: Props) {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const insets = useSafeAreaInsets();
  const motion = useMotionConfig();
  const styles = useMemo(
    () => createStyles(colors, isMosaicPop ? pop : null),
    [colors, isMosaicPop, pop],
  );
  const [launching, setLaunching] = useState(false);

  const enterY = useSharedValue(motion.reduced ? 0 : 18);
  const enterOpacity = useSharedValue(motion.reduced ? 1 : 0);
  const hideProgress = useSharedValue(composerActive ? 1 : 0);

  useEffect(() => {
    enterY.value = withTiming(0, {
      duration: motion.duration(280),
      easing: Easing.out(Easing.cubic),
    });
    enterOpacity.value = withTiming(1, {
      duration: motion.duration(240),
      easing: Easing.out(Easing.quad),
    });
  }, [enterOpacity, enterY, motion]);

  useEffect(() => {
    hideProgress.value = withTiming(composerActive ? 1 : 0, {
      duration: motion.duration(220),
      easing: Easing.out(Easing.cubic),
    });
  }, [composerActive, hideProgress, motion]);

  const animatedRootStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value * (1 - hideProgress.value),
    transform: [{ translateY: enterY.value + hideProgress.value * 48 }],
  }));

  const openDirections = async () => {
    if (launching) return;
    setLaunching(true);
    const label = encodeURIComponent(name);
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${latitude},${longitude}&q=${label}`
        : `google.navigation:q=${latitude},${longitude}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
        );
      }
    } catch {
      // silent fail — l'utilisateur peut réessayer
    } finally {
      setTimeout(() => setLaunching(false), 800);
    }
  };

  const destinationLabel = city?.trim() || name;
  const scrimColors = useMemo(
    () => [`${colors.background}00`, `${colors.background}CC`, colors.background] as const,
    [colors.background],
  );

  const cardBody = (
    <>
      <View style={styles.locationRow}>
        <View style={styles.locationIcon}>
          <MapPin
            size={15}
            color={isMosaicPop ? pop.ink : colors.accent}
            strokeWidth={2.25}
          />
        </View>
        <View style={styles.locationText}>
          <Text
            style={styles.locationTitle}
            numberOfLines={1}
            accessibilityRole="text"
          >
            {destinationLabel}
          </Text>
          <Text style={styles.locationHint} numberOfLines={1}>
            Itinéraire dans votre app Plans
          </Text>
        </View>
      </View>
      <CTAButton
        label="Y aller"
        onPress={openDirections}
        loading={launching}
        size="lg"
        fullWidth
        leftIcon={
          <Navigation
            size={18}
            color={isMosaicPop ? pop.ink : colors.onAccent}
          />
        }
        accessibilityLabel={`Y aller vers ${destinationLabel}`}
      />
    </>
  );

  return (
    <Animated.View
      style={[styles.root, animatedRootStyle]}
      pointerEvents={composerActive ? 'none' : 'box-none'}
    >
      <LinearGradient
        colors={scrimColors}
        locations={[0, 0.55, 1]}
        style={[styles.scrim, composerActive && styles.scrimHidden]}
        pointerEvents="none"
      />
      <View style={[styles.inner, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {isMosaicPop ? (
            <PopSurface shadow={5} radius={Radius.card} contentStyle={styles.popCard}>
              {cardBody}
            </PopSurface>
          ) : (
            <View style={styles.card}>{cardBody}</View>
          )}
      </View>
    </Animated.View>
  );
}

function createStyles(colors: OdosColorPalette, pop: ReturnType<typeof usePopTokens> | null) {
  return StyleSheet.create({
    root: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    scrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 120,
    },
    scrimHidden: {
      opacity: 0,
    },
    inner: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
    },
    card: {
      backgroundColor: colors.elevated,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.md,
      gap: Spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 12,
    },
    popCard: {
      padding: Spacing.md,
      gap: Spacing.md,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    locationIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: pop ? pop.orange : colors.accentSoft,
      ...(pop ? { borderWidth: 2, borderColor: pop.ink } : null),
    },
    locationText: {
      flex: 1,
      gap: 2,
    },
    locationTitle: {
      fontSize: 14,
      fontFamily: FontFamily.uiBold,
      color: pop ? pop.ink : colors.text,
      letterSpacing: 0.1,
    },
    locationHint: {
      fontSize: 12,
      fontFamily: FontFamily.ui,
      color: pop ? `${pop.ink}AA` : colors.muted,
    },
  });
}
