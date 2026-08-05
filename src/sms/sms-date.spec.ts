import { normalizeDateSent } from './sms-date';

describe('normalizeDateSent', () => {
  const iso = '2026-07-30T10:15:00.000Z';
  const expected = new Date(iso).getTime();

  it('accepte une instance Date valide', () => {
    expect(normalizeDateSent(new Date(iso))?.getTime()).toBe(expected);
  });

  it('rejette une instance Date invalide', () => {
    expect(normalizeDateSent(new Date('nope'))).toBeNull();
  });

  it('accepte un timestamp epoch en millisecondes (number)', () => {
    expect(normalizeDateSent(expected)?.getTime()).toBe(expected);
  });

  it('accepte un timestamp epoch en millisecondes (string)', () => {
    expect(normalizeDateSent(String(expected))?.getTime()).toBe(expected);
  });

  it('accepte un timestamp epoch en secondes', () => {
    expect(normalizeDateSent(Math.floor(expected / 1000))?.getTime()).toBe(
      Math.floor(expected / 1000) * 1000,
    );
  });

  it('accepte une chaîne ISO parsable', () => {
    expect(normalizeDateSent(iso)?.getTime()).toBe(expected);
  });

  it('rejette undefined / null / chaîne vide', () => {
    expect(normalizeDateSent(undefined)).toBeNull();
    expect(normalizeDateSent(null)).toBeNull();
    expect(normalizeDateSent('')).toBeNull();
    expect(normalizeDateSent('   ')).toBeNull();
  });

  it('rejette une chaîne non numérique non date', () => {
    expect(normalizeDateSent('pas-une-date')).toBeNull();
  });

  it('rejette NaN / Infinity', () => {
    expect(normalizeDateSent(NaN)).toBeNull();
    expect(normalizeDateSent(Infinity)).toBeNull();
  });
});
