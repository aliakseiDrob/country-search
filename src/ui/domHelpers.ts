export interface ElementOptions {
  className?: string;
  textContent?: string;
  attributes?: Record<string, string>;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: ElementOptions,
  children?: Array<HTMLElement | Text>
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (options?.className) {
    element.className = options.className;
  }

  if (options?.textContent !== undefined) {
    element.textContent = options.textContent;
  }

  if (options?.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      element.setAttribute(key, value);
    }
  }

  if (children) {
    for (const child of children) {
      element.append(child);
    }
  }

  return element;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value);
}
