import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptGroupInvitation,
  createGroup,
  declineGroupInvitation,
  deleteGroup,
  fetchGroupDetail,
  fetchGroupInvitations,
  fetchGroups,
  inviteToGroup,
  joinGroup,
  leaveGroup,
  patchGroup,
  patchGroupMember,
  removeGroupMember,
} from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { SOCIAL_UNREAD_QUERY_KEY } from '@/hooks/useSocialUnreadCount';
import type { GroupRole } from '@/types';

export const GROUPS_QUERY_KEY = ['groups'] as const;
export const GROUP_INVITATIONS_QUERY_KEY = ['groupInvitations'] as const;

export function useGroups(tab: 'mine' | 'discover' = 'mine', page = 1) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: [...GROUPS_QUERY_KEY, tab, page],
    queryFn: () => fetchGroups(tab, page),
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: tab === 'mine' ? 30_000 : false,
  });
}

export function useGroupDetail(groupId: number) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['group', groupId],
    queryFn: () => fetchGroupDetail(groupId),
    enabled: isAuthenticated && groupId > 0,
    staleTime: 15_000,
  });
}

export function useGroupMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ['group'] });
    queryClient.invalidateQueries({ queryKey: GROUP_INVITATIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: SOCIAL_UNREAD_QUERY_KEY });
  };

  const create = useMutation({
    mutationFn: (payload: { name: string; description?: string; isPrivate?: boolean }) => createGroup(payload),
    onSuccess: invalidate,
  });

  const join = useMutation({
    mutationFn: (groupId: number) => joinGroup(groupId),
    onSuccess: invalidate,
  });

  const leave = useMutation({
    mutationFn: (groupId: number) => leaveGroup(groupId),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (groupId: number) => deleteGroup(groupId),
    onSuccess: invalidate,
  });

  const edit = useMutation({
    mutationFn: ({ groupId, ...payload }: { groupId: number; name?: string; description?: string | null }) =>
      patchGroup(groupId, payload),
    onSuccess: invalidate,
  });

  const invite = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: number; userId: number }) => inviteToGroup(groupId, userId),
    onSuccess: invalidate,
  });

  const setMemberRole = useMutation({
    mutationFn: ({ groupId, userId, role }: { groupId: number; userId: number; role: GroupRole }) =>
      patchGroupMember(groupId, userId, role),
    onSuccess: invalidate,
  });

  const kickMember = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: number; userId: number }) => removeGroupMember(groupId, userId),
    onSuccess: invalidate,
  });

  return { create, join, leave, remove, edit, invite, setMemberRole, kickMember };
}

export function useGroupInvitations(page = 1) {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: [...GROUP_INVITATIONS_QUERY_KEY, page],
    queryFn: () => fetchGroupInvitations(page),
    enabled: isAuthenticated && !!user?.socialConsentedAt,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useGroupInvitationMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: GROUP_INVITATIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: SOCIAL_UNREAD_QUERY_KEY });
  };

  const accept = useMutation({
    mutationFn: (id: number) => acceptGroupInvitation(id),
    onSettled: invalidate,
  });

  const decline = useMutation({
    mutationFn: (id: number) => declineGroupInvitation(id),
    onSettled: invalidate,
  });

  return { accept, decline };
}
