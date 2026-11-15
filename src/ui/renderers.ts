import type { Country } from '../types/country.js';
import type { SearchState } from '../core/searchController.js';
import { createElement, formatNumber } from './domHelpers.js';

export interface RenderHandlers {
  onRetry: () => void;
  onSelectCountry: (country: Country) => void;
}

function createCountryCard(country: Country, onSelect: (country: Country) => void): HTMLElement {
  const flagImg = createElement('img', {
    className: 'country-flag',
    attributes: {
      src: country.flagUrl,
      alt: country.flagAlt,
      loading: 'lazy',
    },
  });

  const body = createElement('div', { className: 'country-body' }, [
    createElement('h3', { className: 'country-name', textContent: country.name }),
    createElement('p', {
      className: 'country-meta',
      textContent: `Столица: ${country.capital}`,
    }),
    createElement('p', {
      className: 'country-meta',
      textContent: `Регион: ${country.region}`,
    }),
    createElement('p', {
      className: 'country-meta',
      textContent: `Население: ${formatNumber(country.population)}`,
    }),
  ]);

  const card = createElement(
    'article',
    {
      className: 'country-card',
      attributes: { tabindex: '0', role: 'button' },
    },
    [flagImg, body]
  );

  card.addEventListener('click', () => onSelect(country));
  card.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(country);
    }
  });

  return card;
}

export function renderSearchState(
  container: HTMLElement,
  state: SearchState,
  handlers: RenderHandlers
): void {
  container.replaceChildren();

  switch (state.status) {
    case 'idle': {
      const box = createElement('div', { className: 'state-box state-idle' }, [
        createElement('p', {
          className: 'state-title',
          textContent: 'Начните вводить название страны на английском',
        }),
        createElement('p', {
          className: 'state-subtitle',
          textContent: 'Например: Spain, Germany, Japan, Brazil',
        }),
      ]);
      container.append(box);
      break;
    }

    case 'loading': {
      const spinner = createElement('div', {
        className: 'spinner',
        attributes: { 'aria-hidden': 'true' },
      });
      const box = createElement('div', { className: 'state-box state-loading' }, [
        spinner,
        createElement('p', {
          className: 'state-title',
          textContent: `Поиск по запросу «${state.query}»...`,
        }),
      ]);
      container.append(box);
      break;
    }

    case 'empty': {
      const box = createElement('div', { className: 'state-box state-empty' }, [
        createElement('p', {
          className: 'state-title',
          textContent: `По запросу «${state.query}» ничего не найдено`,
        }),
        createElement('p', {
          className: 'state-subtitle',
          textContent: 'Проверьте написание или попробуйте другое название страны.',
        }),
      ]);
      container.append(box);
      break;
    }

    case 'error': {
      const retryButton = createElement('button', {
        className: 'retry-button',
        textContent: 'Повторить',
        attributes: { type: 'button' },
      });
      retryButton.addEventListener('click', handlers.onRetry);

      const box = createElement('div', { className: 'state-box state-error' }, [
        createElement('p', {
          className: 'state-title',
          textContent: state.errorMessage ?? 'Произошла ошибка при загрузке данных.',
        }),
        retryButton,
      ]);
      container.append(box);
      break;
    }

    case 'success': {
      const grid = createElement('div', { className: 'countries-grid' });
      for (const country of state.countries) {
        grid.append(createCountryCard(country, handlers.onSelectCountry));
      }
      container.append(grid);
      break;
    }
  }
}
