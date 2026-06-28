import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Plus, Route, Shuffle, X } from 'lucide-react-native';
import { useParcoursList, useParcoursMutations } from '@/hooks/useParcours';
import { useActivities } from '@/hooks/useActivities';
import { useOdosColors } from '@/context/ThemeContext';
import { odosAlert } from '@/context/OdosModalContext';
import { FontFamily } from '@/constants/theme';
import { ParcoursCard } from '@/components/social/ParcoursCard';
import { PopEmptyState } from '@/components/pop/PopEmptyState';
import { toAppError } from '@/utils/errorHandling';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import { useCity } from '@/context/CityContext';
import { ResponsiveShell } from '@/components/layout/ResponsiveShell';

/** Nombre d'activités tirées pour un « Parcours surprise ». */
const RANDOM_SIZE = 6;

export default function ParcoursLibraryScreen() {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const { data, isLoading, refetch, isRefetching } = useParcoursList();
  const { create } = useParcoursMutations();
  const { data: activities } = useActivities();
  const { selectedCity } = useCity();

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');

  const parcours = data?.member ?? [];
  const ink = isMosaicPop ? pop.ink : colors.text;

  const onCreate = async () => {
    const name = title.trim();
    if (name.length < 2) return;
    const res = await create.mutateAsync({ title: name });
    setTitle('');
    setCreating(false);
    if (res.parcours?.id) router.push(`/parcours/${res.parcours.id}`);
  };

  // Parcours « surprise » : tire quelques activités au hasard, puis ouvre le
  // détail pour personnaliser (renommer, pochette, réordonner…).
  const onRandom = async () => {
    if (create.isPending) return;
    let pool = (activities ?? []).filter((a) => a.isPublished !== false);
    if (selectedCity) {
      pool = pool.filter((a) => (a.city ?? '') === selectedCity);
    }
    if (pool.length === 0) {
      odosAlert(
        'Parcours surprise',
        selectedCity
          ? `Aucune activité disponible à ${selectedCity} pour le moment.`
          : 'Aucune activité disponible pour le moment.',
      );
      return;
    }
    const activityIds = [...pool]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(RANDOM_SIZE, pool.length))
      .map((a) => a.id);
    try {
      const res = await create.mutateAsync({ title: 'Parcours surprise', activityIds });
      if (res.parcours?.id) router.push(`/parcours/${res.parcours.id}`);
    } catch (err) {
      odosAlert('Parcours surprise', toAppError(err, 'Création impossible.').userMessage);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: isMosaicPop ? pop.paper : colors.background }]}>
      {/* Web : colonne centrée (cf. AUDIT_RESPONSIVE_WEB.md, Niveau 0). */}
      <ResponsiveShell>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: ink, fontFamily: FontFamily.display }]} numberOfLines={1}>
          Mes parcours
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={onRandom}
            disabled={create.isPending}
            accessibilityRole="button"
            accessibilityLabel="Créer un parcours surprise (aléatoire)"
            style={[
              styles.randomBtn,
              { borderColor: isMosaicPop ? pop.ink : colors.accent },
              isMosaicPop && { borderWidth: 2, backgroundColor: pop.paper },
            ]}
          >
            <Shuffle size={18} color={isMosaicPop ? pop.ink : colors.accent} />
          </Pressable>
          <Pressable
            onPress={() => setCreating(true)}
            accessibilityRole="button"
            accessibilityLabel="Créer un parcours"
            style={[
              styles.newBtn,
              { backgroundColor: isMosaicPop ? pop.orange : colors.accent },
              isMosaicPop && { borderWidth: 2, borderColor: pop.ink },
            ]}
          >
            <Plus size={16} color={isMosaicPop ? pop.ink : colors.onAccent} />
            <Text style={[styles.newBtnText, { color: isMosaicPop ? pop.ink : colors.onAccent }]}>Nouveau</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={parcours}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ParcoursCard parcours={item} />}
        ListEmptyComponent={
          isLoading ? (
            <Text style={[styles.empty, { color: colors.muted, fontFamily: FontFamily.ui }]}>Chargement…</Text>
          ) : (
            <PopEmptyState
              icon={<Route size={28} color={isMosaicPop ? pop.ink : colors.onAccent} />}
              title="Aucun parcours pour l’instant"
              subtitle="Composez votre première playlist d’activités — créez-en une, ou ajoutez un lieu à un parcours depuis sa fiche."
              ctaLabel="Créer un parcours"
              onPressCta={() => setCreating(true)}
            />
          )
        }
      />
      </ResponsiveShell>

      <Modal visible={creating} transparent animationType="slide" onRequestClose={() => setCreating(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCreating(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.elevated }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Nouveau parcours</Text>
              <Pressable onPress={() => setCreating(false)} hitSlop={10} accessibilityLabel="Fermer">
                <X size={22} color={colors.muted} />
              </Pressable>
            </View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Nom du parcours (ex. Week-end à Paris)"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              autoFocus
              maxLength={120}
              onSubmitEditing={onCreate}
              returnKeyType="done"
            />
            <Pressable
              onPress={onCreate}
              disabled={title.trim().length < 2 || create.isPending}
              style={[
                styles.createBtn,
                { backgroundColor: colors.accent, opacity: title.trim().length < 2 || create.isPending ? 0.5 : 1 },
              ]}
            >
              <Text style={[styles.createBtnText, { color: colors.onAccent }]}>
                {create.isPending ? '…' : 'Créer'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  randomBtn: {
    width: 40,
    height: 40,
    borderRadius: 100,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 40,
  },
  newBtnText: { fontFamily: FontFamily.uiBold, fontSize: 14 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 14 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontFamily: FontFamily.display, fontSize: 20 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: FontFamily.ui },
  createBtn: { borderRadius: 100, paddingVertical: 14, alignItems: 'center' },
  createBtnText: { fontFamily: FontFamily.uiBold, fontSize: 15 },
});
