import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useOdosColors } from '@/context/ThemeContext';
import { useResponsiveSheet } from '@/hooks/useResponsiveSheet';
import { FontFamily } from '@/constants/theme';
import type { ForumReportReason } from '@/types';

const REASONS: { value: ForumReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harcèlement' },
  { value: 'illegal', label: 'Contenu illégal' },
  { value: 'other', label: 'Autre' },
];

type ReportContentModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ForumReportReason, details?: string) => void;
  loading?: boolean;
};

export function ReportContentModal({ visible, onClose, onSubmit, loading }: ReportContentModalProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sheetLayout = useResponsiveSheet();
  const [reason, setReason] = useState<ForumReportReason>('spam');
  const [details, setDetails] = useState('');

  const submit = () => {
    onSubmit(reason, details.trim() || undefined);
    setDetails('');
    setReason('spam');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, sheetLayout.backdrop]}>
        <View style={[styles.card, sheetLayout.sheet]}>
          <Text style={styles.title}>Signaler ce contenu</Text>
          {REASONS.map((item) => (
            <Pressable key={item.value} onPress={() => setReason(item.value)} style={styles.reasonRow}>
              <Text style={[styles.reason, reason === item.value && styles.reasonActive]}>{item.label}</Text>
            </Pressable>
          ))}
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Détails (optionnel)"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
          />
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>Annuler</Text>
            </Pressable>
            <Pressable onPress={submit} disabled={loading} style={styles.primaryBtn}>
              {loading ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={styles.primaryText}>Envoyer</Text>
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
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 10 },
    title: { fontFamily: FontFamily.uiMedium, fontSize: 17, color: colors.text, marginBottom: 4 },
    reasonRow: { paddingVertical: 6 },
    reason: { fontFamily: FontFamily.ui, fontSize: 15, color: colors.muted },
    reasonActive: { color: colors.accent, fontFamily: FontFamily.uiMedium },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      minHeight: 72,
      fontFamily: FontFamily.ui,
      color: colors.text,
      textAlignVertical: 'top',
    },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
    secondaryBtn: { paddingVertical: 10, paddingHorizontal: 14 },
    secondaryText: { fontFamily: FontFamily.ui, color: colors.muted },
    primaryBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, minWidth: 96, alignItems: 'center' },
    primaryText: { fontFamily: FontFamily.uiMedium, color: colors.onAccent },
  });
}
