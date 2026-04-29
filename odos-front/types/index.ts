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
    interests?: Category[];
} | null;

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
    author: { id: number; displayName: string };
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
