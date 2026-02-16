import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useInterests } from '@/app/context/interestcontext';
import { useRecommendations } from '@/hooks/useRecommendations';

interface RecommendedActivitiesProps {
  title?: string;
}

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
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={`/activity/${item.id}`} asChild>
            <TouchableOpacity style={styles.activityCard}>
              <Image 
                source={{ uri: item.images[0] }} 
                style={styles.activityImage} 
                resizeMode="cover"
              />
              <View style={styles.activityInfo}>
                <Text style={styles.activityName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.activityCategory}>{item.category}</Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.activityRating}>{item.rating}★</Text>
                  <Text style={styles.reviewCount}>({item.reviews} avis)</Text>
                </View>
                <Text style={styles.activityPrice}>{item.price} €</Text>
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  activityRating: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9529',
    marginRight: 5,
  },
  reviewCount: {
    fontSize: 11,
    color: '#999',
  },
  activityPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
});
export default RecommendedActivities;