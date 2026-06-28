import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MapPin, MessageCircle, Plus, Route, Send, X } from 'lucide-react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useGroupChatMutations, useGroupMessages } from '@/hooks/useGroupChat';
import { useGroupDetail } from '@/hooks/useGroups';
import { useContentReport } from '@/hooks/useContentReport';
import { ReportContentModal } from '@/components/social/ReportContentModal';
import { useOdosColors } from '@/context/ThemeContext';
import { useResponsiveSheet } from '@/hooks/useResponsiveSheet';
import { odosAlert } from '@/context/OdosModalContext';
import { FontFamily } from '@/constants/theme';
import { PopEmptyState } from '@/components/pop/PopEmptyState';
import { UserAvatar } from '@/components/social/UserAvatar';
import { UserLink } from '@/components/social/UserLink';
import { ActivityPickerSheet } from '@/components/social/ActivityPickerSheet';
import { ParcoursSharePickerSheet } from '@/components/social/ParcoursSharePickerSheet';
import { MessageActivityCard, MessageParcoursCard } from '@/components/social/MessageAttachmentCards';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import { tapHaptic } from '@/utils/haptics';
import { useKeyboardComposerMotion } from '@/hooks/useKeyboardComposerMotion';
import type { ApiActivity, ParcoursSummary } from '@/types';

