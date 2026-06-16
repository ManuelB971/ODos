import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Mail, Users2 } from 'lucide-react-native';
import { useGroupInvitations, useGroupMutations, useGroups } from '@/hooks/useGroups';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { GroupCard } from '@/components/social/GroupCard';
import { PopEmptyState } from '@/components/pop/PopEmptyState';
import { PopBadge } from '@/components/pop/PopPill';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';

export default function GroupsScreen() {
  const colors = useOdosColors();
  const router = useRouter();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const [tab, setTab] = useState<'mine' | 'discover'>('mine');
  const { data, isLoading, refetch, isRefetching } = useGroups(tab);
  const { join } = useGroupMutations();
  const { data: invitationsData } = useGroupInvitations();

  const groups = data?.member ?? [];
  const pendingInvitations = invitationsData?.member?.length ?? 0;
  const ink = isMosaicPop ? pop.ink : colors.text;

  return (
    <View style={[styles.container, { backgroundColor: isMosaicPop ? pop.paper : colors.background }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push('/group/create')}
          accessibilityRole="button"
          style={[
            styles.headerBtn,
            { backgroundColor: isMosaicPop ? pop.orange : colors.accent },
            isMosaicPop && { ...styles.popBtn, borderColor: pop.ink },
          ]}
        >
          <Plus size={16} color={isMosaicPop ? pop.ink : colors.onAccent} />
          <Text style={[styles.headerBtnText, { color: isMosaicPop ? pop.ink : colors.onAccent, fontFamily: FontFamily.uiBold }]}>
            Créer
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/group-invitations')}
          accessibilityRole="button"
          style={[
            styles.headerBtnOutline,
            { borderColor: colors.border, backgroundColor: colors.surface },
            isMosaicPop && { backgroundColor: pop.paper, borderColor: pop.ink, ...styles.popBtnOutline },
          ]}
        >
          <Mail size={16} color={ink} />
          <Text style={[styles.headerBtnOutlineText, { color: ink, fontFamily: FontFamily.uiMedium }]}>
            Invitations
          </Text>
          {pendingInvitations > 0 ? (
            isMosaicPop ? (
              <PopBadge count={pendingInvitations} />
            ) : (
              <View style={[styles.headerBadge, { backgroundColor: colors.accent }]}>
                <Text style={[styles.headerBadgeText, { color: colors.onAccent }]}>{pendingInvitations}</Text>
              </View>
            )
          ) : null}
        </Pressable>
      </View>

      <View style={[styles.tabs, isMosaicPop && { borderBottomWidth: 2.5, borderBottomColor: pop.ink }]}>
        {(['mine', 'discover'] as const).map((key) => {
          const activeColor = isMosaicPop ? pop.ink : colors.accent;
          const isActive = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[
                styles.tab,
                isActive && {
                  borderBottomColor: isMosaicPop ? pop.orange : colors.accent,
                  borderBottomWidth: isMosaicPop ? 4 : 2,
                },
              ]}
            >
              <Text
                style={{
                  color: isActive ? activeColor : colors.muted,
                  fontFamily: isMosaicPop ? FontFamily.uiBold : FontFamily.uiMedium,
                }}
              >
                {key === 'mine' ? 'Mes groupes' : 'Découvrir'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? (
            <Text style={[styles.empty, { color: colors.muted, fontFamily: FontFamily.ui }]}>Chargement…</Text>
          ) : tab === 'mine' ? (
            <PopEmptyState
              icon={<Users2 size={28} color={isMosaicPop ? pop.ink : colors.onAccent} />}
              title="Aucun groupe pour l’instant"
              subtitle="Créez un groupe pour organiser vos sorties, ou explorez les groupes publics."
              ctaLabel="Créer un groupe"
              onPressCta={() => router.push('/group/create')}
            />
          ) : (
            <PopEmptyState
              icon={<Users2 size={28} color={isMosaicPop ? pop.ink : colors.onAccent} />}
              title="Rien à découvrir"
              subtitle="Aucun groupe public n’est ouvert près de vous pour le moment. Revenez bientôt !"
            />
          )
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
  popBtn: { borderRadius: 100, borderWidth: 2.5, paddingVertical: 8 },
  popBtnOutline: { borderRadius: 100, borderWidth: 2.5, paddingVertical: 8 },
  headerBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  headerBadgeText: { fontSize: 11, fontFamily: FontFamily.uiBold },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 14, paddingHorizontal: 24, lineHeight: 20 },
});
