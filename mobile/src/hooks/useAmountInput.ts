import { useState, useCallback } from 'react';
import { MAX_AMOUNT_CENTS } from '../constants/config';

/**
 * Cents-based input state machine for the cash register keypad.
 *
 * Internal state is a single integer representing cents. Digits are appended
 * from the right (multiply by 10 + digit). DEL removes from the right
 * (integer divide by 10). This avoids all floating-point issues.
 *
 * @example
 * // State: 0      → Display: R 0.00
 * // Press 1 → 1   → Display: R 0.01
 * // Press 4 → 14  → Display: R 0.14
 * // Press 0 → 140 → Display: R 1.40
 * // DEL     → 14  → Display: R 0.14
 */
export function useAmountInput() {
  const [cents, setCents] = useState(0);

  const appendDigit = useCallback((digit: number) => {
    setCents((prev) => {
      const next = prev * 10 + digit;
      // Reject if exceeds max (R999,999.99)
      return next > MAX_AMOUNT_CENTS ? prev : next;
    });
  }, []);

  const deleteDigit = useCallback(() => {
    setCents((prev) => Math.floor(prev / 10));
  }, []);

  const reset = useCallback(() => {
    setCents(0);
  }, []);

  return {
    cents,
    appendDigit,
    deleteDigit,
    reset,
    isZero: cents === 0,
  };
}
