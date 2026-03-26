import { toAppError } from '@/utils/errorHandling';

describe('toAppError', () => {
  it('maps 401 to a user-friendly message', () => {
    const error = {
      isAxiosError: true,
      message: 'Request failed with status code 401',
      response: { status: 401 },
    };

    const result = toAppError(error);
    expect(result.code).toBe('UNAUTHORIZED');
    expect(result.userMessage).toContain('Session');
  });

  it('returns fallback for unknown errors', () => {
    const result = toAppError(new Error('boom'), 'Fallback message');
    expect(result.userMessage).toBe('Fallback message');
  });

  it('maps 422 and returns backend validation message', () => {
    const error = {
      isAxiosError: true,
      message: 'Request failed with status code 422',
      response: {
        status: 422,
        data: {
          message: 'Erreur de validation.',
          details: [{ property: 'plainPassword', message: 'Mot de passe invalide.' }],
        },
      },
    };

    const result = toAppError(error);
    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.userMessage).toBe('Mot de passe invalide.');
  });
});
