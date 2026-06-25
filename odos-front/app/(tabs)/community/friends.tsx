import { useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { EyeOff, Users } from 'lucide-react-native';
import { useFriendshipMutations, useFriendships } from '@/hooks/useFriendships';
import { useSharedActivities, useSharedActivitiesMutations } from '@/hooks/useSharedActivities';
import { useProfileVisibility } from '@/hooks/useProfileVisibility';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { FriendCard } from '@/components/social/FriendCard';
import { FriendRequest } from '@/components/social/FriendRequest';
import { UserSearchBar } from '@/components/social/UserSearchBar';
import { UserLink } from '@/components/social/UserLink';
import { PopEmptyState } from '@/components/pop/PopEmptyState';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import { tapHaptic } from '@/utils/haptics';

export default function FriendsScreen() {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const { friends, pending, isLoading, refetch, isRefetching } = useFriendships();
  const { data: sharesData } = useSharedActivities();
  const { markSeen } = useSharedActivitiesMutations();
  const { acceptRequest, declineRequest } = useFriendshipMutations();
  const { isPublic, isPending: visibilityPending, setPublic } = useProfileVisibility();
  const autoSeenRef = useRef<Set<number>>(new Set());

  const unreadShares = (sharesData?.member ?? []).filter((s) => !s.seenAt);

  const incomingPending = pending.filter((r) => r.isIncoming);
  
  useEffect(() => {
    const unseen = (sharesData?.member ?? [])
      .filter((s) => !s.seenAt && typeof s.id === 'number' && !autoSeenRef.current.has(s.id));
    if (unseen.length === 0) return;

    for (const share of unseen) {
      autoSeenRef.current.add(share.id);
      markSeen.mutate(share.id, {
        onError: () => {
          autoSeenRef.current.delete(share.id);
        },
      });
    }
  }, [sharesData, markSeen]);

  const sectionTitleColor = isMosaicPop ? pop.ink : colors.text;

  return (
    <View style={[styles.container, { backgroundColor: isMosaicPop ? pop.paper : colors.background }]}>
      <View style={styles.section}>
        <UserSearchBar />
      </View>

      {/* Bannière découvrabilité : un profil privé n'est trouvable par personne. */}
      {!isPublic && (
        <View style={styles.section}>
          <View
            style={[
              styles.privacyBanner,
              { backgroundColor: colors.surface, borderColor: colors.border },
              isMosaicPop && { borderWidth: 2.5, borderColor: pop.ink, backgroundColor: pop.paper },
            ]}
          >
            <View style={[styles.privacyIcon, { backgroundColor: isMosaicPop ? pop.orange : colors.accentSoft }]}>
              <EyeOff size={18} color={isMosaicPop ? pop.ink : colors.accent} />
            </View>
            <View style={styles.privacyTextCol}>
              <Text style={[styles.privacyTitle, { color: sectionTitleColor }]}>Votre profil est privé</Text>
              <Text style={[styles.privacyBody, { color: colors.muted }]}>
                Les autres voyageurs ne peuvent pas vous trouver ni vous ajouter tant que votre profil
                reste privé.
              </Text>
            </View>
            <Pressable
              onPress={() => setPublic(true)}
              disabled={visibilityPending}
              accessibilityRole="button"
              accessibilityLabel="Rendre mon profil public"
              style={[
                styles.privacyBtn,
                { backgroundColor: isMosaicPop ? pop.orange : colors.accent },
                isMosaicPop && { borderWidth: 2, borderColor: pop.ink, borderRadius: 100 },
              ]}
            >
              <Text style={[styles.privacyBtnText, { color: isMosaicPop ? pop.ink : colors.onAccent }]}>
                {visibilityPending ? '…' : 'Rendre public'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {incomingPending.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor, fontFamily: FontFamily.uiBold }]}>
            Demandes ({incomingPending.length})
          </Text>
          {incomingPending.map((req) => (
            <FriendRequest
              key={req.id}
              request={req}
              onAccept={() => {
                tapHaptic();
                acceptRequest.mutate(req.id);
              }}
              onDecline={() => declineRequest.mutate(req.id)}
              loading={acceptRequest.isPending || declineRequest.isPending}
            />
          ))}
        </View>
      )}

      {unreadShares.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor, fontFamily: FontFamily.uiBold }]}>
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
              <View style={styles.shareTitleRow}>
                <View
                  style={[
                    styles.newBadge,
                    { backgroundColor: isMosaicPop ? pop.orange : colors.accentSoft },
                    isMosaicPop && { borderColor: pop.ink },
                  ]}
                  accessibilityRole="text"
                  accessibilityLabel="Nouveau partage"
                >
                  <Text
                    style={[
                      styles.newBadgeText,
                      { color: isMosaicPop ? pop.ink : colors.accent },
                    ]}
                  >
                    Nouveau
                  </Text>
                </View>
                <UserLink userId={share.sender?.id} name={share.sender?.displayName}>
                  <Text style={{ color: isMosaicPop ? pop.terra : colors.accent, fontFamily: FontFamily.uiBold }}>
                    {share.sender?.displayName ?? 'Quelqu’un'}
                  </Text>
                </UserLink>
                <Text style={{ color: colors.text, fontFamily: FontFamily.uiMedium, flexShrink: 1 }} numberOfLines={1}>
                  {' → '}
                  {share.activity?.name}
                </Text>
              </View>
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
          friends.length > 0 ? (
            <Text style={[styles.sectionTitle, { color: sectionTitleColor, fontFamily: FontFamily.uiBold }]}>
              Mes amis ({friends.length})
            </Text>
          ) : null
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? (
            <Text style={[styles.empty, { color: colors.muted, fontFamily: FontFamily.ui }]}>Chargement…</Text>
          ) : (
            <PopEmptyState
              icon={<Users size={28} color={isMosaicPop ? pop.ink : colors.onAccent} />}
              title="Pas encore d’amis"
              subtitle="Cherchez un voyageur par son alias dans la barre ci-dessus pour lui envoyer une demande."
            />
          )
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
  shareCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 4, marginBottom: 8 },
  shareTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  newBadge: {
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 2,
  },
  newBadgeText: { fontSize: 10.5, fontFamily: FontFamily.uiBold, letterSpacing: 0.3 },
  empty: { textAlign: 'center', marginTop: 24, fontSize: 14 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  privacyIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyTextCol: { flex: 1, minWidth: 0 },
  privacyTitle: { fontSize: 14, fontFamily: FontFamily.uiBold, marginBottom: 2 },
  privacyBody: { fontSize: 12, fontFamily: FontFamily.ui, lineHeight: 16 },
  privacyBtn: {
    alignSelf: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  privacyBtnText: { fontSize: 12.5, fontFamily: FontFamily.uiBold },
});
