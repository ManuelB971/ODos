import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const isSecureStoreAvailable = async () => {
    try {
        return await SecureStore.isAvailableAsync();
    } catch (e) {
        return false;
    }
};

export const safeStorage = {
    getItem: async (key: string) => {
        if (await isSecureStoreAvailable()) {
            return await SecureStore.getItemAsync(key);
        }
        return null; // Fallback ou localStorage ici si besoin
    },
    setItem: async (key: string, value: string) => {
        if (await isSecureStoreAvailable()) {
            await SecureStore.setItemAsync(key, value);
        }
    },
    deleteItem: async (key: string) => {
        if (await isSecureStoreAvailable()) {
            await SecureStore.deleteItemAsync(key);
        }
    }
};

// REMPLACEZ PAR VOTRE IP LOCALE (ex: http://192.168.1.XX:8000)
// localhost ne fonctionne pas sur un vrai téléphone/simulateur Android vers le PC.
const BASE_URL = 'http://192.168.132.1:8000';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Intercepteur pour ajouter le token JWT à chaque requête
api.interceptors.request.use(async (config) => {
    const token = await safeStorage.getItem('user_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
