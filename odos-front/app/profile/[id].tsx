import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import api from '@/scripts/api';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';

async function fetchPublicProfile(userId: number) {
  const response = await api.get(`/api/users/${userId}/profile`);
  return response.data as {
    id: number;
    alias: string | null;
    bio: string | null;
    avatarUrl: string | null;
    badgeCount?: number;
    favoriteCount?: number;
  };
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = Number(id);
  const colors = useOdosColors();

  const { data, isLoading } = useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: () => fetchPublicProfile(userId),
    enabled: Number.isFinite(userId),
  });

  return (
    <>
      <Stack.Screen options={{ title: data?.alias ?? 'Profil', presentation: 'modal' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {isLoading ? (
          <Text style={{ color: colors.muted, fontFamily: FontFamily.ui }}>Chargement…</Text>
        ) : data ? (
          <>
            <Text style={[styles.name, { color: colors.text, fontFamily: FontFamily.serifSemiBold }]}>
              {data.alias ?? 'Utilisateur'}
            </Text>
            {data.bio ? (
              <Text style={[styles.bio, { color: colors.text, fontFamily: FontFamily.ui }]}>{data.bio}</Text>
            ) : null}
            {data.badgeCount !== undefined ? (
              <Text style={{ color: colors.muted, fontFamily: FontFamily.ui }}>
                {data.badgeCount} badges · {data.favoriteCount ?? 0} favoris
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={{ color: colors.muted, fontFamily: FontFamily.ui }}>Profil inaccessible.</Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  name: { fontSize: 26 },
  bio: { fontSize: 15, lineHeight: 22 },
});
