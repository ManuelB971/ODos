import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { ShieldOff } from 'lucide-react-native';
import { useBlockMutations, useBlockedUsers } from '@/hooks/useBlocks';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { UserAvatar } from '@/components/social/UserAvatar';
import { UserLink } from '@/components/social/UserLink';
import { PopEmptyState } from '@/components/pop/PopEmptyState';
import { ThemedScreen } from '@/components/ui/ThemedScreen';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';

export default function BlockedUsersScreen() {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const { data, isLoading, refetch, isRefetching } = useBlockedUsers();
  const { unblock } = useBlockMutations();

  const blocked = data?.member ?? [];
  const ink = isMosaicPop ? pop.ink : colors.text;

  return (
    <ThemedScreen noSafeArea>
      <Stack.Screen options={{ title: 'Utilisateurs bloqués', headerShown: true }} />
      <FlatList
        data={blocked}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          blocked.length > 0 ? (
            <Text style={[styles.intro, { color: isMosaicPop ? pop.muted : colors.muted }]}>
              Ces personnes ne peuvent ni vous contacter, ni vous trouver, ni voir votre profil.
            </Text>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <Text style={[styles.empty, { color: colors.muted, fontFamily: FontFamily.ui }]}>Chargement…</Text>
          ) : (
            <PopEmptyState
              icon={<ShieldOff size={28} color={isMosaicPop ? pop.ink : colors.onAccent} />}
              title="Personne n’est bloqué"
              subtitle="Vous pouvez bloquer un utilisateur depuis sa fiche profil."
            />
          )
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              { backgroundColor: colors.surface, borderColor: colors.border },
              isMosaicPop && { backgroundColor: pop.paper, borderColor: pop.ink, borderWidth: 2 },
            ]}
          >
            <UserLink userId={item.id} name={item.displayName} style={styles.main}>
              <UserAvatar name={item.displayName} avatarUrl={item.avatarUrl} size={40} />
              <Text style={[styles.name, { color: ink }]} numberOfLines={1}>
                {item.displayName}
              </Text>
            </UserLink>
            <Pressable
              onPress={() => unblock.mutate(item.id)}
              disabled={unblock.isPending}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Débloquer ${item.displayName}`}
              style={[
                styles.btn,
                { backgroundColor: isMosaicPop ? pop.orange : colors.accentSoft },
                isMosaicPop && { borderWidth: 2, borderColor: pop.ink, borderRadius: 100 },
              ]}
            >
              <Text style={[styles.btnText, { color: isMosaicPop ? pop.ink : colors.accent }]}>Débloquer</Text>
            </Pressable>
          </View>
        )}
      />
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, flexGrow: 1 },
  intro: { fontSize: 13, fontFamily: FontFamily.ui, lineHeight: 18, marginBottom: 6 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, gap: 12 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { flex: 1, fontFamily: FontFamily.uiMedium, fontSize: 15 },
  btn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, minHeight: 38, justifyContent: 'center' },
  btnText: { fontFamily: FontFamily.uiBold, fontSize: 13 },
});
