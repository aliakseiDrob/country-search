import type { Country } from '../types/country.js';

export type BaseCountryFetcher = (query: string) => Promise<Country[]>;

function createAbortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function raceWithSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }

  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      reject(createAbortError());
    };

    signal.addEventListener('abort', onAbort, { once: true });

    promise.then(
      (value: T) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });
}

export class CachedCountrySearch {
  private readonly cache = new Map<string, Country[]>();
  private readonly inFlight = new Map<string, Promise<Country[]>>();
  private readonly baseFetcher: BaseCountryFetcher;

  constructor(baseFetcher: BaseCountryFetcher) {
    this.baseFetcher = baseFetcher;
  }

  public search(query: string, signal?: AbortSignal): Promise<Country[]> {
    if (signal?.aborted) {
      return Promise.reject(createAbortError());
    }

    const normalizedKey = query.trim().toLowerCase();
    const cached = this.cache.get(normalizedKey);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }

    let sharedPromise = this.inFlight.get(normalizedKey);
    if (!sharedPromise) {
      sharedPromise = this.baseFetcher(query).then(
        (countries: Country[]) => {
          this.cache.set(normalizedKey, countries);
          this.inFlight.delete(normalizedKey);
          return countries;
        },
        (error: unknown) => {
          this.inFlight.delete(normalizedKey);
          throw error;
        }
      );
      this.inFlight.set(normalizedKey, sharedPromise);
    }

    return raceWithSignal(sharedPromise, signal);
  }

  public getCacheSize(): number {
    return this.cache.size;
  }
}
