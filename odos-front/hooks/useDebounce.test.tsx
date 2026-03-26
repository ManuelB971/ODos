import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('delays value updates', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 200), {
      initialProps: { value: 'a' },
    });

    expect(result.current).toBe('a');

    rerender({ value: 'ab' });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(210);
    });
    expect(result.current).toBe('ab');
  });
});
