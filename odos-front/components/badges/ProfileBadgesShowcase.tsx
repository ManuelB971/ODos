import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Award } from 'lucide-react-native';
import { BlobFrame } from '@/components/ui/BlobFrame';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { resolveImageUrl } from '@/utils/imageUrl';
import type { BadgeItem } from '@/types';

const BADGE_SIZE = 72;

type Props = {
  badges: BadgeItem[];
};

function SpinningBadgeBlob({ badge, index }: { badge: BadgeItem; index: number }) {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const spin = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.35)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  const uri = resolveImageUrl(badge.imageUrl);
  const ink = isMosaicPop ? pop.ink : colors.text;
  const sub = isMosaicPop ? pop.muted : colors.muted;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      spin.setValue(1);
      scale.setValue(1);
      tilt.setValue(1);
      return;
    }

    const delay = index * 140;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(spin, {
          toValue: 1,
          duration: 980,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.spring(scale, {
            toValue: 1.12,
            friction: 5,
            tension: 140,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            friction: 7,
            tension: 90,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(tilt, {
          toValue: 1,
          duration: 980,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [index, reduceMotion, scale, spin, tilt]);

  const rotate = spin.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: ['0deg', '540deg', '900deg', '1080deg'],
  });

  const wobble = tilt.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-14deg', '8deg', '0deg'],
  });

  return (
    <View style={styles.badgeItem} accessibilityRole="text" accessibilityLabel={`Badge ${badge.name}`}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Animated.View style={{ transform: [{ rotate: wobble }] }}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <BlobFrame
          size={BADGE_SIZE}
          seed={badge.id}
          backgroundColor={isMosaicPop ? pop.paper : colors.surface}
          style={[
            styles.blob,
            isMosaicPop
              ? { borderWidth: 2.5, borderColor: pop.ink }
              : { borderWidth: 1, borderColor: colors.border },
          ]}
        >
          {uri ? (
            <Image source={{ uri }} style={styles.badgeImage} resizeMode="cover" />
          ) : (
            <Award size={32} color={isMosaicPop ? pop.orange : colors.accent} />
          )}
        </BlobFrame>
          </Animated.View>
        </Animated.View>
      </Animated.View>
      <Text style={[styles.badgeName, { color: ink, fontFamily: FontFamily.uiMedium }]} numberOfLines={2}>
        {badge.name}
      </Text>
      <Text style={[styles.badgeHint, { color: sub, fontFamily: FontFamily.ui }]} numberOfLines={1}>
        {badge.description}
      </Text>
    </View>
  );
}

export function ProfileBadgesShowcase({ badges }: Props) {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();

  if (badges.length === 0) return null;

  const ink = isMosaicPop ? pop.ink : colors.text;

  return (
    <View
      style={[
        styles.section,
        isMosaicPop
          ? { backgroundColor: pop.paper, borderColor: pop.ink, borderWidth: 2.5 }
          : { backgroundColor: colors.elevated, borderColor: colors.border, borderWidth: 1 },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: ink, fontFamily: FontFamily.uiBold }]}>Badges</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {badges.map((badge, index) => (
          <SpinningBadgeBlob key={badge.id} badge={badge} index={index} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    paddingHorizontal: 4,
  },
  row: {
    gap: 14,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  badgeItem: {
    width: 88,
    alignItems: 'center',
    gap: 6,
  },
  blob: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  badgeImage: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
  },
  badgeName: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 14,
  },
  badgeHint: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
});
