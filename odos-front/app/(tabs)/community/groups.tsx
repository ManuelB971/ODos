import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Mail } from 'lucide-react-native';
import { useGroupInvitations, useGroupMutations, useGroups } from '@/hooks/useGroups';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { GroupCard } from '@/components/social/GroupCard';

export default function GroupsScreen() {
  const colors = useOdosColors();
  const router = useRouter();
  const [tab, setTab] = useState<'mine' | 'discover'>('mine');
  const { data, isLoading, refetch, isRefetching } = useGroups(tab);
  const { join } = useGroupMutations();
  const { data: invitationsData } = useGroupInvitations();

  const groups = data?.member ?? [];
  const pendingInvitations = invitationsData?.member?.length ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push('/group/create')}
          style={[styles.headerBtn, { backgroundColor: colors.accent }]}
        >
          <Plus size={16} color={colors.onAccent} />
          <Text style={[styles.headerBtnText, { color: colors.onAccent, fontFamily: FontFamily.uiBold }]}>Créer</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/group-invitations')}
          style={[styles.headerBtnOutline, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Mail size={16} color={colors.text} />
          <Text style={[styles.headerBtnOutlineText, { color: colors.text, fontFamily: FontFamily.uiMedium }]}>
            Invitations
          </Text>
          {pendingInvitations > 0 ? (
            <View style={[styles.headerBadge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.headerBadgeText, { color: colors.onAccent }]}>{pendingInvitations}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {(['mine', 'discover'] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
          >
            <Text style={{ color: tab === key ? colors.accent : colors.muted, fontFamily: FontFamily.uiMedium }}>
              {key === 'mine' ? 'Mes groupes' : 'Découvrir'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.muted, fontFamily: FontFamily.ui }]}>
            {isLoading
              ? 'Chargement…'
              : tab === 'mine'
                ? 'Aucun groupe pour l’instant. Crée-en un ou découvre les groupes publics.'
                : 'Aucun groupe public à découvrir.'}
          </Text>
        }
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            onJoin={tab === 'discover' && !item.isPrivate ? () => join.mutate(item.id) : undefined}
            joining={join.isPending && join.variables === item.id}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  headerBtnText: { fontSize: 14 },
  headerBtnOutline: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  headerBtnOutlineText: { fontSize: 14 },
  headerBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  headerBadgeText: { fontSize: 11, fontFamily: FontFamily.uiBold },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  list: { padding: 16, gap: 10 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 14, paddingHorizontal: 24, lineHeight: 20 },
});
