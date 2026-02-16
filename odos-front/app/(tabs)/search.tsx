import { View, TextInput, StyleSheet, ScrollView, Text, Pressable, FlatList } from 'react-native';
import { Search as SearchIcon } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { activities, Activity } from '../data/activities';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const filteredActivities = activities.filter(activity =>
    activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = () => {
    if (searchQuery.trim() && !recentSearches.includes(searchQuery)) {
      setRecentSearches(prev => [searchQuery, ...prev].slice(0, 5));
    }
  };

  const navigateToActivity = (id: string) => {
    router.push(`/activity/${id}`);
  };

  return (
    <View style={styles.container}>
    
      <View style={styles.searchContainer}>
        <SearchIcon color="#64748b" size={20} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher des activités..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {searchQuery ? (
        <FlatList
          data={filteredActivities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable 
              style={styles.resultItem}
              onPress={() => navigateToActivity(item.id)}
            >
              <Text style={styles.resultTitle}>{item.name}</Text>
              <View style={styles.resultDetails}>
                <Text style={styles.resultCategory}>{item.category}</Text>
                <Text style={styles.resultPrice}>{item.price} €</Text>
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
                <SearchIcon size={16} color="#64748b" style={styles.recentIcon} />
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
    backgroundColor: '#ffffff',
    padding: 16,
    paddingTop: 25,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#1e293b',
    fontSize: 16,
  },
  resultsContainer: {
    paddingBottom: 16,
  },
  resultItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  resultDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultCategory: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  resultPrice: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  resultDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  noResults: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748b',
    marginTop: 24,
  },
  recentContainer: {
    flex: 1,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  recentIcon: {
    marginRight: 12,
  },
  recentText: {
    fontSize: 16,
    color: '#1e293b',
  },
  noRecent: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
  },
});
