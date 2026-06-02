import { Modal, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { useMemo } from 'react';
import { Award, X } from 'lucide-react-native';
import { Spacing, FontFamily, Radius } from '@/constants/theme';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';
import { BlobFrame } from '@/components/ui/BlobFrame';
import { resolveImageUrl } from '@/utils/imageUrl';
import type { BadgeItem } from '@/types';

type Props = {
  badge: BadgeItem | null;
  onClose: () => void;
};

export function BadgeUnlockModal({ badge, onClose }: Props) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!badge) return null;

  const imageUri = resolveImageUrl(badge.imageUrl);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable style={styles.close} onPress={onClose} accessibilityLabel="Fermer">
            <X size={20} color={colors.muted} />
          </Pressable>
          <BlobFrame size={96} seed={badge.id} backgroundColor={colors.surface}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.badgeImage} resizeMode="cover" />
            ) : (
              <Award size={48} color={colors.accent} />
            )}
          </BlobFrame>
          <Text style={styles.kicker}>Nouveau badge !</Text>
          <Text style={styles.title}>{badge.name}</Text>
          <Text style={styles.desc}>{badge.description}</Text>
          <Pressable style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Super !</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(17, 24, 28, 0.55)',
      justifyContent: 'center',
      padding: Spacing.lg,
    },
    card: {
      backgroundColor: colors.elevated,
      borderRadius: Radius.modal,
      padding: Spacing.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    close: { alignSelf: 'flex-end', padding: 4 },
    badgeImage: { width: 96, height: 96 },
    kicker: {
      fontSize: 11,
      fontFamily: FontFamily.uiBold,
      color: colors.accent,
      textTransform: 'uppercase',
      letterSpacing: 1.4,
      marginTop: Spacing.md,
    },
    title: {
      fontSize: 24,
      fontFamily: FontFamily.display,
      color: colors.text,
      marginTop: 4,
      textAlign: 'center',
    },
    desc: {
      fontSize: 15,
      fontFamily: FontFamily.ui,
      color: colors.muted,
      textAlign: 'center',
      marginTop: Spacing.sm,
      lineHeight: 22,
    },
    btn: {
      marginTop: Spacing.lg,
      backgroundColor: colors.accent,
      paddingHorizontal: 28,
      paddingVertical: 12,
      borderRadius: Radius.pill,
    },
    btnText: {
      color: '#fff',
      fontFamily: FontFamily.uiBold,
      fontSize: 16,
    },
  });
}
