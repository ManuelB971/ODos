import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Route, X } from 'lucide-react-native';

import { useParcoursList } from '@/hooks/useParcours';
import { useOdosColors } from '@/context/ThemeContext';
import { useResponsiveSheet } from '@/hooks/useResponsiveSheet';
import { FontFamily } from '@/constants/theme';
import type { ParcoursSummary } from '@/types';

type ParcoursSharePickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Remonte le parcours choisi pour le partager dans le fil. */
  onSelect: (parcours: ParcoursSummary) => void;
  title?: string;
};

/**
 * Feuille de sélection d'un parcours à **partager** dans un fil (groupe ou
 * message privé). À ne pas confondre avec {@link ParcoursPickerSheet} qui ajoute
 * une activité à un parcours (modèle playlist).
 */
export function ParcoursSharePickerSheet({ visible, onClose, onSelect, title }: ParcoursSharePickerSheetProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sheetLayout = useResponsiveSheet();
  const { data, isLoading } = useParcoursList();
  const parcours = data?.member ?? [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, sheetLayout.backdrop]}>
        <View style={[styles.sheet, sheetLayout.sheet]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title ?? 'Partager un parcours'}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
              <X size={22} color={colors.muted} />
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 16 }} color={colors.accent} />
          ) : (
            <FlatList
              data={parcours}
              keyExtractor={(item) => String(item.id)}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.empty}>Aucun parcours pour l’instant — créez-en un depuis l’onglet Parcours.</Text>
              }
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => onSelect(item)} accessibilityRole="button">
                  <View style={styles.routeIcon}>
                    <Route size={18} color={colors.accent} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.rowMeta}>
                      {item.itemCount} étape{item.itemCount > 1 ? 's' : ''}
                      {item.isOwner ? '' : ' · partagé'}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          )}
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
    routeIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1 },
    rowName: { fontFamily: FontFamily.uiMedium, fontSize: 15, color: colors.text },
    rowMeta: { fontFamily: FontFamily.ui, fontSize: 12, color: colors.muted, marginTop: 2 },
    empty: { fontFamily: FontFamily.ui, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  });
}
