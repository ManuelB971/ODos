import React from 'react';
import { act, create } from 'react-test-renderer';
import { useDebounce } from '@/hooks/useDebounce';

function HookProbe({
  value,
  delay,
  onChange,
}: {
  value: string;
  delay: number;
  onChange: (v: string) => void;
}) {
  const debounced = useDebounce(value, delay);
  React.useEffect(() => {
    onChange(debounced);
  }, [debounced, onChange]);
  return null;
}

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('delays value updates', () => {
    const onChange = jest.fn();

    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<HookProbe value="a" delay={200} onChange={onChange} />);
    });
    expect(onChange).toHaveBeenLastCalledWith('a');

    act(() => {
      renderer!.update(<HookProbe value="ab" delay={200} onChange={onChange} />);
    });
    expect(onChange).toHaveBeenLastCalledWith('a');

    act(() => {
      jest.advanceTimersByTime(210);
    });
    expect(onChange).toHaveBeenLastCalledWith('ab');

    act(() => {
      renderer!.unmount();
    });
  });
});
