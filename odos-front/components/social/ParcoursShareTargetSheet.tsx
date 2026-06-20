import React, { useMemo } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Users, UserRound, X } from 'lucide-react-native';

import { useFriendships } from '@/hooks/useFriendships';
import { useGroups } from '@/hooks/useGroups';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { resolveImageUrl } from '@/utils/imageUrl';

/** Cible d'un partage de parcours : un ami (message privé) ou un groupe. */
export type ParcoursShareTarget =
  | { kind: 'friend'; userId: number; displayName: string }
  | { kind: 'group'; groupId: number; displayName: string };

type Row =
  | { type: 'header'; label: string }
  | { type: 'friend'; userId: number; displayName: string; avatarUrl: string | null }
  | { type: 'group'; groupId: number; displayName: string; avatarUrl: string | null };

type ParcoursShareTargetSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Remonte la cible choisie : carte de parcours envoyée côté appelant. */
  onSelect: (target: ParcoursShareTarget) => void;
  title?: string;
};

/**
 * Feuille de partage d'un parcours : on choisit une cible (ami ou groupe) pour
 * lui envoyer la **carte** du parcours dans un fil. À distinguer de l'invitation
 * à co-éditer (réservée aux amis), qui ouvre l'édition collaborative.
 */
export function ParcoursShareTargetSheet({ visible, onClose, onSelect, title }: ParcoursShareTargetSheetProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { friends } = useFriendships();
  const { data: groupsData } = useGroups('mine');
  const groups = groupsData?.member ?? [];

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const friendRows = friends
      .map((f) => f.otherUser)
      .filter((u): u is NonNullable<typeof u> => Boolean(u?.id))
      .map<Row>((u) => ({ type: 'friend', userId: u.id, displayName: u.displayName ?? '?', avatarUrl: u.avatarUrl ?? null }));
    if (friendRows.length > 0) {
      out.push({ type: 'header', label: 'Amis' }, ...friendRows);
    }
    const groupRows = groups.map<Row>((g) => ({
      type: 'group',
      groupId: g.id,
      displayName: g.name,
      avatarUrl: g.avatarUrl ?? null,
    }));
    if (groupRows.length > 0) {
      out.push({ type: 'header', label: 'Groupes' }, ...groupRows);
    }
    return out;
  }, [friends, groups]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title ?? 'Partager le parcours'}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
              <X size={22} color={colors.muted} />
            </Pressable>
          </View>

          <FlatList
            data={rows}
            keyExtractor={(item, idx) =>
              item.type === 'header' ? `h-${item.label}` : `${item.type}-${item.type === 'friend' ? item.userId : item.groupId}-${idx}`
            }
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.empty}>Aucun ami ni groupe pour partager.</Text>}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return <Text style={styles.sectionLabel}>{item.label}</Text>;
              }
              const uri = resolveImageUrl(item.avatarUrl);
              const onPress = () =>
                onSelect(
                  item.type === 'friend'
                    ? { kind: 'friend', userId: item.userId, displayName: item.displayName }
                    : { kind: 'group', groupId: item.groupId, displayName: item.displayName },
                );
              return (
                <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
                  {uri ? (
                    <Image source={{ uri }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      {item.type === 'friend' ? (
                        <UserRound size={18} color={colors.onAccent} />
                      ) : (
                        <Users size={18} color={colors.onAccent} />
                      )}
                    </View>
                  )}
                  <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
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
    list: { maxHeight: 420 },
    sectionLabel: {
      fontFamily: FontFamily.uiBold,
      fontSize: 12,
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 12,
      marginBottom: 2,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface },
    avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
    name: { fontFamily: FontFamily.uiMedium, fontSize: 15, color: colors.text },
    empty: { fontFamily: FontFamily.ui, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  });
}
