import { View, Text, ScrollView, StyleSheet, Image, Pressable, FlatList, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Star, MapPin } from 'lucide-react-native';
import { Link } from 'expo-router';
import { useInterests } from '../context/interestcontext';
import { ActivityIndicator } from 'react-native';
import { useRecommendations } from '@/hooks/useRecommendations';

const activities = [
  {
    id: '1',
    name: 'Chasse au trésor dans le Vieux Lyon',
    images: [
      'https://res.cloudinary.com/funbooker/image/upload/ar_4:3,c_fill,dpr_auto,f_auto,q_auto,w_900/v1/marketplace-listing/d67qhnutcu0luguvivhw',
      'https://res.cloudinary.com/funbooker/image/upload/ar_4:3,c_fill,dpr_auto,f_auto,q_auto,w_900/v1/marketplace-listing/tmmvejdyuxspyiigphta',
    ],
    price: 89,
    rating: 4.9,
    reviews: 128,
    duration: '3 heures',
    address: 'Place Saint-Jean, 69005 Lyon',
    category: 'Aventure',
    description: "Explorez les traboules et ruelles secrètes du Vieux Lyon à travers une chasse au trésor interactive pleine de mystères et d'énigmes.",
  },
  {
    id: '2',
    name: 'Atelier de fabrication de pralines roses',
    images: [
      'https://chefsquare.fr/media/catalog/product/cache/ba664c13fa4d9dee95ca9c0cf96f6c50/p/r/praline-rose_base4.jpg',
      'https://chefsquare.fr/media/catalog/product/cache/087d549c2b4579daf25a5e588756a955/p/r/praline-rose_base2.jpg',
    ],
    price: 39,
    rating: 4.8,
    reviews: 75,
    duration: '2 heures',
    address: 'Cours Lafayette, 69003 Lyon',
    category: 'Gastronomie',
    description: 'Apprenez à réaliser la célèbre spécialité lyonnaise : les pralines roses. Repartez avec vos créations sucrées à déguster chez vous !',
  },
  {
    id: '3',
    name: 'Croisière apéritive sur la Saône',
    images: [
      'https://res.cloudinary.com/funbooker/image/upload/ar_4:3,c_fill,dpr_auto,f_auto,q_auto,w_900/v1/marketplace-listing/zejjoqmi8nm50skovipt',
      'https://res.cloudinary.com/funbooker/image/upload/ar_4:3,c_fill,dpr_auto,f_auto,q_auto,w_900/v1/marketplace-listing/roxcrlay3la8kwcomhdl',
    ],
    price: 49,
    rating: 4.7,
    reviews: 110,
    duration: '1.5 heures',
    address: 'Quai Rambaud, 69002 Lyon',
    category: 'Détente',
    description: "Profitez d'un apéro convivial à bord d'un bateau tout en découvrant Lyon depuis la Saône au coucher du soleil.",
  },
  {
    id: '4',
    name: 'Visite guidée des traboules du Vieux Lyon',
    images: [
      'https://www.visiterlyon.com/var/site/storage/images/1/3/9/5/395931-3-fre-FR/81584ae3d2e3-Trabouble-vieux-lyon_J-V-L-10_07_2021-credit-briceROBERT-97_1920.jpg',
      'https://images.unsplash.com/photo-1581596541382-b2b08a112ee2?w=800https://www.visiterlyon.com/var/site/storage/images/2/4/8/7/767842-1-fre-FR/9e61a8948074-Maison-du-chamarier-2329-copyright-ONLYLYON-Tourisme-et-Congres_Tristan-Deschamps.jpg',
    ],
    price: 15,
    rating: 4.9,
    reviews: 200,
    duration: '2 heures',
    address: 'Cathédrale Saint-Jean, 69005 Lyon',
    category: 'Culture',
    description: "Découvrez l'histoire fascinante de Lyon à travers ses célèbres traboules accompagnés d'un guide passionné.",
  },
  {
    id: '5',
    name: 'Cours de cuisine bouchon lyonnais',
    images: [
      'https://chefsquare.com/media/catalog/product/cache/087d549c2b4579daf25a5e588756a955/c/u/cuisine-traditionnelle-lyonnaise_base1.jpg',
      'https://chefsquare.com/media/catalog/product/cache/087d549c2b4579daf25a5e588756a955/c/u/cuisine-traditionnelle-lyonnaise_base2.jpg',
    ],
    price: 65,
    rating: 4.6,
    reviews: 68,
    duration: '3 heures',
    address: 'Rue Mercière, 69002 Lyon',
    category: 'Gastronomie',
    description: "Participez à un atelier culinaire pour apprendre à cuisiner les classiques lyonnais comme la quenelle ou l'andouillette.",
  },
  {
    id: '6',
    name: 'Escape Game sur la Résistance',
    images: [
      'https://whereez.com/media/cache/product_carousel_webp/uploads/images/product/escape-game-outdoor-a-la-croix-rousse-rejoignez-la-resistance/escape-game-outdoor-a-la-croix-rousse-rejoignez-la-resistance-0-67a6601337019691622140.webp',
      'https://whereez.com/media/cache/product_carousel_webp/uploads/images/product/escape-game-outdoor-a-la-croix-rousse-rejoignez-la-resistance/escape-game-outdoor-a-la-croix-rousse-rejoignez-la-resistance-2-67a660133815d256834859.webp',
    ],
    price: 25,
    rating: 4.5,
    reviews: 91,
    duration: '1 heure',
    address: 'Rue Sainte-Hélène, 69002 Lyon',
    category: 'Aventure',
    description: "Vivez une expérience immersive en tentant d'échapper à la Gestapo dans un scénario historique captivant.",
  },
];

