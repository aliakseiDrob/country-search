import { describe, expect, it } from 'vitest';
import { HttpError, classifyError } from './errors.js';

describe('HttpError', () => {
  it('stores HTTP status and sets proper error name and default message', () => {
    const error = new HttpError(500);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.name).toBe('HttpError');
    expect(error.status).toBe(500);
    expect(error.message).toBe('HTTP Error: 500');
  });

  it('uses custom message when provided', () => {
    const error = new HttpError(503, 'Service Unavailable');

    expect(error.status).toBe(503);
    expect(error.message).toBe('Service Unavailable');
  });
});

describe('classifyError', () => {
  it('identifies manual cancellation (AbortError) as non-user-facing abort', () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    const result = classifyError(abortError);

    expect(result).toEqual({ kind: 'abort' });
  });

  it('distinguishes TimeoutError from AbortError as a real error', () => {
    const timeoutError = new DOMException(
      'The operation was aborted due to timeout',
      'TimeoutError'
    );
    const result = classifyError(timeoutError);

    expect(result).toEqual({
      kind: 'timeout',
      message: 'Превышено время ожидания ответа от сервера. Попробуйте ещё раз.',
    });
  });

  it('identifies HttpError with its status code', () => {
    const httpError = new HttpError(502, 'Bad Gateway');
    const result = classifyError(httpError);

    expect(result).toEqual({
      kind: 'http',
      status: 502,
      message: 'Ошибка сервера (код 502). Попробуйте повторить запрос.',
    });
  });

  it('classifies generic TypeError (offline/network failure) as network error', () => {
    const networkError = new TypeError('Failed to fetch');
    const result = classifyError(networkError);

    expect(result).toEqual({
      kind: 'network',
      message: 'Не удалось выполнить запрос. Проверьте подключение к сети.',
    });
  });

  it('classifies unknown thrown values safely as network/unexpected error', () => {
    const result = classifyError('unexpected string error');

    expect(result).toEqual({
      kind: 'network',
      message: 'Не удалось выполнить запрос. Проверьте подключение к сети.',
    });
  });
});
