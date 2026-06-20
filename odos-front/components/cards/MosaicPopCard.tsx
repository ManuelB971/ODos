import React, { useMemo } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Link } from 'expo-router';
import { Heart, MapPin } from 'lucide-react-native';

import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { ApiActivity } from '@/types';
import { resolveImageUrl } from '@/utils/imageUrl';
import { Meander, TesseraGrid } from './GreekMotifs';

/**
 * Direction « Mosaïque pop » (sans olivier).
 * Photo sertie de tesselles terracotta + ossature pop (contour encre + ombre dure)
 * + bandeau méandre grec + note en tuile claire. Les couleurs viennent du thème
 * actif (encre = `text`, papier = `elevated`, terracotta = `accent`), donc la
 * direction se superpose proprement au thème de base, en clair comme en sombre.
 */

const OUTLINE = 2.5;
const RADIUS = 10;
const CARD_SHADOW = 7;
const ROW_SHADOW = 5;
const BAND_H = 13;
// Mêmes dimensions que les cartes classiques (RecommendationCard width 250,
// image ~155) pour que la taille soit identique en mosaïque et en classique.
const CARD_W = 250;
const PHOTO_H = 150;

/** Accents par catégorie — uniquement les tokens DA officiels (orange, teal, bleu, terracotta). */
const CATEGORY_ACCENTS = ['#F4A261', '#5FC2D8', '#3B82F6', '#E07D3A'];
function getCategoryAccent(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return CATEGORY_ACCENTS[Math.abs(h) % CATEGORY_ACCENTS.length];
}

function getCategoryName(cat: ApiActivity['category']): string {
  if (typeof cat === 'string') return cat;
  if (cat && typeof cat === 'object' && 'name' in cat) return cat.name;
  return '';
}

function formatPrice(price: number | null | undefined): string {
  if (price == null) return '';
  if (price === 0) return 'Gratuit';
  return `À partir de ${Math.round(price)}€`;
}

type MosaicTokens = {
  ink: string;
  paper: string;
  surface: string;
  terra: string;
  muted: string;
};

function useMosaicTokens(): MosaicTokens {
  const colors = useOdosColors();
  return useMemo(
    () => ({
      ink: colors.text,
      paper: colors.elevated,
      surface: colors.surface,
      terra: colors.accentHover,
      muted: colors.muted,
    }),
    [colors],
  );
}

