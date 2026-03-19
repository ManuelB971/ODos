import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MapPin, ArrowLeft, Heart } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import api from '@/scripts/api';
import { ApiActivity } from '@/types';

/** Helper: get the category display name from the API response */
const getCategoryName = (cat: ApiActivity['category']): string => {
  if (typeof cat === 'string') return cat;
  if (cat && typeof cat === 'object' && 'name' in cat) return cat.name;
  return '';
};

export default function ActivityDetails() {
  const { id } = useLocalSearchParams();
  const [activity, setActivity] = useState<ApiActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/api/activities/${id}`)
      .then((res) => setActivity(res.data))
      .catch((err) => {
        console.error('[ActivityDetails] Erreur:', err);
        setError("Impossible de charger l'activité.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error || !activity) {
    return (
      <View style={styles.container}>
        <Pressable style={styles.backButtonStandalone} onPress={() => router.back()}>
          <ArrowLeft color="#1e293b" size={24} />
        </Pressable>
        <Text style={styles.errorText}>{error ?? 'Activité introuvable'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#1e293b" size={24} />
        </Pressable>
        <Pressable style={styles.favoriteButton}>
          <Heart color="#3b82f6" size={24} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{activity.name}</Text>

        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{getCategoryName(activity.category)}</Text>
        </View>

        {activity.city && (
          <View style={styles.addressContainer}>
            <MapPin color="#64748b" size={16} />
            <Text style={styles.address}>{activity.city}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>À propos de cette expérience</Text>
        <Text style={styles.description}>{activity.description}</Text>

        {(activity.latitude && activity.longitude) && (
          <View style={styles.coordsContainer}>
            <MapPin color="#3b82f6" size={14} />
            <Text style={styles.coordsText}>
              {activity.latitude.toFixed(4)}, {activity.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
  },
  backButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonStandalone: {
    padding: 16,
    paddingTop: 48,
  },
  favoriteButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  address: {
    color: '#64748b',
    marginLeft: 8,
    flex: 1,
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 24,
  },
  coordsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  coordsText: {
    fontSize: 13,
    color: '#64748b',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 24,
  },
});
