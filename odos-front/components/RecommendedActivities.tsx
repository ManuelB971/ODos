import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useInterests } from '@/context/InterestContext';
import { useRecommendations } from '@/hooks/useRecommendations';
import { ApiActivity } from '@/types';
import { resolveImageUrl } from '@/utils/imageUrl';

interface RecommendedActivitiesProps {
  title?: string;
}

/** Helper: map category from API (Category | string) to displayable name */
const getCategoryName = (cat: ApiActivity['category']): string => {
  if (typeof cat === 'string') return cat;
  if (cat && typeof cat === 'object' && 'name' in cat) return cat.name;
  return '';
};

export const RecommendedActivities = ({ title = 'Recommandé pour vous' }: RecommendedActivitiesProps) => {
  const { interests } = useInterests();
  const { recommendations, loading, error } = useRecommendations(interests);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={recommendations}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Link href={`/activity/${item.id}`} asChild>
            <TouchableOpacity style={styles.activityCard}>
              {(() => {
                const resolved = resolveImageUrl(item.imageUrl);
                return resolved ? (
                  <Image
                    source={{ uri: resolved }}
                    style={styles.activityImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.activityImagePlaceholder} />
                );
              })()}
              <View style={styles.activityInfo}>
                <Text style={styles.activityName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.activityCategory}>{getCategoryName(item.category)}</Text>
                {typeof item.price === 'number' ? (
                  <Text style={styles.activityPrice}>{item.price} €</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          </Link>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginLeft: 10,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 10,
  },
  errorText: {
    color: 'red',
  },
  activityCard: {
    width: 220,
    marginHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  activityImage: {
    width: '100%',
    height: 130,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  activityImagePlaceholder: {
    width: '100%',
    height: 130,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  activityInfo: {
    padding: 12,
  },
  activityName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  activityCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  activityPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
});
export default RecommendedActivities;