import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MessagesSquare, PenLine } from 'lucide-react-native';
import { useForumThreads } from '@/hooks/useForumThreads';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { ThreadCard } from '@/components/forum/ThreadCard';
import { PopEmptyState } from '@/components/pop/PopEmptyState';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';

export default function ForumScreen() {
  const colors = useOdosColors();
  const router = useRouter();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const { data, isLoading, refetch, isRefetching } = useForumThreads();

  const threads = data?.member ?? [];

  return (
    <View style={[styles.container, { backgroundColor: isMosaicPop ? pop.paper : colors.background }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push('/thread/create')}
          accessibilityRole="button"
          accessibilityLabel="Créer un nouveau sujet"
          style={[
            styles.newBtn,
            { backgroundColor: isMosaicPop ? pop.orange : colors.accent },
            isMosaicPop && { borderWidth: 2.5, borderColor: pop.ink, borderRadius: 100 },
          ]}
        >
          <PenLine size={16} color={isMosaicPop ? pop.ink : colors.onAccent} />
          <Text style={{ color: isMosaicPop ? pop.ink : colors.onAccent, fontFamily: FontFamily.uiBold, fontSize: 14 }}>
            Nouveau sujet
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? (
            <Text style={[styles.empty, { color: colors.muted, fontFamily: FontFamily.ui }]}>Chargement…</Text>
          ) : (
            <PopEmptyState
              icon={<MessagesSquare size={28} color={isMosaicPop ? pop.ink : colors.onAccent} />}
              title="Aucune discussion"
              subtitle="Lancez le premier sujet et partagez vos bons plans avec la communauté."
              ctaLabel="Nouveau sujet"
              onPressCta={() => router.push('/thread/create')}
            />
          )
        }
        renderItem={({ item }) => <ThreadCard thread={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, alignItems: 'flex-end' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 14 },
});
