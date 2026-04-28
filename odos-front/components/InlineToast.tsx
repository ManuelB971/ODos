import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';

export type InlineToastVariant = 'info' | 'warning' | 'error' | 'success';

export type InlineToastAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export type InlineToastProps = {
  message: string;
  variant?: InlineToastVariant;
  /** Compte à rebours affiché à droite, en secondes. */
  countdownSeconds?: number;
  /** Bouton d'action principal (ex. "Réessayer"). Désactivé tant que `countdownSeconds > 0`. */
  action?: InlineToastAction;
  onDismiss?: () => void;
};

/**
 * Bandeau d'erreur/info inline réutilisable, sans dépendance externe.
 *
 * Pensé pour s'afficher au-dessus des formulaires (commentaires, notes...) afin
 * d'expliquer un 429 (rate-limit) ou tout autre erreur, en proposant un bouton
 * "Réessayer" qui devient actif une fois le décompte écoulé.
 */
export function InlineToast({
  message,
  variant = 'info',
  countdownSeconds,
  action,
  onDismiss,
}: InlineToastProps) {
  const [remaining, setRemaining] = useState<number | null>(
    typeof countdownSeconds === 'number' && countdownSeconds > 0 ? countdownSeconds : null
  );

  useEffect(() => {
    if (typeof countdownSeconds !== 'number' || countdownSeconds <= 0) {
      setRemaining(null);
      return;
    }
    setRemaining(countdownSeconds);
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const next = countdownSeconds - elapsed;
      if (next <= 0) {
        setRemaining(0);
        clearInterval(interval);
      } else {
        setRemaining(next);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownSeconds]);

  const palette = VARIANT_PALETTE[variant];
  const isWaiting = remaining != null && remaining > 0;
  const actionDisabled = action?.disabled === true || isWaiting;

  return (
    <View style={[styles.wrap, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={styles.body}>
        <Text style={[styles.message, { color: palette.text }]}>{message}</Text>
        {isWaiting && (
          <Text style={[styles.countdown, { color: palette.text }]}>
            Réessayez dans {remaining}s
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        {action && (
          <Pressable
            onPress={action.onPress}
            disabled={actionDisabled}
            style={[
              styles.actionBtn,
              { backgroundColor: palette.button, opacity: actionDisabled ? 0.5 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        )}
        {onDismiss && (
          <Pressable
            onPress={onDismiss}
            hitSlop={8}
            style={styles.dismissBtn}
            accessibilityRole="button"
            accessibilityLabel="Fermer le message"
          >
            <Text style={[styles.dismissText, { color: palette.text }]}>×</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const VARIANT_PALETTE: Record<InlineToastVariant, {
  bg: string;
  border: string;
  text: string;
  button: string;
}> = {
  info: {
    bg: '#eef6ff',
    border: '#bfdbfe',
    text: '#1d4ed8',
    button: Colors.light.primary,
  },
  warning: {
    bg: '#fff7ed',
    border: '#fed7aa',
    text: '#c2410c',
    button: '#f97316',
  },
  error: {
    bg: '#fef2f2',
    border: '#fecaca',
    text: '#b91c1c',
    button: Colors.light.danger,
  },
  success: {
    bg: '#ecfdf5',
    border: '#a7f3d0',
    text: '#047857',
    button: '#10b981',
  },
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  body: {
    flex: 1,
    paddingRight: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  countdown: {
    marginTop: 2,
    fontSize: 12,
    opacity: 0.85,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  dismissBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dismissText: {
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '700',
  },
});
