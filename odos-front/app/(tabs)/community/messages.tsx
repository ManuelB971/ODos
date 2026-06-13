import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useConversations } from '@/hooks/useChat';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';

export default function MessagesScreen() {
  const colors = useOdosColors();
  const router = useRouter();
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
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/chat/${item.id}`)}
          style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text, fontFamily: FontFamily.uiMedium }]}>
              {item.otherUser?.displayName ?? 'Utilisateur'}
            </Text>
            <Text style={[styles.meta, { color: colors.muted, fontFamily: FontFamily.ui }]}>
              {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleString() : 'Nouvelle conversation'}
            </Text>
          </View>
          {item.unreadCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.badgeText, { color: colors.onAccent }]}>{item.unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 14, gap: 12 },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 15 },
  meta: { fontSize: 12 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontSize: 11, fontFamily: FontFamily.uiMedium },
});
