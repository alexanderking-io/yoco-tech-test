/**
 * Formats an integer cent amount as South African Rands.
 *
 * Uses en-US number formatting (comma thousands separator, period decimal)
 * with a "R" prefix to match the design brief. Division by 100 is safe for
 * display because all integers up to 2^53 are exactly representable in
 * IEEE 754 doubles, and our max is 99,999,999.
 *
 * @example formatZAR(0)         → "R 0.00"
 * @example formatZAR(1)         → "R 0.01"
 * @example formatZAR(14)        → "R 0.14"
 * @example formatZAR(123456)    → "R 1,234.56"
 * @example formatZAR(99999999)  → "R 999,999.99"
 */
export function formatZAR(cents: number): string {
  const rands = cents / 100;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rands);
  return `R ${formatted}`;
}
