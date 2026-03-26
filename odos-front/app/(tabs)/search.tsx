import { View, TextInput, StyleSheet, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { Search as SearchIcon, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { ApiActivity } from '@/types';
import { useSearchActivities } from '@/hooks/useSearchActivities';
import { Colors, Spacing } from '@/constants/theme';
import { toAppError } from '@/utils/errorHandling';

/** Helper: get the category display name from the API response */
const getCategoryName = (cat: ApiActivity['category']): string => {
  if (typeof cat === 'string') return cat;
  if (cat && typeof cat === 'object' && 'name' in cat) return cat.name;
  return '';
};

export default function SearchScreen() {
  const { searchQuery, setSearchQuery, filteredActivities, isLoading, error } = useSearchActivities();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const errorMessage = error ? toAppError(error, 'Impossible de charger les activites.').userMessage : null;

  const handleSearch = () => {
    if (searchQuery.trim() && !recentSearches.includes(searchQuery)) {
      setRecentSearches((prev) => [searchQuery, ...prev].slice(0, 5));
    }
  };

  const navigateToActivity = (id: number) => {
    router.push(`/activity/${id}`);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <View style={styles.searchContainer}>
        <SearchIcon color={Colors.light.muted} size={20} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher des activités..."
          placeholderTextColor={Colors.light.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {errorMessage && <Text style={styles.noResults}>{errorMessage}</Text>}
      {searchQuery ? (
        <FlatList
          data={filteredActivities}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable
              style={styles.resultItem}
              onPress={() => navigateToActivity(item.id)}
            >
              <Text style={styles.resultTitle}>{item.name}</Text>
              <View style={styles.resultDetails}>
                <Text style={styles.resultCategory}>{getCategoryName(item.category)}</Text>
                {item.city && (
                  <View style={styles.locationRow}>
                    <MapPin size={12} color={Colors.light.muted} />
                    <Text style={styles.resultCity}>{item.city}</Text>
                  </View>
                )}
              </View>
              <Text numberOfLines={2} style={styles.resultDescription}>
                {item.description}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.noResults}>Aucun résultat trouvé</Text>
          }
          contentContainerStyle={styles.resultsContainer}
        />
      ) : (

        <View style={styles.recentContainer}>
          <Text style={styles.sectionTitle}>Recherches récentes</Text>
          {recentSearches.length > 0 ? (
            recentSearches.map((search, index) => (
              <Pressable
                key={index}
                style={styles.recentItem}
                onPress={() => setSearchQuery(search)}
              >
                <SearchIcon size={16} color={Colors.light.muted} style={styles.recentIcon} />
                <Text style={styles.recentText}>{search}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.noRecent}>Aucune recherche récente</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: Spacing.lg,
    paddingTop: 25,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 16,
  },
  resultsContainer: {
    paddingBottom: 16,
  },
  resultItem: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  resultDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultCategory: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultCity: {
    fontSize: 13,
    color: Colors.light.muted,
  },
  resultDescription: {
    fontSize: 14,
    color: Colors.light.muted,
    lineHeight: 20,
  },
  noResults: {
    textAlign: 'center',
    fontSize: 16,
    color: Colors.light.muted,
    marginTop: 24,
  },
  recentContainer: {
    flex: 1,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  recentIcon: {
    marginRight: 12,
  },
  recentText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  noRecent: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: 24,
  },
});
