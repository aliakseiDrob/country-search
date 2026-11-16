import type { Country, RawCountry } from '../types/country.js';

function extractName(rawName: RawCountry['name']): { name: string; officialName: string } {
  if (typeof rawName === 'string') {
    const trimmed = rawName.trim() || 'Unknown country';
    return { name: trimmed, officialName: trimmed };
  }
  const common = rawName?.common?.trim() || 'Unknown country';
  const official = rawName?.official?.trim() || common;
  return { name: common, officialName: official };
}

function extractCapital(rawCapital: RawCountry['capital']): string {
  if (Array.isArray(rawCapital)) {
    return rawCapital.filter(Boolean).join(', ') || 'No capital';
  }
  if (typeof rawCapital === 'string') {
    return rawCapital.trim() || 'No capital';
  }
  return 'No capital';
}

function extractLanguages(rawLanguages: RawCountry['languages']): string[] {
  if (!rawLanguages) {
    return [];
  }
  if (Array.isArray(rawLanguages)) {
    return rawLanguages
      .map((item) => (typeof item === 'string' ? item.trim() : item.name?.trim()))
      .filter((lang): lang is string => Boolean(lang));
  }
  return Object.values(rawLanguages)
    .map((lang) => lang.trim())
    .filter(Boolean);
}

function extractCurrencies(rawCurrencies: RawCountry['currencies']): string[] {
  if (!rawCurrencies) {
    return [];
  }
  const items = Array.isArray(rawCurrencies) ? rawCurrencies : Object.values(rawCurrencies);
  return items
    .map((curr) => {
      const name = curr.name?.trim();
      if (!name) {
        return null;
      }
      const symbol = curr.symbol?.trim();
      return symbol ? `${name} (${symbol})` : name;
    })
    .filter((formatted): formatted is string => Boolean(formatted));
}

function mapSingleCountry(raw: RawCountry): Country {
  const { name, officialName } = extractName(raw.name);
  const flagUrl = raw.flags?.svg || raw.flags?.png || raw.flag || '';
  const flagAlt = raw.flags?.alt?.trim() || `Flag of ${name}`;

  return {
    name,
    officialName,
    flagUrl,
    flagAlt,
    capital: extractCapital(raw.capital),
    region: raw.region?.trim() || 'Unknown region',
    population: typeof raw.population === 'number' ? raw.population : 0,
    languages: extractLanguages(raw.languages),
    currencies: extractCurrencies(raw.currencies),
    area: typeof raw.area === 'number' ? raw.area : 0,
    borders: Array.isArray(raw.borders) ? [...raw.borders] : [],
  };
}

export function mapCountryResponse(rawList: RawCountry[]): Country[] {
  return rawList.map(mapSingleCountry);
}
