import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { MapPin, Search, X } from 'lucide-react-native';

import { useActivities } from '@/hooks/useActivities';
import { useFavorites } from '@/hooks/useFavorites';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { resolveImageUrl } from '@/utils/imageUrl';
import type { ApiActivity } from '@/types';

type ActivityPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (activity: ApiActivity) => void;
  /** Titre de la feuille. Défaut : « Partager une activité ». */
  title?: string;
};

/**
 * Feuille de sélection d'une activité (favoris d'abord, recherche live ensuite).
 *
 * Réutilisée pour partager une activité dans un chat (carte riche) et pour
 * l'ajouter à un parcours (modèle « ajouter à la playlist »). Volontairement
 * agnostique de l'action : remonte l'activité choisie via `onSelect`.
 */
export function ActivityPickerSheet({ visible, onClose, onSelect, title }: ActivityPickerSheetProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { favorites } = useFavorites();
  const { data: allActivities } = useActivities();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) {
      // Sans recherche : favoris d'abord, repli sur tout le catalogue.
      return favorites.length > 0 ? favorites : (allActivities ?? []).slice(0, 30);
    }
    return (allActivities ?? []).filter(
      (a) =>
        a.name.toLowerCase().includes(q) || (a.city ?? '').toLowerCase().includes(q),
    );
  }, [query, favorites, allActivities]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title ?? 'Partager une activité'}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
              <X size={22} color={colors.muted} />
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <Search size={18} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher une activité…"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>Aucune activité trouvée.</Text>}
            renderItem={({ item }) => {
              const uri = resolveImageUrl(item.imageUrl);
              return (
                <Pressable style={styles.row} onPress={() => onSelect(item)} accessibilityRole="button">
                  {uri ? (
                    <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbFallback]}>
                      <MapPin size={18} color={colors.onAccent} />
                    </View>
                  )}
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                    {item.city ? <Text style={styles.rowCity} numberOfLines={1}>{item.city}</Text> : null}
                  </View>
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
      maxHeight: '80%',
      gap: 12,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: FontFamily.display, fontSize: 20, color: colors.text },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      fontFamily: FontFamily.ui,
      fontSize: 15,
      color: colors.text,
    },
    list: { maxHeight: 420 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.surface },
    thumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
    rowText: { flex: 1 },
    rowName: { fontFamily: FontFamily.uiMedium, fontSize: 15, color: colors.text },
    rowCity: { fontFamily: FontFamily.ui, fontSize: 13, color: colors.muted, marginTop: 2 },
    empty: { fontFamily: FontFamily.ui, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  });
}
