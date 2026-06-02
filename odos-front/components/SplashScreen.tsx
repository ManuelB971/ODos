import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as ExpoSplashScreen from 'expo-splash-screen';

import { BrandBaseline } from '@/components/BrandBaseline';
import { AppLogo } from '@/components/AppLogo';
import { SprayBackground } from '@/components/ui/SprayBackground';
import { BRAND_TAGLINE } from '@/constants/brand';
import { FontFamily } from '@/constants/theme';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';

ExpoSplashScreen.preventAutoHideAsync();

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedText = Animated.createAnimatedComponent(Text);

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const baselineOpacity = useSharedValue(0);
  const baselineTranslateY = useSharedValue(15);
  const taglineOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  const handleAnimationEnd = useCallback(() => {
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    ExpoSplashScreen.hideAsync();

    logoOpacity.value = withTiming(1, { duration: 400 });
    logoScale.value = withSequence(
      withSpring(1.08, { damping: 8, stiffness: 100 }),
      withSpring(1, { damping: 12, stiffness: 100 }),
    );

    titleOpacity.value = withDelay(450, withTiming(1, { duration: 500 }));
    titleTranslateY.value = withDelay(450, withSpring(0, { damping: 12, stiffness: 80 }));

    baselineOpacity.value = withDelay(750, withTiming(1, { duration: 550 }));
    baselineTranslateY.value = withDelay(750, withSpring(0, { damping: 12, stiffness: 80 }));

    taglineOpacity.value = withDelay(1050, withTiming(1, { duration: 450 }));

    containerOpacity.value = withDelay(
      2600,
      withTiming(0, { duration: 420, easing: Easing.out(Easing.ease) }, () => {
        runOnJS(handleAnimationEnd)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const baselineStyle = useAnimatedStyle(() => ({
    opacity: baselineOpacity.value,
    transform: [{ translateY: baselineTranslateY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <AnimatedView style={[styles.overlay, containerStyle]}>
      <SprayBackground sprayOpacity={0.42}>
        <View style={styles.content}>
          <Animated.View style={[styles.logoCircle, logoStyle]}>
            <AppLogo width={56} height={56} />
          </Animated.View>

          <AnimatedText style={[styles.title, titleStyle]}>ODOS</AnimatedText>

          <Animated.View style={baselineStyle}>
            <BrandBaseline variant="full" style={styles.baseline} />
          </Animated.View>

          <AnimatedText style={[styles.tagline, taglineStyle]}>{BRAND_TAGLINE}</AnimatedText>
        </View>
      </SprayBackground>
    </AnimatedView>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 999,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 28,
    },
    logoCircle: {
      width: 96,
      height: 96,
      borderRadius: 28,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 22,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.28,
      shadowRadius: 20,
      elevation: 8,
    },
    title: {
      fontSize: 40,
      fontFamily: FontFamily.display,
      color: colors.text,
      letterSpacing: 8,
      marginBottom: 10,
    },
    baseline: {
      fontSize: 15,
      paddingHorizontal: 8,
      marginBottom: 10,
    },
    tagline: {
      fontSize: 12,
      fontFamily: FontFamily.uiMedium,
      color: colors.muted,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
  });
}
