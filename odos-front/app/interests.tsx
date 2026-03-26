import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { styles } from '@/app/(tabs)/styles';
import { useInterests } from '@/context/InterestContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { fetchCategories, updateUserInterests } from '@/scripts/api';
import { Category } from '@/types';
import { Colors } from '@/constants/theme';
import { logError } from '@/utils/errorHandling';

const InterestsScreen = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { setInterests } = useInterests();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((err) => logError('Interests.fetchCategories', err))
      .finally(() => setLoading(false));
  }, []);

  const toggleInterest = (cat: Category) => {
    if (selectedIds.includes(cat.id)) {
      setSelectedIds((prev) => prev.filter((id) => id !== cat.id));
    } else {
      if (selectedIds.length < 7) {
        setSelectedIds((prev) => [...prev, cat.id]);
      } else {
        Alert.alert('Limite atteinte', 'Sélectionner 7 intérêts maximum.');
      }
    }
  };

  const handleContinue = async () => {
    // Update local context with category names for display
    const selectedNames = categories
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => c.name);
    setInterests(selectedNames);

    // Save to backend if authenticated
    if (user?.id) {
      setSaving(true);
      try {
        const iris = selectedIds.map((id) => `/api/categories/${id}`);
        await updateUserInterests(user.id, iris);
      } catch (err) {
        logError('Interests.updateUserInterests', err, { userId: user.id });
        // Non bloquant : on continue quand même
      } finally {
        setSaving(false);
      }
    }

    router.replace('/');
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choisissez vos centres d&apos;intérêt</Text>

      <ScrollView contentContainerStyle={styles.interestContainer}>
        {categories.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.interestBubble,
              selectedIds.includes(item.id) && styles.selectedBubble,
              index % 2 === 0 ? styles.oddBubble : styles.evenBubble,
            ]}
            onPress={() => toggleInterest(item)}
          >
            <Text style={styles.interestText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.button}
        onPress={handleContinue}
        disabled={selectedIds.length === 0 || saving}
      >
        <Text style={styles.buttonText}>
          {saving ? 'Enregistrement...' : 'Continuer'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default InterestsScreen;
