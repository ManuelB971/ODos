import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { isJwtExpired } from '@/utils/jwt';
import {
    ApiActivity,
    ActivityComment,
    ActivityCommentsPage,
    ActivityRatingInfo,
    BadgeItem,
    BadgesOverview,
    MapExplorationOverview,
    Category,
} from '@/types';

const isSecureStoreAvailable = async () => {
    try {
        return await SecureStore.isAvailableAsync();
    } catch (e) {
        return false;
    }
};

// In-memory fallback for platforms where SecureStore is unavailable (web)
const memoryStore: Record<string, string> = {};

export const safeStorage = {
    getItem: async (key: string) => {
        if (await isSecureStoreAvailable()) {
            return await SecureStore.getItemAsync(key);
        }
        try {
            if (typeof localStorage !== 'undefined') {
                return localStorage.getItem(key);
            }
        } catch (_) { /* ignore */ }
        return memoryStore[key] ?? null;
    },
    setItem: async (key: string, value: string) => {
        if (await isSecureStoreAvailable()) {
            await SecureStore.setItemAsync(key, value);
            return;
        }
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(key, value);
                return;
            }
        } catch (_) { /* ignore */ }
        memoryStore[key] = value;
    },
    deleteItem: async (key: string) => {
        if (await isSecureStoreAvailable()) {
            await SecureStore.deleteItemAsync(key);
            return;
        }
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(key);
                return;
            }
        } catch (_) { /* ignore */ }
        delete memoryStore[key];
    }
};

type AuthErrorListener = (error: unknown) => void;
const authErrorListeners = new Set<AuthErrorListener>();

export function onAuthError(listener: AuthErrorListener) {
    authErrorListeners.add(listener);
    return () => authErrorListeners.delete(listener);
}

// Use EXPO_PUBLIC_API_URL so the variable is injected into the client build.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

try {
    if (typeof navigator !== 'undefined' && (navigator as { product?: string }).product === 'ReactNative') {
        if (BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1')) {
            console.warn(`[api] BASE_URL is ${BASE_URL}. On a real device, set EXPO_PUBLIC_API_URL to your PC IP.`);
        }
    }
} catch (e) {
    // ignore
}

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 12000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

/**
 * Renouvelle l’access token via le refresh token (sans passer par les intercepteurs).
 * @returns le nouvel access token, ou null si refresh impossible.
 */
export async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = await safeStorage.getItem('refresh_token');
    if (!refreshToken) {
        return null;
    }

    try {
        const response = await axios.post(`${BASE_URL}/api/token/refresh`, {
            refresh_token: refreshToken,
        });
        const newToken = response.data?.token;
        const newRefreshToken = response.data?.refresh_token;
        if (typeof newToken !== 'string' || !newToken) {
            return null;
        }

        await safeStorage.setItem('user_token', newToken);
        if (newRefreshToken) {
            await safeStorage.setItem('refresh_token', newRefreshToken);
        }
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        return newToken;
    } catch (err) {
        // On ne renvoie null (→ logout) que si le refresh token est explicitement
        // rejeté par le serveur : 401 (introuvable/invalide) ou 403 (interdit).
        // Tout le reste — 429 (rate-limit), 408, autres 4xx, 5xx, erreur réseau —
        // est transitoire : on relance (throw) en conservant les jetons, pour ne
        // jamais tuer une session encore valide côté serveur.
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (status === 401 || status === 403) {
            return null;
        }
        throw err;
    }
}

/**
 * Prépare la session au cold start : refresh proactif si l’access JWT est expiré.
 */
export async function ensureSessionReady(): Promise<boolean> {
    const access = await safeStorage.getItem('user_token');
    const refresh = await safeStorage.getItem('refresh_token');

    if (!access && !refresh) {
        return false;
    }

    if (access && !isJwtExpired(access)) {
        api.defaults.headers.common.Authorization = `Bearer ${access}`;
        return true;
    }

    if (refresh) {
        const renewed = await refreshAccessToken();
        return renewed !== null;
    }

    if (access) {
        api.defaults.headers.common.Authorization = `Bearer ${access}`;
        return true;
    }

    return false;
}

