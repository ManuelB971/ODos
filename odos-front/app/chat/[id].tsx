import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { MapPin, MessageCircle, Plus, Route, Send } from 'lucide-react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useChatMessages, useChatMutations, useConversations } from '@/hooks/useChat';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { resolveImageUrl } from '@/utils/imageUrl';
import { PopEmptyState } from '@/components/pop/PopEmptyState';
import { ActivityPickerSheet } from '@/components/social/ActivityPickerSheet';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import type { ChatActivitySnippet, ChatParcoursSnippet } from '@/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const { data, isLoading } = useChatMessages(conversationId);
  const { data: convData } = useConversations();
  const { sendMessage, markRead } = useChatMutations();
  const markConversationRead = markRead.mutate;
  const [draft, setDraft] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const listRef = useRef<FlatList>(null);

  const messages = data?.member ?? [];

  // Titre = nom de l'interlocuteur (conversation en cache, sinon auteur d'un
  // message reçu, sinon fallback générique pour une conversation vide).
  const conversation = convData?.member?.find((c) => c.id === conversationId);
  const title =
    conversation?.otherUser?.displayName ??
    messages.find((m) => !m.isMine)?.author?.displayName ??
    'Discussion';

  useEffect(() => {
    if (conversationId > 0) {
      markConversationRead(conversationId);
    }
  }, [conversationId, messages.length, markConversationRead]);

  const onSend = () => {
    const content = draft.trim();
    if (!content || !Number.isFinite(conversationId)) return;
    setDraft('');
    sendMessage.mutate({ conversationId, content });
  };

  const onShareActivity = (activity: { id: number; name: string; city: string | null; imageUrl: string | null }) => {
    setPickerOpen(false);
    if (!Number.isFinite(conversationId)) return;
    const snippet: ChatActivitySnippet = {
      id: activity.id,
      name: activity.name,
      city: activity.city,
      imageUrl: activity.imageUrl,
    };
    sendMessage.mutate({ conversationId, content: '', activityId: activity.id, activity: snippet });
  };

  const canSend = draft.trim().length > 0;

  return (
    <>
      <Stack.Screen options={{ title, headerShown: true, headerBackTitle: 'Retour' }} />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: isMosaicPop ? pop.paper : colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            isLoading ? null : (
              <PopEmptyState
                icon={<MessageCircle size={28} color={isMosaicPop ? pop.ink : colors.onAccent} />}
                title="Démarrez la conversation"
                subtitle={`Envoyez votre premier message à ${title}.`}
              />
            )
          }
          renderItem={({ item, index }) => {
            const time = item.createdAt
              ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';
            // Avatar (façon WhatsApp) : seulement sur le dernier message reçu d'un
            // groupe consécutif du même auteur ; sinon on réserve l'espace pour aligner.
            const next = messages[index + 1];
            const isLastOfGroup =
              !next || next.isMine !== item.isMine || next.author?.id !== item.author?.id;
            const showAvatar = !item.isMine && isLastOfGroup;
            return (
              <View style={[styles.msgRow, item.isMine ? styles.rowMine : styles.rowTheirs]}>
                {!item.isMine ? (
                  showAvatar ? (
                    <ChatAvatar
                      uri={resolveImageUrl(item.author?.avatarUrl ?? null)}
                      name={item.author?.displayName ?? '?'}
                      isMosaicPop={isMosaicPop}
                      pop={pop}
                      colors={colors}
                    />
                  ) : (
                    <View style={styles.avatarSpacer} />
                  )
                ) : null}
                <View style={[styles.bubbleCol, item.isMine ? styles.alignEnd : styles.alignStart]}>
                  <View
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: item.isMine ? colors.accentSoft : colors.surface,
                        borderColor: colors.border,
                      },
                      isMosaicPop && {
                        borderWidth: 2,
                        borderColor: pop.ink,
                        backgroundColor: item.isMine ? pop.orange : pop.paper,
                      },
                    ]}
                  >
                    {item.activity ? (
                      <ChatActivityCard
                        activity={item.activity}
                        isMosaicPop={isMosaicPop}
                        pop={pop}
                        colors={colors}
                      />
                    ) : null}
                    {item.parcours ? (
                      <ChatParcoursCard
                        parcours={item.parcours}
                        isMosaicPop={isMosaicPop}
                        pop={pop}
                        colors={colors}
                      />
                    ) : null}
                    {item.content ? (
                      <Text
                        style={[
                          { color: isMosaicPop ? pop.ink : colors.text, fontFamily: FontFamily.ui },
                          item.activity ? { marginTop: 8 } : null,
                        ]}
                      >
                        {item.content}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.metaLine, { color: colors.muted }]}>
                    {time}
                    {item.isMine ? (item.readAt ? ' · Lu' : ' · Envoyé') : ''}
                  </Text>
                </View>
              </View>
            );
          }}
        />
        <View
          style={[
            styles.composer,
            { borderTopColor: colors.border, backgroundColor: colors.surface },
            isMosaicPop && { borderTopWidth: 2.5, borderTopColor: pop.ink, backgroundColor: pop.paper },
          ]}
        >
          <Pressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Partager une activité"
            style={[
              styles.attach,
              { backgroundColor: colors.surface, borderColor: colors.border },
              isMosaicPop && { backgroundColor: pop.paper, borderWidth: 2, borderColor: pop.ink },
            ]}
          >
            <Plus size={20} color={isMosaicPop ? pop.ink : colors.accent} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Votre message…"
            placeholderTextColor={colors.muted}
            multiline
            style={[
              styles.input,
              { color: colors.text, fontFamily: FontFamily.ui },
              isMosaicPop && { borderWidth: 2, borderColor: pop.ink, backgroundColor: pop.background },
            ]}
          />
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Envoyer le message"
            style={[
              styles.send,
              { backgroundColor: colors.accent, opacity: canSend ? 1 : 0.5 },
              isMosaicPop && { backgroundColor: pop.orange, borderWidth: 2, borderColor: pop.ink, borderRadius: 100 },
            ]}
          >
            <Send size={18} color={isMosaicPop ? pop.ink : colors.onAccent} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ActivityPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onShareActivity}
        title="Partager une activité"
      />
    </>
  );
}

