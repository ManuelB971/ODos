import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { useUserSearch } from '@/hooks/useUserSearch';
import { useFriendshipMutations } from '@/hooks/useFriendships';
import { useChatMutations } from '@/hooks/useChat';
import { useRouter } from 'expo-router';
import type { UserSearchResult } from '@/types';

export function UserSearchBar() {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const { data, isFetching } = useUserSearch(query);
  const { sendRequest } = useFriendshipMutations();
  const { startConversation } = useChatMutations();
  const router = useRouter();

  const results = data?.users ?? [];

  const onAddFriend = (userId: number) => {
    sendRequest.mutate(userId);
  };

  const onMessage = async (userId: number) => {
    const result = await startConversation.mutateAsync(userId);
    if (result.conversation?.id) {
      router.push(`/chat/${result.conversation.id}`);
    }
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher par alias (min. 2 car.)"
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {isFetching ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
      {query.trim().length >= 2 && results.map((user: UserSearchResult) => (
        <View key={user.id} style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.name}>{user.displayName}</Text>
            {user.alias ? <Text style={styles.alias}>@{user.alias}</Text> : null}
          </View>
          {user.relationship === 'none' ? (
            <Pressable onPress={() => onAddFriend(user.id)} style={styles.btn}>
              <Text style={styles.btnText}>Ajouter</Text>
            </Pressable>
          ) : null}
          {user.relationship === 'friends' ? (
            <Pressable onPress={() => onMessage(user.id)} style={styles.btn}>
              <Text style={styles.btnText}>Message</Text>
            </Pressable>
          ) : null}
          {user.relationship === 'outgoing' ? (
            <Text style={styles.pending}>Envoyée</Text>
          ) : null}
          {user.relationship === 'incoming' ? (
            <Text style={styles.pending}>Reçue</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useOdosColors>) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: FontFamily.ui,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    loader: { alignSelf: 'flex-start' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
    },
    info: { flex: 1, gap: 2 },
    name: { fontFamily: FontFamily.uiMedium, color: colors.text, fontSize: 14 },
    alias: { fontFamily: FontFamily.ui, color: colors.muted, fontSize: 12 },
    btn: { backgroundColor: colors.accentSoft, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
    btnText: { fontFamily: FontFamily.uiMedium, color: colors.accent, fontSize: 13 },
    pending: { fontFamily: FontFamily.ui, color: colors.muted, fontSize: 12 },
  });
}
