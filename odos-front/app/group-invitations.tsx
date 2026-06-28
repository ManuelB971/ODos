import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useGroupInvitationMutations, useGroupInvitations } from '@/hooks/useGroups';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { ResponsiveShell } from '@/components/layout/ResponsiveShell';

export default function GroupInvitationsScreen() {
  const colors = useOdosColors();
  const { data, isLoading, refetch, isRefetching } = useGroupInvitations();
  const { accept, decline } = useGroupInvitationMutations();

  const invitations = data?.member ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Invitations', headerShown: true }} />
      <ResponsiveShell>
      <FlatList
        data={invitations}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.muted, fontFamily: FontFamily.ui }]}>
            {isLoading ? 'Chargement…' : 'Aucune invitation en attente.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text, fontFamily: FontFamily.uiMedium }]}>
                {item.group?.name ?? 'Groupe'}
              </Text>
              <Text style={[styles.sub, { color: colors.muted, fontFamily: FontFamily.ui }]}>
                Invité par {item.invitedBy?.displayName ?? 'un membre'}
              </Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={() => decline.mutate(item.id)}
                style={[styles.btnOutline, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.muted, fontFamily: FontFamily.uiMedium, fontSize: 13 }}>Refuser</Text>
              </Pressable>
              <Pressable onPress={() => accept.mutate(item.id)} style={[styles.btn, { backgroundColor: colors.accent }]}>
                <Text style={{ color: colors.onAccent, fontFamily: FontFamily.uiBold, fontSize: 13 }}>Accepter</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
      </ResponsiveShell>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 14 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14 },
  name: { fontSize: 15 },
  sub: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  btnOutline: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
});
