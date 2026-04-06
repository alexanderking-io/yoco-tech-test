import { formatZAR } from '../../src/utils/currency';

describe('formatZAR', () => {
  it('formats zero', () => {
    expect(formatZAR(0)).toBe('R 0.00');
  });

  it('formats single cent', () => {
    expect(formatZAR(1)).toBe('R 0.01');
  });

  it('formats two-digit cents', () => {
    expect(formatZAR(14)).toBe('R 0.14');
  });

  it('formats whole rands', () => {
    expect(formatZAR(100)).toBe('R 1.00');
    expect(formatZAR(1000)).toBe('R 10.00');
  });

  it('formats with thousands separator', () => {
    expect(formatZAR(123456)).toBe('R 1,234.56');
  });

  it('formats maximum allowed amount', () => {
    expect(formatZAR(99999999)).toBe('R 999,999.99');
  });

  it('formats large amounts with multiple separators', () => {
    expect(formatZAR(10000000)).toBe('R 100,000.00');
  });
});
