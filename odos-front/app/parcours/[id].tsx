import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Map, Camera as MapCamera, Marker } from '@maplibre/maplibre-react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Camera, ChevronDown, ChevronUp, Globe, Lock, Pencil, Plus, Route, Share2, Trash2, UserPlus, X } from 'lucide-react-native';

import { useParcoursDetail, useParcoursMutations } from '@/hooks/useParcours';
import { useChatMutations } from '@/hooks/useChat';
import { sendGroupMessage } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { odosAlert } from '@/context/OdosModalContext';
import { useOdosColors, useTheme, type OdosColorPalette } from '@/context/ThemeContext';
import { FontFamily, Spacing } from '@/constants/theme';
import { getOdosMaplibreStyleUrl } from '@/constants/maplibreStyle';
import { regionToInitialCamera, type LatLngRegion } from '@/utils/mapViewport';
import { ParcoursRouteLayer } from '@/components/map/ParcoursRouteLayer';
import { ActivityPickerSheet } from '@/components/social/ActivityPickerSheet';
import { ConversationPickerSheet } from '@/components/social/ConversationPickerSheet';
import { ParcoursShareTargetSheet, type ParcoursShareTarget } from '@/components/social/ParcoursShareTargetSheet';
import { UserAvatar } from '@/components/social/UserAvatar';
import { PopEmptyState } from '@/components/pop/PopEmptyState';
import { resolveImageUrl } from '@/utils/imageUrl';
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
  const { addItem, removeItem, reorder, rename, uploadCover, addCollaborator, removeCollaborator, remove } =
    useParcoursMutations(parcoursId);
  const { startConversation, sendMessage } = useChatMutations();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
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
    odosAlert('Retirer l’étape', `Retirer « ${item.activity?.name ?? 'cette activité'} » du parcours ?`, [
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
      { onError: (err) => odosAlert('Parcours', toAppError(err, 'Ajout impossible.').userMessage) },
    );
  };

  const onShareToTarget = async (target: ParcoursShareTarget) => {
    setShareOpen(false);
    if (!parcours) return;
    try {
      if (target.kind === 'friend') {
        const { conversation } = await startConversation.mutateAsync(target.userId);
        await sendMessage.mutateAsync({
          conversationId: conversation.id,
          content: '',
          parcoursId,
          parcours: { id: parcours.id, title: parcours.title, itemCount: parcours.itemCount },
        });
      } else {
        await sendGroupMessage(target.groupId, '', undefined, parcoursId);
      }
      odosAlert('Parcours partagé', `« ${parcours.title} » envoyé à ${target.displayName}.`);
    } catch (err) {
      odosAlert('Partage', toAppError(err, 'Partage impossible.').userMessage);
    }
  };

  const onInviteCollaborator = ({ userId, displayName }: { userId: number; displayName: string }) => {
    setInviteOpen(false);
    addCollaborator.mutate(
      { parcoursId, userId },
      {
        onSuccess: () => odosAlert('Invitation envoyée', `${displayName} peut désormais co-éditer ce parcours.`),
        onError: (err) =>
          odosAlert('Co-édition', toAppError(err, 'Invitation impossible. La co-édition est réservée à vos amis.').userMessage),
      },
    );
  };

  const confirmRemoveCollaborator = (collaborator: { id: number; displayName: string }) => {
    odosAlert('Retirer le collaborateur', `Retirer ${collaborator.displayName} de la co-édition ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: () => removeCollaborator.mutate({ parcoursId, userId: collaborator.id }),
      },
    ]);
  };

  const canEdit = parcours?.canEdit ?? false;
  const isOwner = parcours?.isOwner ?? false;
  const isPublic = parcours?.visibility === 'public';
  const coverUri = resolveImageUrl(parcours?.coverImageUrl ?? null);

  const collaborators = useMemo(
    () =>
      (parcours?.collaborators ?? []).filter(
        (c): c is NonNullable<typeof c> => Boolean(c?.id),
      ),
    [parcours],
  );

  const handlePickCover = async () => {
    if (!isOwner) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      odosAlert('Permission requise', "Autorisez l'accès à vos photos pour changer la pochette.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      exif: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mime = asset.mimeType ?? (asset.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
    const name = asset.fileName ?? `cover-${Date.now()}.${mime.split('/')[1] ?? 'jpg'}`;
    uploadCover.mutate(
      { parcoursId, file: { uri: asset.uri, name, mimeType: mime } },
      { onError: (err) => odosAlert('Pochette', toAppError(err, 'Upload impossible.').userMessage) },
    );
  };

  const toggleVisibility = () => {
    if (!isOwner) return;
    rename.mutate({ parcoursId, visibility: isPublic ? 'private' : 'public' });
  };

  const confirmDelete = () => {
    if (!isOwner) return;
    odosAlert(
      'Supprimer le parcours',
      `Supprimer « ${parcours?.title ?? 'ce parcours'} » ? Cette action est définitive.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () =>
            remove.mutate(parcoursId, {
              onSuccess: () => router.back(),
              onError: (err) => odosAlert('Parcours', toAppError(err, 'Suppression impossible.').userMessage),
            }),
        },
      ],
    );
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
          <MapCamera initialViewState={initialCamera} />
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
            <View style={styles.headerTop}>
              <Pressable
                disabled={!isOwner}
                onPress={handlePickCover}
                style={styles.coverWrap}
                accessibilityRole={isOwner ? 'button' : undefined}
                accessibilityLabel={isOwner ? 'Changer la pochette du parcours' : undefined}
              >
                {coverUri ? (
                  <Image source={{ uri: coverUri }} style={styles.cover} contentFit="cover" />
                ) : (
                  <View style={[styles.cover, styles.coverFallback]}>
                    <Route size={28} color={colors.onAccent} />
                  </View>
                )}
                {isOwner ? (
                  <View style={styles.coverEdit}>
                    <Camera size={13} color={colors.onAccent} />
                  </View>
                ) : null}
              </Pressable>

              <View style={styles.headerInfo}>
                {editingTitle && canEdit ? (
                  <TextInput
                    value={titleDraft}
                    onChangeText={setTitleDraft}
                    style={styles.titleInput}
                    autoFocus
                    maxLength={120}
                    onBlur={saveTitle}
                    onSubmitEditing={saveTitle}
                  />
                ) : (
                  <Pressable
                    style={styles.titleRow}
                    disabled={!canEdit}
                    onPress={() => {
                      setTitleDraft(parcours?.title ?? '');
                      setEditingTitle(true);
                    }}
                  >
                    <Text style={styles.title} numberOfLines={2}>{parcours?.title}</Text>
                    {canEdit ? <Pencil size={16} color={colors.muted} /> : null}
                  </Pressable>
                )}
                <Text style={styles.meta}>
                  {items.length} étape{items.length > 1 ? 's' : ''}
                  {parcours && !parcours.isOwner ? ' · partagé avec vous' : ''}
                  {parcours && parcours.collaboratorCount > 0 ? ` · ${parcours.collaboratorCount} collaborateur${parcours.collaboratorCount > 1 ? 's' : ''}` : ''}
                </Text>
                {isOwner ? (
                  <Pressable
                    onPress={toggleVisibility}
                    style={styles.visPill}
                    accessibilityRole="button"
                    accessibilityLabel={isPublic ? 'Rendre le parcours privé' : 'Rendre le parcours public'}
                  >
                    {isPublic ? <Globe size={13} color={colors.accent} /> : <Lock size={13} color={colors.muted} />}
                    <Text style={[styles.visText, { color: isPublic ? colors.accent : colors.muted }]}>
                      {isPublic ? 'Public' : 'Privé'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.actionsRow}>
              {canEdit ? (
                <Pressable style={styles.addBtn} onPress={() => setPickerOpen(true)} accessibilityRole="button">
                  <Plus size={18} color={colors.onAccent} />
                  <Text style={styles.addBtnText}>Ajouter une activité</Text>
                </Pressable>
              ) : null}
              {canShare ? (
                <Pressable
                  style={[styles.shareBtn, !canEdit && styles.shareBtnWide]}
                  onPress={() => setShareOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Partager le parcours"
                >
                  <Share2 size={18} color={colors.accent} />
                  {!canEdit ? <Text style={styles.shareBtnText}>Partager</Text> : null}
                </Pressable>
              ) : null}
            </View>

            {isOwner ? (
              <View style={styles.collabBlock}>
                <View style={styles.collabHead}>
                  <Text style={styles.collabTitle}>Co-éditeurs</Text>
                  <Pressable
                    style={styles.inviteBtn}
                    onPress={() => setInviteOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Inviter un ami à co-éditer"
                  >
                    <UserPlus size={15} color={colors.accent} />
                    <Text style={styles.inviteText}>Inviter</Text>
                  </Pressable>
                </View>
                {collaborators.length === 0 ? (
                  <Text style={styles.collabEmpty}>Invitez des amis pour construire ce parcours ensemble.</Text>
                ) : (
                  <View style={styles.collabList}>
                    {collaborators.map((c) => (
                      <Pressable
                        key={c.id}
                        style={styles.collabChip}
                        onPress={() => confirmRemoveCollaborator({ id: c.id, displayName: c.displayName })}
                        accessibilityRole="button"
                        accessibilityLabel={`Retirer ${c.displayName}`}
                      >
                        <UserAvatar name={c.displayName} avatarUrl={c.avatarUrl} size={24} />
                        <Text style={styles.collabName} numberOfLines={1}>{c.displayName}</Text>
                        <X size={13} color={colors.muted} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <PopEmptyState
            icon={<Plus size={26} color={colors.onAccent} />}
            title="Parcours vide"
            subtitle={canEdit ? 'Ajoutez des activités pour construire votre itinéraire.' : 'Ce parcours ne contient pas encore d’étape.'}
            ctaLabel={canEdit ? 'Ajouter une activité' : undefined}
            onPressCta={canEdit ? () => setPickerOpen(true) : undefined}
          />
        }
        renderItem={({ item, index }) => {
          const row = (
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
            {canEdit ? (
              <View style={styles.itemActions}>
                <Pressable
                  onPress={() => move(index, -1)}
                  disabled={index === 0}
                  hitSlop={6}
                  style={{ opacity: index === 0 ? 0.3 : 1 }}
                  accessibilityRole="button"
                  accessibilityLabel="Monter cette étape"
                >
                  <ChevronUp size={20} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  hitSlop={6}
                  style={{ opacity: index === items.length - 1 ? 0.3 : 1 }}
                  accessibilityRole="button"
                  accessibilityLabel="Descendre cette étape"
                >
                  <ChevronDown size={20} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={() => confirmRemove(item)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Retirer ${item.activity?.name ?? 'cette étape'} du parcours`}
                >
                  <Trash2 size={18} color={colors.danger} />
                </Pressable>
              </View>
            ) : null}
          </View>
          );

          if (!canEdit) return row;
          return (
            <ReanimatedSwipeable
              friction={2}
              rightThreshold={40}
              renderRightActions={() => (
                <Pressable
                  onPress={() => confirmRemove(item)}
                  style={styles.swipeDelete}
                  accessibilityRole="button"
                  accessibilityLabel={`Retirer ${item.activity?.name ?? 'cette étape'} du parcours`}
                >
                  <Trash2 size={20} color={colors.onAccent} />
                </Pressable>
              )}
            >
              {row}
            </ReanimatedSwipeable>
          );
        }}
        ListFooterComponent={
          isOwner ? (
            <Pressable
              onPress={confirmDelete}
              style={styles.deleteRow}
              accessibilityRole="button"
              accessibilityLabel="Supprimer le parcours"
            >
              <Trash2 size={16} color={colors.danger} />
              <Text style={styles.deleteText}>Supprimer le parcours</Text>
            </Pressable>
          ) : null
        }
      />

      <ActivityPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onAddActivity}
        title="Ajouter au parcours"
      />

      <ParcoursShareTargetSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        onSelect={onShareToTarget}
        title="Partager le parcours"
      />

      <ConversationPickerSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSelect={onInviteCollaborator}
        title="Inviter à co-éditer"
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
    shareBtnWide: { width: undefined, flex: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
    shareBtnText: { fontFamily: FontFamily.uiBold, fontSize: 14, color: colors.accent },
    collabBlock: { gap: 8, marginTop: 12 },
    collabHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    collabTitle: { fontFamily: FontFamily.uiBold, fontSize: 14, color: colors.text },
    inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    inviteText: { fontFamily: FontFamily.uiBold, fontSize: 13, color: colors.accent },
    collabEmpty: { fontFamily: FontFamily.ui, fontSize: 13, color: colors.muted },
    collabList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    collabChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      borderRadius: 100,
      paddingVertical: 4,
      paddingRight: 10,
      paddingLeft: 4,
      maxWidth: '100%',
    },
    collabName: { fontFamily: FontFamily.uiMedium, fontSize: 13, color: colors.text, maxWidth: 120 },
    headerTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    coverWrap: { width: 84, height: 84 },
    cover: { width: 84, height: 84, borderRadius: 14, backgroundColor: colors.surface },
    coverFallback: { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    coverEdit: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.accent,
      borderWidth: 2,
      borderColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerInfo: { flex: 1, minWidth: 0, gap: 4 },
    visPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 100,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginTop: 2,
    },
    visText: { fontFamily: FontFamily.uiBold, fontSize: 12 },
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
    deleteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 28,
      paddingVertical: 12,
    },
    deleteText: { fontFamily: FontFamily.uiMedium, fontSize: 14, color: colors.danger },
    swipeDelete: {
      backgroundColor: colors.danger,
      justifyContent: 'center',
      alignItems: 'center',
      width: 72,
      marginVertical: 1,
      borderRadius: 12,
    },
  });
}
