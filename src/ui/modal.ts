import type { Country } from '../types/country.js';
import { createElement, formatNumber } from './domHelpers.js';

export class CountryDetailsModal {
  private readonly overlay: HTMLElement;
  private readonly dialog: HTMLElement;

  constructor() {
    this.dialog = createElement('div', {
      className: 'modal-dialog',
      attributes: { role: 'dialog', 'aria-modal': 'true' },
    });

    this.overlay = createElement('div', { className: 'modal-overlay hidden' }, [this.dialog]);

    this.overlay.addEventListener('click', (event: MouseEvent) => {
      if (event.target === this.overlay) {
        this.close();
      }
    });

    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
        this.close();
      }
    });
  }

  public getElement(): HTMLElement {
    return this.overlay;
  }

  public open(country: Country): void {
    this.dialog.replaceChildren();

    const closeBtn = createElement('button', {
      className: 'modal-close',
      textContent: '✕',
      attributes: { type: 'button', 'aria-label': 'Закрыть' },
    });
    closeBtn.addEventListener('click', () => this.close());

    const header = createElement('div', { className: 'modal-header' }, [
      createElement('h2', { className: 'modal-title', textContent: country.name }),
      closeBtn,
    ]);

    const flagImg = createElement('img', {
      className: 'modal-flag',
      attributes: {
        src: country.flagUrl,
        alt: country.flagAlt,
      },
    });

    const summaryText = `${country.officialName} (${country.name}) — государство в регионе ${country.region}. Столица: ${country.capital}.`;

    const detailsList = createElement('dl', { className: 'modal-details' }, [
      this.createDetailRow('Официальное название', country.officialName),
      this.createDetailRow('Описание', summaryText),
      this.createDetailRow('Столица', country.capital),
      this.createDetailRow('Регион', country.region),
      this.createDetailRow('Население', `${formatNumber(country.population)} чел.`),
      this.createDetailRow(
        'Площадь',
        country.area > 0 ? `${formatNumber(country.area)} км²` : 'Нет данных'
      ),
      this.createDetailRow(
        'Языки',
        country.languages.length > 0 ? country.languages.join(', ') : 'Нет данных'
      ),
      this.createDetailRow(
        'Валюты',
        country.currencies.length > 0 ? country.currencies.join(', ') : 'Нет данных'
      ),
      this.createDetailRow(
        'Границы',
        country.borders.length > 0 ? country.borders.join(', ') : 'Нет сухопутных границ'
      ),
    ]);

    this.dialog.append(header, flagImg, detailsList);
    this.overlay.classList.remove('hidden');
  }

  public close(): void {
    this.overlay.classList.add('hidden');
  }

  private createDetailRow(label: string, value: string): HTMLElement {
    return createElement('div', { className: 'detail-row' }, [
      createElement('dt', { className: 'detail-label', textContent: label }),
      createElement('dd', { className: 'detail-value', textContent: value }),
    ]);
  }
}
