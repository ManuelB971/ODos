/**
 * Ancien style **Google Maps** (JSON tableau pour `customMapStyle` sur react-native-maps).
 * L’app mobile utilise désormais **MapLibre** — voir `constants/maplibreStyle.ts`;
 * ce fichier est conservé comme référence si tu dois recréer une esthétique proche sous Maputnik / MapLibre.
 *
 * Principes :
 * - Carte **très claire**, peu de bruit visuel (routes fines, peu de labels).
 * - Eau teintée turquoise douce (#5fc2d8 à 25 %) pour rappeler l'identité.
 * - POIs génériques cachés : on ne garde que nos propres markers.
 *
 * Anciennement : `<MapView customMapStyle={odosMapStyle} />` (Google).
 *
 * Réf. : https://developers.google.com/maps/documentation/ios-sdk/styling
 */
export const odosMapStyle = [
  // Fond général : blanc cassé très doux
  { elementType: 'geometry', stylers: [{ color: '#fafafa' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },

  // POIs : on masque les pins Google (restaurants, gares, etc.) pour laisser place à nos markers
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e8f5e9' }, { visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },

  // Transit : caché pour la discrétion
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  // Routes : fines et peu saturées
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#eceff1' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },

  // Pays / admin : discrets
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e0e0e0' }, { weight: 0.5 }],
  },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b7280' }],
  },

  // Paysages naturels
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#f1f5f9' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },

  // Eau : teinte turquoise ODOS
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d6eef4' }] },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5fc2d8' }],
  },
];