// Intercepteur pour ajouter le token JWT à chaque requête
api.interceptors.request.use(async (config) => {
    const token = await safeStorage.getItem('user_token');
    if (token && config.url !== '/api/token/refresh') {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error?.response?.status === 401 && !originalRequest._retry) {
            // Si l'appel au refresh a renvoyé une erreur, on évite les boucles
            if (originalRequest.url === '/api/token/refresh') {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise(function(resolve, reject) {
                    failedQueue.push({ resolve, reject });
                })
                .then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return api(originalRequest);
                })
                .catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const newToken = await refreshAccessToken();
                if (newToken) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    processQueue(null, newToken);
                    return api(originalRequest);
                }
                // null = le serveur a rejeté le refresh token (4xx) → session définitivement invalide
                processQueue(error, null);
                await safeStorage.deleteItem('user_token');
                await safeStorage.deleteItem('refresh_token');
                for (const listener of authErrorListeners) {
                    try {
                        listener(error);
                    } catch {
                        /* ignore */
                    }
                }
                return Promise.reject(error);
            } catch (refreshError) {
                // Erreur réseau pendant le refresh → tokens conservés, on ne déconnecte pas
                processQueue(refreshError, null);
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

// ── API Helper Functions ──

/** Fetch all categories */
export async function fetchCategories(): Promise<Category[]> {
    const response = await api.get('/api/categories');
    return response.data['hydra:member'] ?? response.data;
}

/**
 * Extrait les IDs d'activités depuis le champ `favorites` de /api/me.
 * L'API peut renvoyer des objets { id }, des IRIs JSON-LD, ou des chaînes.
 */
export function extractFavoriteActivityIds(favorites: unknown): number[] {
    if (!Array.isArray(favorites)) return [];
    const ids: number[] = [];
    for (const item of favorites) {
        if (typeof item === 'number' && Number.isFinite(item)) {
            ids.push(item);
            continue;
        }
        if (typeof item === 'string') {
            const m = item.match(/\/activities\/(\d+)/) ?? item.match(/\/(\d+)\/?$/);
            if (m) ids.push(Number.parseInt(m[1], 10));
            continue;
        }
        if (item && typeof item === 'object') {
            const o = item as Record<string, unknown>;
            if (typeof o.id === 'number' && Number.isFinite(o.id)) {
                ids.push(o.id);
                continue;
            }
            if (typeof o['@id'] === 'string') {
                const m = o['@id'].match(/\/activities\/(\d+)/) ?? o['@id'].match(/\/(\d+)\/?$/);
                if (m) ids.push(Number.parseInt(m[1], 10));
            }
        }
    }
    return [...new Set(ids)];
}

/** Fetch all activities */
export async function fetchActivities(): Promise<ApiActivity[]> {
    const response = await api.get('/api/activities', {
        params: { itemsPerPage: 200 },
    });
    const raw = response.data;
    if (Array.isArray(raw)) return raw as ApiActivity[];
    const member = raw['hydra:member'] ?? raw.member;
    return Array.isArray(member) ? member : [];
}

/** Fetch personalized recommendations (requires auth) */
export async function fetchRecommendations(): Promise<ApiActivity[]> {
    const response = await api.get('/api/recommendations');
    return response.data['hydra:member'] ?? response.data;
}

/** Update the current user's interests */
export async function updateUserInterests(userId: number, interestIris: string[]): Promise<void> {
    await api.patch(`/api/users/${userId}`, {
        interests: interestIris,
    }, {
        headers: { 'Content-Type': 'application/merge-patch+json' },
    });
}

/**
 * Toggle favorite status of an activity for the current user.
 * Returns { isFavorite: boolean } — the new state after the toggle.
 */
export async function toggleFavoriteActivity(activityId: number, isCurrentlyFavorite: boolean): Promise<{ isFavorite: boolean }> {
    if (isCurrentlyFavorite) {
        const response = await api.delete(`/api/activities/${activityId}/favorite`);
        return response.data;
    }

    const response = await api.post(`/api/activities/${activityId}/favorite`);
    return response.data;
}

/**
 * Fetch the list of activity IDs saved as favorites by the current user.
 * Uses the /api/me endpoint and extracts the `favorites` field.
 */
export async function fetchFavoriteIds(): Promise<number[]> {
    const response = await api.get('/api/me');
    return extractFavoriteActivityIds(response.data.favorites);
}

/**
 * Toggle the "visited" status of an activity for the current user.
 * Signal explicite (« J'ai visité ») qui alimente les recommandations.
 * Returns { isVisited: boolean } — the new state after the toggle.
 */
export async function toggleVisitedActivity(activityId: number, isCurrentlyVisited: boolean): Promise<{ isVisited: boolean }> {
    if (isCurrentlyVisited) {
        const response = await api.delete(`/api/activities/${activityId}/visited`);
        return response.data;
    }

    const response = await api.post(`/api/activities/${activityId}/visited`);
    return response.data;
}

/**
 * Fetch the list of activity IDs the current user marked as visited.
 * Uses /api/me and extracts the `visitedActivities` field.
 */
export async function fetchVisitedIds(): Promise<number[]> {
    const response = await api.get('/api/me');
    return extractFavoriteActivityIds(response.data.visitedActivities);
}

/**
 * Update editable profile fields (alias, bio, visibilité) for the current user.
 *
 * NB : `avatarUrl` n'est volontairement pas settable directement : il doit passer
 * par {@link uploadAvatar} (upload contrôlé côté serveur).
 *
 * `profilePublic` pilote la découvrabilité sociale : à `false`, l'utilisateur
 * disparaît de la recherche par alias (cf. `UserRepository::searchDiscoverable`).
 */
export async function updateProfile(
    userId: number,
    data: { alias?: string | null; bio?: string | null; mapExplorationEnabled?: boolean; profilePublic?: boolean }
): Promise<void> {
    await api.patch(`/api/users/${userId}`, data, {
        headers: { 'Content-Type': 'application/merge-patch+json' },
    });
}

/** PATCH /api/me/exploration/settings — activer / désactiver l'exploration carte */
export async function patchMapExplorationEnabled(enabled: boolean): Promise<MapExplorationOverview> {
    const response = await api.patch('/api/me/exploration/settings', { enabled });
    return response.data;
}

/**
 * Upload un avatar pour l'utilisateur courant (POST /api/me/avatar, multipart).
 *
 * @param file objet URI + nom + mimeType typiquement retourné par `expo-image-picker`
 * @returns la nouvelle URL publique de l'avatar
 */
export async function uploadAvatar(file: {
    uri: string;
    name: string;
    mimeType: string;
}): Promise<{ avatarUrl: string }> {
    const form = new FormData();
    // React Native a une signature spécifique pour FormData.append avec un fichier local.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
    } as any);

    const response = await api.post('/api/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { avatarUrl: response.data.avatarUrl };
}

