import { SmsService } from './sms.service';
import { DEFAULT_SMS_PIPELINE_CONFIG } from './pipeline/config';

jest.mock('natural', () => ({
  BayesClassifier: jest.fn().mockImplementation(() => ({
    addDocument: jest.fn(),
    train: jest.fn(),
    classify: jest.fn(() => 'DIVERS'),
  })),
}));

const prismaMock = {
  userBankConnection: { findFirst: jest.fn() },
  smsTransaction: {
    findMany: jest.fn().mockResolvedValue([]),
    createMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn().mockResolvedValue(0),
  },
  smsFilterRule: { findMany: jest.fn().mockResolvedValue([]) },
};
const classifierMock = { categorizeWithCache: jest.fn().mockResolvedValue('ALIMENTATION') };
const encryptionMock = { encrypt: (s: string) => `enc:${s}` };
const camenBertMock = {
  isReady: jest.fn().mockReturnValue(true),
  classify: jest.fn(),
};
const redisMock = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
};

function makeService() {
  return new SmsService(
    prismaMock as any,
    classifierMock as any,
    encryptionMock as any,
    camenBertMock as any,
    redisMock as any,
  );
}

const MESSAGES = [
  {
    id: 1,
    address: 'ORABANK',
    body: 'Vous avez recu 3000 CFA de NUTSUKPUI',
    dateSent: new Date('2026-07-13T10:00:00Z'),
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  redisMock.get.mockResolvedValue(null);
  camenBertMock.classify.mockResolvedValue({
    category: 'CREDIT_SALAIRE',
    direction: 'CREDIT',
    confidence: 0.92,
    rawScores: {},
  });
});

describe('SmsService pipeline v2', () => {
  it('arbitrage AGREED quand regex et CamenBert sont d\'accord', async () => {
    const service = makeService();
    await service.syncSms('cust-1', MESSAGES);
    const created = prismaMock.smsTransaction.createMany.mock.calls[0][0].data[0];
    expect(created.direction).toBe('CREDIT');
    expect(created.cbCategory).toBe('CREDIT_SALAIRE');
    expect(created.category).toBe('SALAIRE');
    expect(created.arbitration).toBe('AGREED');
    expect(created.disagreed).toBe(false);
    expect(created.status).toBe('APPROVED');
  });

  it('CamenBert arbitre seul (regex désactivé)', async () => {
    redisMock.get.mockResolvedValue(
      JSON.stringify({ ...DEFAULT_SMS_PIPELINE_CONFIG, regexEnabled: false }),
    );
    const service = makeService();
    await service.syncSms('cust-1', MESSAGES);
    const created = prismaMock.smsTransaction.createMany.mock.calls[0][0].data[0];
    expect(created.arbitration).toBe('CAMENBERT');
    expect(created.direction).toBe('CREDIT');
    expect(created.category).toBe('SALAIRE');
  });

  it('CamenBert sous le seuil → REGEX décide', async () => {
    camenBertMock.classify.mockResolvedValue({
      category: 'DEBIT_PAIEMENT',
      direction: 'DEBIT',
      confidence: 0.4,
      rawScores: {},
    });
    const service = makeService();
    await service.syncSms('cust-1', MESSAGES);
    const created = prismaMock.smsTransaction.createMany.mock.calls[0][0].data[0];
    expect(created.arbitration).toBe('REGEX');
    expect(created.cbCategory).toBeNull();
    expect(created.direction).toBe('CREDIT');
  });

  it('désaccord regex vs CamenBert → CamenBert gagne', async () => {
    camenBertMock.classify.mockResolvedValue({
      category: 'DEBIT_PAIEMENT',
      direction: 'DEBIT',
      confidence: 0.9,
      rawScores: {},
    });
    const service = makeService();
    await service.syncSms('cust-1', MESSAGES);
    const created = prismaMock.smsTransaction.createMany.mock.calls[0][0].data[0];
    expect(created.arbitration).toBe('CAMENBERT');
    expect(created.disagreed).toBe(true);
    expect(created.direction).toBe('DEBIT');
    // DEBIT_PAIEMENT → null → classifier mots-clés décide (spec)
    expect(created.category).toBe('ALIMENTATION');
  });

  it('camenbertEnabled=false → flux regex seul (backward compatible)', async () => {
    redisMock.get.mockResolvedValue(
      JSON.stringify({ ...DEFAULT_SMS_PIPELINE_CONFIG, camenbertEnabled: false }),
    );
    const service = makeService();
    await service.syncSms('cust-1', MESSAGES);
    expect(camenBertMock.classify).not.toHaveBeenCalled();
    const created = prismaMock.smsTransaction.createMany.mock.calls[0][0].data[0];
    expect(created.arbitration).toBe('REGEX');
    expect(created.cbCategory).toBeNull();
  });

  it('CamenBert UNKNOWN → direction null → SKIP (rien créé)', async () => {
    camenBertMock.classify.mockResolvedValue({
      category: 'UNKNOWN',
      direction: null,
      confidence: 0.99,
      rawScores: {},
    });
    const service = makeService();
    await service.syncSms('cust-1', MESSAGES);
    expect(prismaMock.smsTransaction.createMany).not.toHaveBeenCalled();
  });

  it('getPipelineConfig lit Redis ; updatePipelineConfig fusionne', async () => {
    const service = makeService();
    const cfg = await service.getPipelineConfig();
    expect(cfg).toEqual(DEFAULT_SMS_PIPELINE_CONFIG);

    await service.updatePipelineConfig({ camenbertThreshold: 0.8 });
    const saved = JSON.parse(redisMock.set.mock.calls[0][1]);
    expect(saved.camenbertThreshold).toBe(0.8);
    expect(saved.regexEnabled).toBe(true);
  });

  it('debugFilter : émetteur inconnu → PAS de fallback ORABANK (conservé PENDING via classifieur)', async () => {
    camenBertMock.classify.mockResolvedValue({
      category: 'UNKNOWN',
      direction: null,
      confidence: 0.1,
      rawScores: {},
    });
    const service = makeService();
    const res = await service.debugFilter('', 'Votre paiement de 3000 FCFA est validé chez un commerçant');
    expect(res.steps.parseSms.operator).toBe('UNKNOWN');
    expect(res.steps.parseSms.direction).toBeNull();
    expect(res.verdict).toBe('INSERT');
    expect(res.reason).toContain('Classifieur mots-clés');
    expect(res.steps.config.regexEnabled).toBe(true);
  });

  it('debugFilter : adresse Moov reconnue → opérateur MOOV (pas ORABANK)', async () => {
    const service = makeService();
    const res = await service.debugFilter(
      'Moov',
      'Moov Money: Paiement de 5000 F CFA chez EDINET',
    );
    expect(res.steps.parseSms.operator).toBe('MOOV');
    expect(res.steps.parseSms.direction).toBe('DEBIT');
    expect(res.steps.parseSms.amount).toBe(5000);
    expect(res.verdict).toBe('INSERT');
  });

  it('debugFilter : corps mentionnant ORABANK → opérateur ORABANK (détecté par contenu, pas un fallback)', async () => {
    const service = makeService();
    const res = await service.debugFilter(
      '',
      'Transfert de Moov Money vers ORABANK WHATSAPP Mobile Banking reussi / Montant: 3 000,00 FCFA / Txn ID: 040785058468',
    );
    expect(res.steps.parseSms.operator).toBe('ORABANK');
    expect(res.steps.parseSms.direction).toBe('CREDIT');
    expect(res.steps.parseSms.amount).toBe(3000);
  });
});
