import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchCountries } from './countriesApi.js';
import { HttpError } from './errors.js';
import type { RawCountry } from '../types/country.js';

describe('searchCountries', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests encoded URL and returns mapped countries on 200 OK', async () => {
    const rawPayload: RawCountry[] = [
      {
        name: 'United Kingdom',
        capital: 'London',
        region: 'Europe',
        population: 67215293,
        flags: { svg: 'https://flagcdn.com' },
        languages: [{ name: 'English' }],
        currencies: [{ name: 'British pound', symbol: '£' }],
        area: 242900,
        borders: ['IRL'],
      },
    ];

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(rawPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const controller = new AbortController();
    const result = await searchCountries('United Kingdom', controller.signal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://countries.dev' + '/name/United%20Kingdom');
    expect(calledInit?.signal).toBeInstanceOf(AbortSignal);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('United Kingdom');
    expect(result[0]?.capital).toBe('London');
  });

  it('returns an empty array on 404 Not Found without throwing an error', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 })
    );

    const controller = new AbortController();
    const result = await searchCountries('nonexistentcountryxyz', controller.signal);

    expect(result).toEqual([]);
  });

  it('throws HttpError with status code on non-404 HTTP error responses (e.g. 500)', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }));

    const controller = new AbortController();
    const promise = searchCountries('spain', controller.signal);

    await expect(promise).rejects.toBeInstanceOf(HttpError);
    await expect(promise).rejects.toMatchObject({ status: 500 });
  });

  it('aborts the composed signal passed to fetch when external AbortController aborts', async () => {
    let capturedSignal: AbortSignal | undefined;

    fetchMock.mockImplementationOnce((_input, init) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise((_resolve, reject) => {
        capturedSignal?.addEventListener('abort', () => {
          reject(capturedSignal?.reason ?? new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const controller = new AbortController();
    const promise = searchCountries('spain', controller.signal);

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    controller.abort();

    expect(capturedSignal?.aborted).toBe(true);
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('aborts with TimeoutError when request exceeds timeoutMs', async () => {
    vi.useFakeTimers();

    try {
      fetchMock.mockImplementationOnce((_input, init) => {
        const signal = init?.signal;
        return new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(signal.reason);
          });
        });
      });

      const controller = new AbortController();
      const promise = searchCountries('spain', controller.signal, 1000);

      vi.advanceTimersByTime(1000);

      await expect(promise).rejects.toMatchObject({ name: 'TimeoutError' });
    } finally {
      vi.useRealTimers();
    }
  });
});
