const STORAGE_KEY = 'country_search_history_v1';
const MAX_HISTORY_ITEMS = 8;

export class SearchHistoryService {
  private readonly storageKey: string;
  private readonly maxItems: number;

  constructor(storageKey: string = STORAGE_KEY, maxItems: number = MAX_HISTORY_ITEMS) {
    this.storageKey = storageKey;
    this.maxItems = maxItems;
  }

  public getHistory(): string[] {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((item): item is string => typeof item === 'string');
    } catch {
      return [];
    }
  }

  public addQuery(rawQuery: string): string[] {
    const trimmed = rawQuery.trim();
    if (!trimmed) {
      return this.getHistory();
    }

    const current = this.getHistory();
    const filtered = current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, this.maxItems);

    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(updated));
    } catch {
      // Ignore storage quota or private mode errors
    }

    return updated;
  }

  public clear(): void {
    try {
      window.localStorage.removeItem(this.storageKey);
    } catch {
      // Ignore storage errors
    }
  }
}
