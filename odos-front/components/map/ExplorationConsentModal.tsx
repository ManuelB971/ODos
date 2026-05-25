import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

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
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Exploration de la carte</Text>
          <Text style={styles.body}>
            ODos peut utiliser votre position lorsque la carte est ouverte pour calculer le pourcentage
            de zones visitées et débloquer des badges. Les cellules enregistrées sont des identifiants
            géographiques approximatifs (geohash), pas un historique GPS détaillé.
          </Text>
          <Pressable
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={onAccept}
            disabled={loading}
          >
            <Text style={styles.btnPrimaryText}>{loading ? 'Activation…' : 'Activer'}</Text>
          </Pressable>
          <Pressable style={styles.btnGhost} onPress={onDecline} disabled={loading}>
            <Text style={styles.btnGhostText}>Plus tard</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    gap: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.muted,
  },
  btnPrimary: {
    backgroundColor: Colors.light.mapPrimaryCta,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  btnGhost: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnGhostText: {
    color: Colors.light.muted,
    fontSize: 14,
  },
});
