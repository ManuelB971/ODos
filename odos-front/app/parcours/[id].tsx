import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronUp, Pencil, Plus, Share2, Trash2 } from 'lucide-react-native';

import { useParcoursDetail, useParcoursMutations } from '@/hooks/useParcours';
import { useChatMutations } from '@/hooks/useChat';
import { useAuth } from '@/context/AuthContext';
import { useOdosColors, useTheme, type OdosColorPalette } from '@/context/ThemeContext';
import { FontFamily, Spacing } from '@/constants/theme';
import { getOdosMaplibreStyleUrl } from '@/constants/maplibreStyle';
import { regionToInitialCamera, type LatLngRegion } from '@/utils/mapViewport';
import { ParcoursRouteLayer } from '@/components/map/ParcoursRouteLayer';
import { ActivityPickerSheet } from '@/components/social/ActivityPickerSheet';
import { ConversationPickerSheet } from '@/components/social/ConversationPickerSheet';
import { PopEmptyState } from '@/components/pop/PopEmptyState';
import { toAppError } from '@/utils/errorHandling';
import type { ParcoursItemDetail } from '@/types';

const FRANCE_FALLBACK: LatLngRegion = {
  latitude: 46.603354,
  longitude: 1.888334,
  latitudeDelta: 6,
  longitudeDelta: 6,
};

