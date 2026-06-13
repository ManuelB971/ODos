import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useChatMessages, useChatMutations } from '@/hooks/useChat';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const { data, refetch } = useChatMessages(conversationId);
  const { sendMessage, markRead } = useChatMutations();
  const markConversationRead = markRead.mutate;
  const [draft, setDraft] = useState('');

  const messages = data?.member ?? [];

  useEffect(() => {
    if (conversationId > 0) {
      markConversationRead(conversationId);
    }
  }, [conversationId, messages.length, markConversationRead]);

  const onSend = () => {
    const content = draft.trim();
    if (!content || !Number.isFinite(conversationId)) return;
    sendMessage.mutate({ conversationId, content }, { onSuccess: () => setDraft('') });
    refetch();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.isMine ? styles.mine : styles.theirs,
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
            <Text style={{ color: isMosaicPop ? pop.ink : colors.text, fontFamily: FontFamily.ui }}>
              {item.content}
            </Text>
          </View>
        )}
      />
      <View
        style={[
          styles.composer,
          { borderTopColor: colors.border, backgroundColor: colors.surface },
          isMosaicPop && { borderTopWidth: 2.5, borderTopColor: pop.ink, backgroundColor: pop.paper },
        ]}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Votre message…"
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            { color: colors.text, fontFamily: FontFamily.ui },
            isMosaicPop && { borderWidth: 2, borderColor: pop.ink, backgroundColor: pop.background },
          ]}
        />
        <Pressable
          onPress={onSend}
          style={[
            styles.send,
            { backgroundColor: colors.accent },
            isMosaicPop && { backgroundColor: pop.orange, borderWidth: 2, borderColor: pop.ink, borderRadius: 100 },
          ]}
        >
          <Text style={{ color: isMosaicPop ? pop.ink : colors.onAccent, fontFamily: FontFamily.uiBold }}>Envoyer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 8 },
  bubble: { maxWidth: '82%', borderRadius: 12, borderWidth: 1, padding: 12 },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  composer: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  send: { borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
});
