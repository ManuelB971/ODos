import { AxiosError } from 'axios';

export type AppError = {
  status?: number;
  code: string;
  userMessage: string;
  technicalMessage?: string;
};

export function toAppError(error: unknown, fallback = 'Une erreur est survenue.'): AppError {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | { message?: unknown; details?: Array<{ message?: unknown }>; ['hydra:description']?: unknown }
      | undefined;
    if (status === 401) {
      return { status, code: 'UNAUTHORIZED', userMessage: 'Session expirée. Merci de vous reconnecter.', technicalMessage: error.message };
    }
    if (status === 403) {
      return { status, code: 'FORBIDDEN', userMessage: "Vous n'avez pas accès à cette ressource.", technicalMessage: error.message };
    }
    if (status === 404) {
      return { status, code: 'NOT_FOUND', userMessage: 'Ressource introuvable.', technicalMessage: error.message };
    }
    if (status === 422) {
      const firstDetailMessage = data?.details?.find((d) => typeof d?.message === 'string')?.message as string | undefined;
      const message =
        firstDetailMessage ??
        (typeof data?.message === 'string' ? data.message : undefined) ??
        (typeof data?.['hydra:description'] === 'string' ? data['hydra:description'] : undefined) ??
        'Données invalides. Vérifiez les champs saisis.';
      return { status, code: 'VALIDATION_ERROR', userMessage: message, technicalMessage: error.message };
    }
    if (status !== undefined && status >= 500) {
      return { status, code: 'SERVER_ERROR', userMessage: 'Le serveur est indisponible. Réessayez plus tard.', technicalMessage: error.message };
    }
    return { status, code: 'API_ERROR', userMessage: fallback, technicalMessage: error.message };
  }

  if (error instanceof Error) {
    return { code: 'UNKNOWN_ERROR', userMessage: fallback, technicalMessage: error.message };
  }

  return { code: 'UNKNOWN_ERROR', userMessage: fallback };
}

export function logError(scope: string, error: unknown, extra?: Record<string, unknown>) {
  const appError = toAppError(error);
  console.error(`[${scope}] ${appError.code}`, {
    status: appError.status,
    userMessage: appError.userMessage,
    technicalMessage: appError.technicalMessage,
    ...extra,
  });
}

function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === 'object' && error !== null && (error as { isAxiosError?: boolean }).isAxiosError === true;
}
