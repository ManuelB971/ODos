import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, Plus, Route, X } from 'lucide-react-native';

import { useParcoursList, useParcoursMutations } from '@/hooks/useParcours';
import { useOdosColors } from '@/context/ThemeContext';
import { odosAlert } from '@/context/OdosModalContext';
import { FontFamily } from '@/constants/theme';
import { toAppError } from '@/utils/errorHandling';

type ParcoursPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Activité à ajouter au parcours choisi. */
  activity: { id: number; name: string };
  onAdded?: (parcoursId: number) => void;
};

/**
 * Feuille « Ajouter à un parcours » (modèle playlist) : liste les parcours
 * existants + permet d'en créer un nouveau, et ajoute l'activité au parcours
 * choisi. Point d'entrée unique appelé depuis la fiche activité et depuis la
 * carte d'activité partagée dans le chat.
 */
export function ParcoursPickerSheet({ visible, onClose, activity, onAdded }: ParcoursPickerSheetProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data, isLoading } = useParcoursList();
  const { create, addItem } = useParcoursMutations();
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const parcours = data?.member ?? [];
  const busy = create.isPending || addItem.isPending;

  const handleAdd = async (parcoursId: number) => {
    try {
      await addItem.mutateAsync({ parcoursId, activityId: activity.id });
      onAdded?.(parcoursId);
      onClose();
    } catch (err) {
      odosAlert('Parcours', toAppError(err, 'Impossible d’ajouter au parcours.').userMessage);
    }
  };

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (title.length < 2) return;
    try {
      const { parcours: created } = await create.mutateAsync({ title, activityIds: [activity.id] });
      setNewTitle('');
      setCreating(false);
      onAdded?.(created.id);
      onClose();
    } catch (err) {
      odosAlert('Parcours', toAppError(err, 'Impossible de créer le parcours.').userMessage);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Ajouter à un parcours</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
              <X size={22} color={colors.muted} />
            </Pressable>
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>{activity.name}</Text>

          {creating ? (
            <View style={styles.createRow}>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Nom du parcours (ex. Week-end Paris)"
                placeholderTextColor={colors.muted}
                style={styles.createInput}
                autoFocus
                maxLength={120}
                onSubmitEditing={handleCreate}
              />
              <Pressable
                onPress={handleCreate}
                disabled={newTitle.trim().length < 2 || busy}
                style={[styles.createBtn, { opacity: newTitle.trim().length < 2 || busy ? 0.5 : 1 }]}
                accessibilityRole="button"
              >
                {busy ? <ActivityIndicator color={colors.onAccent} /> : <Check size={18} color={colors.onAccent} />}
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.newRow} onPress={() => setCreating(true)} accessibilityRole="button">
              <View style={styles.newIcon}>
                <Plus size={18} color={colors.onAccent} />
              </View>
              <Text style={styles.newLabel}>Nouveau parcours</Text>
            </Pressable>
          )}

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 16 }} color={colors.accent} />
          ) : (
            <FlatList
              data={parcours}
              keyExtractor={(item) => String(item.id)}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.empty}>Aucun parcours pour l’instant — créez-en un.</Text>
              }
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => handleAdd(item.id)} accessibilityRole="button">
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
                  <Plus size={18} color={colors.muted} />
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
      maxHeight: '80%',
      gap: 10,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: FontFamily.display, fontSize: 20, color: colors.text },
    subtitle: { fontFamily: FontFamily.ui, fontSize: 13, color: colors.muted },
    newRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    newIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    newLabel: { fontFamily: FontFamily.uiMedium, fontSize: 15, color: colors.text },
    createRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    createInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: FontFamily.ui,
      fontSize: 15,
      color: colors.text,
    },
    createBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: { maxHeight: 360 },
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
    empty: { fontFamily: FontFamily.ui, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 20 },
  });
}
