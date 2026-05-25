import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { Svg, Ellipse, Path, G } from 'react-native-svg';

ExpoSplashScreen.preventAutoHideAsync();

const AnimatedView = Animated.createAnimatedComponent(View);

function OdosLogo({ size = 100 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="630 35 155 130">
      <G>
        <Ellipse
          cx="707.56"
          cy="98.32"
          rx="71.08"
          ry="58.88"
          fill="#ffffff"
          fillOpacity={0.2}
          stroke="#ffffff"
          strokeWidth={1}
        />
        <Path
          d="m 690.55891,83.537428 c -1.80113,27.925882 -39.79587,20.889682 -37.44565,51.505552 0.0395,0.52676 0.50026,1.03951 1.02806,1.1433 -6.91055,0.32578 95.42157,13.76468 97.43809,7.99714 l 7.65797,-85.111147 c -0.0418,-0.526791 -8.65878,-0.994364 -9.18659,-1.098343 z m 61.47305,60.921042 -82.08179,-95.675807 25.41494,3.302732 61.41924,9.647079 -6.94053,81.585746 -94.89795,-8.84552 -0.94493,-53.583046 -0.23517,-22.628892 z"
          fill="#ffffff"
        />
      </G>
    </Svg>
  );
}

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(15);
  const containerOpacity = useSharedValue(1);

  const handleAnimationEnd = useCallback(() => {
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    ExpoSplashScreen.hideAsync();

    logoOpacity.value = withTiming(1, { duration: 400 });
    logoScale.value = withSequence(
      withSpring(1.1, { damping: 8, stiffness: 100 }),
      withSpring(1, { damping: 12, stiffness: 100 }),
    );

    titleOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    titleTranslateY.value = withDelay(
      500,
      withSpring(0, { damping: 12, stiffness: 80 }),
    );

    taglineOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));
    taglineTranslateY.value = withDelay(
      900,
      withSpring(0, { damping: 12, stiffness: 80 }),
    );

    containerOpacity.value = withDelay(
      2400,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }, () => {
        runOnJS(handleAnimationEnd)();
      }),
    );
    // Shared values are stable; animation must run once on mount.
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

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <AnimatedView style={[styles.container, containerStyle]}>
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <OdosLogo size={120} />
        </Animated.View>

        <Animated.Text style={[styles.title, titleStyle]}>ODOS</Animated.Text>

        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Explorez. Decouvrez. Vivez.
        </Animated.Text>
      </View>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F4A261',
    zIndex: 999,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 6,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1.5,
  },
});
