import { ReactNode, Dispatch, SetStateAction } from 'react';

// User and Auth Types
export type User = {
    id: number;
    email: string;
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
