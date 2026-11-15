import { SearchController } from './core/searchController.js';
import { createElement } from './ui/domHelpers.js';
import { CountryDetailsModal } from './ui/modal.js';
import { renderSearchState } from './ui/renderers.js';

function bootstrap(): void {
  const controller = new SearchController();
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

  const header = createElement('header', { className: 'app-header' }, [
    createElement('h1', { className: 'app-title', textContent: 'Country Search' }),
    searchBar,
  ]);

  const resultsContainer = createElement('main', {
    className: 'results-container',
    attributes: { 'aria-live': 'polite' },
  });

  const appRoot = createElement('div', { className: 'app-container' }, [header, resultsContainer]);

  document.body.append(appRoot, modal.getElement());

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