/** Note en tuile claire (tessère) : papier + double liseré accent / encre. */
function Tessera({
  value,
  t,
  accent,
  small = false,
  style,
}: {
  value: number;
  t: MosaicTokens;
  accent: string;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const dim = small ? 26 : 36;
  return (
    <View style={[styles.tesseraOuter, { borderColor: t.ink }, style]}>
      <View
        style={[
          styles.tesseraInner,
          { borderColor: accent, backgroundColor: t.paper, width: dim, height: dim },
        ]}
      >
        <Text style={[styles.tesseraNum, { color: t.ink, fontSize: small ? 11 : 14 }]}>
          {value.toFixed(1)}
        </Text>
      </View>
    </View>
  );
}

/* ============================ Carte (carrousel) ============================ */

export function MosaicPopCard({
  item,
  variant = 'carousel',
  isFavorite,
  onToggleFavorite,
}: {
  item: ApiActivity;
  /**
   * `carousel` : largeur fixe (scroll horizontal).
   * `grid` : flex 1, photo carrée (colonne 2 cols, compacte).
   * `featured` : pleine largeur (hero « incontournable »).
   */
  variant?: 'carousel' | 'grid' | 'featured';
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const t = useMosaicTokens();
  const img = resolveImageUrl(item.imageUrl);
  const cat = getCategoryName(item.category);
  const accent = getCategoryAccent(cat);
  const rating = item.ratingAverage;
  // Variante grille (favoris, 2 colonnes) : plus compacte que le carrousel.
  const isGrid = variant === 'grid';
  const isFeatured = variant === 'featured';
  const shadow = isGrid ? 4 : CARD_SHADOW;

  return (
    <Link href={`/activity/${item.id}`} asChild>
      <Pressable
        style={[
          styles.cardWrap,
          isGrid ? styles.cardWrapGrid : isFeatured ? styles.cardWrapFeatured : styles.cardWrapCarousel,
        ]}
      >
        {/* Ombre dure décalée (rendu net cross-platform via un calque encre) */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.hardShadow,
            { backgroundColor: t.ink, borderRadius: RADIUS, transform: [{ translateX: shadow }, { translateY: shadow }] },
          ]}
        />
        <View style={[styles.card, { backgroundColor: t.paper, borderColor: t.ink }]}>
          {/* Photo sertie de tesselles */}
          <View style={[styles.frame, isGrid && styles.frameGrid, { backgroundColor: accent, borderBottomColor: t.ink }]}>
            <TesseraGrid color={t.paper} />
            <View
              style={[
                styles.photoWrap,
                isGrid ? styles.photoWrapGrid : isFeatured ? styles.photoWrapFeatured : styles.photoWrapCarousel,
                { borderColor: t.ink },
              ]}
            >
              {img ? (
                <Image source={{ uri: img }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={[styles.photo, { backgroundColor: t.surface }]} />
              )}
            </View>
            {rating != null && rating > 0 ? (
              <Tessera value={rating} t={t} accent={accent} small={isGrid} style={styles.cardTessera} />
            ) : null}
            {onToggleFavorite ? (
              <Pressable
                onPress={onToggleFavorite}
                hitSlop={8}
                style={[styles.heartBtn, { backgroundColor: t.paper, borderColor: t.ink }]}
                accessibilityRole="button"
                accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Heart
                  size={15}
                  color={isFavorite ? '#E0245E' : t.muted}
                  fill={isFavorite ? '#E0245E' : 'transparent'}
                />
              </Pressable>
            ) : null}
          </View>

          {/* Bandeau méandre (masqué en grille pour gagner de la hauteur) */}
          {!isGrid ? (
            <View style={[styles.band, { backgroundColor: accent, borderBottomColor: t.ink }]}>
              <Meander color={t.ink} height={BAND_H} />
            </View>
          ) : null}

          {/* Corps */}
          <View style={[styles.body, isGrid && styles.bodyGrid]}>
            {cat ? (
              <View style={[styles.catPill, { backgroundColor: accent, borderColor: t.ink }]}>
                <Text style={[styles.catText, { color: t.ink }]} numberOfLines={1}>
                  {cat.toUpperCase()}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.title, isGrid && styles.titleGrid, { color: t.ink }]} numberOfLines={2}>
              {item.name}
            </Text>
            {item.city ? (
              <View style={styles.meta}>
                <MapPin size={12} color={t.muted} />
                <Text style={[styles.metaText, { color: t.muted }]} numberOfLines={1}>
                  {item.city}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

/* ============================ Ligne (liste) ============================ */

export function MosaicPopRow({ item }: { item: ApiActivity }) {
  const t = useMosaicTokens();
  const img = resolveImageUrl(item.imageUrl);
  const cat = getCategoryName(item.category);
  const accent = getCategoryAccent(cat);
  const rating = item.ratingAverage;
  const priceLabel = formatPrice(item.price);

  return (
    <Link href={`/activity/${item.id}`} asChild>
      <Pressable style={styles.rowWrap}>
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.hardShadow,
            { backgroundColor: t.ink, borderRadius: RADIUS, transform: [{ translateX: ROW_SHADOW }, { translateY: ROW_SHADOW }] },
          ]}
        />
        <View style={[styles.row, { backgroundColor: t.paper, borderColor: t.ink }]}>
          {/* Vignette sertie de tesselles */}
          <View style={[styles.thumb, { backgroundColor: accent, borderColor: t.ink }]}>
            <TesseraGrid color={t.paper} />
            <View style={[styles.thumbPhotoWrap, { borderColor: t.ink }]}>
              {img ? (
                <Image source={{ uri: img }} style={styles.thumbPhoto} resizeMode="cover" />
              ) : (
                <View style={[styles.thumbPhoto, { backgroundColor: t.surface }]} />
              )}
            </View>
            {rating != null && rating > 0 ? (
              <Tessera value={rating} t={t} accent={accent} small style={styles.rowTessera} />
            ) : null}
          </View>

          {/* Infos */}
          <View style={styles.rowInfo}>
            <View style={styles.rowTop}>
              <Text style={[styles.rowCat, { color: t.terra }]} numberOfLines={1}>
                {cat.toUpperCase()}
              </Text>
              {priceLabel ? (
                <Text style={[styles.rowPrice, { color: t.terra }]} numberOfLines={1}>
                  {priceLabel}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.rowName, { color: t.ink }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.city ? (
              <View style={styles.meta}>
                <MapPin size={11} color={t.muted} />
                <Text style={[styles.metaText, { color: t.muted }]} numberOfLines={1}>
                  {item.city}
                </Text>
              </View>
            ) : null}
            {item.description ? (
              <Text style={[styles.rowDesc, { color: t.muted }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  // ---- card ----
  cardWrap: {
    marginBottom: CARD_SHADOW + 4,
  },
  cardWrapCarousel: {
    width: CARD_W,
    marginRight: 14 + CARD_SHADOW,
  },
  cardWrapGrid: {
    flex: 1,
    marginRight: 4,
    marginBottom: 8,
  },
  // Hero pleine largeur : la carte s'étire au parent, marge droite réservée à l'ombre dure.
  cardWrapFeatured: {
    marginRight: CARD_SHADOW,
  },
  heartBtn: {
    position: 'absolute',
    top: 9,
    right: 9,
    zIndex: 5,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hardShadow: {
    // backing layer translated to fake a crisp offset shadow on every platform
  },
  card: {
    borderWidth: OUTLINE,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  frame: {
    padding: 7,
    borderBottomWidth: OUTLINE,
    position: 'relative',
  },
  frameGrid: {
    padding: 6,
  },
  photoWrap: {
    width: '100%',
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  // Carrousel : hauteur fixe (≈ classique 155) → totalement déterministe.
  photoWrapCarousel: {
    height: PHOTO_H,
  },
  // Grille favoris / recherche : photo carrée → cartes plus compactes (la photo
  // ne fait plus gonfler la carte en hauteur comme l'ancien portrait 4/5).
  photoWrapGrid: {
    aspectRatio: 1,
  },
  // Hero « incontournable » : pleine largeur, proportion paysage proche du hero classique.
  photoWrapFeatured: {
    aspectRatio: 16 / 10,
  },
  // Image en absolu : elle ne participe pas au calcul de taille du parent, sinon
  // `height: '100%'` + `aspectRatio` entrent en conflit sous Fabric et la carte
  // gonfle pour remplir tout l'espace. Le parent se dimensionne seul via aspectRatio.
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardTessera: {
    top: 9,
    left: 9,
  },
  band: {
    borderBottomWidth: OUTLINE,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  body: {
    padding: 11,
    paddingTop: 10,
  },
  bodyGrid: {
    padding: 10,
    paddingTop: 8,
  },
  catPill: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginBottom: 7,
  },
  catText: {
    fontSize: 9.5,
    fontFamily: FontFamily.uiBold,
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: 17,
    lineHeight: 20,
    marginBottom: 4,
  },
  titleGrid: {
    fontSize: 14,
    lineHeight: 17,
    marginBottom: 3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: FontFamily.uiMedium,
  },

  // ---- tessera ----
  tesseraOuter: {
    position: 'absolute',
    zIndex: 4,
    borderWidth: 2,
  },
  tesseraInner: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tesseraNum: {
    fontFamily: FontFamily.uiBold,
  },

  // ---- row ----
  rowWrap: {
    marginBottom: 12 + ROW_SHADOW,
    marginRight: ROW_SHADOW,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    borderWidth: OUTLINE,
    borderRadius: RADIUS,
    padding: 9,
  },
  thumb: {
    position: 'relative',
    width: 80,
    padding: 5,
    borderWidth: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  thumbPhotoWrap: {
    width: '100%',
    borderWidth: 2,
    aspectRatio: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbPhoto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  rowTessera: {
    left: 8,
    bottom: 8,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  rowCat: {
    fontSize: 9,
    fontFamily: FontFamily.uiBold,
    letterSpacing: 1.2,
    flexShrink: 1,
  },
  rowPrice: {
    fontSize: 11,
    fontFamily: FontFamily.uiBold,
  },
  rowName: {
    fontFamily: FontFamily.display,
    fontSize: 16,
    lineHeight: 19,
    marginBottom: 3,
  },
  rowDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: FontFamily.ui,
    marginTop: 3,
  },
});
