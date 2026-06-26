import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PopSurface } from '@/components/pop/PopSurface';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';
import type { OdosDialogPayload } from '@/components/ui/odosModalTypes';

type Props = OdosDialogPayload & {
  visible: boolean;
  onClose: () => void;
  onButtonPress: (button: OdosDialogPayload['buttons'][number]) => void;
};

export function OdosDialogView({ visible, title, message, buttons, onClose, onButtonPress }: Props) {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const styles = useMemo(
    () => createStyles(colors, isMosaicPop ? pop : null),
    [colors, isMosaicPop, pop],
  );

  const primaryButtons = buttons.filter((b) => b.style !== 'cancel');
  const cancelButtons = buttons.filter((b) => b.style === 'cancel');
  const stacked = buttons.length > 2;

  const cardContent = (
    <>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <View style={[styles.actions, stacked && styles.actionsStacked]}>
        {buttons.map((button) => {
          const isCancel = button.style === 'cancel';
          const isDestructive = button.style === 'destructive';
          const isPrimary =
            button.style === 'primary' ||
            (!isCancel && !isDestructive && primaryButtons.length === 1 && cancelButtons.length > 0);

          return (
            <Pressable
              key={button.label}
              onPress={() => onButtonPress(button)}
              style={({ pressed }) => [
                styles.actionBtn,
                stacked && styles.actionBtnStacked,
                isCancel && styles.actionBtnCancel,
                isDestructive && styles.actionBtnDestructive,
                isPrimary && styles.actionBtnPrimary,
                pressed && styles.actionBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={button.label}
            >
              <Text
                style={[
                  styles.actionLabel,
                  isCancel && styles.actionLabelCancel,
                  isDestructive && styles.actionLabelDestructive,
                  isPrimary && styles.actionLabelPrimary,
                ]}
              >
                {button.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer">
        <Pressable style={styles.centerWrap} onPress={(e) => e.stopPropagation()}>
          {isMosaicPop ? (
            <PopSurface shadow={6} radius={Radius.card} contentStyle={styles.popCard}>
              {cardContent}
            </PopSurface>
          ) : (
            <View style={styles.card}>{cardContent}</View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: OdosColorPalette, pop: ReturnType<typeof usePopTokens> | null) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(17, 24, 28, 0.48)',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    centerWrap: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    card: {
      backgroundColor: colors.elevated,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 22,
      gap: Spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.14,
      shadowRadius: 24,
      elevation: 16,
    },
    popCard: {
      padding: 22,
      gap: Spacing.md,
    },
    title: {
      fontFamily: FontFamily.display,
      fontSize: 22,
      color: pop ? pop.ink : colors.text,
      lineHeight: 28,
    },
    message: {
      fontFamily: FontFamily.ui,
      fontSize: 15,
      lineHeight: 22,
      color: pop ? `${pop.ink}CC` : colors.muted,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    actionsStacked: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    actionBtn: {
      minHeight: 48,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 12,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    actionBtnStacked: {
      width: '100%',
    },
    actionBtnCancel: {
      backgroundColor: 'transparent',
      borderColor: colors.border,
    },
    actionBtnDestructive: {
      backgroundColor: colors.errorSurface,
      borderColor: `${colors.danger}55`,
    },
    actionBtnPrimary: {
      backgroundColor: pop ? pop.orange : colors.accent,
      borderColor: pop ? pop.ink : colors.accent,
      ...(pop ? { borderWidth: 2.5 } : null),
    },
    actionBtnPressed: {
      opacity: 0.82,
    },
    actionLabel: {
      fontFamily: FontFamily.uiMedium,
      fontSize: 15,
      color: colors.text,
    },
    actionLabelCancel: {
      color: colors.muted,
    },
    actionLabelDestructive: {
      color: colors.danger,
      fontFamily: FontFamily.uiBold,
    },
    actionLabelPrimary: {
      color: pop ? pop.ink : colors.onAccent,
      fontFamily: FontFamily.uiBold,
    },
  });
}
