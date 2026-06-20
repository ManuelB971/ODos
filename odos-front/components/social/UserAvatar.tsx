import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { resolveImageUrl } from '@/utils/imageUrl';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';

type UserAvatarProps = {
  name?: string | null;
  avatarUrl?: string | null;
  /** Diamètre en points (carré). Par défaut 40. */
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Avatar utilisateur unifié : photo si disponible, sinon initiales sur fond
 * accent. Bordure encre en Mosaïque pop pour rester dans la DA. Centralise le
 * rendu d'avatar dupliqué jusque-là dans FriendCard / chat / recherche / membres.
 */
export function UserAvatar({ name, avatarUrl, size = 40, style }: UserAvatarProps) {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();

  const uri = resolveImageUrl(avatarUrl ?? null);
  const initials = (name ?? '?').trim().slice(0, 2).toUpperCase() || '?';
  const ring = isMosaicPop ? { borderWidth: 2, borderColor: pop.ink } : null;
  const dims = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[dims, ring, style] as React.ComponentProps<typeof Image>['style']}
        contentFit="cover"
        transition={120}
      />
    );
  }

  return (
    <View
      style={[
        dims,
        styles.fallback,
        { backgroundColor: isMosaicPop ? pop.orange : colors.accentSoft },
        ring,
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: FontFamily.uiBold,
          fontSize: Math.max(11, Math.round(size * 0.4)),
          color: isMosaicPop ? pop.ink : colors.accent,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
