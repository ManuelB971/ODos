import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFriendshipMutations, useFriendships } from '@/hooks/useFriendships';
import { useSharedActivities } from '@/hooks/useSharedActivities';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { FriendCard } from '@/components/social/FriendCard';
import { FriendRequest } from '@/components/social/FriendRequest';
import { UserSearchBar } from '@/components/social/UserSearchBar';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';

export default function FriendsScreen() {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const { friends, pending, isLoading, refetch, isRefetching } = useFriendships();
  const { data: sharesData } = useSharedActivities();
  const { acceptRequest, declineRequest } = useFriendshipMutations();

  const unreadShares = (sharesData?.member ?? []).filter((s) => !s.seenAt);

  const incomingPending = pending.filter((r) => r.isIncoming);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.section}>
        <UserSearchBar />
      </View>
      {incomingPending.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FontFamily.uiMedium }]}>
            Demandes ({incomingPending.length})
          </Text>
          {incomingPending.map((req) => (
            <FriendRequest
              key={req.id}
              request={req}
              onAccept={() => acceptRequest.mutate(req.id)}
              onDecline={() => declineRequest.mutate(req.id)}
              loading={acceptRequest.isPending || declineRequest.isPending}
            />
          ))}
        </View>
      )}

      {unreadShares.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FontFamily.uiMedium }]}>
            Partages reçus ({unreadShares.length})
          </Text>
          {unreadShares.map((share) => (
            <View
              key={share.id}
              style={[
                styles.shareCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isMosaicPop && { borderWidth: 2.5, borderColor: pop.ink, backgroundColor: pop.paper },
              ]}
            >
              <Text style={{ color: colors.text, fontFamily: FontFamily.uiMedium }}>
                {share.sender?.displayName} → {share.activity?.name}
              </Text>
              {share.message ? (
                <Text style={{ color: colors.muted, fontFamily: FontFamily.ui }}>{share.message}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={friends}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        ListHeaderComponent={
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FontFamily.uiMedium }]}>
            Mes amis ({friends.length})
          </Text>
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.muted, fontFamily: FontFamily.ui }]}>
            {isLoading ? 'Chargement…' : 'Pas encore d\'amis.'}
          </Text>
        }
        renderItem={({ item }) => <FriendCard friendship={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { paddingHorizontal: 16, paddingTop: 16, gap: 4 },
  sectionTitle: { fontSize: 15, marginBottom: 8 },
  list: { padding: 16, gap: 10 },
  shareCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 4, marginBottom: 8 },
  empty: { textAlign: 'center', marginTop: 24, fontSize: 14 },
});
