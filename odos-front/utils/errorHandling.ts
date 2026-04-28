import { AxiosError } from 'axios';

export type AppError = {
  status?: number;
  code: string;
  userMessage: string;
  technicalMessage?: string;
  /**
   * Présent uniquement pour `code === 'RATE_LIMITED'` (HTTP 429).
   * Indique combien de secondes attendre avant de pouvoir réessayer.
   */
  retryAfterSeconds?: number;
};

export function toAppError(error: unknown, fallback = 'Une erreur est survenue.'): AppError {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | {
          message?: unknown;
          details?: Array<{ message?: unknown }>;
          ['hydra:description']?: unknown;
          retryAfterSeconds?: unknown;
          code?: unknown;
        }
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
    if (status === 429) {
      const retryAfterSeconds = parseRetryAfter(
        data?.retryAfterSeconds,
        error.response?.headers?.['retry-after'] ?? error.response?.headers?.['Retry-After']
      );
      const message =
        (typeof data?.message === 'string' ? data.message : undefined) ??
        'Action trop rapprochée. Patientez quelques secondes avant de réessayer.';
      return {
        status,
        code: 'RATE_LIMITED',
        userMessage: retryAfterSeconds
          ? `${message} (${retryAfterSeconds}s)`
          : message,
        technicalMessage: error.message,
        retryAfterSeconds: retryAfterSeconds ?? undefined,
      };
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

function parseRetryAfter(payloadValue: unknown, headerValue: unknown): number | null {
  if (typeof payloadValue === 'number' && Number.isFinite(payloadValue) && payloadValue > 0) {
    return Math.ceil(payloadValue);
  }
  if (typeof payloadValue === 'string' && payloadValue.trim() !== '') {
    const n = Number.parseInt(payloadValue, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (typeof headerValue === 'string' && headerValue.trim() !== '') {
    const asNumber = Number.parseInt(headerValue, 10);
    if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
    const asDate = Date.parse(headerValue);
    if (Number.isFinite(asDate)) {
      const diffSeconds = Math.ceil((asDate - Date.now()) / 1000);
      if (diffSeconds > 0) return diffSeconds;
    }
  }
  return null;
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