const AVATAR_SIZE = 28;

/**
 * Carte d'activité partagée dans le fil (façon WhatsApp : image + nom + ville).
 * Tap → fiche activité. Bordure encre en Mosaïque pop.
 */
function ChatActivityCard({
  activity,
  isMosaicPop,
  pop,
  colors,
}: {
  activity: ChatActivitySnippet;
  isMosaicPop: boolean;
  pop: ReturnType<typeof usePopTokens>;
  colors: ReturnType<typeof useOdosColors>;
}) {
  const uri = resolveImageUrl(activity.imageUrl);
  const ink = isMosaicPop ? pop.ink : colors.text;
  const sub = isMosaicPop ? pop.muted : colors.muted;
  // Fond contrasté avec la bulle pour détacher la carte.
  const cardBg = isMosaicPop ? pop.paper : colors.surface;
  return (
    <Pressable
      onPress={() => router.push(`/activity/${activity.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Voir l'activité ${activity.name}`}
      style={[
        styles.activityCard,
        { backgroundColor: cardBg, borderColor: isMosaicPop ? pop.ink : colors.border },
        isMosaicPop && { borderWidth: 2 },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.activityImage} contentFit="cover" />
      ) : (
        <View style={[styles.activityImage, styles.activityImageFallback, { backgroundColor: isMosaicPop ? pop.orange : colors.accent }]}>
          <MapPin size={22} color={isMosaicPop ? pop.ink : colors.onAccent} />
        </View>
      )}
      <View style={styles.activityText}>
        <Text style={[styles.activityName, { color: ink }]} numberOfLines={2}>{activity.name}</Text>
        {activity.city ? (
          <Text style={[styles.activityCity, { color: sub }]} numberOfLines={1}>{activity.city}</Text>
        ) : null}
        <Text style={[styles.activityCta, { color: isMosaicPop ? pop.orange : colors.accent }]}>
          Voir l’activité ›
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Carte de parcours partagé dans le fil. Tap → détail du parcours (édition
 * collaborative). Style aligné sur la carte activité.
 */
function ChatParcoursCard({
  parcours,
  isMosaicPop,
  pop,
  colors,
}: {
  parcours: ChatParcoursSnippet;
  isMosaicPop: boolean;
  pop: ReturnType<typeof usePopTokens>;
  colors: ReturnType<typeof useOdosColors>;
}) {
  const ink = isMosaicPop ? pop.ink : colors.text;
  const sub = isMosaicPop ? pop.muted : colors.muted;
  const cardBg = isMosaicPop ? pop.paper : colors.surface;
  const accent = isMosaicPop ? pop.orange : colors.accent;
  return (
    <Pressable
      onPress={() => router.push(`/parcours/${parcours.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Voir le parcours ${parcours.title}`}
      style={[
        styles.activityCard,
        { backgroundColor: cardBg, borderColor: isMosaicPop ? pop.ink : colors.border },
        isMosaicPop && { borderWidth: 2 },
      ]}
    >
      <View style={[styles.activityImage, styles.activityImageFallback, { backgroundColor: accent }]}>
        <Route size={22} color={isMosaicPop ? pop.ink : colors.onAccent} />
      </View>
      <View style={styles.activityText}>
        <Text style={[styles.activityName, { color: ink }]} numberOfLines={2}>{parcours.title}</Text>
        <Text style={[styles.activityCity, { color: sub }]}>
          Parcours · {parcours.itemCount} étape{parcours.itemCount > 1 ? 's' : ''}
        </Text>
        <Text style={[styles.activityCta, { color: accent }]}>Voir le parcours ›</Text>
      </View>
    </Pressable>
  );
}

/**
 * Avatar d'interlocuteur affiché à gauche des messages reçus (façon WhatsApp).
 * Photo si disponible, sinon initiales sur fond accent. Bordure encre en
 * Mosaïque pop pour rester dans la DA.
 */
function ChatAvatar({
  uri,
  name,
  isMosaicPop,
  pop,
  colors,
}: {
  uri: string | null;
  name: string;
  isMosaicPop: boolean;
  pop: ReturnType<typeof usePopTokens>;
  colors: ReturnType<typeof useOdosColors>;
}) {
  const ring = isMosaicPop ? { borderWidth: 2, borderColor: pop.ink } : null;
  if (uri) {
    return <Image source={{ uri }} style={[styles.avatar, ring]} contentFit="cover" />;
  }
  return (
    <View
      style={[
        styles.avatar,
        styles.avatarFallback,
        { backgroundColor: isMosaicPop ? pop.orange : colors.accent },
        ring,
      ]}
    >
      <Text style={[styles.avatarInitials, { color: isMosaicPop ? pop.ink : colors.onAccent }]}>
        {name.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 8, flexGrow: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontFamily: FontFamily.uiBold, fontSize: 11 },
  avatarSpacer: { width: AVATAR_SIZE },
  bubbleCol: { maxWidth: '82%' },
  alignEnd: { alignItems: 'flex-end' },
  alignStart: { alignItems: 'flex-start' },
  bubble: { borderRadius: 12, borderWidth: 1, padding: 12 },
  activityCard: { flexDirection: 'row', gap: 10, borderRadius: 12, borderWidth: 1, padding: 8, width: 240 },
  activityImage: { width: 56, height: 56, borderRadius: 8 },
  activityImageFallback: { alignItems: 'center', justifyContent: 'center' },
  activityText: { flex: 1, justifyContent: 'center' },
  activityName: { fontFamily: FontFamily.uiBold, fontSize: 14 },
  activityCity: { fontFamily: FontFamily.ui, fontSize: 12, marginTop: 2 },
  activityCta: { fontFamily: FontFamily.uiMedium, fontSize: 12, marginTop: 4 },
  metaLine: { fontSize: 10.5, fontFamily: FontFamily.ui, marginTop: 3, marginHorizontal: 4 },
  composer: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, alignItems: 'flex-end' },
  attach: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 120 },
  send: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
