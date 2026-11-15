import type { Country } from '../types/country.js';
import { debounce } from '../utils/debounce.js';
import { classifyError } from '../utils/errors.js';
import { searchCountries } from '../utils/countriesApi.js';

export type SearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface SearchState {
  status: SearchStatus;
  query: string;
  countries: Country[];
  errorMessage: string | null;
}

export type StateListener = (state: SearchState) => void;
export type SearchFetcher = (query: string, signal: AbortSignal) => Promise<Country[]>;

export const SEARCH_DEBOUNCE_MS = 350;

export class SearchController {
  private state: SearchState = {
    status: 'idle',
    query: '',
    countries: [],
    errorMessage: null,
  };

  private currentAbortController: AbortController | null = null;
  private readonly listeners = new Set<StateListener>();
  private readonly fetcher: SearchFetcher;
  private readonly debouncedExecute: (query: string) => void;
  private readonly onSuccessfulSearch?: (query: string) => void;

  constructor(options?: {
    fetcher?: SearchFetcher;
    debounceMs?: number;
    onSuccessfulSearch?: (query: string) => void;
  }) {
    this.fetcher = options?.fetcher ?? ((q, sig): Promise<Country[]> => searchCountries(q, sig));
    this.onSuccessfulSearch = options?.onSuccessfulSearch;
    const delay = options?.debounceMs ?? SEARCH_DEBOUNCE_MS;

    this.debouncedExecute = debounce((query: string) => {
      void this.executeSearch(query);
    }, delay);
  }

  public getState(): SearchState {
    return { ...this.state };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public handleInput(rawInput: string): void {
    const trimmed = rawInput.trim();

    // Cancel any in-flight request immediately on every input change
    this.abortInFlight();

    if (!trimmed) {
      this.setState({
        status: 'idle',
        query: '',
        countries: [],
        errorMessage: null,
      });
      return;
    }

    this.setState({
      ...this.state,
      query: trimmed,
    });

    this.debouncedExecute(trimmed);
  }

  public searchImmediately(rawInput: string): void {
    const trimmed = rawInput.trim();
    this.abortInFlight();

    if (!trimmed) {
      this.setState({
        status: 'idle',
        query: '',
        countries: [],
        errorMessage: null,
      });
      return;
    }

    this.setState({
      ...this.state,
      query: trimmed,
    });

    void this.executeSearch(trimmed);
  }

  public retry(): void {
    if (!this.state.query) {
      return;
    }
    this.abortInFlight();
    void this.executeSearch(this.state.query);
  }

  private abortInFlight(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  private async executeSearch(query: string): Promise<void> {
    // Guard against stale debounced callback if input changed or cleared right before timer fired
    if (this.state.query !== query) {
      return;
    }

    const controller = new AbortController();
    this.currentAbortController = controller;

    this.setState({
      status: 'loading',
      query,
      countries: [],
      errorMessage: null,
    });

    try {
      const results = await this.fetcher(query, controller.signal);

      // Double check signal was not aborted while resolving
      if (controller.signal.aborted) {
        return;
      }

      this.currentAbortController = null;
      this.onSuccessfulSearch?.(query);

      if (results.length === 0) {
        this.setState({
          status: 'empty',
          query,
          countries: [],
          errorMessage: null,
        });
      } else {
        this.setState({
          status: 'success',
          query,
          countries: results,
          errorMessage: null,
        });
      }
    } catch (error: unknown) {
      const classified = classifyError(error);

      if (classified.kind === 'abort') {
        return;
      }

      if (this.currentAbortController === controller) {
        this.currentAbortController = null;
      }

      this.setState({
        status: 'error',
        query,
        countries: [],
        errorMessage: classified.message,
      });
    }
  }

  private setState(nextState: SearchState): void {
    this.state = nextState;
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
