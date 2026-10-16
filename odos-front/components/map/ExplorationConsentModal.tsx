import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';

type ExplorationConsentModalProps = {
  visible: boolean;
  loading?: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function ExplorationConsentModal({
  visible,
  loading,
  onAccept,
  onDecline,
}: ExplorationConsentModalProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Exploration de la carte</Text>
          <Text style={styles.body}>
            Avec votre accord, ODos utilise votre position uniquement lorsque la carte est ouverte,
            pour calculer le pourcentage de zones visitées et débloquer des badges. Seules les zones
            d&apos;environ 1 km proches des activités sont enregistrées (geohash), jamais vos
            coordonnées GPS ni un historique de trajets.
          </Text>
          <Text style={styles.body}>
            C&apos;est facultatif : l&apos;app fonctionne pareil sans. Vous pouvez retirer votre accord
            à tout moment dans Paramètres, ce qui efface vos zones visitées.
          </Text>
          <Pressable
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={onAccept}
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={styles.btnPrimaryText}>{loading ? 'Activation…' : 'Accepter'}</Text>
          </Pressable>
          <Pressable
            style={styles.btnGhost}
            onPress={onDecline}
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={styles.btnGhostText}>Refuser</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.45)',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 22,
      gap: 14,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.muted,
    },
    btnPrimary: {
      backgroundColor: colors.mapPrimaryCta,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    btnDisabled: { opacity: 0.6 },
    btnPrimaryText: {
      color: colors.onAccent,
      fontWeight: '700',
      fontSize: 15,
    },
    btnGhost: {
      paddingVertical: 10,
      alignItems: 'center',
    },
    btnGhostText: {
      color: colors.muted,
      fontSize: 14,
    },
  });
}
