import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { FontFamily } from '@/constants/theme';
import { PopSurface } from './PopSurface';
import { usePopTokens } from './usePop';

/**
 * Ligne « pop » de liste / réglages (réf. capture `tab-profil`) : icône en carré
 * encre, label gras, sous-texte optionnel, chevron (ou élément `right`). Chaque
 * ligne est sa propre `PopSurface` (contour encre + ombre dure), à empiler avec
 * un `gap`.
 */
export function PopListItem({
  icon,
  label,
  helper,
  right,
  onPress,
  accent,
  style,
}: {
  icon?: React.ReactNode;
  label: string;
  helper?: string;
  /** Élément de droite (défaut: chevron). Passer `null` pour rien. */
  right?: React.ReactNode;
  onPress?: () => void;
  /** Fond du carré d'icône. Défaut: surface. */
  accent?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = usePopTokens();
  const Wrapper: typeof Pressable | typeof View = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [
        pressed ? styles.pressed : null,
        style,
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
    >
      <PopSurface shadow={4} radius={12} contentStyle={styles.content}>
        {icon ? (
          <View style={[styles.iconSquare, { backgroundColor: accent ?? t.surface, borderColor: t.ink }]}>
            {icon}
          </View>
        ) : null}
        <View style={styles.texts}>
          <Text style={[styles.label, { color: t.ink }]} numberOfLines={1}>
            {label}
          </Text>
          {helper ? (
            <Text style={[styles.helper, { color: t.muted }]} numberOfLines={1}>
              {helper}
            </Text>
          ) : null}
        </View>
        {right === undefined ? (
          onPress ? <ChevronRight size={18} color={t.muted} /> : null
        ) : (
          right
        )}
      </PopSurface>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  pressed: {
    transform: [{ translateX: 1.5 }, { translateY: 1.5 }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  iconSquare: {
    width: 38,
    height: 38,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 15,
    fontFamily: FontFamily.uiBold,
  },
  helper: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: FontFamily.ui,
  },
});
