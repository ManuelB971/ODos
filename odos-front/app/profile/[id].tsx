import { useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MessageCircle, UserPlus, Check, Clock, X, Ban, Flag } from 'lucide-react-native';
import api from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { odosAlert } from '@/context/OdosModalContext';
import { useFriendshipMutations, useFriendships } from '@/hooks/useFriendships';
import { useChatMutations } from '@/hooks/useChat';
import { useBlockMutations } from '@/hooks/useBlocks';
import { useContentReport } from '@/hooks/useContentReport';
import { ReportContentModal } from '@/components/social/ReportContentModal';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { CTAButton } from '@/components/ui/CTAButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { PopSurface } from '@/components/pop/PopSurface';
import { UserAvatar } from '@/components/social/UserAvatar';
import { ProfileBadgesShowcase } from '@/components/badges/ProfileBadgesShowcase';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import type { BadgeItem } from '@/types';

type PublicProfile = {
  id: number;
  alias: string | null;
  bio: string | null;
  avatarUrl: string | null;
  joinedAt?: string | null;
  badgeCount?: number;
  favoriteCount?: number;
  visitCount?: number;
  forumThreadCount?: number;
  isBlockedByMe?: boolean;
  profileBadges?: BadgeItem[];
};

async function fetchPublicProfile(userId: number) {
  const response = await api.get(`/api/users/${userId}/profile`);
  return response.data as PublicProfile;
}

