import { Modal, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { Award, X } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { resolveImageUrl } from '@/utils/imageUrl';
import type { BadgeItem } from '@/types';

type Props = {
  badge: BadgeItem | null;
  onClose: () => void;
};

export function BadgeUnlockModal({ badge, onClose }: Props) {
  if (!badge) return null;

  const imageUri = resolveImageUrl(badge.imageUrl);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable style={styles.close} onPress={onClose} accessibilityLabel="Fermer">
            <X size={20} color={Colors.light.muted} />
          </Pressable>
          <View style={styles.iconWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.badgeImage} resizeMode="cover" />
            ) : (
              <Award size={48} color={Colors.light.accent} />
            )}
          </View>
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  close: { alignSelf: 'flex-end', padding: 4 },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f8f4ef',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  badgeImage: { width: 96, height: 96 },
  kicker: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 4,
    textAlign: 'center',
  },
  desc: {
    fontSize: 15,
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  btn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
