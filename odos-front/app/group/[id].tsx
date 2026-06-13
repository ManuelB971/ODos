import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '@/scripts/api';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { PopSurface } from '@/components/pop/PopSurface';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import type { ActivityGroupItem } from '@/types';

async function fetchGroup(id: number) {
  const response = await api.get(`/api/groups/${id}`);
  return response.data as { group: ActivityGroupItem; members: { user: { displayName: string }; role: string }[] };
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();

  const { data, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => fetchGroup(groupId),
    enabled: Number.isFinite(groupId),
  });

  const group = data?.group;
  const members = data?.members ?? [];

  return (
    <>
      <Stack.Screen options={{ title: group?.name ?? 'Groupe', presentation: 'modal' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {isLoading ? (
          <Text style={{ color: colors.muted, fontFamily: FontFamily.ui }}>Chargement…</Text>
        ) : group ? (
          <>
            {isMosaicPop ? (
              <PopSurface shadow={6} radius={12} style={{ marginBottom: 8 }} contentStyle={{ padding: 16, gap: 8 }}>
                <Text style={[styles.title, { color: pop.ink, fontFamily: FontFamily.display }]}>
                  {group.name}
                </Text>
                {group.description ? (
                  <Text style={[styles.desc, { color: pop.ink, fontFamily: FontFamily.ui }]}>{group.description}</Text>
                ) : null}
                <Text style={[styles.meta, { color: pop.muted, fontFamily: FontFamily.ui }]}>
                  {group.memberCount} membres{group.isPrivate ? ' · Privé' : ''}
                </Text>
              </PopSurface>
            ) : (
              <>
                <Text style={[styles.title, { color: colors.text, fontFamily: FontFamily.display }]}>
                  {group.name}
                </Text>
                {group.description ? (
                  <Text style={[styles.desc, { color: colors.text, fontFamily: FontFamily.ui }]}>{group.description}</Text>
                ) : null}
                <Text style={[styles.meta, { color: colors.muted, fontFamily: FontFamily.ui }]}>
                  {group.memberCount} membres{group.isPrivate ? ' · Privé' : ''}
                </Text>
              </>
            )}
            <Text style={[styles.section, { color: colors.text, fontFamily: FontFamily.uiMedium }]}>Membres</Text>
            <FlatList
              data={members}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <Text style={{ color: colors.text, fontFamily: FontFamily.ui, paddingVertical: 6 }}>
                  {item.user.displayName} · {item.role}
                </Text>
              )}
            />
          </>
        ) : (
          <Text style={{ color: colors.muted }}>Groupe introuvable.</Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 8 },
  title: { fontSize: 24 },
  desc: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 13 },
  section: { fontSize: 15, marginTop: 16, marginBottom: 8 },
});
