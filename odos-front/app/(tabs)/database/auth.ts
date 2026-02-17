import api, { safeStorage } from '@/scripts/api';

/**
 * Inscription d'un nouvel utilisateur
 */
export async function signUp(email: string, password: string) {
  try {
    const response = await api.post('/api/users', {
      email: email,
      plainPassword: password, // Utilisation du champ plainPassword pour le processor Symfony
    });

    return {
      success: true,
      errorMessage: null,
      user: response.data,
    };
  } catch (error: any) {
    console.error('Erreur SignUp:', error.response?.data || error.message);
    return {
      success: false,
      errorMessage: error.response?.data?.['hydra:description'] || "Erreur lors de l'inscription",
      user: null,
    };
  }
}

/**
 * Connexion de l'utilisateur
 */
export async function signIn(email: string, password: string) {
  try {
    const response = await api.post('/api/login', {
      email,
      password,
    });

    const { token } = response.data;

    // Stockage sécurisé du token JWT
    await safeStorage.setItem('user_token', token);

    // Optionnel : Récupérer les infos de l'utilisateur (id, email) via /api/me
    const userResponse = await api.get('/api/me');

    return {
      success: true,
      errorMessage: null,
      user: userResponse.data,
    };
  } catch (error: any) {
    console.error('Erreur SignIn:', error.response?.data || error.message);
    return {
      success: false,
      errorMessage: "Email ou mot de passe incorrect",
      user: null,
    };
  }
}

/**
 * Déconnexion de l'utilisateur
 */
export async function signOut() {
  try {
    // Suppression du token
    await safeStorage.deleteItem('user_token');
    return { success: true, errorMessage: null };
  } catch (error: any) {
    return { success: false, errorMessage: "Erreur lors de la déconnexion" };
  }
}

export default api;