/** Retire l'avatar courant (revient à l'avatar par défaut côté UI). */
export async function deleteAvatar(): Promise<void> {
    await api.delete('/api/me/avatar');
}

/** Delete the current user's account (legacy ApiPlatform route). */
export async function deleteAccount(userId: number): Promise<void> {
    await api.delete(`/api/users/${userId}`);
}

/** Effacement du compte courant — art. 17 RGPD (confirmation explicite). */
export async function deleteMyAccount(): Promise<void> {
    await api.delete('/api/me', { data: { confirm: true } });
}

/** Export des données personnelles — art. 20 RGPD. */
export async function exportMyData(): Promise<Record<string, unknown>> {
    const response = await api.get('/api/me/export');
    return response.data;
}

/** GET /api/activities/{id}/rating */
export async function fetchActivityRating(activityId: number): Promise<ActivityRatingInfo> {
    const response = await api.get(`/api/activities/${activityId}/rating`);
    return response.data;
}

/** PUT /api/activities/{id}/rating — crée ou met à jour la note (1–5) */
export async function putActivityRating(activityId: number, score: number): Promise<ActivityRatingInfo> {
    const response = await api.put(`/api/activities/${activityId}/rating`, { score });
    return response.data;
}

/** DELETE /api/activities/{id}/rating */
export async function deleteActivityRating(activityId: number): Promise<ActivityRatingInfo> {
    const response = await api.delete(`/api/activities/${activityId}/rating`);
    return response.data;
}

/** GET /api/activities/{id}/comments?page= */
export async function fetchActivityComments(activityId: number, page = 1): Promise<ActivityCommentsPage> {
    const response = await api.get(`/api/activities/${activityId}/comments`, { params: { page } });
    return response.data;
}

