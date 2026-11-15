import { describe, expect, it } from 'vitest';
import { mapCountryResponse } from './mapper.js';
import type { RawCountry } from '../types/country.js';

describe('mapCountryResponse', () => {
  it('maps object-style name, capital array, and record languages/currencies', () => {
    const rawMock: RawCountry[] = [
      {
        name: { common: 'Spain', official: 'Kingdom of Spain' },
        flags: {
          svg: 'https://flagcdn.com',
          png: 'https://flagcdn.com',
          alt: 'The flag of Spain has three horizontal stripes.',
        },
        capital: ['Madrid'],
        region: 'Europe',
        population: 47351567,
        languages: { spa: 'Spanish' },
        currencies: { EUR: { name: 'Euro', symbol: '€' } },
        area: 505992,
        borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
      },
    ];

    const result = mapCountryResponse(rawMock);

    expect(result).toEqual([
      {
        name: 'Spain',
        officialName: 'Kingdom of Spain',
        flagUrl: 'https://flagcdn.com',
        flagAlt: 'The flag of Spain has three horizontal stripes.',
        capital: 'Madrid',
        region: 'Europe',
        population: 47351567,
        languages: ['Spanish'],
        currencies: ['Euro (€)'],
        area: 505992,
        borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
      },
    ]);
  });

  it('maps string-style name/capital and array-style languages/currencies (countries.dev format)', () => {
    const rawMock: RawCountry[] = [
      {
        name: 'Switzerland',
        flags: { svg: 'https://flagcdn.com' },
        capital: 'Bern',
        region: 'Europe',
        population: 8654622,
        languages: [{ name: 'German' }, { name: 'French' }],
        currencies: [{ name: 'Swiss franc', symbol: 'Fr.' }, { name: 'WIR Euro' }],
        area: 41284,
        borders: ['AUT', 'FRA', 'ITA', 'LIE', 'DEU'],
      },
    ];

    const result = mapCountryResponse(rawMock);

    expect(result).toEqual([
      {
        name: 'Switzerland',
        officialName: 'Switzerland',
        flagUrl: 'https://flagcdn.com',
        flagAlt: 'Flag of Switzerland',
        capital: 'Bern',
        region: 'Europe',
        population: 8654622,
        languages: ['German', 'French'],
        currencies: ['Swiss franc (Fr.)', 'WIR Euro'],
        area: 41284,
        borders: ['AUT', 'FRA', 'ITA', 'LIE', 'DEU'],
      },
    ]);
  });

  it('provides safe defaults when optional fields are missing', () => {
    const partialMock: RawCountry[] = [
      {
        name: { common: 'Antarctica' },
        region: 'Polar',
        population: 1000,
      },
    ];

    const result = mapCountryResponse(partialMock);

    expect(result[0]).toEqual({
      name: 'Antarctica',
      officialName: 'Antarctica',
      flagUrl: '',
      flagAlt: 'Flag of Antarctica',
      capital: 'No capital',
      region: 'Polar',
      population: 1000,
      languages: [],
      currencies: [],
      area: 0,
      borders: [],
    });
  });
});
