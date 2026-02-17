import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { styles } from '@/app/(tabs)/styles';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useInterests } from '@/context/interestcontext';
import { useRouter } from 'expo-router';

export const interests = [
  'Histoire', 'Art', 'Cuisine', 'Shopping', 'Sport',
  'Architecture', 'Culture', 'Vie nocturne', 'Nature', 'Musique',
  'Festivals', 'Théâtre', 'Cinéma', 'Photographie', 'Street Art',
  'Science', 'Littérature', 'Vin', 'Luxe', 'Parcs',
  'Musées', 'Sculpture', 'Monuments', 'Artisanat local', 'Gastronomie',
  'Sites religieux', 'Centres commerciaux', 'Antiquités', 'Vignobles', 'Vélo'
];

const InterestsScreen = () => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const { setInterests } = useInterests();
  const { recommendations, loading, error } = useRecommendations(selectedInterests);
  const router = useRouter();

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      const newInterests = selectedInterests.filter(i => i !== interest);
      setSelectedInterests(newInterests);
      setInterests(newInterests);
    } else {
      if (selectedInterests.length < 7) {
        const newInterests = [...selectedInterests, interest];
        setSelectedInterests(newInterests);
        setInterests(newInterests);
      } else {
        Alert.alert('Limite atteinte', 'Sélectionner 7 intérêts maximum.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choisissez vos centres d&apos;intérêt</Text>

      <ScrollView contentContainerStyle={styles.interestContainer}>
        {interests.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.interestBubble,
              selectedInterests.includes(item) && styles.selectedBubble,
              index % 2 === 0 ? styles.oddBubble : styles.evenBubble,
            ]}
            onPress={() => toggleInterest(item)}
          >
            <Text style={styles.interestText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {

          router.replace('/');
        }}
        disabled={selectedInterests.length === 0}
      >
        <Text style={styles.buttonText}>Continuer</Text>
      </TouchableOpacity>
    </View>
  );
};

export default InterestsScreen;
