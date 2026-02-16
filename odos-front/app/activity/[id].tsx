import { View, Text, StyleSheet, Image, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Star, MapPin, Clock, ArrowLeft, Heart } from 'lucide-react-native';
import { useState } from 'react';

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

export default function ActivityDetails() {
  const { id } = useLocalSearchParams();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const activity = activities.find(a => a.id === id);

  if (!activity) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Activity not found</Text>
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

      <Pressable
        onPress={() => {
          setCurrentImageIndex((prev) => 
            prev === activity.images.length - 1 ? 0 : prev + 1
          );
        }}
      >
        <Image
          source={{ uri: activity.images[currentImageIndex] }}
          style={styles.image}
        />
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.title}>{activity.name}</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.ratingContainer}>
            <Star color="#f59e0b" size={16} />
            <Text style={styles.rating}>{activity.rating}</Text>
            <Text style={styles.reviews}>({activity.reviews} reviews)</Text>
          </View>
          <View style={styles.durationContainer}>
            <Clock color="#64748b" size={16} />
            <Text style={styles.duration}>{activity.duration}</Text>
          </View>
        </View>

        <View style={styles.addressContainer}>
          <MapPin color="#64748b" size={16} />
          <Text style={styles.address}>{activity.address}</Text>
        </View>

        <Text style={styles.price}>${activity.price} per person</Text>

        <Text style={styles.sectionTitle}>A propos de cette expérience</Text>
        <Text style={styles.description}>{activity.description}</Text>

        <Pressable style={styles.bookButton}>
          <Text style={styles.bookButtonText}>Réserver</Text>
        </Pressable>
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
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  backButton: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  favoriteButton: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: '#1e293b',
    marginLeft: 4,
    fontWeight: '500',
  },
  reviews: {
    color: '#64748b',
    marginLeft: 4,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duration: {
    color: '#64748b',
    marginLeft: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  address: {
    color: '#64748b',
    marginLeft: 8,
    flex: 1,
  },
  price: {
    fontSize: 20,
    color: '#3b82f6',
    fontWeight: 'bold',
    marginBottom: 20,
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
  bookButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 24,
  },
});