const AVATAR_SIZE = 28;

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const sheetLayout = useResponsiveSheet();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { animatedStyle: composerAnimatedStyle } = useKeyboardComposerMotion();
  const { data, isLoading } = useGroupMessages(groupId);
  const { data: detail } = useGroupDetail(groupId);
  const { send, markRead } = useGroupChatMutations(groupId);
  const [draft, setDraft] = useState('');
  const [chooserOpen, setChooserOpen] = useState(false);
  const [activityPickerOpen, setActivityPickerOpen] = useState(false);
  const [parcoursPickerOpen, setParcoursPickerOpen] = useState(false);
  const [reportMessageId, setReportMessageId] = useState<number | null>(null);
  const { report } = useContentReport();
  const listRef = useRef<FlatList>(null);

  const messages = data?.member ?? [];
  const markReadMutate = markRead.mutate;

  useEffect(() => {
    if (groupId > 0 && messages.length > 0) {
      markReadMutate();
    }
  }, [groupId, messages.length, markReadMutate]);

  const submitMessage = (content: string) => {
    send.mutate(
      { content },
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
    if (!content || !Number.isFinite(groupId)) return;
    setDraft('');
    tapHaptic();
    submitMessage(content);
  };

  const onShareActivity = (activity: ApiActivity) => {
    setActivityPickerOpen(false);
    if (!Number.isFinite(groupId)) return;
    send.mutate({
      content: '',
      activityId: activity.id,
      activity: { id: activity.id, name: activity.name, city: activity.city, imageUrl: activity.imageUrl },
    });
  };

  const onShareParcours = (parcours: ParcoursSummary) => {
    setParcoursPickerOpen(false);
    if (!Number.isFinite(groupId)) return;
    send.mutate({
      content: '',
      parcoursId: parcours.id,
      parcours: { id: parcours.id, title: parcours.title, itemCount: parcours.itemCount },
    });
  };

  const canSend = draft.trim().length > 0;

  return (
    <>
      <Stack.Screen options={{ title: detail?.group?.name ?? 'Discussion', headerShown: true }} />
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
                title="Lancez la discussion"
                subtitle="Aucun message pour le moment — écrivez ou partagez une activité au groupe."
              />
            )
          }
          renderItem={({ item, index }) => {
            const time = item.createdAt
              ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';
            const next = messages[index + 1];
            const isLastOfGroup =
              !next || next.isMine !== item.isMine || next.author?.id !== item.author?.id;
            const showAvatar = !item.isMine && isLastOfGroup;
            const prev = messages[index - 1];
            const isFirstOfGroup =
              !prev || prev.isMine !== item.isMine || prev.author?.id !== item.author?.id;
            const showName = !item.isMine && isFirstOfGroup;

            return (
              <View style={[styles.msgRow, item.isMine ? styles.rowMine : styles.rowTheirs]}>
                {!item.isMine ? (
                  showAvatar ? (
                    <UserLink userId={item.author?.id} name={item.author?.displayName}>
                      <UserAvatar
                        name={item.author?.displayName ?? '?'}
                        avatarUrl={item.author?.avatarUrl}
                        size={AVATAR_SIZE}
                      />
                    </UserLink>
                  ) : (
                    <View style={styles.avatarSpacer} />
                  )
                ) : null}
                <View style={[styles.bubbleCol, item.isMine ? styles.alignEnd : styles.alignStart]}>
                  {showName ? (
                    <UserLink userId={item.author?.id} name={item.author?.displayName}>
                      <Text style={[styles.author, { color: isMosaicPop ? pop.terra : colors.accent }]}>
                        {item.author?.displayName ?? 'Membre'}
                      </Text>
                    </UserLink>
                  ) : null}
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
                          item.activity || item.parcours ? { marginTop: 8 } : null,
                        ]}
                      >
                        {item.content}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaLine, { color: colors.muted }]}>
                      {time}
                      {item.isMine && item.id < 0 ? ' · Envoi…' : ''}
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
            onPress={() => setChooserOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Partager une activité ou un parcours"
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

      {/* Choix du type de partage */}
      <Modal visible={chooserOpen} transparent animationType="fade" onRequestClose={() => setChooserOpen(false)}>
        <Pressable style={[styles.chooserBackdrop, sheetLayout.backdrop]} onPress={() => setChooserOpen(false)}>
          <View style={[styles.chooserSheet, { backgroundColor: colors.elevated }, sheetLayout.sheet]}>
            <View style={styles.chooserHeader}>
              <Text style={[styles.chooserTitle, { color: colors.text }]}>Partager au groupe</Text>
              <Pressable onPress={() => setChooserOpen(false)} hitSlop={10} accessibilityLabel="Fermer">
                <X size={22} color={colors.muted} />
              </Pressable>
            </View>
            <Pressable
              style={styles.chooserRow}
              onPress={() => {
                setChooserOpen(false);
                setActivityPickerOpen(true);
              }}
              accessibilityRole="button"
            >
              <View style={[styles.chooserIcon, { backgroundColor: colors.accent }]}>
                <MapPin size={20} color={colors.onAccent} />
              </View>
              <Text style={[styles.chooserLabel, { color: colors.text }]}>Une activité</Text>
            </Pressable>
            <Pressable
              style={styles.chooserRow}
              onPress={() => {
                setChooserOpen(false);
                setParcoursPickerOpen(true);
              }}
              accessibilityRole="button"
            >
              <View style={[styles.chooserIcon, { backgroundColor: colors.accent }]}>
                <Route size={20} color={colors.onAccent} />
              </View>
              <Text style={[styles.chooserLabel, { color: colors.text }]}>Un parcours</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <ActivityPickerSheet
        visible={activityPickerOpen}
        onClose={() => setActivityPickerOpen(false)}
        onSelect={onShareActivity}
        title="Partager une activité"
      />

      <ParcoursSharePickerSheet
        visible={parcoursPickerOpen}
        onClose={() => setParcoursPickerOpen(false)}
        onSelect={onShareParcours}
        title="Partager un parcours"
      />

      <ReportContentModal
        visible={reportMessageId !== null}
        onClose={() => setReportMessageId(null)}
        loading={report.isPending}
        onSubmit={(reason, details) => {
          if (reportMessageId === null) return;
          report.mutate(
            { target: { kind: 'group', id: reportMessageId }, reason, details },
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 8, flexGrow: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  avatarSpacer: { width: AVATAR_SIZE },
  bubbleCol: { maxWidth: '82%' },
  alignEnd: { alignItems: 'flex-end' },
  alignStart: { alignItems: 'flex-start' },
  author: { fontSize: 11.5, fontFamily: FontFamily.uiBold, marginBottom: 2, marginLeft: 4 },
  bubble: { borderRadius: 12, borderWidth: 1, padding: 12 },
  metaLine: { fontSize: 10.5, fontFamily: FontFamily.ui, marginTop: 3, marginHorizontal: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportLink: { fontSize: 10.5, fontFamily: FontFamily.uiMedium, marginTop: 3, textDecorationLine: 'underline' },
  composer: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12, borderTopWidth: 1, alignItems: 'flex-end' },
  attach: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 120, textAlignVertical: 'top' },
  send: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  composerPressed: { transform: [{ scale: 0.97 }] },
  chooserBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  chooserSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 6 },
  chooserHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  chooserTitle: { fontFamily: FontFamily.display, fontSize: 20 },
  chooserRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  chooserIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chooserLabel: { fontFamily: FontFamily.uiMedium, fontSize: 16 },
});
