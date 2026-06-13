import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFriendships } from '@/hooks/useFriendships';
import { useGroups } from '@/hooks/useGroups';
import { shareActivity } from '@/scripts/api';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { toAppError } from '@/utils/errorHandling';

type ShareModalProps = {
  visible: boolean;
  activityId: number;
  activityName: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function ShareModal({ visible, activityId, activityName, onClose, onSuccess }: ShareModalProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { friends } = useFriendships();
  const { data: groupsData } = useGroups('mine');
  const groups = groupsData?.member ?? [];

  const [message, setMessage] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Set<number>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFriend = (id: number) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (id: number) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    const targets = [...selectedFriends, ...selectedGroups];
    if (targets.length === 0) {
      setError('Sélectionnez au moins un destinataire.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const msg = message.trim() || undefined;
      await Promise.all([
        ...[...selectedFriends].map((receiverId) =>
          shareActivity({ activityId, receiverId, message: msg }),
        ),
        ...[...selectedGroups].map((groupId) =>
          shareActivity({ activityId, groupId, message: msg }),
        ),
      ]);
      setMessage('');
      setSelectedFriends(new Set());
      setSelectedGroups(new Set());
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(toAppError(err, 'Partage impossible.').userMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Partager cette activité</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{activityName}</Text>

          <TextInput
            style={styles.input}
            placeholder="Message (optionnel)"
            placeholderTextColor={colors.muted}
            value={message}
            onChangeText={setMessage}
            maxLength={280}
            multiline
          />

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.section}>Amis</Text>
            {friends.length === 0 ? (
              <Text style={styles.empty}>Aucun ami pour le moment.</Text>
            ) : (
              friends.map((f) => {
                const id = f.otherUser?.id;
                if (!id) return null;
                const checked = selectedFriends.has(id);
                return (
                  <Pressable key={f.id} style={styles.option} onPress={() => toggleFriend(id)}>
                    <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                      {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                    </View>
                    <Text style={styles.optionLabel}>{f.otherUser?.displayName}</Text>
                  </Pressable>
                );
              })
            )}

            <Text style={[styles.section, { marginTop: 16 }]}>Groupes</Text>
            {groups.length === 0 ? (
              <Text style={styles.empty}>Aucun groupe.</Text>
            ) : (
              groups.map((g) => {
                const checked = selectedGroups.has(g.id);
                return (
                  <Pressable key={g.id} style={styles.option} onPress={() => toggleGroup(g.id)}>
                    <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                      {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                    </View>
                    <Text style={styles.optionLabel}>{g.name}</Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Annuler</Text>
            </Pressable>
            <Pressable onPress={handleSubmit} disabled={submitting} style={styles.submitBtn}>
              {submitting ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={styles.submitText}>Envoyer</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useOdosColors>) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      backgroundColor: colors.elevated,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '80%',
      gap: 10,
    },
    title: {
      fontFamily: FontFamily.serifSemiBold,
      fontSize: 20,
      color: colors.text,
    },
    subtitle: {
      fontFamily: FontFamily.ui,
      fontSize: 13,
      color: colors.muted,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      fontFamily: FontFamily.ui,
      fontSize: 14,
      color: colors.text,
      minHeight: 60,
      textAlignVertical: 'top',
    },
    scroll: { maxHeight: 280 },
    section: {
      fontFamily: FontFamily.uiMedium,
      fontSize: 13,
      color: colors.muted,
      marginBottom: 8,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    checkMark: { color: colors.onAccent, fontSize: 12, fontWeight: '700' },
    optionLabel: {
      fontFamily: FontFamily.ui,
      fontSize: 15,
      color: colors.text,
    },
    empty: {
      fontFamily: FontFamily.ui,
      fontSize: 13,
      color: colors.muted,
      fontStyle: 'italic',
    },
    error: {
      fontFamily: FontFamily.ui,
      fontSize: 13,
      color: colors.danger,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelText: {
      fontFamily: FontFamily.uiMedium,
      color: colors.muted,
    },
    submitBtn: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: colors.accent,
    },
    submitText: {
      fontFamily: FontFamily.uiMedium,
      color: colors.onAccent,
    },
  });
}