export async function postActivityComment(activityId: number, content: string): Promise<ActivityComment> {
    const response = await api.post(`/api/activities/${activityId}/comments`, { content });
    return response.data;
}

export async function patchActivityComment(commentId: number, content: string): Promise<ActivityComment> {
    const response = await api.patch(`/api/comments/${commentId}`, { content });
    return response.data;
}

export async function deleteActivityComment(commentId: number): Promise<void> {
    await api.delete(`/api/comments/${commentId}`);
}

/** GET /api/me/badges — badges obtenus, catalogue et vitrine profil */
export async function fetchMyBadges(): Promise<BadgesOverview> {
    const response = await api.get('/api/me/badges');
    return response.data;
}

/** PATCH /api/me/badges/{id}/display */
export async function patchBadgeDisplay(
    badgeId: number,
    displayOnProfile: boolean,
    displayOrder?: number | null
): Promise<BadgeItem> {
    const response = await api.patch(`/api/me/badges/${badgeId}/display`, {
        displayOnProfile,
        ...(displayOrder !== undefined ? { displayOrder } : {}),
    });
    return response.data;
}

/** POST /api/me/badges/{id}/seen */
export async function markBadgeSeen(badgeId: number): Promise<void> {
    await api.post(`/api/me/badges/${badgeId}/seen`);
}

/** POST /api/me/gamification/events */
export async function postGamificationEvent(
    type: 'activity_viewed' | 'favorite_added' | 'comment_created' | 'rating_created',
    context: Record<string, unknown> = {}
): Promise<{ unlocked: BadgeItem[]; overview: BadgesOverview }> {
    const response = await api.post('/api/me/gamification/events', { type, context });
    return response.data;
}

/** GET /api/me/exploration — progression zones carte */
export async function fetchMapExploration(): Promise<MapExplorationOverview> {
    const response = await api.get('/api/me/exploration');
    return response.data;
}

/** POST /api/me/exploration/consent */
export async function postMapExplorationConsent(): Promise<MapExplorationOverview> {
    const response = await api.post('/api/me/exploration/consent');
    return response.data;
}

/** POST /api/me/exploration/sync */
export async function syncMapExplorationCells(
    cells: string[]
): Promise<{ overview: MapExplorationOverview; unlockedBadges: BadgeItem[] }> {
    const response = await api.post('/api/me/exploration/sync', { cells });
    return response.data;
}

// --- Social / Community API ---

export async function postSocialConsent(): Promise<{ socialConsentedAt: string }> {
    const response = await api.post('/api/me/social-consent');
    return response.data;
}

export async function fetchSocialUnreadCount(): Promise<import('@/types').SocialUnreadCount> {
    const response = await api.get('/api/social/unread-count');
    return response.data;
}

export async function fetchFriendships(page = 1): Promise<import('@/types').PaginatedMember<import('@/types').FriendshipItem>> {
    const response = await api.get('/api/friendships', { params: { page } });
    return response.data;
}

export async function sendFriendRequest(receiverId: number): Promise<{ friendship: import('@/types').FriendshipItem }> {
    const response = await api.post('/api/friendships', { receiverId });
    return response.data;
}

export async function patchFriendship(id: number, status: 'accepted' | 'blocked'): Promise<void> {
    await api.patch(`/api/friendships/${id}`, { status });
}

export async function deleteFriendship(id: number): Promise<void> {
    await api.delete(`/api/friendships/${id}`);
}

export async function fetchForumThreads(params: { page?: number; activity?: number; category?: number; group?: number } = {}): Promise<import('@/types').PaginatedMember<import('@/types').ForumThreadItem>> {
    const response = await api.get('/api/forum/threads', { params });
    return response.data;
}

export async function fetchForumThread(id: number): Promise<{ thread: import('@/types').ForumThreadItem }> {
    const response = await api.get(`/api/forum/threads/${id}`);
    return response.data;
}

export async function fetchForumReplies(threadId: number, page = 1): Promise<import('@/types').PaginatedMember<import('@/types').ForumReplyItem>> {
    const response = await api.get(`/api/forum/threads/${threadId}/replies`, { params: { page } });
    return response.data;
}

/**
 * Crée un sujet de forum. Le backend exige une cible (activité, catégorie ou
 * groupe) — au moins l'un des trois doit être fourni.
 */
