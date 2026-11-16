import './styles.css';
import { SearchController } from './core/searchController.js';
import { createElement } from './ui/domHelpers.js';
import { CountryDetailsModal } from './ui/modal.js';
import { renderSearchState } from './ui/renderers.js';

import { searchCountries } from './utils/countriesApi.js';
import { CachedCountrySearch } from './api/cache-service.js';
import { SearchHistoryService } from './core/history-service.js';
import type { Country } from './types/country.js';

function renderHistoryBar(
  container: HTMLElement,
  items: string[],
  onSelectHistory: (query: string) => void
): void {
  container.replaceChildren();

  if (items.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  const label = createElement('span', {
    className: 'history-label',
    textContent: 'Недавние:',
  });

  const list = createElement('div', { className: 'history-list' });

  for (const item of items) {
    const chip = createElement('button', {
      className: 'history-chip',
      textContent: item,
      attributes: { type: 'button' },
    });
    chip.addEventListener('click', () => onSelectHistory(item));
    list.append(chip);
  }

  container.append(label, list);
}

function bootstrap(): void {
  const cachedSearch = new CachedCountrySearch((query: string) => searchCountries(query));
  const historyService = new SearchHistoryService();
  const modal = new CountryDetailsModal();

  const searchInput = createElement('input', {
    className: 'search-input',
    attributes: {
      type: 'search',
      placeholder: 'Введите название страны (например, Spain)...',
      'aria-label': 'Поиск страны по названию',
      autocomplete: 'off',
    },
  });

  const clearButton = createElement('button', {
    className: 'clear-button hidden',
    textContent: 'Очистить',
    attributes: { type: 'button' },
  });

  const searchBar = createElement('div', { className: 'search-bar' }, [searchInput, clearButton]);

  const historyBar = createElement('div', { className: 'history-bar hidden' });

  const header = createElement('header', { className: 'app-header' }, [
    createElement('h1', { className: 'app-title', textContent: 'Country Search' }),
    searchBar,
    historyBar,
  ]);

  const resultsContainer = createElement('main', {
    className: 'results-container',
    attributes: { 'aria-live': 'polite' },
  });

  const appRoot = createElement('div', { className: 'app-container' }, [header, resultsContainer]);

  document.body.append(appRoot, modal.getElement());

  const handleSelectHistory = (query: string): void => {
    searchInput.value = query;
    clearButton.classList.remove('hidden');
    controller.searchImmediately(query);
  };

  const controller = new SearchController({
    fetcher: (query: string, signal: AbortSignal): Promise<Country[]> =>
      cachedSearch.search(query, signal),
    onSuccessfulSearch: (query: string): void => {
      const updatedHistory = historyService.addQuery(query);
      renderHistoryBar(historyBar, updatedHistory, handleSelectHistory);
    },
  });

  renderHistoryBar(historyBar, historyService.getHistory(), handleSelectHistory);

  searchInput.addEventListener('input', () => {
    const value = searchInput.value;
    clearButton.classList.toggle('hidden', value.length === 0);
    controller.handleInput(value);
  });

  clearButton.addEventListener('click', () => {
    searchInput.value = '';
    clearButton.classList.add('hidden');
    controller.handleInput('');
    searchInput.focus();
  });

  controller.subscribe((state) => {
    renderSearchState(resultsContainer, state, {
      onRetry: () => controller.retry(),
      onSelectCountry: (country) => modal.open(country),
    });
  });

  searchInput.focus();
}

bootstrap();