export default function ParcoursDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const parcoursId = Number(id);
  const colors = useOdosColors();
  const { colorScheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { user } = useAuth();
  const { data, isLoading } = useParcoursDetail(parcoursId);
  const { addItem, removeItem, reorder, rename } = useParcoursMutations(parcoursId);
  const { startConversation, sendMessage } = useChatMutations();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const parcours = data?.parcours;
  const items = useMemo(() => parcours?.items ?? [], [parcours]);

  const geoItems = useMemo(
    () => items.filter((it) => it.activity && it.activity.latitude != null && it.activity.longitude != null),
    [items],
  );

  const points = useMemo<[number, number][]>(
    () => geoItems.map((it) => [it.activity!.longitude, it.activity!.latitude]),
    [geoItems],
  );

  const initialCamera = useMemo(() => {
    if (points.length === 0) return regionToInitialCamera(FRANCE_FALLBACK);
    const lats = points.map((p) => p[1]);
    const lngs = points.map((p) => p[0]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return regionToInitialCamera({
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.05),
      longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.05),
    });
  }, [points]);

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const order = items.map((it) => it.id);
    [order[index], order[next]] = [order[next], order[index]];
    reorder.mutate({ parcoursId, order });
  };

  const confirmRemove = (item: ParcoursItemDetail) => {
    Alert.alert('Retirer l’étape', `Retirer « ${item.activity?.name ?? 'cette activité'} » du parcours ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: () => removeItem.mutate({ parcoursId, itemId: item.id }),
      },
    ]);
  };

  const saveTitle = () => {
    const title = titleDraft.trim();
    setEditingTitle(false);
    if (title.length >= 2 && title !== parcours?.title) {
      rename.mutate({ parcoursId, title });
    }
  };

  const onAddActivity = (activity: { id: number }) => {
    setPickerOpen(false);
    addItem.mutate(
      { parcoursId, activityId: activity.id },
      { onError: (err) => Alert.alert('Parcours', toAppError(err, 'Ajout impossible.').userMessage) },
    );
  };

  const onShareToFriend = async ({ userId, displayName }: { userId: number; displayName: string }) => {
    setShareOpen(false);
    if (!parcours) return;
    try {
      const { conversation } = await startConversation.mutateAsync(userId);
      sendMessage.mutate({
        conversationId: conversation.id,
        content: '',
        parcoursId,
        parcours: { id: parcours.id, title: parcours.title, itemCount: parcours.itemCount },
      });
      Alert.alert('Parcours partagé', `« ${parcours.title} » envoyé à ${displayName}.`);
    } catch (err) {
      Alert.alert('Partage', toAppError(err, 'Partage impossible. Vous devez être amis.').userMessage);
    }
  };

  const canShare = !!user?.socialConsentedAt;

  if (isLoading && !parcours) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Stack.Screen options={{ title: 'Parcours', headerShown: true, headerBackTitle: 'Retour' }} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ title: parcours?.title ?? 'Parcours', headerShown: true, headerBackTitle: 'Retour' }}
      />

      <View style={styles.mapBox}>
        <Map
          style={StyleSheet.absoluteFill}
          mapStyle={getOdosMaplibreStyleUrl(colorScheme)}
          compass={false}
          scaleBar={false}
          logo={false}
          attribution={false}
          touchPitch={false}
          touchRotate={false}
        >
          <Camera initialViewState={initialCamera} />
          <ParcoursRouteLayer points={points} />
          {geoItems.map((it, idx) => (
            <Marker
              key={`stop-${it.id}`}
              id={`stop-${it.id}`}
              lngLat={[it.activity!.longitude, it.activity!.latitude]}
              anchor="center"
            >
              <View style={styles.numberPin}>
                <Text style={styles.numberPinText}>{idx + 1}</Text>
              </View>
            </Marker>
          ))}
        </Map>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {editingTitle ? (
              <View style={styles.titleEditRow}>
                <TextInput
                  value={titleDraft}
                  onChangeText={setTitleDraft}
                  style={styles.titleInput}
                  autoFocus
                  maxLength={120}
                  onBlur={saveTitle}
                  onSubmitEditing={saveTitle}
                />
              </View>
            ) : (
              <Pressable
                style={styles.titleRow}
                onPress={() => {
                  setTitleDraft(parcours?.title ?? '');
                  setEditingTitle(true);
                }}
              >
                <Text style={styles.title}>{parcours?.title}</Text>
                <Pencil size={16} color={colors.muted} />
              </Pressable>
            )}
            <Text style={styles.meta}>
              {items.length} étape{items.length > 1 ? 's' : ''}
              {parcours && !parcours.isOwner ? ' · partagé avec vous' : ''}
              {parcours && parcours.collaboratorCount > 0 ? ` · ${parcours.collaboratorCount} collaborateur${parcours.collaboratorCount > 1 ? 's' : ''}` : ''}
            </Text>

            <View style={styles.actionsRow}>
              <Pressable style={styles.addBtn} onPress={() => setPickerOpen(true)} accessibilityRole="button">
                <Plus size={18} color={colors.onAccent} />
                <Text style={styles.addBtnText}>Ajouter une activité</Text>
              </Pressable>
              {canShare ? (
                <Pressable
                  style={styles.shareBtn}
                  onPress={() => setShareOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Partager le parcours"
                >
                  <Share2 size={18} color={colors.accent} />
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <PopEmptyState
            icon={<Plus size={26} color={colors.onAccent} />}
            title="Parcours vide"
            subtitle="Ajoutez des activités pour construire votre itinéraire."
            ctaLabel="Ajouter une activité"
            onPressCta={() => setPickerOpen(true)}
          />
        }
        renderItem={({ item, index }) => (
          <View style={styles.itemRow}>
            <View style={styles.itemNumber}>
              <Text style={styles.itemNumberText}>{index + 1}</Text>
            </View>
            <Pressable
              style={styles.itemBody}
              onPress={() => item.activity && router.push(`/activity/${item.activity.id}`)}
            >
              <Text style={styles.itemName} numberOfLines={1}>
                {item.activity?.name ?? 'Activité supprimée'}
              </Text>
              {item.activity?.city ? <Text style={styles.itemCity}>{item.activity.city}</Text> : null}
            </Pressable>
            <View style={styles.itemActions}>
              <Pressable onPress={() => move(index, -1)} disabled={index === 0} hitSlop={6} style={{ opacity: index === 0 ? 0.3 : 1 }}>
                <ChevronUp size={20} color={colors.text} />
              </Pressable>
              <Pressable onPress={() => move(index, 1)} disabled={index === items.length - 1} hitSlop={6} style={{ opacity: index === items.length - 1 ? 0.3 : 1 }}>
                <ChevronDown size={20} color={colors.text} />
              </Pressable>
              <Pressable onPress={() => confirmRemove(item)} hitSlop={6}>
                <Trash2 size={18} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        )}
      />

      <ActivityPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onAddActivity}
        title="Ajouter au parcours"
      />

      <ConversationPickerSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        onSelect={onShareToFriend}
        title="Partager le parcours"
      />
    </View>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    mapBox: { height: 240, backgroundColor: colors.surface },
    numberPin: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.accent,
      borderWidth: 2,
      borderColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    numberPinText: { color: colors.onAccent, fontFamily: FontFamily.uiBold, fontSize: 12 },
    listContent: { padding: Spacing.lg, paddingBottom: 48 },
    listHeader: { gap: 8, marginBottom: 12 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    titleEditRow: { flexDirection: 'row', alignItems: 'center' },
    title: { fontFamily: FontFamily.display, fontSize: 24, color: colors.text },
    titleInput: {
      flex: 1,
      fontFamily: FontFamily.display,
      fontSize: 22,
      color: colors.text,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.accent,
      paddingVertical: 2,
    },
    meta: { fontFamily: FontFamily.ui, fontSize: 13, color: colors.muted },
    actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    addBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.accent,
      borderRadius: 100,
      paddingVertical: 12,
    },
    addBtnText: { color: colors.onAccent, fontFamily: FontFamily.uiBold, fontSize: 14 },
    shareBtn: {
      width: 48,
      height: 48,
      borderRadius: 100,
      borderWidth: 1.5,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    itemNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemNumberText: { fontFamily: FontFamily.uiBold, fontSize: 13, color: colors.text },
    itemBody: { flex: 1 },
    itemName: { fontFamily: FontFamily.uiMedium, fontSize: 15, color: colors.text },
    itemCity: { fontFamily: FontFamily.ui, fontSize: 13, color: colors.muted, marginTop: 2 },
    itemActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  });
}
