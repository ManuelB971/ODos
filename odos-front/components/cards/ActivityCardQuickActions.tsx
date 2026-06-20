import React, { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Heart, Plus } from 'lucide-react-native';

import { useFavoriteToggle } from '@/hooks/useFavoriteToggle';
import { useOdosColors } from '@/context/ThemeContext';
import { ParcoursPickerSheet } from '@/components/social/ParcoursPickerSheet';

type ActivityCardQuickActionsProps = {
  activity: { id: number; name: string };
  /** Masque le bouton « ajouter à un parcours » (ex. contexte favoris). */
  showAddToParcours?: boolean;
};

/**
 * Contrôles rapides superposés à une carte d'activité : **cœur favori** et
 * **ajout à un parcours**. Toujours visibles (pas d'appui long caché, cf.
 * recommandation `gesture-alternative` de l'audit) et dimensionnés pour rester
 * tapables (hitSlop). À placer en haut-gauche, le badge note occupant la droite.
 */
function ActivityCardQuickActionsComponent({ activity, showAddToParcours = true }: ActivityCardQuickActionsProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(), []);
  const { isFavorite, toggleFavorite, canFavorite } = useFavoriteToggle();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!canFavorite) return null;

  const favorite = isFavorite(activity.id);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        onPress={() => toggleFavorite(activity.id)}
        hitSlop={8}
        style={styles.btn}
        accessibilityRole="button"
        accessibilityLabel={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <Heart size={17} color={favorite ? colors.danger : '#FFFFFF'} fill={favorite ? colors.danger : 'none'} />
      </Pressable>

      {showAddToParcours ? (
        <Pressable
          onPress={() => setPickerOpen(true)}
          hitSlop={8}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel="Ajouter à un parcours"
        >
          <Plus size={17} color="#FFFFFF" />
        </Pressable>
      ) : null}

      <ParcoursPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        activity={activity}
      />
    </View>
  );
}

export const ActivityCardQuickActions = memo(ActivityCardQuickActionsComponent);
ActivityCardQuickActions.displayName = 'ActivityCardQuickActions';

function createStyles() {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      top: 10,
      left: 10,
      flexDirection: 'row',
      gap: 8,
      zIndex: 2,
    },
    btn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(17,24,28,0.72)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
