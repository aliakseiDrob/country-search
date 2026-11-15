import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchController } from './searchController.js';
import type { RawCountry } from '../types/country.js';

interface DeferredResponse {
  promise: Promise<Response>;
  resolve: (value: Response) => void;
  reject: (reason?: unknown) => void;
}

function createDeferredResponse(signal: AbortSignal | null | undefined): DeferredResponse {
  let resolvePromise!: (value: Response) => void;
  let rejectPromise!: (reason?: unknown) => void;

  const promise = new Promise<Response>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;

    if (signal) {
      if (signal.aborted) {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
        return;
      }
      signal.addEventListener(
        'abort',
        () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        },
        { once: true }
      );
    }
  });

  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

describe('Race condition & AbortController integration', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aborts the first slow request when user types further and keeps only the latest result', async () => {
    const deferredByUrl = new Map<
      string,
      {
        signal: AbortSignal | null | undefined;
        deferred: DeferredResponse;
      }
    >();

    fetchMock.mockImplementation((input, init) => {
      const url = String(input);
      const signal = init?.signal;
      const deferred = createDeferredResponse(signal);
      deferredByUrl.set(url, { signal, deferred });
      return deferred.promise;
    });

    const controller = new SearchController({ debounceMs: 300 });

    controller.handleInput('sp');
    vi.advanceTimersByTime(300);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const spEntry = Array.from(deferredByUrl.entries()).find(([url]) => url.endsWith('/sp'))?.[1];
    expect(spEntry).toBeDefined();
    expect(spEntry?.signal?.aborted).toBe(false);

    controller.handleInput('spain');
    expect(spEntry?.signal?.aborted).toBe(true);

    vi.advanceTimersByTime(300);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const spainEntry = Array.from(deferredByUrl.entries()).find(([url]) =>
      url.endsWith('/spain')
    )?.[1];
    expect(spainEntry).toBeDefined();
    expect(spainEntry?.signal?.aborted).toBe(false);

    const spainPayload: RawCountry[] = [
      {
        name: 'Spain',
        capital: 'Madrid',
        region: 'Europe',
        population: 47351567,
        flags: { svg: 'https://flagcdn.com' },
      },
    ];
    spainEntry!.deferred.resolve(
      new Response(JSON.stringify(spainPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await vi.waitFor(() => {
      expect(controller.getState().status).toBe('success');
    });

    expect(controller.getState().countries).toHaveLength(1);
    expect(controller.getState().countries[0]?.name).toBe('Spain');

    const stalePayload: RawCountry[] = [
      {
        name: 'Stale Country From SP',
        capital: 'Old City',
        region: 'Europe',
        population: 100,
      },
    ];
    spEntry!.deferred.resolve(
      new Response(JSON.stringify(stalePayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await vi.advanceTimersByTimeAsync(10);

    const finalState = controller.getState();
    expect(finalState.status).toBe('success');
    expect(finalState.errorMessage).toBeNull();
    expect(finalState.countries).toHaveLength(1);
    expect(finalState.countries[0]?.name).toBe('Spain');
  });

  it('aborts in-flight request and clears results immediately when input is cleared', async () => {
    let capturedSignal: AbortSignal | undefined;

    fetchMock.mockImplementationOnce((_input, init) => {
      capturedSignal = init?.signal ?? undefined;
      return createDeferredResponse(capturedSignal).promise;
    });

    const controller = new SearchController({ debounceMs: 200 });

    controller.handleInput('france');
    vi.advanceTimersByTime(200);

    expect(capturedSignal?.aborted).toBe(false);
    expect(controller.getState().status).toBe('loading');

    controller.handleInput('');

    expect(capturedSignal?.aborted).toBe(true);
    expect(controller.getState()).toEqual({
      status: 'idle',
      query: '',
      countries: [],
      errorMessage: null,
    });
  });

  it('retries the exact last query when retry() is called after a real network failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            name: 'Germany',
            capital: 'Berlin',
            region: 'Europe',
            population: 83240525,
          },
        ]),
        { status: 200 }
      )
    );

    const controller = new SearchController({ debounceMs: 200 });

    controller.handleInput('germany');
    vi.advanceTimersByTime(200);

    await vi.waitFor(() => {
      expect(controller.getState().status).toBe('error');
    });

    expect(controller.getState().query).toBe('germany');

    controller.retry();

    await vi.waitFor(() => {
      expect(controller.getState().status).toBe('success');
    });

    expect(controller.getState().countries[0]?.name).toBe('Germany');
  });
});
