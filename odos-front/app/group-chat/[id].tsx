import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useGroupChatMutations, useGroupMessages } from '@/hooks/useGroupChat';
import { useGroupDetail } from '@/hooks/useGroups';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const colors = useOdosColors();
  const { data } = useGroupMessages(groupId);
  const { data: detail } = useGroupDetail(groupId);
  const { send, markRead } = useGroupChatMutations(groupId);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  const messages = data?.member ?? [];
  const markReadMutate = markRead.mutate;

  useEffect(() => {
    if (groupId > 0 && messages.length > 0) {
      markReadMutate();
    }
  }, [groupId, messages.length, markReadMutate]);

  const onSend = () => {
    const content = draft.trim();
    if (!content || !Number.isFinite(groupId)) return;
    send.mutate(content);
    setDraft('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: detail?.group?.name ?? 'Discussion', headerShown: true }} />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <View style={[styles.bubbleWrap, item.isMine ? styles.mine : styles.theirs]}>
            {!item.isMine ? (
              <Text style={[styles.author, { color: colors.muted, fontFamily: FontFamily.uiMedium }]}>
                {item.author?.displayName ?? 'Membre'}
              </Text>
            ) : null}
            <View
              style={[
                styles.bubble,
                {
                  backgroundColor: item.isMine ? colors.accentSoft : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={{ color: colors.text, fontFamily: FontFamily.ui }}>{item.content}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.muted, fontFamily: FontFamily.ui }]}>
            Aucun message. Lancez la discussion !
          </Text>
        }
      />
      <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Votre message…"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, fontFamily: FontFamily.ui, borderColor: colors.border }]}
          onSubmitEditing={onSend}
          returnKeyType="send"
        />
        <Pressable onPress={onSend} style={[styles.send, { backgroundColor: colors.accent }]}>
          <Text style={{ color: colors.onAccent, fontFamily: FontFamily.uiBold }}>Envoyer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 8 },
  bubbleWrap: { maxWidth: '85%' },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  author: { fontSize: 11, marginBottom: 2, marginLeft: 4 },
  bubble: { borderRadius: 12, borderWidth: 1, padding: 12 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 14 },
  composer: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  send: { borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
});
