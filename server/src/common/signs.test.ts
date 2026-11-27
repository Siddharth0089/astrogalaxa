import { describe, expect, it } from 'vitest';
import { sunSign } from './signs.js';

describe('tropical sun sign date boundaries', () => {
  it.each([
    ['2000-01-19', 'Capricorn'], ['2000-01-20', 'Aquarius'],
    ['2000-03-20', 'Pisces'], ['2000-03-21', 'Aries'],
    ['1998-08-20', 'Leo'], ['2000-08-23', 'Virgo'],
    ['2000-12-21', 'Sagittarius'], ['2000-12-22', 'Capricorn'],
  ])('%s maps to %s', (date, sign) => {
    expect(sunSign(new Date(`${date}T00:00:00Z`))).toBe(sign);
  });
});