export async function createForumThread(payload: {
    title: string;
    content: string;
    activityId?: number;
    categoryId?: number;
    groupId?: number;
}): Promise<{ thread: import('@/types').ForumThreadItem }> {
    const response = await api.post('/api/forum/threads', payload);
    return response.data;
}

/** Poste une réponse dans un fil. */
export async function createForumReply(
    threadId: number,
    content: string,
): Promise<{ reply: import('@/types').ForumReplyItem }> {
    const response = await api.post(`/api/forum/threads/${threadId}/replies`, { content });
    return response.data;
}

/** Like / unlike une réponse. Le backend interdit de liker sa propre réponse. */
export async function setForumReplyLike(
    replyId: number,
    liked: boolean,
): Promise<{ liked: boolean; likeCount: number }> {
    const response = liked
        ? await api.post(`/api/forum/replies/${replyId}/like`)
        : await api.delete(`/api/forum/replies/${replyId}/like`);
    return response.data;
}

export async function fetchGroups(tab: 'mine' | 'discover' = 'mine', page = 1): Promise<import('@/types').PaginatedMember<import('@/types').ActivityGroupItem>> {
    const response = await api.get('/api/groups', { params: { tab, page } });
    return response.data;
}

export async function createGroup(payload: {
    name: string;
    description?: string;
    isPrivate?: boolean;
}): Promise<{ group: import('@/types').ActivityGroupItem }> {
    const response = await api.post('/api/groups', payload);
    return response.data;
}

export async function fetchGroupDetail(groupId: number): Promise<import('@/types').GroupDetail> {
    const response = await api.get(`/api/groups/${groupId}`);
    return response.data;
}

export async function patchGroup(groupId: number, payload: {
    name?: string;
    description?: string | null;
    avatarUrl?: string;
}): Promise<{ group: import('@/types').ActivityGroupItem }> {
    const response = await api.patch(`/api/groups/${groupId}`, payload);
    return response.data;
}

export async function deleteGroup(groupId: number): Promise<void> {
    await api.delete(`/api/groups/${groupId}`);
}

export async function joinGroup(groupId: number): Promise<void> {
    await api.post(`/api/groups/${groupId}/join`);
}

export async function leaveGroup(groupId: number): Promise<void> {
    await api.delete(`/api/groups/${groupId}/leave`);
}

export async function inviteToGroup(groupId: number, userId: number): Promise<void> {
    await api.post(`/api/groups/${groupId}/invite`, { userId });
}

export async function patchGroupMember(
    groupId: number,
    userId: number,
    role: import('@/types').GroupRole,
): Promise<void> {
    await api.patch(`/api/groups/${groupId}/members/${userId}`, { role });
}

export async function removeGroupMember(groupId: number, userId: number): Promise<void> {
    await api.delete(`/api/groups/${groupId}/members/${userId}`);
}

export async function fetchGroupMessages(
    groupId: number,
    page = 1,
): Promise<import('@/types').PaginatedMember<import('@/types').GroupMessageItem>> {
    const response = await api.get(`/api/groups/${groupId}/messages`, { params: { page } });
    return response.data;
}

export async function sendGroupMessage(
    groupId: number,
    content: string,
): Promise<{ message: import('@/types').GroupMessageItem }> {
    const response = await api.post(`/api/groups/${groupId}/messages`, { content });
    return response.data;
}

export async function markGroupMessagesRead(groupId: number): Promise<void> {
    await api.patch(`/api/groups/${groupId}/messages/read`);
}

export async function fetchGroupInvitations(page = 1): Promise<import('@/types').PaginatedMember<import('@/types').GroupInvitationItem>> {
    const response = await api.get('/api/group-invitations', { params: { page } });
    return response.data;
}

export async function acceptGroupInvitation(id: number): Promise<void> {
    await api.post(`/api/group-invitations/${id}/accept`);
}

export async function declineGroupInvitation(id: number): Promise<void> {
    await api.post(`/api/group-invitations/${id}/decline`);
}

export async function fetchSharedActivities(page = 1): Promise<import('@/types').PaginatedMember<import('@/types').SharedActivityItem>> {
    const response = await api.get('/api/shared-activities', { params: { page } });
    return response.data;
}

