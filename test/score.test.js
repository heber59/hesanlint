import { calcScore } from '../src/score.js';

describe('calcScore', () => {
  test('0 violations -> 100', () => {
    expect(calcScore([], 5)).toBe(100);
  });

  test('fileCount 0 -> 100', () => {
    expect(calcScore([{ severity: 'error' }], 0)).toBe(100);
  });

  test('applies weights error=10 / warn=3 / info=1 averaged over fileCount', () => {
    // (10 + 3 + 1) / 1 = 14 penalty -> 100 - 14 = 86
    const v = [{ severity: 'error' }, { severity: 'warn' }, { severity: 'info' }];
    expect(calcScore(v, 1)).toBe(86);
  });

  test('divides penalty by fileCount', () => {
    // (10 + 10) / 2 = 10 penalty -> 90
    const v = [{ severity: 'error' }, { severity: 'error' }];
    expect(calcScore(v, 2)).toBe(90);
  });

  test('ignores unknown severities (weight 0)', () => {
    expect(calcScore([{ severity: 'whatever' }], 1)).toBe(100);
  });

  test('clamps at 0 for heavy penalties', () => {
    const v = Array.from({ length: 20 }, () => ({ severity: 'error' }));
    expect(calcScore(v, 1)).toBe(0);
  });
});
