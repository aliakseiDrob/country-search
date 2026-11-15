import type { Country, RawCountry } from '../types/country.js';
import { HttpError } from '../utils/errors.js';
import { mapCountryResponse } from '../api/mapper.js';

const BASE_URL = 'https://countries.dev/name';
export const DEFAULT_TIMEOUT_MS = 8000;

function composeAbortSignal(
  externalSignal: AbortSignal | undefined,
  timeoutMs: number
): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);

  if (!externalSignal) {
    return timeoutSignal;
  }

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([externalSignal, timeoutSignal]);
  }

  // Fallback for environments without AbortSignal.any
  const fallbackController = new AbortController();

  const onAbort = (source: AbortSignal): void => {
    fallbackController.abort(source.reason);
  };

  if (externalSignal.aborted) {
    onAbort(externalSignal);
  } else if (timeoutSignal.aborted) {
    onAbort(timeoutSignal);
  } else {
    externalSignal.addEventListener('abort', () => onAbort(externalSignal), { once: true });
    timeoutSignal.addEventListener('abort', () => onAbort(timeoutSignal), { once: true });
  }

  return fallbackController.signal;
}

export async function searchCountries(
  query: string,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Country[]> {
  const composedSignal = composeAbortSignal(signal, timeoutMs);
  const url = `${BASE_URL}/${encodeURIComponent(query)}`;

  const response = await fetch(url, { signal: composedSignal });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  const rawData: unknown = await response.json();
  if (!Array.isArray(rawData)) {
    return [];
  }

  return mapCountryResponse(rawData as RawCountry[]);
}
