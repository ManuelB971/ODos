import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MapPin, ArrowLeft, Heart, Navigation, CircleCheck, Share2 } from 'lucide-react-native';
import { DaIcon } from '@/components/ui/DaIcon';
import { useMemo, useState, useEffect, useRef } from 'react';
import { CTAButton } from '@/components/ui/CTAButton';
import { Skeleton } from '@/components/ui/Skeleton';
import api, {
  fetchFavoriteIds,
  toggleFavoriteActivity,
  fetchVisitedIds,
  toggleVisitedActivity,
  fetchActivityRating,
  putActivityRating,
  deleteActivityRating,
  fetchActivityComments,
  postActivityComment,
  patchActivityComment,
  deleteActivityComment,
  postGamificationEvent,
} from '@/scripts/api';
import { ActivityCommentsSection } from '@/components/comments/ActivityCommentsSection';
import { useBadgeUnlock } from '@/context/BadgeUnlockContext';
import { BADGES_QUERY_KEY } from '@/hooks/useBadges';
import type { BadgeItem } from '@/types';
import { ApiActivity } from '@/types';
import { FontFamily, Spacing } from '@/constants/theme';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';
import { logError, toAppError, AppError } from '@/utils/errorHandling';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { resolveImageUrl } from '@/utils/imageUrl';
import { InlineToast, InlineToastVariant } from '@/components/InlineToast';
import { ShareModal } from '@/components/social/ShareModal';

function routeParamToString(param: string | string[] | undefined): string | undefined {
  if (param === undefined) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

const getCategoryName = (cat: ApiActivity['category']): string => {
  if (typeof cat === 'string') return cat;
  if (cat && typeof cat === 'object' && 'name' in cat) return cat.name;
  return '';
};

type ToastState = {
  variant: InlineToastVariant;
  message: string;
  retryAfterSeconds?: number;
  retry?: () => void;
};

/**
 * Convertit une erreur axios en {@link ToastState} prêt à afficher.
 *
 * Distingue le cas 429 (rate-limit anti-abus) — auquel cas on propose un
 * compte à rebours + un bouton "Réessayer" — des erreurs génériques.
 */
function buildToast(
  err: unknown,
  fallback: string,
  retry?: () => void
): ToastState {
  const appError: AppError = toAppError(err, fallback);
  if (appError.code === 'RATE_LIMITED') {
    return {
      variant: 'warning',
      message: appError.userMessage,
      retryAfterSeconds: appError.retryAfterSeconds,
      retry,
    };
  }
  return {
    variant: 'error',
    message: appError.userMessage,
    retry,
  };
}

function StarsDisplay({ value, max = 5 }: { value: number; max?: number }) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const full = Math.round(value);
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: max }, (_, i) => (
        <DaIcon
          key={`star-${i}`}
          name="etoile"
          variant="rating"
          opacity={i < full ? 1 : 0.28}
          accessibilityLabel={i < full ? 'Étoile pleine' : 'Étoile vide'}
        />
      ))}
    </View>
  );
}

