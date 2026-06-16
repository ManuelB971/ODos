import React, { useMemo } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { UserRound, X } from 'lucide-react-native';

import { useFriendships } from '@/hooks/useFriendships';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { resolveImageUrl } from '@/utils/imageUrl';

type ConversationPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Remonte l'ami choisi : on ouvrira/retrouvera la conversation côté appelant. */
  onSelect: (friend: { userId: number; displayName: string }) => void;
  title?: string;
};

/**
 * Sélection d'un ami pour partager un contenu en message privé. On liste les
 * amis (pas les conversations) car partager peut démarrer une nouvelle conv.
 */
export function ConversationPickerSheet({ visible, onClose, onSelect, title }: ConversationPickerSheetProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { friends } = useFriendships();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title ?? 'Partager avec…'}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
              <X size={22} color={colors.muted} />
            </Pressable>
          </View>

          <FlatList
            data={friends}
            keyExtractor={(item) => String(item.id)}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.empty}>Aucun ami pour le moment.</Text>}
            renderItem={({ item }) => {
              const userId = item.otherUser?.id;
              const name = item.otherUser?.displayName ?? '?';
              if (!userId) return null;
              const uri = resolveImageUrl(item.otherUser?.avatarUrl ?? null);
              return (
                <Pressable
                  style={styles.row}
                  onPress={() => onSelect({ userId, displayName: name })}
                  accessibilityRole="button"
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <UserRound size={18} color={colors.onAccent} />
                    </View>
                  )}
                  <Text style={styles.name} numberOfLines={1}>{name}</Text>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useOdosColors>) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
      backgroundColor: colors.elevated,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '70%',
      gap: 10,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: FontFamily.display, fontSize: 20, color: colors.text },
    list: { maxHeight: 380 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface },
    avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
    name: { fontFamily: FontFamily.uiMedium, fontSize: 15, color: colors.text },
    empty: { fontFamily: FontFamily.ui, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  });
}
