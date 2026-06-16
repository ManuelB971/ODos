import { useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { MessageCircle, UserPlus, Check, Clock } from 'lucide-react-native';
import api from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { useFriendshipMutations, useFriendships } from '@/hooks/useFriendships';
import { useChatMutations } from '@/hooks/useChat';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { CTAButton } from '@/components/ui/CTAButton';
import { PopSurface } from '@/components/pop/PopSurface';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';

async function fetchPublicProfile(userId: number) {
  const response = await api.get(`/api/users/${userId}/profile`);
  return response.data as {
    id: number;
    alias: string | null;
    bio: string | null;
    avatarUrl: string | null;
    badgeCount?: number;
    favoriteCount?: number;
  };
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

  const { data, isLoading } = useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: () => fetchPublicProfile(userId),
    enabled: Number.isFinite(userId),
  });

  const isSelf = user?.id === userId;
  const friendship = friends.find((f) => f.otherUser?.id === userId);
  const incoming = pending.find((p) => p.isIncoming && p.otherUser?.id === userId);
  const outgoing = pending.find((p) => !p.isIncoming && p.otherUser?.id === userId);

  const openChat = async () => {
    const res = await startConversation.mutateAsync(userId);
    if (res.conversation?.id) router.push(`/chat/${res.conversation.id}`);
  };

  const renderActions = () => {
    if (!data || isSelf) return null;
    return (
      <View style={styles.actions}>
        {friendship ? (
          <CTAButton
            label="Envoyer un message"
            onPress={openChat}
            loading={startConversation.isPending}
            size="md"
            fullWidth
            leftIcon={<MessageCircle size={16} color={colors.onAccent} />}
          />
        ) : incoming ? (
          <CTAButton
            label="Accepter la demande"
            onPress={() => acceptRequest.mutate(incoming.id)}
            loading={acceptRequest.isPending}
            size="md"
            fullWidth
            leftIcon={<Check size={16} color={colors.onAccent} />}
          />
        ) : outgoing ? (
          <CTAButton
            label="Demande envoyée"
            onPress={() => {}}
            disabled
            variant="secondary"
            size="md"
            fullWidth
            leftIcon={<Clock size={16} color={colors.muted} />}
          />
        ) : (
          <CTAButton
            label="Ajouter en ami"
            onPress={() => sendRequest.mutate(userId)}
            loading={sendRequest.isPending}
            size="md"
            fullWidth
            leftIcon={<UserPlus size={16} color={colors.onAccent} />}
          />
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: data?.alias ?? 'Profil', presentation: 'modal', headerShown: true }} />
      <View style={[styles.container, { backgroundColor: isMosaicPop ? pop.paper : colors.background }]}>
        {isLoading ? (
          <Text style={{ color: colors.muted, fontFamily: FontFamily.ui }}>Chargement…</Text>
        ) : data ? (
          <>
            {isMosaicPop ? (
              <PopSurface shadow={6} radius={14} contentStyle={{ padding: 18, gap: 10 }}>
                <Text style={[styles.name, { color: pop.ink, fontFamily: FontFamily.display }]}>
                  {data.alias ?? 'Utilisateur'}
                </Text>
                {data.bio ? (
                  <Text style={[styles.bio, { color: pop.ink, fontFamily: FontFamily.ui }]}>{data.bio}</Text>
                ) : null}
                {data.badgeCount !== undefined ? (
                  <Text style={{ color: pop.muted, fontFamily: FontFamily.ui }}>
                    {data.badgeCount} badges · {data.favoriteCount ?? 0} favoris
                  </Text>
                ) : null}
              </PopSurface>
            ) : (
              <>
                <Text style={[styles.name, { color: colors.text, fontFamily: FontFamily.display }]}>
                  {data.alias ?? 'Utilisateur'}
                </Text>
                {data.bio ? (
                  <Text style={[styles.bio, { color: colors.text, fontFamily: FontFamily.ui }]}>{data.bio}</Text>
                ) : null}
                {data.badgeCount !== undefined ? (
                  <Text style={{ color: colors.muted, fontFamily: FontFamily.ui }}>
                    {data.badgeCount} badges · {data.favoriteCount ?? 0} favoris
                  </Text>
                ) : null}
              </>
            )}
            {renderActions()}
          </>
        ) : (
          <Text style={{ color: colors.muted, fontFamily: FontFamily.ui }}>Profil inaccessible.</Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  name: { fontSize: 26 },
  bio: { fontSize: 15, lineHeight: 22 },
  actions: { marginTop: 12 },
});
