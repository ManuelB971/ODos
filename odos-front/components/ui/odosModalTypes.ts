import type { ReactNode } from 'react';

export type OdosModalButtonStyle = 'default' | 'cancel' | 'destructive' | 'primary';

export type OdosModalButton = {
  label: string;
  style?: OdosModalButtonStyle;
  onPress?: () => void;
  icon?: ReactNode;
};

/** Compatible avec la signature `Alert.alert` de React Native. */
export type OdosAlertButton = {
  text: string;
  style?: 'cancel' | 'destructive' | 'default';
  onPress?: () => void;
};

export type OdosDialogPayload = {
  kind: 'dialog';
  title: string;
  message?: string;
  buttons: OdosModalButton[];
};

export type OdosActionSheetPayload = {
  kind: 'actionSheet';
  title?: string;
  message?: string;
  actions: OdosModalButton[];
  cancelLabel: string;
};

export type OdosModalPayload = OdosDialogPayload | OdosActionSheetPayload;
