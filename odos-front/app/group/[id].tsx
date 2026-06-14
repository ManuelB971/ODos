import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MessageCircle, UserPlus, Pencil, LogOut, Trash2 } from 'lucide-react-native';
import { useGroupDetail, useGroupMutations } from '@/hooks/useGroups';
import { useUserSearch } from '@/hooks/useUserSearch';
import { useAuth } from '@/context/AuthContext';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import type { GroupMemberItem, GroupRole } from '@/types';

const ROLE_LABEL: Record<GroupRole, string> = {
  creator: 'Créateur',
  admin: 'Admin',
  member: 'Membre',
};

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const colors = useOdosColors();
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading } = useGroupDetail(groupId);
  const { join, leave, remove, edit, invite, setMemberRole, kickMember } = useGroupMutations();

  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [inviteQuery, setInviteQuery] = useState('');
  const [invitedIds, setInvitedIds] = useState<number[]>([]);
  const { data: searchData, isFetching: searching } = useUserSearch(inviting ? inviteQuery : '');

  const group = data?.group;
  const members = data?.members ?? [];
  const myMembership = members.find((m) => m.user?.id === user?.id);
  const myRole = myMembership?.role;
  const isMember = !!myMembership;
  const isCreator = myRole === 'creator';
  const isAdmin = myRole === 'creator' || myRole === 'admin';

  const canManage = (m: GroupMemberItem): boolean => {
    if (!isAdmin || m.user?.id === user?.id || m.role === 'creator') return false;
    if (isCreator) return true;
    return m.role === 'member';
  };

  const startEdit = () => {
    setEditName(group?.name ?? '');
    setEditDesc(group?.description ?? '');
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    await edit.mutateAsync({ groupId, name: editName.trim(), description: editDesc.trim() || null });
    setEditing(false);
  };

  const confirmLeave = () => {
    Alert.alert('Quitter le groupe', 'Voulez-vous vraiment quitter ce groupe ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: async () => {
          await leave.mutateAsync(groupId);
          router.back();
        },
      },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert('Supprimer le groupe', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await remove.mutateAsync(groupId);
          router.back();
        },
      },
    ]);
  };

  const confirmKick = (m: GroupMemberItem) => {
    if (!m.user?.id) return;
    Alert.alert('Exclure', `Exclure ${m.user.displayName} du groupe ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Exclure',
        style: 'destructive',
        onPress: () => kickMember.mutate({ groupId, userId: m.user!.id }),
      },
    ]);
  };

  const doInvite = (userId: number) => {
    invite.mutate({ groupId, userId });
    setInvitedIds((prev) => [...prev, userId]);
  };

  const memberIds = new Set(members.map((m) => m.user?.id));

  return (
    <>
      <Stack.Screen options={{ title: group?.name ?? 'Groupe', headerShown: true }} />
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : !group ? (
          <Text style={{ color: colors.muted, fontFamily: FontFamily.ui }}>Groupe introuvable.</Text>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.text, fontFamily: FontFamily.display }]}>{group.name}</Text>
              {group.description ? (
                <Text style={[styles.desc, { color: colors.text, fontFamily: FontFamily.ui }]}>{group.description}</Text>
              ) : null}
              <Text style={[styles.meta, { color: colors.muted, fontFamily: FontFamily.ui }]}>
                {group.memberCount} membres{group.isPrivate ? ' · Privé' : ' · Public'}
              </Text>
            </View>

            {/* Actions principales */}
            {isMember ? (
              <Pressable
                onPress={() => router.push(`/group-chat/${groupId}`)}
                style={[styles.primary, { backgroundColor: colors.accent }]}
              >
                <MessageCircle size={18} color={colors.onAccent} />
                <Text style={[styles.primaryText, { color: colors.onAccent, fontFamily: FontFamily.uiBold }]}>
                  Ouvrir la discussion
                </Text>
              </Pressable>
            ) : group.isPrivate ? (
              <Text style={[styles.note, { color: colors.muted, fontFamily: FontFamily.ui }]}>
                Groupe privé — vous devez être invité pour le rejoindre.
              </Text>
            ) : (
              <Pressable
                onPress={() => join.mutate(groupId)}
                disabled={join.isPending}
                style={[styles.primary, { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.primaryText, { color: colors.onAccent, fontFamily: FontFamily.uiBold }]}>
                  {join.isPending ? '…' : 'Rejoindre le groupe'}
                </Text>
              </Pressable>
            )}

            {/* Boutons secondaires */}
            <View style={styles.actionRow}>
              {isAdmin && group.isPrivate ? (
                <Pressable onPress={() => setInviting((v) => !v)} style={[styles.secondary, { borderColor: colors.border }]}>
                  <UserPlus size={16} color={colors.text} />
                  <Text style={[styles.secondaryText, { color: colors.text }]}>Inviter</Text>
                </Pressable>
              ) : null}
              {isAdmin ? (
                <Pressable onPress={startEdit} style={[styles.secondary, { borderColor: colors.border }]}>
                  <Pencil size={16} color={colors.text} />
                  <Text style={[styles.secondaryText, { color: colors.text }]}>Éditer</Text>
                </Pressable>
              ) : null}
              {isMember && !isCreator ? (
                <Pressable onPress={confirmLeave} style={[styles.secondary, { borderColor: colors.border }]}>
                  <LogOut size={16} color={colors.danger} />
                  <Text style={[styles.secondaryText, { color: colors.danger }]}>Quitter</Text>
                </Pressable>
              ) : null}
              {isCreator ? (
                <Pressable onPress={confirmDelete} style={[styles.secondary, { borderColor: colors.border }]}>
                  <Trash2 size={16} color={colors.danger} />
                  <Text style={[styles.secondaryText, { color: colors.danger }]}>Supprimer</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Édition inline */}
            {editing ? (
              <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Nom"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, fontFamily: FontFamily.ui }]}
                />
                <TextInput
                  value={editDesc}
                  onChangeText={setEditDesc}
                  placeholder="Description"
                  placeholderTextColor={colors.muted}
                  multiline
                  style={[styles.input, styles.textarea, { color: colors.text, borderColor: colors.border, fontFamily: FontFamily.ui }]}
                />
                <View style={styles.panelActions}>
                  <Pressable onPress={() => setEditing(false)}>
                    <Text style={{ color: colors.muted, fontFamily: FontFamily.uiMedium }}>Annuler</Text>
                  </Pressable>
                  <Pressable onPress={saveEdit} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                    <Text style={{ color: colors.onAccent, fontFamily: FontFamily.uiBold }}>
                      {edit.isPending ? '…' : 'Enregistrer'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Invitation inline */}
            {inviting ? (
              <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  value={inviteQuery}
                  onChangeText={setInviteQuery}
                  placeholder="Rechercher un alias à inviter…"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.text, borderColor: colors.border, fontFamily: FontFamily.ui }]}
                />
                {searching ? <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} /> : null}
                {(searchData?.users ?? []).map((u) => {
                  const already = memberIds.has(u.id);
                  const invited = invitedIds.includes(u.id);
                  return (
                    <View key={u.id} style={styles.inviteRow}>
                      <Text style={{ color: colors.text, fontFamily: FontFamily.uiMedium, flex: 1 }} numberOfLines={1}>
                        {u.displayName}
                      </Text>
                      <Pressable
                        disabled={already || invited}
                        onPress={() => doInvite(u.id)}
                        style={[styles.inviteBtn, { backgroundColor: already || invited ? colors.border : colors.accent }]}
                      >
                        <Text style={{ color: already || invited ? colors.muted : colors.onAccent, fontFamily: FontFamily.uiMedium, fontSize: 12 }}>
                          {already ? 'Membre' : invited ? 'Invité' : 'Inviter'}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Membres */}
            <Text style={[styles.section, { color: colors.text, fontFamily: FontFamily.uiMedium }]}>
              Membres ({members.length})
            </Text>
            {members.map((m) => (
              <View key={m.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
                  <Text style={[styles.avatarLetter, { color: colors.accent }]}>
                    {(m.user?.displayName ?? '?')[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontFamily: FontFamily.uiMedium }}>{m.user?.displayName}</Text>
                  <Text style={{ color: colors.muted, fontFamily: FontFamily.ui, fontSize: 12 }}>{ROLE_LABEL[m.role]}</Text>
                </View>
                {canManage(m) ? (
                  <View style={styles.memberActions}>
                    {isCreator && m.role === 'member' ? (
                      <Pressable onPress={() => setMemberRole.mutate({ groupId, userId: m.user!.id, role: 'admin' })}>
                        <Text style={[styles.memberAction, { color: colors.accent }]}>Promouvoir</Text>
                      </Pressable>
                    ) : null}
                    {isCreator && m.role === 'admin' ? (
                      <Pressable onPress={() => setMemberRole.mutate({ groupId, userId: m.user!.id, role: 'member' })}>
                        <Text style={[styles.memberAction, { color: colors.accent }]}>Rétrograder</Text>
                      </Pressable>
                    ) : null}
                    <Pressable onPress={() => confirmKick(m)}>
                      <Text style={[styles.memberAction, { color: colors.danger }]}>Exclure</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },
  title: { fontSize: 24 },
  desc: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 13 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  primaryText: { fontSize: 15 },
  note: { fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondary: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  secondaryText: { fontFamily: FontFamily.uiMedium, fontSize: 13 },
  panel: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  panelActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16 },
  saveBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  inviteBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  section: { fontSize: 15, marginTop: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: FontFamily.uiBold, fontSize: 16 },
  memberActions: { flexDirection: 'row', gap: 12 },
  memberAction: { fontFamily: FontFamily.uiMedium, fontSize: 12 },
});