function formatJoined(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = Number(id);
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const { user } = useAuth();
  const { friends, pending } = useFriendships();
  const { sendRequest, acceptRequest } = useFriendshipMutations();
  const { startConversation } = useChatMutations();
  const { block, unblock } = useBlockMutations();
  const { report } = useContentReport();
  const [reportOpen, setReportOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: () => fetchPublicProfile(userId),
    enabled: Number.isFinite(userId),
  });

  const isSelf = user?.id === userId;
  const friendship = friends.find((f) => f.otherUser?.id === userId);
  const incoming = pending.find((p) => p.isIncoming && p.otherUser?.id === userId);
  const outgoing = pending.find((p) => !p.isIncoming && p.otherUser?.id === userId);

  const ink = isMosaicPop ? pop.ink : colors.text;
  const sub = isMosaicPop ? pop.muted : colors.muted;

  const isBlockedByMe = !!data?.isBlockedByMe;

  const openChat = async () => {
    const res = await startConversation.mutateAsync(userId);
    if (res.conversation?.id) router.push(`/chat/${res.conversation.id}`);
  };

  const confirmBlock = () => {
    odosAlert(
      `Bloquer ${data?.alias ?? 'cet utilisateur'} ?`,
      'Vous ne verrez plus son profil et votre conversation sera supprimée. Il ne pourra plus vous contacter, vous ajouter ni vous trouver dans la recherche.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Bloquer', style: 'destructive', onPress: () => block.mutate(userId) },
      ],
    );
  };

  const joined = formatJoined(data?.joinedAt);
  const hasStats = data?.badgeCount !== undefined;
  const stats = hasStats
    ? [
        { label: 'Badges', value: data?.badgeCount ?? 0 },
        { label: 'Favoris', value: data?.favoriteCount ?? 0 },
        { label: 'Visites', value: data?.visitCount ?? 0 },
        { label: 'Sujets', value: data?.forumThreadCount ?? 0 },
      ]
    : [];

  const renderActions = () => {
    if (!data || isSelf) return null;
    if (friendship) {
      return (
        <CTAButton
          label="Envoyer un message"
          onPress={openChat}
          loading={startConversation.isPending}
          size="md"
          fullWidth
          leftIcon={<MessageCircle size={16} color={colors.onAccent} />}
        />
      );
    }
    if (incoming) {
      return (
        <CTAButton
          label="Accepter la demande"
          onPress={() => acceptRequest.mutate(incoming.id)}
          loading={acceptRequest.isPending}
          size="md"
          fullWidth
          leftIcon={<Check size={16} color={colors.onAccent} />}
        />
      );
    }
    if (outgoing) {
      return (
        <CTAButton
          label="Demande envoyée"
          onPress={() => {}}
          disabled
          variant="secondary"
          size="md"
          fullWidth
          leftIcon={<Clock size={16} color={colors.muted} />}
        />
      );
    }
    return (
      <CTAButton
        label="Ajouter en ami"
        onPress={() => sendRequest.mutate(userId)}
        loading={sendRequest.isPending}
        size="md"
        fullWidth
        leftIcon={<UserPlus size={16} color={colors.onAccent} />}
      />
    );
  };

  const header = (
    <View style={styles.header}>
      <UserAvatar name={data?.alias ?? 'Utilisateur'} avatarUrl={data?.avatarUrl} size={96} />
      <Text style={[styles.name, { color: ink, fontFamily: FontFamily.display }]}>
        {data?.alias ?? 'Utilisateur'}
      </Text>
      {joined ? (
        <Text style={[styles.joined, { color: sub, fontFamily: FontFamily.ui }]}>
          Membre depuis {joined}
        </Text>
      ) : null}
    </View>
  );

  const statsRow =
    stats.length > 0 ? (
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View
            key={s.label}
            style={[
              styles.statPill,
              { backgroundColor: colors.surface, borderColor: colors.border },
              isMosaicPop && { backgroundColor: pop.paper, borderColor: pop.ink, borderWidth: 2 },
            ]}
          >
            <Text style={[styles.statValue, { color: ink, fontFamily: FontFamily.uiBold }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: sub, fontFamily: FontFamily.ui }]}>{s.label}</Text>
          </View>
        ))}
      </View>
    ) : null;

  const bioBlock = data?.bio ? (
    <Text style={[styles.bio, { color: ink, fontFamily: FontFamily.ui }]}>{data.bio}</Text>
  ) : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: data?.alias ?? 'Profil',
          presentation: 'modal',
          headerShown: true,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Fermer le profil"
              hitSlop={10}
              style={{ paddingHorizontal: 4 }}
            >
              <X size={22} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: isMosaicPop ? pop.paper : colors.background }}
        contentContainerStyle={styles.container}
      >
        {isLoading ? (
          <View style={styles.header}>
            <Skeleton width={96} height={96} radius={48} />
            <Skeleton width={160} height={22} radius={6} />
            <Skeleton width={120} height={12} radius={6} />
          </View>
        ) : data ? (
          <>
            {isMosaicPop ? (
              <PopSurface shadow={6} radius={16} contentStyle={styles.popCard}>
                {header}
                {bioBlock}
                {statsRow}
              </PopSurface>
            ) : (
              <View style={styles.plainCard}>
                {header}
                {bioBlock}
                {statsRow}
              </View>
            )}
            <ProfileBadgesShowcase badges={data.profileBadges ?? []} />
            {!isSelf ? (
              <View style={styles.actions}>
                {isBlockedByMe ? (
                  <>
                    <View
                      style={[
                        styles.blockBanner,
                        { backgroundColor: colors.surface, borderColor: colors.danger },
                        isMosaicPop && { backgroundColor: pop.paper, borderColor: pop.ink, borderWidth: 2 },
                      ]}
                    >
                      <Ban size={16} color={colors.danger} />
                      <Text style={[styles.blockBannerText, { color: ink, fontFamily: FontFamily.ui }]}>
                        Vous avez bloqué {data.alias ?? 'cet utilisateur'}.
                      </Text>
                    </View>
                    <CTAButton
                      label="Débloquer"
                      onPress={() => unblock.mutate(userId)}
                      loading={unblock.isPending}
                      variant="secondary"
                      size="md"
                      fullWidth
                    />
                  </>
                ) : (
                  <>
                    {renderActions()}
                    <Pressable
                      onPress={confirmBlock}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Bloquer ${data.alias ?? 'cet utilisateur'}`}
                      style={({ pressed }) => [styles.blockLink, pressed && { opacity: 0.6 }]}
                    >
                      <Ban size={15} color={colors.danger} />
                      <Text style={[styles.blockLinkText, { color: colors.danger }]}>Bloquer cet utilisateur</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setReportOpen(true)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Signaler ${data.alias ?? 'cet utilisateur'}`}
                      style={({ pressed }) => [styles.blockLink, pressed && { opacity: 0.6 }]}
                    >
                      <Flag size={15} color={sub} />
                      <Text style={[styles.blockLinkText, { color: sub }]}>Signaler cet utilisateur</Text>
                    </Pressable>
                  </>
                )}
              </View>
            ) : null}
          </>
        ) : (
          <Text style={{ color: colors.muted, fontFamily: FontFamily.ui, textAlign: 'center', marginTop: 40 }}>
            Profil inaccessible.
          </Text>
        )}
      </ScrollView>

      <ReportContentModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        loading={report.isPending}
        onSubmit={(reason, details) =>
          report.mutate(
            { target: { kind: 'user', id: userId }, reason, details },
            {
              onSuccess: () => {
                setReportOpen(false);
                odosAlert('Merci', 'Votre signalement a été transmis à notre équipe.');
              },
              onError: () => {
                setReportOpen(false);
                odosAlert('Signalement', 'Impossible d’envoyer le signalement pour le moment.');
              },
            },
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  popCard: { padding: 20, gap: 16, alignItems: 'stretch' },
  plainCard: { gap: 16 },
  header: { alignItems: 'center', gap: 8 },
  name: { fontSize: 26, textAlign: 'center' },
  joined: { fontSize: 13 },
  bio: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  statPill: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 18 },
  statLabel: { fontSize: 11 },
  actions: { marginTop: 4, gap: 12 },
  blockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  blockBannerText: { flex: 1, fontSize: 13, lineHeight: 18 },
  blockLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    minHeight: 44,
  },
  blockLinkText: { fontSize: 14, fontFamily: FontFamily.uiMedium },
});
