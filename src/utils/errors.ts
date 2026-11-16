export type ClassifiedError =
  | { kind: 'abort' }
  | { kind: 'timeout'; message: string }
  | { kind: 'http'; status: number; message: string }
  | { kind: 'network'; message: string };

export class HttpError extends Error {
  public readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `HTTP Error: ${status}`);
    this.name = 'HttpError';
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function isDomExceptionWithName(error: unknown, expectedName: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: unknown }).name === expectedName
  );
}

export function classifyError(error: unknown): ClassifiedError {
  if (isDomExceptionWithName(error, 'AbortError')) {
    return { kind: 'abort' };
  }

  if (isDomExceptionWithName(error, 'TimeoutError')) {
    return {
      kind: 'timeout',
      message: 'Превышено время ожидания ответа от сервера. Попробуйте ещё раз.',
    };
  }

  if (error instanceof HttpError) {
    return {
      kind: 'http',
      status: error.status,
      message: `Ошибка сервера (код ${error.status}). Попробуйте повторить запрос.`,
    };
  }

  return {
    kind: 'network',
    message: 'Не удалось выполнить запрос. Проверьте подключение к сети.',
  };
}
