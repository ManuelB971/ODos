/**
 * Résout l'URL d'une image renvoyée par l'API.
 *
 * - Si l'URL est absolue (http://, https://, data:), elle est renvoyée telle quelle.
 * - Si c'est un chemin relatif (ex. "/uploads/activities/foo.jpg" — ce que produit
 *   l'upload via l'admin EasyAdmin), on la préfixe avec EXPO_PUBLIC_API_URL.
 * - Si l'URL est null/undefined/vide, on renvoie null.
 *
 * Indispensable côté React Native, qui exige toujours une URI absolue dans <Image source={{ uri }} />.
 */
export function resolveImageUrl(imageUrl: string | null | undefined): string | null {
    if (!imageUrl) return null;
    const trimmed = imageUrl.trim();
    if (trimmed === '') return null;

    if (/^(?:https?:|data:)/i.test(trimmed)) {
        return trimmed;
    }

    const base = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${base}${path}`;
}
