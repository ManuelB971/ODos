import { ReactNode, Dispatch, SetStateAction } from 'react';

// User and Auth Types
export type User = {
    id: number;
    email: string;
    /** Pseudo public (alias). */
    alias?: string | null;
    /**
     * Valeur calculée côté serveur (alias ou local-part de l'email).
     * Utilisée comme nom à afficher partout où l'on montrerait sinon l'email.
     */
    displayName?: string | null;
    /** URL publique de l'avatar (`/uploads/avatars/xxx.webp`), relative côté API. */
    avatarUrl?: string | null;
    /** Bio publique, 500 caractères max, texte brut. */
    bio?: string | null;
    hideBadgesOnProfile?: boolean;
    /** Exploration carte activée (paramètres + consentement). */
    mapExplorationEnabled?: boolean;
    socialConsentedAt?: string | null;
    profilePublic?: boolean;
    interests?: Category[];
} | null;

/** Badge gamification (API /api/me/badges) */
export interface BadgeItem {
    id: number;
    code: string;
    name: string;
    description: string;
    imageUrl: string | null;
    sortOrder: number;
    owned: boolean;
    ruleHint: string;
    unlockedAt?: string;
    seenAt?: string | null;
    isUnseen?: boolean;
    displayOnProfile?: boolean;
    displayOrder?: number | null;
}

export interface BadgesOverview {
    hideAllOnProfile: boolean;
    earned: BadgeItem[];
    available: BadgeItem[];
    profileDisplayed: BadgeItem[];
    unseenCount: number;
}

export interface MapExplorationOverview {
    zoneKey: string;
    precision: number;
    bbox: { west: number; south: number; east: number; north: number };
    totalCells: number;
    visitedCount: number;
    percent: number;
    enabled: boolean;
    consented: boolean;
    /** enabled && consented — fonctionnalité réellement utilisable */
    active: boolean;
    consentedAt?: string | null;
    visitedCellIds: string[];
    visitedGeoJson?: GeoJSON.FeatureCollection;
}

export type AuthContextType = {
    user: User;
    setUser: Dispatch<SetStateAction<User>>;
    isAuthenticated: boolean;
    isLoading: boolean;
    checkAuth: () => Promise<void>;
    logout: () => Promise<void>;
};

export type AuthProviderProps = {
    children: ReactNode;
};

// Interest Types
export type InterestContextType = {
    interests: string[];
    setInterests: Dispatch<SetStateAction<string[]>>;
};

export type InterestProviderProps = {
    children: ReactNode;
};

// Category (from API)
export interface Category {
    id: number;
    name: string;
}

// Activity from the backend API
export interface ApiActivity {
    id: number;
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    city: string | null;
    category: Category | string;
    // Nouveaux champs enrichis
    price: number | null;
    imageUrl: string | null;
    dateStart: string | null; // ISO 8601 string from the API
    dateEnd: string | null;
    isFavorite?: boolean; // état local, pas persisté côté API
    /** Moyenne des notes 1–5 (API) */
    ratingAverage?: number | null;
    /** Nombre d’avis */
    ratingCount?: number | null;
    /** Statut de publication. Par défaut `true` côté serveur ; filtré côté client pour exclure les brouillons. */
    isPublished?: boolean;
}

/** Réponse GET /api/activities/{id}/rating */
export interface ActivityRatingInfo {
    average: number | null;
    count: number;
    userScore: number | null;
}

/** Commentaire renvoyé par l’API */
export interface ActivityComment {
    id: number;
    content: string;
    createdAt: string;
    updatedAt: string;
    isEdited: boolean;
    /** Présent uniquement pour les admins (les commentaires masqués sont filtrés côté serveur). */
    isHidden?: boolean;
    author: { id: number; displayName: string; avatarUrl?: string | null };
    activityId: number | null;
}

/** Réponse paginée commentaires */
export interface ActivityCommentsPage {
    member: ActivityComment[];
    totalItems: number;
    page: number;
    itemsPerPage: number;
}

// Activity for local/display usage (richer UI data)
export interface Activity {
    id: string;
    name: string;
    images: string[];
    price: number;
    rating: number;
    reviews: number;
    duration: string;
    address: string;
    category: string;
    description: string;
}

// ML / Recommendation Types
export interface RecommendationModel {
    predict: (interests: string[]) => Promise<Activity[]>;
    load: () => Promise<boolean>;
    isLoaded: boolean;
}

/** Social / Community */
export interface SocialUserSnippet {
    id: number;
    displayName: string;
    avatarUrl: string | null;
}

