import { arbitrate, mapCbCategoryToAnalysis, ArbitrateInput } from './arbitration';

function base(overrides: Partial<ArbitrateInput> = {}): ArbitrateInput {
  return {
    regexDirection: 'CREDIT',
    regexConfidence: 0.9,
    cbCategory: 'CREDIT_SALAIRE',
    cbDirection: 'CREDIT',
    cbConfidence: 0.9,
    camenbertEnabled: true,
    camenbertThreshold: 0.75,
    amountPresent: true,
    ...overrides,
  };
}

describe('mapCbCategoryToAnalysis', () => {
  const cases: [string | null, string | null][] = [
    ['CREDIT_SALAIRE', 'SALAIRE'],
    ['CREDIT_TRANSFERT', 'VIREMENTS'],
    ['CREDIT_DEPOT', 'DEPOTS'],
    ['DEBIT_ACHAT_CREDIT', 'MOBILE_MONEY'],
    ['DEBIT_FRAIS', 'FRAIS_BANCAIRES'],
    ['DEBIT_PAIEMENT', null],
    ['DEBIT_RETRAIT', null],
    ['DEBIT_TRANSFERT', null],
    ['UNKNOWN', null],
    [null, null],
    ['LABEL_INCONNU', null],
  ];
  it.each(cases)('mappe %s → %s', (input, expected) => {
    expect(mapCbCategoryToAnalysis(input)).toBe(expected);
  });
});

describe('arbitrate', () => {
  it('accord regex/CamenBert → AGREED, direction CamenBert, statut APPROVED', () => {
    const r = arbitrate(base());
    expect(r.arbitration).toBe('AGREED');
    expect(r.disagreed).toBe(false);
    expect(r.camenbertOk).toBe(true);
    expect(r.direction).toBe('CREDIT');
    expect(r.cbCategory).toBe('CREDIT_SALAIRE');
    expect(r.analysisCategory).toBe('SALAIRE');
    expect(r.status).toBe('APPROVED');
  });

  it('désaccord → CAMENBERT gagne, disagreed=true', () => {
    const r = arbitrate(base({ cbDirection: 'DEBIT', cbCategory: 'DEBIT_PAIEMENT' }));
    expect(r.arbitration).toBe('CAMENBERT');
    expect(r.disagreed).toBe(true);
    expect(r.direction).toBe('DEBIT');
    expect(r.status).toBe('APPROVED');
  });

  it('CamenBert sous le seuil → REGEX décide, cb ignoré', () => {
    const r = arbitrate(base({ cbConfidence: 0.4 }));
    expect(r.camenbertOk).toBe(false);
    expect(r.arbitration).toBe('REGEX');
    expect(r.direction).toBe('CREDIT');
    expect(r.cbCategory).toBeNull();
    expect(r.analysisCategory).toBeNull();
    expect(r.status).toBe('APPROVED');
  });

  it('regex seul confiance faible → PENDING', () => {
    const r = arbitrate(base({ cbConfidence: 0.4, regexConfidence: 0.6 }));
    expect(r.status).toBe('PENDING');
    expect(r.arbitration).toBe('REGEX');
  });

  it('camenbertEnabled=false → comportement regex seul', () => {
    const r = arbitrate(base({ camenbertEnabled: false }));
    expect(r.camenbertOk).toBe(false);
    expect(r.arbitration).toBe('REGEX');
    expect(r.direction).toBe('CREDIT');
    expect(r.cbCategory).toBeNull();
  });

  it('regex désactivé (regexDirection null) + cb ok → CAMENBERT décide', () => {
    const r = arbitrate(base({ regexDirection: null }));
    expect(r.arbitration).toBe('CAMENBERT');
    expect(r.disagreed).toBe(false);
    expect(r.direction).toBe('CREDIT');
    expect(r.analysisCategory).toBe('SALAIRE');
    expect(r.status).toBe('APPROVED');
  });

  it('regex désactivé + cb sous le seuil → SKIP', () => {
    const r = arbitrate(base({ regexDirection: null, cbConfidence: 0.4 }));
    expect(r.status).toBe('SKIP');
    expect(r.direction).toBeNull();
  });

  it('cb UNKNOWN (direction null) à haute confiance → SKIP', () => {
    const r = arbitrate(base({ cbCategory: 'UNKNOWN', cbDirection: null }));
    expect(r.camenbertOk).toBe(true);
    expect(r.direction).toBeNull();
    expect(r.status).toBe('SKIP');
    expect(r.analysisCategory).toBeNull();
  });

  it('pas de montant → SKIP', () => {
    const r = arbitrate(base({ amountPresent: false }));
    expect(r.status).toBe('SKIP');
  });
});
