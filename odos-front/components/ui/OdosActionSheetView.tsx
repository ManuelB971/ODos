import { useMemo } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PopSurface } from '@/components/pop/PopSurface';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { SHEET_MAX_WIDTH } from '@/hooks/useResponsiveSheet';
import type { OdosActionSheetPayload } from '@/components/ui/odosModalTypes';

type Props = OdosActionSheetPayload & {
  visible: boolean;
  onClose: () => void;
  onActionPress: (action: OdosActionSheetPayload['actions'][number]) => void;
};

export function OdosActionSheetView({
  visible,
  title,
  message,
  actions,
  cancelLabel,
  onClose,
  onActionPress,
}: Props) {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  // Desktop web : la feuille d'actions glissant du bas devient une **modale centrée**.
  // Cf. docs/AUDIT_RESPONSIVE_WEB.md (Niveau 1).
  const centered = Platform.OS === 'web' && isDesktop;
  const styles = useMemo(
    () => createStyles(colors, isMosaicPop ? pop : null),
    [colors, isMosaicPop, pop],
  );

  const sheetBody = (
    <>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <View style={styles.actionList}>
        {actions.map((action) => {
          const destructive = action.style === 'destructive';
          return (
            <Pressable
              key={action.label}
              onPress={() => onActionPress(action)}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && styles.actionRowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              {action.icon ? <View style={styles.actionIcon}>{action.icon}</View> : null}
              <Text style={[styles.actionLabel, destructive && styles.actionLabelDestructive]}>
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, centered && styles.rootCentered]}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" />
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }, centered && styles.footerCentered]}>
          {isMosaicPop ? (
            <PopSurface shadow={5} radius={Radius.card} contentStyle={styles.popSheet}>
              <View style={styles.handle} />
              {sheetBody}
            </PopSurface>
          ) : (
            <View style={[styles.sheet, centered && styles.sheetCentered]}>
              <View style={styles.handle} />
              {sheetBody}
            </View>
          )}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.actionRowPressed]}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
          >
            <Text style={styles.cancelLabel}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: OdosColorPalette, pop: ReturnType<typeof usePopTokens> | null) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    // ── Desktop web : modale centrée plutôt que feuille du bas ──
    rootCentered: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    footerCentered: {
      width: '100%',
      maxWidth: SHEET_MAX_WIDTH,
      alignSelf: 'center',
    },
    sheetCentered: {
      borderRadius: Radius.modal,
      borderBottomWidth: 1,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(17, 24, 28, 0.48)',
    },
    footer: {
      paddingHorizontal: Spacing.lg,
      gap: Spacing.sm,
    },
    sheet: {
      backgroundColor: colors.elevated,
      borderTopLeftRadius: Radius.modal,
      borderTopRightRadius: Radius.modal,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomWidth: 0,
      paddingBottom: Spacing.sm,
      overflow: 'hidden',
    },
    popSheet: {
      paddingBottom: Spacing.sm,
      overflow: 'hidden',
    },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: pop ? pop.ink : colors.border,
      opacity: pop ? 0.35 : 1,
      marginTop: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    title: {
      fontFamily: FontFamily.display,
      fontSize: 20,
      color: pop ? pop.ink : colors.text,
      textAlign: 'center',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xs,
      paddingBottom: Spacing.xs,
    },
    message: {
      fontFamily: FontFamily.ui,
      fontSize: 14,
      lineHeight: 20,
      color: pop ? `${pop.ink}AA` : colors.muted,
      textAlign: 'center',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.sm,
    },
    actionList: {
      paddingTop: Spacing.xs,
    },
    actionRow: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: pop ? `${pop.ink}22` : colors.border,
    },
    actionRowPressed: {
      backgroundColor: pop ? `${pop.orange}33` : colors.accentSoft,
    },
    actionIcon: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionLabel: {
      fontFamily: FontFamily.uiMedium,
      fontSize: 16,
      color: pop ? pop.ink : colors.primary,
      textAlign: 'center',
    },
    actionLabelDestructive: {
      color: colors.danger,
      fontFamily: FontFamily.uiBold,
    },
    cancelBtn: {
      minHeight: 52,
      borderRadius: Radius.card,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: pop ? pop.paper : colors.elevated,
      borderWidth: pop ? 2.5 : 1,
      borderColor: pop ? pop.ink : colors.border,
      marginBottom: Spacing.xs,
    },
    cancelLabel: {
      fontFamily: FontFamily.uiBold,
      fontSize: 16,
      color: pop ? pop.ink : colors.text,
    },
  });
}
