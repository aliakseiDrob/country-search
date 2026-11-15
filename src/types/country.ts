export interface RawCountry {
  name: string | { common: string; official?: string };
  flags?: { png?: string; svg?: string; alt?: string };
  flag?: string;
  capital?: string[] | string;
  region?: string;
  subregion?: string;
  population?: number;
  languages?: Record<string, string> | Array<{ name?: string } | string>;
  currencies?:
    Record<string, { name: string; symbol?: string }> | Array<{ name?: string; symbol?: string }>;
  area?: number;
  borders?: string[];
}

export interface Country {
  name: string;
  officialName: string;
  flagUrl: string;
  flagAlt: string;
  capital: string;
  region: string;
  population: number;
  languages: string[];
  currencies: string[];
  area: number;
  borders: string[];
}
