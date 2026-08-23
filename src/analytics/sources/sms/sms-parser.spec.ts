import {
  parseSms,
  guessOperatorFromAddress,
  extractBalance,
  extractReference,
  buildFingerprint,
} from './sms-parser';

describe('parseSms', () => {
  describe('MIXX (ex-TMoney / Yas)', () => {
    it('parse une réception de fonds', () => {
      const result = parseSms(
        'MIXTONE',
        'MIXX (ex-TMoney) : Vous avez recu 50000 FCFA de la part de KOFFI AGBEKO. Solde: 150000 FCFA. Ref: 8812',
      );
      expect(result.operator).toBe('MIXX');
      expect(result.direction).toBe('CREDIT');
      expect(result.amount).toBe(50000);
      expect(result.balanceAfter).toBe(150000);
      expect(result.referenceNo).toBe('8812');
      expect(result.counterparty).toMatch(/KOFFI/);
      expect(result.confidence).toBe(1);
    });

    it('parse un paiement (débit)', () => {
      const result = parseSms(
        'MIXTONE',
        'MIXX : Paiement de 12500 FCFA chez CEDAO SUPERMARCHE. Solde: 37450 FCFA.',
      );
      expect(result.direction).toBe('DEBIT');
      expect(result.amount).toBe(12500);
      expect(result.operator).toBe('MIXX');
    });
  });

  describe('FLOOZ', () => {
    it('parse un envoi de fonds', () => {
      const result = parseSms(
        'FLOOZ',
        'FLOOZ: Vous avez envoye 10000 FCFA a AMINATA TOURE. Solde: 90000 FCFA.',
      );
      expect(result.operator).toBe('FLOOZ');
      expect(result.direction).toBe('DEBIT');
      expect(result.amount).toBe(10000);
    });

    it('parse une réception', () => {
      const result = parseSms(
        'MOOVFLOOZ',
        'FLOOZ: Vous avez recu 25000 FCFA de la part de SOCIETE GENERALE TOGO.',
      );
      expect(result.direction).toBe('CREDIT');
      expect(result.amount).toBe(25000);
      expect(result.counterparty).toMatch(/SOCIETE/);
    });
  });

  describe('MOOV Money', () => {
    it('parse un paiement facture', () => {
      const result = parseSms(
        'MOOV',
        'Moov Money: Paiement de 5000 F CFA chez EDINET, abonnement internet.',
      );
      expect(result.operator).toBe('MOOV');
      expect(result.direction).toBe('DEBIT');
      expect(result.amount).toBe(5000);
    });
  });

  describe('ORABANK WhatsApp Mobile Banking', () => {
    const body =
      'Transfert de Moov Money vers ORABANK WHATSAPP Mobile Banking reussi / ' +
      'Expéditeur: 22800008558 / Montant: 3 000,00 FCFA / Date: 03/08/2026 10:38:16. ' +
      '/ Nouveau solde: 3 004,00 FCFA / Txn ID: 040785058468';

    it('classifie un transfert entrant "vers ORABANK" en CREDIT', () => {
      const result = parseSms('ORABANK', body);
      expect(result.operator).toBe('ORABANK');
      expect(result.direction).toBe('CREDIT');
      expect(result.amount).toBe(3000);
      expect(result.balanceAfter).toBe(3004);
      expect(result.referenceNo).toBe('040785058468');
      expect(result.confidence).toBe(1);
    });

    it('traite le transfert entrant même avec une adresse inconnue (short code)', () => {
      const result = parseSms('22800008558', body);
      expect(result.operator).toBe('ORABANK');
      expect(result.direction).toBe('CREDIT');
      expect(result.amount).toBe(3000);
    });

    it('gère les décimales françaises "3 000,00" → 3000', () => {
      const result = parseSms('ORABANK', body);
      expect(result.amount).toBe(3000);
      expect(result.balanceAfter).toBe(3004);
    });
  });

  describe('Fallback générique', () => {
    it('accepte un SMS promo inconnu sans adresse connue', () => {
      const result = parseSms(
        '+22890000000',
        'PROFITEZ DE NOS OFFRES PROMO! -30% chez notre partenaire ce weekend!',
      );
      expect(result.amount).toBeNull();
      expect(result.direction).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('accepte un SMS d’adresse inconnue sans mot-clé financier', () => {
      const result = parseSms('CB-VISA', 'Paiement de 45000 FCFA chez CARREFOUR');
      expect(result.amount).toBeNull();
      expect(result.direction).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('traite un SMS d’adresse bancaire connue avec mot-clé financier', () => {
      const result = parseSms(
        'FLOOZ',
        'MOOV FLOOZ: votre paiement de 3000 FCFA a ete accepte chez LIMOUSINE CAFE.',
      );
      expect(result.amount).toBe(3000);
      expect(result.direction).toBe('DEBIT');
      expect(result.confidence).toBeGreaterThanOrEqual(0.65);
    });

    it('reconnaît le format "X CFA" (sans F devant)', () => {
      const result = parseSms('ORABANK', 'ORABANK: Vous avez reçu 3.000 CFA de NUTSUKPUI');
      expect(result.operator).toBe('ORABANK');
      expect(result.direction).toBe('CREDIT');
      expect(result.amount).toBe(3000);
      expect(result.counterparty).toMatch(/NUTSUKPUI/);
    });

    it('reconnaît un débit bancaire ORABANK avec séparateur de milliers', () => {
      const result = parseSms('ORABANK', 'ORABANK: Débit de 15.000 FCFA le 04/08. Solde: 45.000 FCFA.');
      expect(result.direction).toBe('DEBIT');
      expect(result.amount).toBe(15000);
      expect(result.balanceAfter).toBe(45000);
    });

    it('accepte les accents ("reçu") via normalisation', () => {
      const result = parseSms('MOOV', 'Moov Money: Vous avez reçu 5.500 FCFA de la part de KOFI.');
      expect(result.direction).toBe('CREDIT');
      expect(result.amount).toBe(5500);
    });

    it('donne confiance 0.8 au fallback générique (statut APPROVED)', () => {
      const result = parseSms('eMoov', 'eMoov: Credit recu: 550 FCFA Ref: 123456');
      expect(result.amount).toBe(550);
      expect(result.direction).toBe('CREDIT');
      expect(result.confidence).toBe(0.8);
    });
  });
});

describe('guessOperatorFromAddress', () => {
  it('reconnaît les adresses MIXX', () => {
    expect(guessOperatorFromAddress('MIXTONE')).toBe('MIXX');
    expect(guessOperatorFromAddress('TMONEY')).toBe('MIXX');
  });

  it('reconnaît FLOOZ', () => {
    expect(guessOperatorFromAddress('MOOVFLOOZ')).toBe('FLOOZ');
  });

  it('reconnaît MOOV Money', () => {
    expect(guessOperatorFromAddress('MOOV')).toBe('MOOV');
  });

  it('renvoie null pour une adresse inconnue', () => {
    expect(guessOperatorFromAddress('ORANGE SENEGAL')).toBeNull();
  });
});

describe('extractBalance', () => {
  it('extrait le solde en FCFA', () => {
    expect(extractBalance('Solde: 150000 FCFA')).toBe(150000);
    expect(extractBalance('SOLDE 12 500 F')).toBe(12500);
  });

  it('renvoie null sans solde', () => {
    expect(extractBalance('Aucune information de solde')).toBeNull();
  });
});

describe('extractReference', () => {
  it('extrait une référence courte', () => {
    expect(extractReference('Ref: 8812')).toBe('8812');
    expect(extractReference('N°: AB12345')).toBe('AB12345');
  });

  it('extrait "Txn ID: ..."', () => {
    expect(extractReference('Txn ID: 040785058468')).toBe('040785058468');
  });

  it('ne crée pas de faux positif sur "Nouveau solde"', () => {
    expect(extractReference('Nouveau solde: 3 004,00 FCFA')).toBeNull();
  });

  it('renvoie null sans référence', () => {
    expect(extractReference('Solde: 10000 FCFA')).toBeNull();
  });
});

describe('buildFingerprint', () => {
  const base = { operator: 'MIXX', direction: 'DEBIT' as const, amount: 5000, counterparty: 'EDINET' };

  it('est stable pour le même SMS relu', () => {
    const date = new Date('2026-07-30T10:15:00Z');
    const fp1 = buildFingerprint({ ...base, referenceNo: null }, date);
    const fp2 = buildFingerprint({ ...base, referenceNo: null }, new Date('2026-07-30T10:15:30Z'));
    expect(fp1).toBe(fp2);
  });

  it('distingue deux transactions identiques à des minutes différentes', () => {
    const a = buildFingerprint({ ...base, referenceNo: null }, new Date('2026-07-30T10:15:00Z'));
    const b = buildFingerprint({ ...base, referenceNo: null }, new Date('2026-07-30T10:16:00Z'));
    expect(a).not.toBe(b);
  });

  it('privilégie la référence quand présente', () => {
    const fp = buildFingerprint({ ...base, referenceNo: '8812' }, new Date('2026-07-30T10:15:00Z'));
    expect(fp).toContain('ref:8812');
  });

  it('distingue crédit et débit', () => {
    const a = buildFingerprint({ ...base, direction: 'DEBIT' }, new Date('2026-07-30T10:15:00Z'));
    const b = buildFingerprint({ ...base, direction: 'CREDIT' }, new Date('2026-07-30T10:15:00Z'));
    expect(a).not.toBe(b);
  });
});
