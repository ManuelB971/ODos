import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useConversations } from '@/hooks/useChat';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { PopSurface } from '@/components/pop/PopSurface';
import { PopBadge } from '@/components/pop/PopPill';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';

export default function MessagesScreen() {
  const colors = useOdosColors();
  const router = useRouter();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const { data, isLoading, refetch, isRefetching } = useConversations();
  const conversations = data?.member ?? [];

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={conversations}
      keyExtractor={(item) => String(item.id)}
      refreshing={isRefetching}
      onRefresh={() => refetch()}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={[styles.empty, { color: colors.muted, fontFamily: FontFamily.ui }]}>
          {isLoading ? 'Chargement…' : 'Aucune conversation. Ajoutez un ami et envoyez un message.'}
        </Text>
      }
      renderItem={({ item }) => {
        const name = item.otherUser?.displayName ?? 'Utilisateur';
        const sub = item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleString() : 'Nouvelle conversation';

        if (isMosaicPop) {
          return (
            <Pressable onPress={() => router.push(`/chat/${item.id}`)}>
              <PopSurface shadow={4} radius={12} contentStyle={styles.popRow}>
                <View style={styles.info}>
                  <Text style={[styles.name, { color: pop.ink, fontFamily: FontFamily.uiBold }]} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={[styles.meta, { color: pop.muted }]} numberOfLines={1}>
                    {sub}
                  </Text>
                </View>
                <PopBadge count={item.unreadCount} />
              </PopSurface>
            </Pressable>
          );
        }

        return (
          <Pressable
            onPress={() => router.push(`/chat/${item.id}`)}
            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text, fontFamily: FontFamily.uiMedium }]}>{name}</Text>
              <Text style={[styles.meta, { color: colors.muted, fontFamily: FontFamily.ui }]}>{sub}</Text>
            </View>
            {item.unreadCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <Text style={[styles.badgeText, { color: colors.onAccent }]}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 14, gap: 12 },
  popRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 15 },
  meta: { fontSize: 12 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontSize: 11, fontFamily: FontFamily.uiMedium },
});
