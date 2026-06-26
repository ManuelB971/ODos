import { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { MessageCircle, Plus, Send } from 'lucide-react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useChatMessages, useChatMutations, useConversations } from '@/hooks/useChat';
import { useContentReport } from '@/hooks/useContentReport';
import { useOdosColors } from '@/context/ThemeContext';
import { odosAlert } from '@/context/OdosModalContext';
import { FontFamily } from '@/constants/theme';
import { resolveImageUrl } from '@/utils/imageUrl';
import { tapHaptic } from '@/utils/haptics';
import { PopEmptyState } from '@/components/pop/PopEmptyState';
import { ActivityPickerSheet } from '@/components/social/ActivityPickerSheet';
import { ReportContentModal } from '@/components/social/ReportContentModal';
import { MessageActivityCard, MessageParcoursCard } from '@/components/social/MessageAttachmentCards';
import { UserLink } from '@/components/social/UserLink';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import { useKeyboardComposerMotion } from '@/hooks/useKeyboardComposerMotion';
import type { ChatActivitySnippet } from '@/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { animatedStyle: composerAnimatedStyle } = useKeyboardComposerMotion();
  const { data, isLoading } = useChatMessages(conversationId);
  const { data: convData } = useConversations();
  const { sendMessage, markRead } = useChatMutations();
  const markConversationRead = markRead.mutate;
  const [draft, setDraft] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reportMessageId, setReportMessageId] = useState<number | null>(null);
  const { report } = useContentReport();
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

  const submitMessage = (content: string) => {
    sendMessage.mutate(
      { conversationId, content },
      {
        onError: () =>
          odosAlert('Message non envoyé', 'Vérifiez votre connexion.', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Réessayer', onPress: () => submitMessage(content) },
          ]),
      },
    );
  };

  const onSend = () => {
    const content = draft.trim();
    if (!content || !Number.isFinite(conversationId)) return;
    setDraft('');
    tapHaptic();
    submitMessage(content);
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: 92 + Math.max(insets.bottom, 8) }]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
                    <UserLink userId={item.author?.id} name={item.author?.displayName}>
                      <ChatAvatar
                        uri={resolveImageUrl(item.author?.avatarUrl ?? null)}
                        name={item.author?.displayName ?? '?'}
                        isMosaicPop={isMosaicPop}
                        pop={pop}
                        colors={colors}
                      />
                    </UserLink>
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
                    {item.activity ? <MessageActivityCard activity={item.activity} /> : null}
                    {item.parcours ? <MessageParcoursCard parcours={item.parcours} /> : null}
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
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaLine, { color: colors.muted }]}>
                      {time}
                      {item.isMine
                        ? item.id < 0
                          ? ' · Envoi…'
                          : item.readAt
                            ? ' · Lu'
                            : ' · Envoyé'
                        : ''}
                    </Text>
                    {!item.isMine && typeof item.id === 'number' ? (
                      <Pressable
                        onPress={() => setReportMessageId(item.id)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Signaler ce message"
                      >
                        <Text style={[styles.reportLink, { color: colors.muted }]}>Signaler</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
        />
        <Animated.View style={composerAnimatedStyle}>
        <View
          style={[
            styles.composer,
            { borderTopColor: colors.border, backgroundColor: colors.surface },
            isMosaicPop && { borderTopWidth: 2.5, borderTopColor: pop.ink, backgroundColor: pop.paper },
            { paddingBottom: Math.max(insets.bottom, 8) },
          ]}
        >
          <Pressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Partager une activité"
            style={({ pressed }) => [
              styles.attach,
              { backgroundColor: colors.surface, borderColor: colors.border },
              isMosaicPop && { backgroundColor: pop.paper, borderWidth: 2, borderColor: pop.ink },
              pressed && styles.composerPressed,
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
            style={({ pressed }) => [
              styles.send,
              { backgroundColor: colors.accent, opacity: canSend ? 1 : 0.5 },
              isMosaicPop && { backgroundColor: pop.orange, borderWidth: 2, borderColor: pop.ink, borderRadius: 100 },
              pressed && canSend && styles.composerPressed,
            ]}
          >
            <Send size={18} color={isMosaicPop ? pop.ink : colors.onAccent} />
          </Pressable>
        </View>
        </Animated.View>
      </KeyboardAvoidingView>

      <ActivityPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onShareActivity}
        title="Partager une activité"
      />

      <ReportContentModal
        visible={reportMessageId !== null}
        onClose={() => setReportMessageId(null)}
        loading={report.isPending}
        onSubmit={(reason, details) => {
          if (reportMessageId === null) return;
          report.mutate(
            { target: { kind: 'chat', id: reportMessageId }, reason, details },
            {
              onSuccess: () => {
                setReportMessageId(null);
                odosAlert('Merci', 'Votre signalement a été transmis à notre équipe.');
              },
              onError: () => {
                setReportMessageId(null);
                odosAlert('Signalement', 'Impossible d’envoyer le signalement pour le moment.');
              },
            },
          );
        }}
      />
    </>
  );
}

const AVATAR_SIZE = 28;

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
  metaLine: { fontSize: 10.5, fontFamily: FontFamily.ui, marginTop: 3, marginHorizontal: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportLink: { fontSize: 10.5, fontFamily: FontFamily.uiMedium, marginTop: 3, textDecorationLine: 'underline' },
  composer: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12, borderTopWidth: 1, alignItems: 'flex-end' },
  attach: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 120, textAlignVertical: 'top' },
  send: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  composerPressed: { transform: [{ scale: 0.97 }] },
});
