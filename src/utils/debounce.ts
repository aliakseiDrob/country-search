export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timerId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => {
      fn(...args);
      timerId = null;
    }, delay);
  };
}