export default function ActivityDetails() {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams();
  const { isAuthenticated, user } = useAuth();
  const [activity, setActivity] = useState<ApiActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [ratingToast, setRatingToast] = useState<ToastState | null>(null);
  const [commentToast, setCommentToast] = useState<ToastState | null>(null);
  const [shareVisible, setShareVisible] = useState(false);
  const queryClient = useQueryClient();
  const { mergeUnlocked } = useBadgeUnlock();
  const scrollRef = useRef<ScrollView>(null);
  const idFromRoute = routeParamToString(id as string | string[] | undefined);
  const activityIdFromRoute = Number.parseInt(String(idFromRoute ?? ''), 10);
  const activityId =
    activity?.id ??
    (Number.isFinite(activityIdFromRoute) && activityIdFromRoute > 0 ? activityIdFromRoute : NaN);

  const favoriteIdsQuery = useQuery<number[]>({
    queryKey: ['favoriteIds'],
    queryFn: fetchFavoriteIds,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: 1,
  });

  const visitedIdsQuery = useQuery<number[]>({
    queryKey: ['visitedIds'],
    queryFn: fetchVisitedIds,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: 1,
  });

  const ratingQuery = useQuery({
    queryKey: ['activityRating', activityId],
    queryFn: () => fetchActivityRating(activityId),
    enabled: Number.isFinite(activityId) && activityId > 0,
    staleTime: 1000 * 30,
  });

  const commentsQuery = useQuery({
    queryKey: ['activityComments', activityId],
    queryFn: () => fetchActivityComments(activityId, 1),
    enabled: Number.isFinite(activityId) && activityId > 0,
    staleTime: 1000 * 20,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ targetActivityId, currentlyFavorite }: { targetActivityId: number; currentlyFavorite: boolean }) =>
      toggleFavoriteActivity(targetActivityId, currentlyFavorite),
    onMutate: async ({ targetActivityId, currentlyFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['favoriteIds'] });
      const previous = queryClient.getQueryData<number[]>(['favoriteIds']);
      queryClient.setQueryData<number[]>(['favoriteIds'], (old) => {
        const list = old ?? [];
        if (currentlyFavorite) {
          return list.filter((i) => i !== targetActivityId);
        }
        if (list.includes(targetActivityId)) return list;
        return [...list, targetActivityId];
      });
      return { previous };
    },
    onError: (err: unknown, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['favoriteIds'], context.previous);
      }
      logError('ActivityDetails.toggleFavorite', err, { id: activityId });
      const appError = toAppError(err, 'Impossible de modifier les favoris.');
      Alert.alert('Favoris', appError.userMessage);
    },
    onSuccess: (data) => {
      const unlocked = (data as { unlockedBadges?: BadgeItem[] }).unlockedBadges;
      if (unlocked?.length) {
        mergeUnlocked(unlocked);
        void queryClient.invalidateQueries({ queryKey: BADGES_QUERY_KEY });
      }
    },
    onSettled: async () => {
      // Les favoris alimentent désormais les recommandations → on rafraîchit aussi.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['favoriteIds'] }),
        queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
      ]);
    },
  });

  const toggleVisitedMutation = useMutation({
    mutationFn: ({ targetActivityId, currentlyVisited }: { targetActivityId: number; currentlyVisited: boolean }) =>
      toggleVisitedActivity(targetActivityId, currentlyVisited),
    onMutate: async ({ targetActivityId, currentlyVisited }) => {
      await queryClient.cancelQueries({ queryKey: ['visitedIds'] });
      const previous = queryClient.getQueryData<number[]>(['visitedIds']);
      queryClient.setQueryData<number[]>(['visitedIds'], (old) => {
        const list = old ?? [];
        if (currentlyVisited) {
          return list.filter((i) => i !== targetActivityId);
        }
        if (list.includes(targetActivityId)) return list;
        return [...list, targetActivityId];
      });
      return { previous };
    },
    onError: (err: unknown, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['visitedIds'], context.previous);
      }
      logError('ActivityDetails.toggleVisited', err, { id: activityId });
      const appError = toAppError(err, 'Impossible de modifier le statut de visite.');
      Alert.alert('Visite', appError.userMessage);
    },
    onSettled: async () => {
      // Le signal de visite change les recommandations → on invalide leur cache.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['visitedIds'] }),
        queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
      ]);
    },
  });

  const putRatingMutation = useMutation({
    mutationFn: (score: number) => putActivityRating(activityId, score),
    onMutate: async (score) => {
      await queryClient.cancelQueries({ queryKey: ['activityRating', activityId] });
      const prev = queryClient.getQueryData(['activityRating', activityId]);
      queryClient.setQueryData(['activityRating', activityId], (old: { average: number | null; count: number; userScore: number | null } | undefined) => {
        if (!old) return old;
        return { ...old, userScore: score };
      });
      return { prev };
    },
    onError: (err, score, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['activityRating', activityId], ctx.prev);
      logError('ActivityDetails.putRating', err, { activityId });
      setRatingToast(
        buildToast(err, 'Impossible d’enregistrer la note.', () => {
          setRatingToast(null);
          putRatingMutation.mutate(score);
        })
      );
    },
    onSuccess: (data) => {
      setRatingToast(null);
      queryClient.setQueryData(['activityRating', activityId], data);
      setActivity((a) =>
        a ? { ...a, ratingAverage: data.average ?? undefined, ratingCount: data.count } : a
      );
      const unlocked = (data as { unlockedBadges?: BadgeItem[] }).unlockedBadges;
      if (unlocked?.length) {
        mergeUnlocked(unlocked);
        void queryClient.invalidateQueries({ queryKey: BADGES_QUERY_KEY });
      }
    },
  });

  const deleteRatingMutation = useMutation({
    mutationFn: () => deleteActivityRating(activityId),
    onSuccess: (data) => {
      setRatingToast(null);
      queryClient.setQueryData(['activityRating', activityId], data);
      setActivity((a) =>
        a ? { ...a, ratingAverage: data.average ?? undefined, ratingCount: data.count } : a
      );
    },
    onError: (err) => {
      logError('ActivityDetails.deleteRating', err, { activityId });
      setRatingToast(
        buildToast(err, 'Impossible de retirer la note.', () => {
          setRatingToast(null);
          deleteRatingMutation.mutate();
        })
      );
    },
  });

  const postCommentMutation = useMutation({
    mutationFn: () => postActivityComment(activityId, commentDraft.trim()),
    onSuccess: (data) => {
      setCommentDraft('');
      setCommentToast(null);
      queryClient.invalidateQueries({ queryKey: ['activityComments', activityId] });
      const unlocked = (data as { unlockedBadges?: BadgeItem[] }).unlockedBadges;
      if (unlocked?.length) {
        mergeUnlocked(unlocked);
        void queryClient.invalidateQueries({ queryKey: BADGES_QUERY_KEY });
      }
    },
    onError: (err) => {
      logError('ActivityDetails.postComment', err, { activityId });
      setCommentToast(
        buildToast(err, 'Envoi impossible.', () => {
          if (commentDraft.trim().length < 2) {
            setCommentToast(null);
            return;
          }
          setCommentToast(null);
          postCommentMutation.mutate();
        })
      );
    },
  });

  const patchCommentMutation = useMutation({
    mutationFn: ({ commentId, text }: { commentId: number; text: string }) =>
      patchActivityComment(commentId, text),
    onSuccess: () => {
      setEditingCommentId(null);
      setEditingText('');
      setCommentToast(null);
      queryClient.invalidateQueries({ queryKey: ['activityComments', activityId] });
    },
    onError: (err, vars) => {
      logError('ActivityDetails.patchComment', err, { activityId, commentId: vars.commentId });
      setCommentToast(
        buildToast(err, 'Modification impossible.', () => {
          setCommentToast(null);
          patchCommentMutation.mutate(vars);
        })
      );
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => deleteActivityComment(commentId),
    onSuccess: () => {
      setCommentToast(null);
      queryClient.invalidateQueries({ queryKey: ['activityComments', activityId] });
    },
    onError: (err, commentId) => {
      logError('ActivityDetails.deleteComment', err, { activityId, commentId });
      setCommentToast(
        buildToast(err, 'Suppression impossible.', () => {
          setCommentToast(null);
          deleteCommentMutation.mutate(commentId);
        })
      );
    },
  });

  const isFavorite =
    isAuthenticated && (favoriteIdsQuery.data ?? []).includes(activityId);

  const isVisited =
    isAuthenticated && (visitedIdsQuery.data ?? []).includes(activityId);

  useEffect(() => {
    const fetchId = idFromRoute ?? String(id);
    if (!fetchId) {
      setLoading(false);
      setError('Activité introuvable');
      return;
    }
    api
      .get(`/api/activities/${fetchId}`)
      .then((res) => {
        setActivity(res.data);
        const actId = Number.parseInt(String(fetchId), 10);
        if (isAuthenticated && Number.isFinite(actId) && actId > 0) {
          postGamificationEvent('activity_viewed', { activityId: actId })
            .then(({ unlocked }) => {
              if (unlocked?.length) {
                mergeUnlocked(unlocked);
                void queryClient.invalidateQueries({ queryKey: BADGES_QUERY_KEY });
              }
            })
            .catch((err) => logError('ActivityDetails.gamification', err, { activityId: actId }));
        }
      })
      .catch((err) => {
        logError('ActivityDetails.fetch', err, { id: fetchId });
        setError(toAppError(err, "Impossible de charger l'activite.").userMessage);
      })
      .finally(() => setLoading(false));
  }, [id, idFromRoute, isAuthenticated, mergeUnlocked, queryClient]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Hero skeleton */}
        <View style={styles.heroWrap}>
          <Skeleton width="100%" height="100%" radius={0} />
          <View style={styles.heroOverlay}>
            <Pressable style={styles.heroButton} onPress={() => router.back()} hitSlop={8}>
              <ArrowLeft color={colors.text} size={22} />
            </Pressable>
          </View>
        </View>
        {/* Body skeleton */}
        <View style={styles.content}>
          <Skeleton width="75%" height={24} radius={6} />
          <View style={{ height: 10 }} />
          <Skeleton width={110} height={22} radius={11} />
          <View style={{ height: 14 }} />
          <Skeleton width="50%" height={14} radius={4} />
          <View style={{ height: 28 }} />
          <Skeleton width="100%" height={14} radius={4} />
          <View style={{ height: 8 }} />
          <Skeleton width="95%" height={14} radius={4} />
          <View style={{ height: 8 }} />
          <Skeleton width="80%" height={14} radius={4} />
        </View>
      </View>
    );
  }

  if (error || !activity) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Pressable style={styles.backButtonStandalone} onPress={() => router.back()}>
          <ArrowLeft color={colors.text} size={24} />
        </Pressable>
        <Text style={styles.errorText}>{error ?? 'Activité introuvable'}</Text>
      </View>
    );
  }

  const canToggleFavorite = Number.isFinite(activityId) && activityId > 0;
  const avgRating =
    ratingQuery.data?.average ??
    activity.ratingAverage ??
    null;
  const countRating =
    ratingQuery.data?.count ??
    activity.ratingCount ??
    0;
  const userScore = ratingQuery.data?.userScore ?? null;

  const onFavoritePress = () => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour ajouter des favoris.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/login') },
      ]);
      return;
    }
    if (!canToggleFavorite) return;
    toggleFavoriteMutation.mutate({ targetActivityId: activityId, currentlyFavorite: isFavorite });
  };

  const onVisitedPress = () => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour marquer vos visites.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/login') },
      ]);
      return;
    }
    if (!canToggleFavorite) return;
    toggleVisitedMutation.mutate({ targetActivityId: activityId, currentlyVisited: isVisited });
  };

  const onPickStar = (score: number) => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour noter cette activité.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/login') },
      ]);
      return;
    }
    putRatingMutation.mutate(score);
  };

  const comments = commentsQuery.data?.member ?? [];
  const commentsLoading = commentsQuery.isLoading;
  const commentsError = commentsQuery.error
    ? toAppError(commentsQuery.error, 'Commentaires indisponibles.').userMessage
    : null;

  const heroImage = resolveImageUrl(activity.imageUrl);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={88}
    >
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.heroWrap}>
          {heroImage ? (
            <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]} />
          )}
          <View style={styles.heroOverlay}>
            <Pressable style={styles.heroButton} onPress={() => router.back()} hitSlop={8}>
              <ArrowLeft color={colors.text} size={22} />
            </Pressable>
            <View style={styles.heroActions}>
              {isAuthenticated && user?.socialConsentedAt ? (
                <Pressable
                  style={({ pressed }) => [styles.heroButton, pressed && styles.favoriteButtonPressed]}
                  onPress={() => setShareVisible(true)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Partager cette activité"
                >
                  <Share2 color={colors.primary} size={22} />
                </Pressable>
              ) : null}
              <Pressable
                style={({ pressed }) => [styles.heroButton, pressed && styles.favoriteButtonPressed]}
                onPress={onFavoritePress}
                disabled={toggleFavoriteMutation.isPending || !canToggleFavorite}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Heart
                  color={isFavorite ? colors.danger : colors.primary}
                  fill={isFavorite ? colors.danger : 'none'}
                  size={22}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{activity.name}</Text>
            {typeof activity.price === 'number' ? (
              <Text style={styles.priceTag}>
                {activity.price === 0 ? 'Gratuit' : `${Math.round(activity.price)}€`}
              </Text>
            ) : null}
          </View>

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{getCategoryName(activity.category)}</Text>
          </View>

          {activity.city && (
            <View style={styles.addressContainer}>
              <MapPin color={colors.muted} size={16} />
              <Text style={styles.address}>{activity.city}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.visitedButton,
              isVisited && styles.visitedButtonActive,
              pressed && styles.visitedButtonPressed,
            ]}
            onPress={onVisitedPress}
            disabled={toggleVisitedMutation.isPending || !canToggleFavorite}
            accessibilityRole="button"
            accessibilityState={{ selected: isVisited }}
            accessibilityLabel={isVisited ? 'Retirer « J’ai visité »' : 'Marquer comme visité'}
          >
            <CircleCheck
              color={isVisited ? colors.onAccent : colors.accent}
              fill={isVisited ? colors.accent : 'none'}
              size={20}
            />
            <Text style={[styles.visitedButtonText, isVisited && styles.visitedButtonTextActive]}>
              {isVisited ? "Lieu visité" : "Non visité"}
            </Text>
          </Pressable>

          <Text style={styles.sectionTitle}>Note moyenne</Text>
          {ratingToast && (
            <InlineToast
              variant={ratingToast.variant}
              message={ratingToast.message}
              countdownSeconds={ratingToast.retryAfterSeconds}
              action={
                ratingToast.retry
                  ? {
                      label: 'Réessayer',
                      onPress: ratingToast.retry,
                      disabled: putRatingMutation.isPending || deleteRatingMutation.isPending,
                    }
                  : undefined
              }
              onDismiss={() => setRatingToast(null)}
            />
          )}
          <View style={styles.ratingBlock}>
            {avgRating != null && countRating > 0 ? (
              <>
                <StarsDisplay value={avgRating} />
                <Text style={styles.ratingMeta}>
                  {avgRating.toFixed(1)} / 5 — {countRating} avis
                </Text>
              </>
            ) : (
              <Text style={styles.muted}>Pas encore d&apos;avis.</Text>
            )}
          </View>

          {isAuthenticated && (
            <View style={styles.userRatingRow}>
              <Text style={styles.subLabel}>Votre note</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => onPickStar(s)}
                    disabled={putRatingMutation.isPending}
                    hitSlop={6}
                  >
                    <DaIcon
                      name="etoile"
                      variant="ratingPicker"
                      opacity={userScore != null && s <= userScore ? 1 : 0.32}
                      accessibilityLabel={`Noter ${s} sur 5`}
                    />
                  </Pressable>
                ))}
              </View>
              {userScore != null && (
                <Pressable
                  onPress={() => deleteRatingMutation.mutate()}
                  disabled={deleteRatingMutation.isPending}
                  style={styles.removeRatingBtn}
                >
                  <Text style={styles.removeRatingText}>Retirer ma note</Text>
                </Pressable>
              )}
            </View>
          )}

          <Text style={styles.sectionTitle}>À propos de cette expérience</Text>
          <Text style={styles.description}>{activity.description}</Text>

          {activity.latitude != null && activity.longitude != null && (
            <View style={styles.coordsContainer}>
              <MapPin color={colors.primary} size={14} />
              <Text style={styles.coordsText}>
                {activity.latitude.toFixed(4)}, {activity.longitude.toFixed(4)}
              </Text>
            </View>
          )}

          <ActivityCommentsSection
            comments={comments}
            loading={commentsLoading}
            error={commentsError}
            isAuthenticated={isAuthenticated}
            currentUser={user}
            commentDraft={commentDraft}
            onChangeDraft={setCommentDraft}
            editingCommentId={editingCommentId}
            editingText={editingText}
            onChangeEditingText={setEditingText}
            onStartEdit={(c) => {
              setEditingCommentId(c.id);
              setEditingText(c.content);
            }}
            onCancelEdit={() => setEditingCommentId(null)}
            onSaveEdit={(commentId, text) => patchCommentMutation.mutate({ commentId, text })}
            onDelete={(commentId) => deleteCommentMutation.mutate(commentId)}
            onPost={() => {
              const t = commentDraft.trim();
              if (t.length < 2) {
                Alert.alert('Commentaire', 'Le texte est trop court.');
                return;
              }
              postCommentMutation.mutate();
            }}
            postPending={postCommentMutation.isPending}
            patchPending={patchCommentMutation.isPending}
            deletePending={deleteCommentMutation.isPending}
            commentToast={commentToast}
            onDismissToast={() => setCommentToast(null)}
            onLoginPress={() => router.push('/login')}
            onComposeFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
          />
        </View>
      </ScrollView>

      {/* ── Sticky CTA bottom : itinéraire ── */}
      {activity.latitude != null && activity.longitude != null ? (
        <StickyCTABar
          latitude={activity.latitude}
          longitude={activity.longitude}
          name={activity.name}
        />
      ) : null}

      {activity ? (
        <ShareModal
          visible={shareVisible}
          activityId={activity.id}
          activityName={activity.name}
          onClose={() => setShareVisible(false)}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

/**
 * Barre CTA sticky en bas de l'écran détail : ouvre les directions natives
 * (Apple Maps sur iOS, Google Maps sur Android) vers l'activité.
 *
 * Gère son propre state "loading" pour le feedback bref (Linking.openURL est
 * asynchrone, on affiche le spinner jusqu'à la résolution).
 */
function StickyCTABar({
  latitude,
  longitude,
  name,
}: {
  latitude: number;
  longitude: number;
  name: string;
}) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [launching, setLaunching] = useState(false);

  const openDirections = async () => {
    if (launching) return;
    setLaunching(true);
    const label = encodeURIComponent(name);
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${latitude},${longitude}&q=${label}`
        : `google.navigation:q=${latitude},${longitude}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
        );
      }
    } catch {
      // silent fail — on rend la main à l'utilisateur
    } finally {
      // léger délai pour que le spinner reste visible ~1 frame après le switch d'app
      setTimeout(() => setLaunching(false), 800);
    }
  };

  return (
    <View style={styles.stickyBar} pointerEvents="box-none">
      <View style={styles.stickyInner}>
        <CTAButton
          label="Y aller"
          onPress={openDirections}
          loading={launching}
          size="lg"
          fullWidth
          leftIcon={<Navigation size={18} color="#fff" />}
        />
      </View>
    </View>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120, // espace pour la sticky CTA bar
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroWrap: {
    position: 'relative',
    width: '100%',
    height: 280,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    backgroundColor: colors.surface,
  },
  heroOverlay: {
    position: 'absolute',
    top: 48,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
  },
  heroButton: {
    backgroundColor: colors.elevated,
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  backButtonStandalone: {
    padding: Spacing.lg,
    paddingTop: 48,
  },
  favoriteButtonPressed: {
    opacity: 0.7,
  },
  content: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontFamily: FontFamily.display,
    color: colors.text,
  },
  priceTag: {
    fontSize: 18,
    fontFamily: FontFamily.uiBold,
    color: colors.accent,
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryText: {
    color: colors.primary,
    fontFamily: FontFamily.uiMedium,
    fontSize: 14,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  address: {
    color: colors.muted,
    marginLeft: 8,
    flex: 1,
    fontSize: 15,
    fontFamily: FontFamily.ui,
  },
  visitedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    marginBottom: 20,
  },
  visitedButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  visitedButtonPressed: {
    opacity: 0.7,
  },
  visitedButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontFamily: FontFamily.uiMedium,
  },
  visitedButtonTextActive: {
    color: colors.onAccent,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FontFamily.display,
    color: colors.text,
    marginTop: 8,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 14,
    fontFamily: FontFamily.uiMedium,
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    fontFamily: FontFamily.ui,
    color: colors.muted,
    lineHeight: 24,
    marginBottom: 24,
  },
  coordsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  coordsText: {
    fontSize: 13,
    color: colors.muted,
  },
  errorText: {
    fontSize: 18,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 24,
  },
  ratingBlock: {
    marginBottom: 16,
  },
  ratingMeta: {
    marginTop: 6,
    fontSize: 14,
    color: colors.muted,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  userRatingRow: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  removeRatingBtn: {
    marginTop: 8,
  },
  removeRatingText: {
    color: colors.muted,
    fontSize: 13,
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
  },
  warnText: {
    color: colors.danger,
    marginBottom: 8,
  },
  commentCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  commentCardHidden: {
    backgroundColor: colors.errorSurface,
    borderColor: `${colors.danger}44`,
    opacity: 0.85,
  },
  hiddenBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.errorSurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  hiddenBadgeText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  commentAuthor: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  commentBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  commentDate: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
  dangerText: {
    color: colors.danger,
    fontWeight: '600',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: colors.elevated,
    color: colors.text,
  },
  newCommentBox: {
    marginTop: 16,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    backgroundColor: colors.elevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  stickyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
}
