import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const callback: Mock = vi.fn();
    const debouncedFn = debounce(callback, 300);

    debouncedFn('test');
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('test');
  });

  it('should reset timer if called again before delay window passes', () => {
    const callback: Mock = vi.fn();
    const debouncedFn = debounce(callback, 300);

    debouncedFn();
    vi.advanceTimersByTime(200);

    debouncedFn();
    vi.advanceTimersByTime(200);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
