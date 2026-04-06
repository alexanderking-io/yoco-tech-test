import { renderHook, act } from '@testing-library/react-native';
import { useAmountInput } from '../../src/hooks/useAmountInput';

describe('useAmountInput', () => {
  it('starts at zero', () => {
    const { result } = renderHook(() => useAmountInput());
    expect(result.current.cents).toBe(0);
    expect(result.current.isZero).toBe(true);
  });

  it('appends digits from the right', () => {
    const { result } = renderHook(() => useAmountInput());

    act(() => result.current.appendDigit(1));
    expect(result.current.cents).toBe(1); // R 0.01

    act(() => result.current.appendDigit(4));
    expect(result.current.cents).toBe(14); // R 0.14

    act(() => result.current.appendDigit(0));
    expect(result.current.cents).toBe(140); // R 1.40

    expect(result.current.isZero).toBe(false);
  });

  it('removes digits from the right on delete', () => {
    const { result } = renderHook(() => useAmountInput());

    act(() => result.current.appendDigit(1));
    act(() => result.current.appendDigit(4));
    act(() => result.current.appendDigit(0));
    expect(result.current.cents).toBe(140);

    act(() => result.current.deleteDigit());
    expect(result.current.cents).toBe(14);

    act(() => result.current.deleteDigit());
    expect(result.current.cents).toBe(1);

    act(() => result.current.deleteDigit());
    expect(result.current.cents).toBe(0);
  });

  it('delete at zero is a no-op', () => {
    const { result } = renderHook(() => useAmountInput());

    act(() => result.current.deleteDigit());
    expect(result.current.cents).toBe(0);

    act(() => result.current.deleteDigit());
    expect(result.current.cents).toBe(0);
  });

  it('rejects digits that would exceed max amount', () => {
    const { result } = renderHook(() => useAmountInput());

    // Build up to 99,999,999 (max)
    for (const digit of [9, 9, 9, 9, 9, 9, 9, 9]) {
      act(() => result.current.appendDigit(digit));
    }
    expect(result.current.cents).toBe(99999999);

    // One more digit should be rejected
    act(() => result.current.appendDigit(1));
    expect(result.current.cents).toBe(99999999);
  });

  it('resets to zero', () => {
    const { result } = renderHook(() => useAmountInput());

    act(() => result.current.appendDigit(5));
    act(() => result.current.appendDigit(0));
    expect(result.current.cents).toBe(50);

    act(() => result.current.reset());
    expect(result.current.cents).toBe(0);
    expect(result.current.isZero).toBe(true);
  });

  it('handles repeated zeros correctly', () => {
    const { result } = renderHook(() => useAmountInput());

    act(() => result.current.appendDigit(0));
    act(() => result.current.appendDigit(0));
    act(() => result.current.appendDigit(0));
    expect(result.current.cents).toBe(0);
    expect(result.current.isZero).toBe(true);
  });
});