export interface FriendshipItem {
    id: number;
    status: 'pending' | 'accepted' | 'blocked';
    isIncoming: boolean;
    otherUser: SocialUserSnippet | null;
    createdAt: string;
    acceptedAt: string | null;
}

export interface ForumThreadItem {
    id: number;
    title: string;
    content: string;
    author: SocialUserSnippet | null;
    activityId: number | null;
    categoryId: number | null;
    groupId: number | null;
    isPinned: boolean;
    isLocked: boolean;
    replyCount: number;
    lastReplyAt: string | null;
    createdAt: string;
}

export interface ForumReplyItem {
    id: number;
    content: string;
    author: SocialUserSnippet | null;
    threadId: number;
    likeCount: number;
    likedByMe: boolean;
    createdAt: string;
}

/** Activité telle qu'embarquée dans une étape de parcours (avec géo pour le tracé). */
export interface ParcoursActivitySnippet {
    id: number;
    name: string;
    city: string | null;
    imageUrl: string | null;
    latitude: number;
    longitude: number;
}

export interface ParcoursItemDetail {
    id: number;
    position: number;
    note: string | null;
    activity: ParcoursActivitySnippet | null;
}

/** Résumé d'un parcours (listes, picker, carte de chat). */
export interface ParcoursSummary {
    id: number;
    title: string;
    description: string | null;
    itemCount: number;
    coverImageUrl: string | null;
    owner: SocialUserSnippet | null;
    isOwner: boolean;
    collaboratorCount: number;
    updatedAt: string;
    createdAt: string;
}

export interface ParcoursDetail extends ParcoursSummary {
    items: ParcoursItemDetail[];
    collaborators: (SocialUserSnippet | null)[];
}

export interface ActivityGroupItem {
    id: number;
    name: string;
    description: string | null;
    avatarUrl: string | null;
    isPrivate: boolean;
    memberCount: number;
    createdAt: string;
    /** Messages de groupe non lus (présent uniquement dans l'onglet « mes groupes »). */
    unreadCount?: number;
}

export type GroupRole = 'creator' | 'admin' | 'member';

export interface GroupMemberItem {
    id: number;
    user: SocialUserSnippet | null;
    role: GroupRole;
    joinedAt: string;
}

export interface GroupDetail {
    group: ActivityGroupItem;
    members: GroupMemberItem[];
}

export interface GroupMessageItem {
    id: number;
    content: string;
    author: SocialUserSnippet | null;
    groupId: number;
    isMine: boolean;
    createdAt: string;
}

export interface SharedActivityItem {
    id: number;
    sender: SocialUserSnippet | null;
    receiver: SocialUserSnippet | null;
    groupId: number | null;
    activity: { id: number; name: string; city: string | null } | null;
    message: string | null;
    createdAt: string;
    seenAt: string | null;
}

export interface PaginatedMember<T> {
    member: T[];
    totalItems?: number;
    page: number;
    itemsPerPage: number;
}

export interface SocialUnreadCount {
    pendingFriendRequests: number;
    unreadShares: number;
    pendingGroupInvitations: number;
    unreadMessages: number;
    unreadGroupMessages: number;
    total: number;
}

export type UserRelationship = 'none' | 'friends' | 'incoming' | 'outgoing';

export interface UserSearchResult {
    id: number;
    displayName: string;
    alias: string | null;
    avatarUrl: string | null;
    relationship: UserRelationship;
}

export interface ConversationItem {
    id: number;
    otherUser: SocialUserSnippet | null;
    lastMessageAt: string | null;
    unreadCount: number;
    createdAt: string;
}

/** Activité attachée à un message de chat (carte riche façon WhatsApp). */
export interface ChatActivitySnippet {
    id: number;
    name: string;
    city: string | null;
    imageUrl: string | null;
}

/** Parcours attaché à un message de chat (carte cliquable). */
export interface ChatParcoursSnippet {
    id: number;
    title: string;
    itemCount: number;
}

export interface ChatMessageItem {
    id: number;
    content: string;
    author: SocialUserSnippet | null;
    conversationId: number;
    isMine: boolean;
    /** Activité partagée dans le fil, `null` pour un message texte simple. */
    activity: ChatActivitySnippet | null;
    /** Parcours partagé dans le fil, `null` sinon. */
    parcours: ChatParcoursSnippet | null;
    readAt: string | null;
    createdAt: string;
}

export type ForumReportReason = 'spam' | 'harassment' | 'illegal' | 'other';

export interface GroupInvitationItem {
    id: number;
    group: ActivityGroupItem | null;
    invitedBy: SocialUserSnippet | null;
    status: string;
    createdAt: string;
}
