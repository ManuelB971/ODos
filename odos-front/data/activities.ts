export interface Activity {
  id: string;
  name: string;
  images: string[];
  price: number;
  rating: number;
  reviews: number;
  duration: string;
  address: string;
  category: string;
  description: string;
}

export const activities: Activity[] = [
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
      {
        id: '7',
        name: 'Balade à vélo électrique sur les berges',
        images: [
          'https://boutique.visiterlyon.com/media/catalog/product/cache/eba852a5c78b3a6cc0c2087b1359db88/m/o/mobilbaord-bike-circuit-2h-grand-tour-banniere.jpg',
          'https://cdn.getyourguide.com/img/tour/5db0391fe9a82.jpeg/98.jpg',
        ],
        price: 30,
        rating: 4.7,
        reviews: 80,
        duration: '2 heures',
        address: "Parc de la Tête d'Or, 69006 Lyon",
        category: 'Sport',
        description: 'Découvrez les plus beaux spots de Lyon à vélo électrique avec un guide local enthousiaste.',
      },
      {
        id: '8',
        name: 'Atelier de création de soie',
        images: [
          'https://maisondescanuts.fr/wp-content/uploads/2025/01/ambiance-22-scaled.jpg',
          'https://maisondescanuts.fr/wp-content/uploads/2025/03/fleurs-scaled.jpeg',
        ],
        price: 55,
        rating: 4.8,
        reviews: 66,
        duration: '2 heures',
        address: 'Croix-Rousse, 69004 Lyon',
        category: 'Artisanat',
        description: 'Apprenez les techniques ancestrales de la soierie lyonnaise dans un atelier traditionnel du quartier Croix-Rousse.',
      },
      {
        id: '9',
        name: "Séance de yoga au parc de la Tête d'Or",
        images: [
          'https://pandipandayoga.com/wp-content/uploads/2023/05/img_2851.jpeg',
          'https://pandipandayoga.com/wp-content/uploads/2023/05/img_2851.jpeg',
        ],
        price: 20,
        rating: 4.4,
        reviews: 43,
        duration: '1 heure',
        address: "Parc de la Tête d'Or, 69006 Lyon",
        category: 'Bien-être',
        description: 'Détendez-vous au grand air avec une séance de yoga guidée dans le plus grand parc de Lyon.',
      },
      {
        id: '10',
        name: 'Street art tour à la Croix-Rousse',
        images: [
          'https://www.lyon-visite.info/wp-content/uploads/2019/08/toto_ld-spiderlyon-street-art-lyon-visite-1200.jpg',
          'https://www.lyon-visite.info/wp-content/uploads/2024/05/Street-art-Marie-Garnier-2-1024x1024.jpeg',
        ],
        price: 18,
        rating: 4.6,
        reviews: 58,
        duration: '1.5 heures',
        address: 'Boulevard de la Croix-Rousse, 69004 Lyon',
        category: 'Culture',
        description: 'Partez à la découverte des fresques murales et œuvres de street art emblématiques de la Croix-Rousse.',
      },
];

export const interestToCategoryMap: Record<string, string[]> = {
  'Histoire': ['Culture', 'Aventure'],
  'Art': ['Culture'],
  'Cuisine': ['Gastronomie'],
  'Shopping': ['Shopping'],
  'Sport': ['Sport', 'Aventure'],
  'Architecture': ['Culture'],
  'Culture': ['Culture'],
  'Vie nocturne': ['Détente'],
  'Nature': ['Détente', 'Aventure'],
  'Musique': ['Culture', 'Détente'],
  'Festivals': ['Culture', 'Détente'],
  'Théâtre': ['Culture'],
  'Cinéma': ['Culture'],
  'Photographie': ['Culture', 'Aventure'],
  'Street Art': ['Culture'],
  'Science': ['Culture'],
  'Littérature': ['Culture'],
  'Vin': ['Gastronomie', 'Détente'],
  'Luxe': ['Shopping', 'Gastronomie'],
  'Parcs': ['Détente', 'Nature'],
  'Musées': ['Culture'],
  'Sculpture': ['Culture'],
  'Monuments': ['Culture'],
  'Artisanat local': ['Culture', 'Shopping'],
  'Gastronomie': ['Gastronomie'],
  'Sites religieux': ['Culture'],
  'Centres commerciaux': ['Shopping'],
  'Antiquités': ['Culture', 'Shopping'],
  'Vignobles': ['Gastronomie', 'Détente'],
  'Vélo': ['Sport', 'Aventure']
};

export const getActivityById = (id: string): Activity | undefined => {
  return activities.find(activity => activity.id === id);
};

export const getActivitiesByCategory = (category: string): Activity[] => {
  return activities.filter(activity => activity.category === category);
};
