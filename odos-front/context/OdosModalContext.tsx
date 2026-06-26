import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { OdosActionSheetView } from '@/components/ui/OdosActionSheetView';
import { OdosDialogView } from '@/components/ui/OdosDialogView';
import type {
  OdosActionSheetPayload,
  OdosAlertButton,
  OdosDialogPayload,
  OdosModalButton,
  OdosModalPayload,
} from '@/components/ui/odosModalTypes';

type OdosModalApi = {
  showDialog: (payload: Omit<OdosDialogPayload, 'kind'>) => void;
  showActionSheet: (payload: Omit<OdosActionSheetPayload, 'kind' | 'cancelLabel'> & { cancelLabel?: string }) => void;
};

const OdosModalContext = createContext<OdosModalApi | null>(null);

let globalModalApi: OdosModalApi | null = null;

function mapAlertButton(button: OdosAlertButton): OdosModalButton {
  return {
    label: button.text,
    style:
      button.style === 'cancel'
        ? 'cancel'
        : button.style === 'destructive'
          ? 'destructive'
          : 'default',
    onPress: button.onPress,
  };
}

function shouldUseActionSheet(message: string | undefined, buttons: OdosModalButton[]): boolean {
  if (message && message.trim().length > 0) return false;
  const cancel = buttons.find((b) => b.style === 'cancel');
  const actions = buttons.filter((b) => b.style !== 'cancel');
  if (!cancel || actions.length === 0) return false;
  return !actions.some((b) => b.style === 'destructive');
}

function buildPayload(title: string, message?: string, buttons?: OdosAlertButton[]): OdosModalPayload {
  const normalized =
    buttons?.map(mapAlertButton) ?? [{ label: 'OK', style: 'primary' as const }];

  if (shouldUseActionSheet(message, normalized)) {
    const cancel = normalized.find((b) => b.style === 'cancel')!;
    const actions = normalized.filter((b) => b.style !== 'cancel');
    return {
      kind: 'actionSheet',
      title,
      message,
      actions,
      cancelLabel: cancel.label,
    };
  }

  const withPrimary = normalized.map((b) => {
    if (b.style === 'cancel' || b.style === 'destructive') return b;
    if (normalized.length === 1) return { ...b, style: 'primary' as const };
    if (normalized.length === 2 && normalized.some((x) => x.style === 'cancel')) {
      return { ...b, style: 'primary' as const };
    }
    return b;
  });

  return {
    kind: 'dialog',
    title,
    message,
    buttons: withPrimary,
  };
}

/**
 * Remplacement thémé de `Alert.alert` — action sheet ou dialogue selon le contexte.
 * Utilisable hors composant React (mutations, callbacks).
 */
export function odosAlert(title: string, message?: string, buttons?: OdosAlertButton[]): void {
  if (!globalModalApi) {
    console.warn('[odosAlert] OdosModalProvider missing — fallback ignored:', title);
    return;
  }
  const payload = buildPayload(title, message, buttons);
  if (payload.kind === 'actionSheet') {
    globalModalApi.showActionSheet(payload);
  } else {
    globalModalApi.showDialog(payload);
  }
}

export function OdosModalProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<OdosModalPayload | null>(null);
  const queueRef = useRef<OdosModalPayload[]>([]);
  const showingRef = useRef(false);

  const pumpQueue = useCallback(() => {
    if (showingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    showingRef.current = true;
    setModal(next);
  }, []);

  const dismiss = useCallback(() => {
    showingRef.current = false;
    setModal(null);
    requestAnimationFrame(() => pumpQueue());
  }, [pumpQueue]);

  const enqueue = useCallback(
    (payload: OdosModalPayload) => {
      queueRef.current.push(payload);
      pumpQueue();
    },
    [pumpQueue],
  );

  const api = useMemo<OdosModalApi>(
    () => ({
      showDialog: (payload) => enqueue({ kind: 'dialog', ...payload }),
      showActionSheet: (payload) =>
        enqueue({
          kind: 'actionSheet',
          cancelLabel: payload.cancelLabel ?? 'Annuler',
          ...payload,
        }),
    }),
    [enqueue],
  );

  useEffect(() => {
    globalModalApi = api;
    return () => {
      globalModalApi = null;
    };
  }, [api]);

  const handleButton = (onPress?: () => void) => {
    dismiss();
    onPress?.();
  };

  return (
    <OdosModalContext.Provider value={api}>
      {children}
      {modal?.kind === 'dialog' ? (
        <OdosDialogView
          visible
          title={modal.title}
          message={modal.message}
          buttons={modal.buttons}
          onClose={dismiss}
          onButtonPress={(button) => handleButton(button.onPress)}
        />
      ) : null}
      {modal?.kind === 'actionSheet' ? (
        <OdosActionSheetView
          visible
          title={modal.title}
          message={modal.message}
          actions={modal.actions}
          cancelLabel={modal.cancelLabel}
          onClose={dismiss}
          onActionPress={(action) => handleButton(action.onPress)}
        />
      ) : null}
    </OdosModalContext.Provider>
  );
}

export function useOdosModal(): OdosModalApi {
  const ctx = useContext(OdosModalContext);
  if (!ctx) {
    throw new Error('useOdosModal must be used within OdosModalProvider');
  }
  return ctx;
}
