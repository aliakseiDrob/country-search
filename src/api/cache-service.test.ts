import { describe, expect, it, vi } from 'vitest';
import { CachedCountrySearch } from './cache-service.js';
import type { Country } from '../types/country.js';

const mockSpain: Country[] = [
  {
    name: 'Spain',
    officialName: 'Kingdom of Spain',
    flagUrl: 'https://flagcdn.com',
    flagAlt: 'Flag of Spain',
    capital: 'Madrid',
    region: 'Europe',
    population: 47351567,
    languages: ['Spanish'],
    currencies: ['Euro (€)'],
    area: 505992,
    borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
  },
];

describe('CachedCountrySearch', () => {
  it('returns cached results on repeated normalized queries without calling fetcher again', async () => {
    const fetcher = vi.fn<(query: string) => Promise<Country[]>>().mockResolvedValueOnce(mockSpain);
    const cachedSearch = new CachedCountrySearch(fetcher);

    const first = await cachedSearch.search('Spain');
    const second = await cachedSearch.search('  spain  ');

    expect(first).toEqual(mockSpain);
    expect(second).toEqual(mockSpain);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cachedSearch.getCacheSize()).toBe(1);
  });

  it('deduplicates concurrent in-flight requests with the same query', async () => {
    let resolveFetch!: (value: Country[]) => void;
    const fetcher = vi.fn<(query: string) => Promise<Country[]>>(
      () =>
        new Promise<Country[]>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const cachedSearch = new CachedCountrySearch(fetcher);
    const controllerA = new AbortController();
    const controllerB = new AbortController();

    const promiseA = cachedSearch.search('spain', controllerA.signal);
    const promiseB = cachedSearch.search('Spain', controllerB.signal);

    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveFetch(mockSpain);

    const [resA, resB] = await Promise.all([promiseA, promiseB]);
    expect(resA).toEqual(mockSpain);
    expect(resB).toEqual(mockSpain);
  });

  it('does not break the shared in-flight request for other callers when one caller aborts', async () => {
    let resolveFetch!: (value: Country[]) => void;
    const fetcher = vi.fn<(query: string) => Promise<Country[]>>(
      () =>
        new Promise<Country[]>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const cachedSearch = new CachedCountrySearch(fetcher);
    const controllerA = new AbortController();
    const controllerB = new AbortController();

    const promiseA = cachedSearch.search('spain', controllerA.signal);
    const promiseB = cachedSearch.search('spain', controllerB.signal);

    controllerA.abort();

    await expect(promiseA).rejects.toMatchObject({ name: 'AbortError' });

    resolveFetch(mockSpain);

    const resultB = await promiseB;
    expect(resultB).toEqual(mockSpain);
    expect(cachedSearch.getCacheSize()).toBe(1);
  });
});
