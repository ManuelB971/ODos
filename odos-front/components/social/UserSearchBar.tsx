import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { useUserSearch } from '@/hooks/useUserSearch';
import { useFriendshipMutations } from '@/hooks/useFriendships';
import { useChatMutations } from '@/hooks/useChat';
import { useRouter } from 'expo-router';
import { UserAvatar } from '@/components/social/UserAvatar';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import type { UserSearchResult } from '@/types';

/**
 * Combobox de recherche d'utilisateurs par alias.
 * Champ + dropdown : états chargement / résultats / aucun résultat explicites.
 */
export function UserSearchBar() {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const { data, isFetching } = useUserSearch(query);
  const { sendRequest } = useFriendshipMutations();
  const { startConversation } = useChatMutations();
  const router = useRouter();

  const trimmed = query.trim();
  const active = trimmed.length >= 2;
  const results = data?.users ?? [];
  const ink = isMosaicPop ? pop.ink : colors.text;

  const onAddFriend = (userId: number) => sendRequest.mutate(userId);

  const onMessage = async (userId: number) => {
    const result = await startConversation.mutateAsync(userId);
    if (result.conversation?.id) {
      router.push(`/chat/${result.conversation.id}`);
    }
  };

  const renderAction = (user: UserSearchResult) => {
    switch (user.relationship) {
      case 'none':
        return (
          <Pressable
            onPress={() => onAddFriend(user.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Ajouter ${user.displayName ?? user.alias ?? 'cet utilisateur'} en ami`}
            style={[styles.btn, popBtn(isMosaicPop, pop)]}
          >
            <Text style={[styles.btnText, isMosaicPop && { color: pop.ink }]}>Ajouter</Text>
          </Pressable>
        );
      case 'friends':
        return (
          <Pressable
            onPress={() => onMessage(user.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Envoyer un message à ${user.displayName ?? user.alias ?? 'cet utilisateur'}`}
            style={[styles.btn, popBtn(isMosaicPop, pop)]}
          >
            <Text style={[styles.btnText, isMosaicPop && { color: pop.ink }]}>Message</Text>
          </Pressable>
        );
      case 'outgoing':
        return <Text style={styles.pending}>Envoyée</Text>;
      case 'incoming':
        return <Text style={styles.pending}>Reçue</Text>;
      default:
        return null;
    }
  };

  return (
    <View style={styles.wrap}>
      {/* Champ */}
      <View
        style={[
          styles.field,
          { borderColor: colors.border, backgroundColor: colors.surface },
          isMosaicPop && { borderWidth: 2, borderColor: pop.ink, backgroundColor: pop.paper },
        ]}
      >
        <Search size={18} color={isMosaicPop ? pop.muted : colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un alias…"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: ink }]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Effacer">
            <X size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {/* Dropdown */}
      {active ? (
        <View
          style={[
            styles.dropdown,
            { borderColor: colors.border, backgroundColor: colors.elevated },
            isMosaicPop && { borderWidth: 2, borderColor: pop.ink, backgroundColor: pop.paper },
          ]}
        >
          {isFetching && results.length === 0 ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={isMosaicPop ? pop.orange : colors.accent} />
              <Text style={styles.statusText}>Recherche…</Text>
            </View>
          ) : results.length === 0 ? (
            <Text style={styles.statusText}>
              Aucun utilisateur trouvé pour « {trimmed} ». Seuls les profils publics ayant rejoint la
              Communauté apparaissent ici.
            </Text>
          ) : (
            results.map((user, i) => (
              <View
                key={user.id}
                style={[
                  styles.row,
                  i > 0 && { borderTopWidth: 1, borderTopColor: isMosaicPop ? `${pop.ink}22` : colors.border },
                ]}
              >
                <Pressable
                  style={styles.rowMain}
                  onPress={() => router.push(`/profile/${user.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Voir le profil de ${user.displayName ?? user.alias ?? 'cet utilisateur'}`}
                >
                  <UserAvatar name={user.displayName ?? user.alias} avatarUrl={user.avatarUrl} size={36} />
                  <View style={styles.info}>
                    <Text style={[styles.name, { color: ink }]} numberOfLines={1}>
                      {user.displayName ?? user.alias ?? 'Utilisateur'}
                    </Text>
                    {user.alias ? (
                      <Text style={styles.alias} numberOfLines={1}>@{user.alias}</Text>
                    ) : null}
                  </View>
                </Pressable>
                {renderAction(user)}
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

function popBtn(isMosaicPop: boolean, pop: ReturnType<typeof usePopTokens>) {
  return isMosaicPop
    ? { backgroundColor: pop.orange, borderWidth: 2, borderColor: pop.ink, borderRadius: 100 }
    : null;
}

function createStyles(colors: ReturnType<typeof useOdosColors>) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    input: {
      flex: 1,
      fontFamily: FontFamily.ui,
      fontSize: 15,
      padding: 0,
    },
    dropdown: {
      borderWidth: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
    statusText: {
      fontFamily: FontFamily.ui,
      color: colors.muted,
      fontSize: 13,
      padding: 14,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    info: { flex: 1, minWidth: 0 },
    name: { fontFamily: FontFamily.uiBold, color: colors.text, fontSize: 14 },
    alias: { fontFamily: FontFamily.ui, color: colors.muted, fontSize: 12 },
    btn: { backgroundColor: colors.accentSoft, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, minHeight: 38, justifyContent: 'center' },
    btnText: { fontFamily: FontFamily.uiBold, color: colors.accent, fontSize: 13 },
    pending: { fontFamily: FontFamily.ui, color: colors.muted, fontSize: 12 },
  });
}
