import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  Platform,
  type EmitterSubscription,
} from 'react-native';

/**
 * Motion discret du composer lors de l'ouverture/fermeture clavier.
 * Respecte "Reduce Motion" : animation neutralisée quand activée.
 */
export function useKeyboardComposerMotion() {
  const progress = useRef(new Animated.Value(0)).current;
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotionEnabled)
      .catch(() => setReduceMotionEnabled(false));

    const reduceMotionSub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      setReduceMotionEnabled,
    );

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const animateTo = (toValue: number) => {
      if (reduceMotionEnabled) {
        progress.setValue(toValue);
        return;
      }
      Animated.timing(progress, {
        toValue,
        duration: 220,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        useNativeDriver: true,
      }).start();
    };

    const onShow = () => {
      setIsKeyboardVisible(true);
      animateTo(1);
    };
    const onHide = () => {
      setIsKeyboardVisible(false);
      animateTo(0);
    };

    const showSub: EmitterSubscription = Keyboard.addListener(showEvent, onShow);
    const hideSub: EmitterSubscription = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
      reduceMotionSub?.remove?.();
    };
  }, [progress, reduceMotionEnabled]);

  const animatedStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.96, 1],
    }),
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [6, 0],
        }),
      },
    ],
  } as const;

  return { animatedStyle, isKeyboardVisible };
}