export async function shareActivity(payload: {
    activityId: number;
    receiverId?: number;
    groupId?: number;
    message?: string;
}): Promise<void> {
    await api.post('/api/shared-activities', payload);
}

export async function markSharedActivitySeen(id: number): Promise<void> {
    await api.patch(`/api/shared-activities/${id}`);
}

export async function searchUsers(q: string, page = 1): Promise<{
    users: import('@/types').UserSearchResult[];
    page: number;
    itemsPerPage: number;
}> {
    const response = await api.get('/api/users/search', { params: { q, page } });
    return response.data;
}

export async function reportForumThread(id: number, reason: import('@/types').ForumReportReason, details?: string): Promise<void> {
    await api.post(`/api/forum/threads/${id}/report`, { reason, details });
}

export async function reportForumReply(id: number, reason: import('@/types').ForumReportReason, details?: string): Promise<void> {
    await api.post(`/api/forum/replies/${id}/report`, { reason, details });
}

export async function registerPushToken(token: string, platform: string): Promise<void> {
    await api.post('/api/me/push-token', { token, platform });
}

export async function unregisterPushToken(token: string): Promise<void> {
    await api.delete('/api/me/push-token', { data: { token } });
}

export async function fetchConversations(page = 1): Promise<import('@/types').PaginatedMember<import('@/types').ConversationItem>> {
    const response = await api.get('/api/chat/conversations', { params: { page } });
    return response.data;
}

export async function openConversation(userId: number): Promise<{ conversation: import('@/types').ConversationItem }> {
    const response = await api.post('/api/chat/conversations', { userId });
    return response.data;
}

export async function fetchChatMessages(conversationId: number, page = 1): Promise<import('@/types').PaginatedMember<import('@/types').ChatMessageItem>> {
    const response = await api.get(`/api/chat/conversations/${conversationId}/messages`, { params: { page } });
    return response.data;
}

export async function sendChatMessage(
    conversationId: number,
    content: string,
    activityId?: number,
    parcoursId?: number,
): Promise<{ message: import('@/types').ChatMessageItem }> {
    const response = await api.post(`/api/chat/conversations/${conversationId}/messages`, {
        content,
        ...(activityId ? { activityId } : {}),
        ...(parcoursId ? { parcoursId } : {}),
    });
    return response.data;
}

export async function markConversationRead(conversationId: number): Promise<void> {
    await api.patch(`/api/chat/conversations/${conversationId}/read`);
}

// --- Parcours (itinéraires collaboratifs) ---

export async function fetchParcours(): Promise<{ member: import('@/types').ParcoursSummary[] }> {
    const response = await api.get('/api/parcours');
    return response.data;
}

export async function fetchParcoursDetail(id: number): Promise<{ parcours: import('@/types').ParcoursDetail }> {
    const response = await api.get(`/api/parcours/${id}`);
    return response.data;
}

export async function createParcours(payload: {
    title: string;
    description?: string;
    activityIds?: number[];
}): Promise<{ parcours: import('@/types').ParcoursDetail }> {
    const response = await api.post('/api/parcours', payload);
    return response.data;
}

export async function updateParcours(
    id: number,
    payload: { title?: string; description?: string },
): Promise<{ parcours: import('@/types').ParcoursDetail }> {
    const response = await api.patch(`/api/parcours/${id}`, payload);
    return response.data;
}

export async function addParcoursItem(
    id: number,
    activityId: number,
    note?: string,
): Promise<{ parcours: import('@/types').ParcoursDetail }> {
    const response = await api.post(`/api/parcours/${id}/items`, { activityId, ...(note ? { note } : {}) });
    return response.data;
}

export async function reorderParcoursItems(
    id: number,
    order: number[],
): Promise<{ parcours: import('@/types').ParcoursDetail }> {
    const response = await api.patch(`/api/parcours/${id}/items/reorder`, { order });
    return response.data;
}

export async function removeParcoursItem(
    id: number,
    itemId: number,
): Promise<{ parcours: import('@/types').ParcoursDetail }> {
    const response = await api.delete(`/api/parcours/${id}/items/${itemId}`);
    return response.data;
}

export async function deleteParcours(id: number): Promise<void> {
    await api.delete(`/api/parcours/${id}`);
}

export default api;
