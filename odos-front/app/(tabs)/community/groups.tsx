import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useGroups } from '@/hooks/useGroups';
import { joinGroup } from '@/scripts/api';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { useQueryClient } from '@tanstack/react-query';
import { GroupCard } from '@/components/social/GroupCard';

export default function GroupsScreen() {
  const colors = useOdosColors();
  const [tab, setTab] = useState<'mine' | 'discover'>('mine');
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useGroups(tab);

  const groups = data?.member ?? [];

  const handleJoin = async (groupId: number) => {
    setJoiningId(groupId);
    try {
      await joinGroup(groupId);
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.tabs}>
        {(['mine', 'discover'] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
          >
            <Text style={{ color: tab === key ? colors.accent : colors.muted, fontFamily: FontFamily.uiMedium }}>
              {key === 'mine' ? 'Mes groupes' : 'Découvrir'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.muted, fontFamily: FontFamily.ui }]}>
            {isLoading ? 'Chargement…' : 'Aucun groupe.'}
          </Text>
        }
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            onJoin={tab === 'discover' && !item.isPrivate ? () => handleJoin(item.id) : undefined}
            joining={joiningId === item.id}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  list: { padding: 16, gap: 10 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 14 },
});
