import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useForumThreads } from '@/hooks/useForumThreads';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { ThreadCard } from '@/components/forum/ThreadCard';

export default function ForumScreen() {
  const colors = useOdosColors();
  const { data, isLoading, refetch, isRefetching } = useForumThreads();

  const threads = data?.member ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={threads}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.muted, fontFamily: FontFamily.ui }]}>
            {isLoading ? 'Chargement…' : 'Aucun fil de discussion pour le moment.'}
          </Text>
        }
        renderItem={({ item }) => <ThreadCard thread={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 14 },
});