export default function HomeScreen() {
  const { interests } = useInterests();
  const { recommendations, loading, error } = useRecommendations(interests);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.welcomeText}>Bienvenue sur ODOS</Text>
        
        <View style={styles.recommendationsContainer}>
          <Text style={styles.recommendationsTitle}>Recommandations</Text>
          
          {loading && <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />}
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          {!loading && !error && (
            <FlatList
              data={recommendations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Link href={`/activity/${item.id}`} asChild>
                  <Pressable style={styles.activityCard}>
                    <Image source={{ uri: item.images[0] }} style={styles.activityImage} />
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName}>{item.name}</Text>
                      <Text style={styles.activityCategory}>{item.category}</Text>
                      <View style={styles.ratingContainer}>
                        <Star size={12} color="#FF9529" />
                        <Text style={styles.activityRating}>{item.rating}</Text>
                      </View>
                    </View>
                  </Pressable>
                </Link>
              )}
              scrollEnabled={false}
              numColumns={1}
            />
          )}
        </View>
        
        <View style={styles.activitiesSection}>
          <Text style={styles.sectionTitle}>Toutes les activités</Text>
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Link href={`/activity/${item.id}`} asChild>
                <Pressable style={styles.activityCard}>
                  <Image source={{ uri: item.images[0] }} style={styles.activityImage} />
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName}>{item.name}</Text>
                    <Text style={styles.activityCategory}>{item.category}</Text>
                    <View style={styles.ratingContainer}>
                      <Star size={12} color="#FF9529" />
                      <Text style={styles.activityRating}>{item.rating}</Text>
                    </View>
                  </View>
                </Pressable>
              </Link>
            )}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 25,
    paddingBottom: 100,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f4a261',
    marginBottom: 24,
    textAlign: 'center',
  },
  recommendationsContainer: {
    marginBottom: 32,
  },
  recommendationsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  loader: {
    marginVertical: 20,
  },
  errorText: {
    color: '#ef4444',
    marginVertical: 10,
    textAlign: 'center',
  },
  activitiesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  activityCard: {
    marginBottom: 16,
    borderRadius: 12,
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
    height: 200,
  },
  activityInfo: {
    padding: 12,
  },
  activityName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activityCategory: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityRating: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9529',
  },
});
