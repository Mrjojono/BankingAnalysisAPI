# Pipeline SMS v2 (CamenBert arbitre) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire de CamenBert l'arbitre sémantique du pipeline SMS (direction + type sur chaque SMS), avec toggle regex depuis l'admin, catégories d'analyse mappées et nouvelle section admin « IA & Analyse ».

**Architecture:** Couche 2 pure et testable (`src/sms/pipeline/arbitration.ts` + `config.ts`) branchée dans `SmsService.syncSms`. Le regex garde l'extraction du montant (toujours), CamenBert tranche direction/type quand sa confiance ≥ seuil, sinon fallback classifier existant. Config en Redis (`sms_pipeline_config`), exposée via `/admin/sms/pipeline`. La catégorie mappée est stockée sur `sms_transactions.category` puis propagée dans `Entry.transaction.category` et priorisée par les moteurs d'analyse.

**Tech Stack:** NestJS, Prisma, PostgreSQL (migration SQL manuscrite via `docker exec`), Redis (ioredis), Jest (ts-jest), Svelte 5 (runes) + Tailwind pour l'admin, lucide-svelte 1.17.

## Global Constraints

- Pas de `prisma migrate dev`. Migration SQL manuscrite exécutée via `docker exec postgres_dev psql -U joan -d bank_joan` + insert dans `_prisma_migrations` (checksum `'handwritten'`).
- Le montant reste TOUJOURS extrait par le regex (CamenBert ne sait pas extraire un montant).
- Statut `'ELIGIBLE'` (pas `'PASS'`), `EligibilityResult.globalScore` — non concerné par ce plan, ne pas toucher.
- Enum `ExpenseCategory` et `NON_EXPENSE_CATEGORIES` inchangés ; seules des valeurs de `ExpenseCategory` (ou `null`) sont stockées dans `sms_transactions.category`.
- Aucun contenu SMS ni identité client affiché dans l'admin (RGPD) — stats agrégées uniquement.
- Configuration de test : `npx jest <chemin>` ; build backend : `npm run build` ; build admin : `cd admin && npm run build`.
- CamenBert labels: `CREDIT_DEPOT, CREDIT_SALAIRE, CREDIT_TRANSFERT, DEBIT_PAIEMENT, DEBIT_RETRAIT, DEBIT_TRANSFERT, DEBIT_ACHAT_CREDIT, DEBIT_FRAIS, UNKNOWN`.

---
## File Structure

- `src/sms/pipeline/arbitration.ts` (nouveau) — types + `arbitrate()` + `mapCbCategoryToAnalysis()` (purs, sans DI)
- `src/sms/pipeline/arbitration.spec.ts` (nouveau) — tests unitaires de la table de décision + mapping
- `src/sms/pipeline/config.ts` (nouveau) — `SmsPipelineConfig`, défauts, `normalizeSmsPipelineConfig()`
- `src/sms/pipeline/config.spec.ts` (nouveau) — tests du normaliseur
- `src/sms/sms.service.ts` (modifier) — brancher l'arbitrage dans `syncSms`, ajouter `getPipelineConfig()` / `updatePipelineConfig()`, injecter `RedisService`
- `src/sms/sms-pipeline.spec.ts` (nouveau) — test d'intégration `syncSms` avec Prisma/Classifier/Encryption/CamenBert/Redis mockés
- `prisma/schema.prisma` (modifier) — 4 nouveaux champs sur `SmsTransaction`
- `src/admin/admin.controller.ts` (modifier) — `GET/PATCH admin/sms/pipeline`, extension `admin/sms/stats`
- `src/admin/dto/sms-pipeline.dto.ts` (nouveau) — DTO du PATCH
- `src/analytics/types.ts` (modifier) — `category?: string` sur `Transaction`
- `src/analytics/shared/classifier.ts` (modifier) — méthode `categorizeEntry(entry, customerId)`
- `src/analytics/shared/classifier.spec.ts` (modifier) — tests `categorizeEntry`
- `src/analytics/sources/sms/sms-source.service.ts` (modifier) — `toEntry()` renseigne `transaction.category`
- `src/analytics/engines/revenue.engine.ts`, `expense.engine.ts`, `advice.engine.ts` (modifier) — préférer la catégorie stockée (8 sites)
- `admin/src/lib/api/index.ts` (modifier) — `smsPipelineConfig()` / `updateSmsPipelineConfig()`
- `admin/src/lib/components/Sidebar.svelte` (modifier) — section « IA & Analyse »
- `admin/src/lib/components/AppLayout.svelte` (modifier) — titre `pipeline`
- `admin/src/App.svelte` (modifier) — route `pipeline` + passer `onNavigate` à Sms
- `admin/src/pages/Pipeline.svelte` (nouveau) — page config/stats/test
- `admin/src/pages/Sms.svelte` (modifier) — bloc compact « Pipeline d'analyse » en haut

---
### Task 1: Migration SQL + schéma Prisma + `prisma generate`

**Files:**
- Modify: `prisma/schema.prisma` (modèle `SmsTransaction`, lignes 768-801)
- Migration appliquée directement sur la base (pas de fichier commité)

**Interfaces:**
- Produces: colonnes `cb_category TEXT`, `cb_confidence DOUBLE PRECISION`, `category TEXT`, `arbitration TEXT`, `disagreed BOOLEAN NOT NULL DEFAULT false` sur `sms_transactions` ; types Prisma régénérés (`sms.cbCategory`, `sms.cbConfidence`, `sms.category`, `sms.arbitration`, `sms.disagreed`).

- [ ] **Step 1: Ajouter les champs au schéma Prisma**

Dans `prisma/schema.prisma`, remplacer le bloc du modèle `SmsTransaction` (lignes 781-791) par :

```prisma
  status       SmsTransactionStatus @default(PENDING)
  category     String?
  cbCategory   String?
  cbConfidence Float?
  arbitration  String?
  disagreed    Boolean @default(false)
  counterparty String?
  balanceAfter Float?
  referenceNo  String?
  confidence   Float?
  fingerprint  String?              @unique
  reviewedAt   DateTime?
  reviewedBy   String?
  matchRuleId  String?              @db.Uuid
  matchRule    SmsFilterRule?       @relation(fields: [matchRuleId], references: [id])
```

- [ ] **Step 2: Vérifier la structure de `_prisma_migrations`**

Run: `docker start postgres_dev && docker exec postgres_dev psql -U joan -d bank_joan -c "\d _prisma_migrations"`
Expected: liste des colonnes. Si la colonne `id` a une valeur par défaut (`gen_random_uuid()`), l'insert de l'étape 3 la laisse générer ; sinon fournir un uuid explicite (`'sms_pipeline_20260805'`).

- [ ] **Step 3: Appliquer la migration**

Run:
```bash
docker exec postgres_dev psql -U joan -d bank_joan <<'SQL'
ALTER TABLE sms_transactions
  ADD COLUMN IF NOT EXISTS cb_category TEXT,
  ADD COLUMN IF NOT EXISTS cb_confidence DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS arbitration TEXT,
  ADD COLUMN IF NOT EXISTS disagreed BOOLEAN NOT NULL DEFAULT false;
SQL
docker exec postgres_dev psql -U joan -d bank_joan -c "INSERT INTO _prisma_migrations (migration_name, checksum, started_at, finished_at, applied_steps_count) VALUES ('20260805000001_sms_pipeline', 'handwritten', now(), now(), 1);"
```
(Adapter l'insert si la table a d'autres colonnes obligatoires.)

- [ ] **Step 4: Vérifier les colonnes**

Run: `docker exec postgres_dev psql -U joan -d bank_joan -c "\d sms_transactions"`
Expected: `cb_category`, `cb_confidence`, `category`, `arbitration`, `disagreed` présentes.

- [ ] **Step 5: Régénérer le client Prisma**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" sans erreur.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(sms): migration 20260805000001_sms_pipeline (colonnes pipeline CamenBert)"
```

---
### Task 2: Module d'arbitrage pur (`arbitration.ts`)

**Files:**
- Create: `src/sms/pipeline/arbitration.ts`
- Test: `src/sms/pipeline/arbitration.spec.ts`

**Interfaces:**
- Produces:
  - `export type Direction = 'DEBIT' | 'CREDIT';`
  - `export type ArbitrationKind = 'REGEX' | 'CAMENBERT' | 'AGREED';`
  - `export interface ArbitrateInput { regexDirection: Direction | null; regexConfidence: number; cbCategory: string | null; cbDirection: Direction | null; cbConfidence: number; camenbertEnabled: boolean; camenbertThreshold: number; amountPresent: boolean; }`
  - `export interface ArbitrationResult { direction: Direction | null; cbCategory: string | null; analysisCategory: string | null; arbitration: ArbitrationKind | null; disagreed: boolean; camenbertOk: boolean; status: 'APPROVED' | 'PENDING' | 'SKIP'; }`
  - `export function mapCbCategoryToAnalysis(cbCategory: string | null): string | null`
  - `export function arbitrate(input: ArbitrateInput): ArbitrationResult`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/sms/pipeline/arbitration.spec.ts`:

```ts
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
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx jest src/sms/pipeline/arbitration.spec.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter**

Create `src/sms/pipeline/arbitration.ts`:

```ts
export type Direction = 'DEBIT' | 'CREDIT';
export type ArbitrationKind = 'REGEX' | 'CAMENBERT' | 'AGREED';

export interface ArbitrateInput {
  regexDirection: Direction | null;
  regexConfidence: number;
  cbCategory: string | null;
  cbDirection: Direction | null;
  cbConfidence: number;
  camenbertEnabled: boolean;
  camenbertThreshold: number;
  amountPresent: boolean;
}

export interface ArbitrationResult {
  direction: Direction | null;
  cbCategory: string | null;
  analysisCategory: string | null;
  arbitration: ArbitrationKind | null;
  disagreed: boolean;
  camenbertOk: boolean;
  status: 'APPROVED' | 'PENDING' | 'SKIP';
}

/**
 * Mapping conservateur type CamenBert → catégorie d'analyse.
 * Seule la catégorie dérivable du TYPE d'opération est imposée ;
 * sinon null → le classifier mots-clés décide (commerçant, lieu…).
 */
export const CB_TO_ANALYSIS_CATEGORY: Record<string, string | null> = {
  CREDIT_SALAIRE: 'SALAIRE',
  CREDIT_TRANSFERT: 'VIREMENTS',
  CREDIT_DEPOT: 'DEPOTS',
  DEBIT_ACHAT_CREDIT: 'MOBILE_MONEY',
  DEBIT_FRAIS: 'FRAIS_BANCAIRES',
  DEBIT_PAIEMENT: null,
  DEBIT_RETRAIT: null,
  DEBIT_TRANSFERT: null,
  UNKNOWN: null,
};

export function mapCbCategoryToAnalysis(cbCategory: string | null): string | null {
  if (!cbCategory) return null;
  return CB_TO_ANALYSIS_CATEGORY[cbCategory] ?? null;
}

export function arbitrate(input: ArbitrateInput): ArbitrationResult {
  const camenbertOk =
    input.camenbertEnabled &&
    input.cbCategory != null &&
    input.cbDirection != null &&
    input.cbConfidence >= input.camenbertThreshold;

  let direction: Direction | null;
  let cbCategory: string | null = null;
  let arbitration: ArbitrationKind | null;
  let disagreed = false;

  if (camenbertOk) {
    direction = input.cbDirection;
    cbCategory = input.cbCategory;
    disagreed =
      input.regexDirection != null && input.regexDirection !== input.cbDirection;
    arbitration = input.regexDirection == null ? 'CAMENBERT' : disagreed ? 'CAMENBERT' : 'AGREED';
  } else {
    direction = input.regexDirection;
    arbitration = 'REGEX';
  }

  const status =
    !input.amountPresent || !direction
      ? 'SKIP'
      : camenbertOk || input.regexConfidence >= 0.8
        ? 'APPROVED'
        : 'PENDING';

  return {
    direction,
    cbCategory,
    analysisCategory: mapCbCategoryToAnalysis(cbCategory),
    arbitration,
    disagreed,
    camenbertOk,
    status,
  };
}
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx jest src/sms/pipeline/arbitration.spec.ts`
Expected: PASS (toutes les cases vertes).

- [ ] **Step 5: Commit**

```bash
git add src/sms/pipeline/arbitration.ts src/sms/pipeline/arbitration.spec.ts
git commit -m "feat(sms): arbitrage CamenBert pur + mapping type→catégorie"
```

---
### Task 3: Configuration Redis du pipeline (`config.ts`)

**Files:**
- Create: `src/sms/pipeline/config.ts`
- Test: `src/sms/pipeline/config.spec.ts`

**Interfaces:**
- Produces:
  - `export interface SmsPipelineConfig { regexEnabled: boolean; camenbertEnabled: boolean; camenbertThreshold: number; }`
  - `export const DEFAULT_SMS_PIPELINE_CONFIG: SmsPipelineConfig` (= `{ regexEnabled: true, camenbertEnabled: true, camenbertThreshold: 0.75 }`)
  - `export const SMS_PIPELINE_CONFIG_KEY = 'sms_pipeline_config';`
  - `export function normalizeSmsPipelineConfig(raw: string | null): SmsPipelineConfig`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/sms/pipeline/config.spec.ts`:

```ts
import {
  DEFAULT_SMS_PIPELINE_CONFIG,
  normalizeSmsPipelineConfig,
  SMS_PIPELINE_CONFIG_KEY,
} from './config';

describe('normalizeSmsPipelineConfig', () => {
  it('null → défauts', () => {
    expect(normalizeSmsPipelineConfig(null)).toEqual(DEFAULT_SMS_PIPELINE_CONFIG);
  });

  it('JSON complet → valeurs conservées', () => {
    const cfg = normalizeSmsPipelineConfig(
      JSON.stringify({ regexEnabled: false, camenbertEnabled: false, camenbertThreshold: 0.8 }),
    );
    expect(cfg).toEqual({ regexEnabled: false, camenbertEnabled: false, camenbertThreshold: 0.8 });
  });

  it('JSON partiel → complété par les défauts', () => {
    const cfg = normalizeSmsPipelineConfig(JSON.stringify({ regexEnabled: false }));
    expect(cfg.regexEnabled).toBe(false);
    expect(cfg.camenbertEnabled).toBe(DEFAULT_SMS_PIPELINE_CONFIG.camenbertEnabled);
    expect(cfg.camenbertThreshold).toBe(DEFAULT_SMS_PIPELINE_CONFIG.camenbertThreshold);
  });

  it('JSON invalide → défauts', () => {
    expect(normalizeSmsPipelineConfig('pas du json')).toEqual(DEFAULT_SMS_PIPELINE_CONFIG);
  });

  it('clé Redis attendue', () => {
    expect(SMS_PIPELINE_CONFIG_KEY).toBe('sms_pipeline_config');
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx jest src/sms/pipeline/config.spec.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter**

Create `src/sms/pipeline/config.ts`:

```ts
export interface SmsPipelineConfig {
  regexEnabled: boolean;
  camenbertEnabled: boolean;
  camenbertThreshold: number;
}

export const SMS_PIPELINE_CONFIG_KEY = 'sms_pipeline_config';

export const DEFAULT_SMS_PIPELINE_CONFIG: SmsPipelineConfig = {
  regexEnabled: true,
  camenbertEnabled: true,
  camenbertThreshold: 0.75,
};

export function normalizeSmsPipelineConfig(raw: string | null): SmsPipelineConfig {
  if (!raw) return { ...DEFAULT_SMS_PIPELINE_CONFIG };
  try {
    const parsed = JSON.parse(raw);
    return {
      regexEnabled:
        typeof parsed.regexEnabled === 'boolean'
          ? parsed.regexEnabled
          : DEFAULT_SMS_PIPELINE_CONFIG.regexEnabled,
      camenbertEnabled:
        typeof parsed.camenbertEnabled === 'boolean'
          ? parsed.camenbertEnabled
          : DEFAULT_SMS_PIPELINE_CONFIG.camenbertEnabled,
      camenbertThreshold:
        typeof parsed.camenbertThreshold === 'number' &&
        parsed.camenbertThreshold >= 0 &&
        parsed.camenbertThreshold <= 1
          ? parsed.camenbertThreshold
          : DEFAULT_SMS_PIPELINE_CONFIG.camenbertThreshold,
    };
  } catch {
    return { ...DEFAULT_SMS_PIPELINE_CONFIG };
  }
}
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx jest src/sms/pipeline/config.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sms/pipeline/config.ts src/sms/pipeline/config.spec.ts
git commit -m "feat(sms): config Redis sms_pipeline_config (défauts + normalisation)"
```

---
### Task 4: Intégration dans `SmsService.syncSms` + accès config

**Files:**
- Modify: `src/sms/sms.service.ts`
- Test: `src/sms/sms-pipeline.spec.ts` (nouveau)

**Interfaces:**
- Consumes: `arbitrate`, `mapCbCategoryToAnalysis` (Task 2) ; `SmsPipelineConfig`, `SMS_PIPELINE_CONFIG_KEY`, `DEFAULT_SMS_PIPELINE_CONFIG`, `normalizeSmsPipelineConfig` (Task 3) ; `CamenBertResult` (`./camenbert/camenbert.types`) ; `RedisService` (`../redis/redis.service`) ; colonnes `cbCategory`, `cbConfidence`, `arbitration`, `disagreed` (Task 1).
- Produces:
  - `SmsService.getPipelineConfig(): Promise<SmsPipelineConfig>`
  - `SmsService.updatePipelineConfig(partial: Partial<SmsPipelineConfig>): Promise<SmsPipelineConfig>`
  - `syncSms` remplit désormais `cbCategory`, `cbConfidence`, `category`, `arbitration`, `disagreed`.

- [ ] **Step 1: Écrire le test d'intégration qui échoue**

Create `src/sms/sms-pipeline.spec.ts`:

```ts
import { SmsService } from './sms.service';
import { DEFAULT_SMS_PIPELINE_CONFIG } from './pipeline/config';

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
    expect(created.category).toBeNull();
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
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx jest src/sms/sms-pipeline.spec.ts`
Expected: FAIL — le constructeur `SmsService` n'accepte pas 5 arguments (TS) / colonnes absentes.

- [ ] **Step 3: Modifier `SmsService`**

Dans `src/sms/sms.service.ts` :

Imports (en tête de fichier) :

```ts
import { RedisService } from '../redis/redis.service';
import { CamenBertResult } from './camenbert/camenbert.types';
import {
  arbitrate,
  mapCbCategoryToAnalysis,
} from './pipeline/arbitration';
import {
  DEFAULT_SMS_PIPELINE_CONFIG,
  normalizeSmsPipelineConfig,
  SMS_PIPELINE_CONFIG_KEY,
  SmsPipelineConfig,
} from './pipeline/config';
```

Constructeur (remplacer lignes 31-36) :

```ts
  constructor(
    private readonly prisma: PrismaService,
    private readonly classifier: Classifier,
    private readonly encryption: EncryptionService,
    private readonly camenBert: CamenBertService,
    private readonly redis: RedisService,
  ) {}
```

Ajouter ces méthodes publiques (après `getCamenBertStatus()`) :

```ts
  async getPipelineConfig(): Promise<SmsPipelineConfig> {
    const raw = await this.redis.get(SMS_PIPELINE_CONFIG_KEY);
    return normalizeSmsPipelineConfig(raw);
  }

  async updatePipelineConfig(
    partial: Partial<SmsPipelineConfig>,
  ): Promise<SmsPipelineConfig> {
    const current = await this.getPipelineConfig();
    const next: SmsPipelineConfig = { ...current, ...partial };
    await this.redis.set(
      SMS_PIPELINE_CONFIG_KEY,
      JSON.stringify(next),
      30 * 24 * 60 * 60,
    );
    return next;
  }
```

Remplacer le bloc du `syncSms` (lignes 140-217) par :

```ts
      const parsed = parseSms(msg.address, msg.body);

      if (parsed.amount === null && parsed.direction === null) {
        skipReasons.parseEmpty++;
        continue;
      }

      if (parsed.amount === null) {
        skipReasons.parseEmpty++;
        continue;
      }

      // Couche 2 : CamenBert arbitre sur CHAQUE SMS si activé
      let cbResult: CamenBertResult | null = null;
      if (pipelineConfig.camenbertEnabled && this.camenBert.isReady()) {
        try {
          cbResult = await this.camenBert.classify(msg.body);
        } catch {
          cbResult = null;
        }
      }

      const arbitration = arbitrate({
        regexDirection: pipelineConfig.regexEnabled
          ? (parsed.direction as 'DEBIT' | 'CREDIT' | null)
          : null,
        regexConfidence: parsed.confidence,
        cbCategory: cbResult?.category ?? null,
        cbDirection: cbResult?.direction ?? null,
        cbConfidence: cbResult?.confidence ?? 0,
        camenbertEnabled: pipelineConfig.camenbertEnabled,
        camenbertThreshold: pipelineConfig.camenbertThreshold,
        amountPresent: parsed.amount !== null,
      });

      parsed.direction = arbitration.direction;

      let status: string = arbitration.status === 'APPROVED' ? 'APPROVED' : 'PENDING';

      if (parsed.direction === null) {
        if (pipelineConfig.regexEnabled && !arbitration.camenbertOk) {
          // Fallback classifier existant : valide que ce n'est pas du bruit
          try {
            const category = await this.classifier.categorizeWithCache(msg.body);
            if (category === ExpenseCategory.DIVERS) {
              skipReasons.classifierDivers++;
              continue;
            }
            parsed.confidence = Math.min(parsed.confidence, 0.6);
          } catch {
            skipReasons.classifierError++;
            continue;
          }
          status = 'PENDING';
        } else {
          skipReasons.parseEmpty++;
          continue;
        }
      }

      const fingerprint = buildFingerprint(parsed, dateSent);
      if (existingFingerprints.has(fingerprint)) {
        duplicates++;
        continue;
      }

      const matchRule = rules.find((r) => this.ruleMatches(r, msg, parsed));
      if (matchRule) status = 'IGNORED';

      // Catégorie d'analyse : type mappé CamenBert, sinon classifier mots-clés
      let category: string | null = arbitration.analysisCategory;
      if (category === null && parsed.direction) {
        try {
          const cat = await this.classifier.categorizeWithCache(msg.body);
          if (cat !== ExpenseCategory.DIVERS) category = cat;
        } catch {}
      }

      toCreate.push({
        customerId,
        smsId: msg.id,
        address: msg.address,
        body: this.encryption.encrypt(msg.body.slice(0, 500)),
        amount: parsed.amount,
        direction: parsed.direction,
        operator: parsed.operator,
        sender: parsed.sender,
        counterparty: parsed.counterparty,
        balanceAfter: parsed.balanceAfter,
        referenceNo: parsed.referenceNo,
        confidence: parsed.confidence,
        cbCategory: arbitration.cbCategory,
        cbConfidence: cbResult?.confidence ?? null,
        category,
        arbitration: arbitration.arbitration,
        disagreed: arbitration.disagreed,
        fingerprint,
        status,
        matchRuleId: matchRule?.id ?? null,
        dateSent,
      });

      existingIds.add(msg.id);
      existingFingerprints.add(fingerprint);
```

Puis, au début de `syncSms` (après `const rules = ...`), lire la config une seule fois par appel :

```ts
    const pipelineConfig = await this.getPipelineConfig();
```

**Note** : `mapCbCategoryToAnalysis` est importé mais utilisé via `arbitrate` (qui l'appelle). Si TypeScript signale un import inutilisé, retirer `mapCbCategoryToAnalysis` de l'import.

- [ ] **Step 4: Vérifier le passage**

Run: `npx jest src/sms/sms-pipeline.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Régression + build**

Run: `npx jest src/sms && npm run build`
Expected: tous les specs SMS passent (dont `sms-date.spec.ts`), build OK.

- [ ] **Step 6: Commit**

```bash
git add src/sms/sms.service.ts src/sms/sms-pipeline.spec.ts
git commit -m "feat(sms): CamenBert arbitre systématique dans syncSms + config Redis"
```

---
### Task 5: Endpoints admin (`GET/PATCH admin/sms/pipeline`) + stats étendues

**Files:**
- Create: `src/admin/dto/sms-pipeline.dto.ts`
- Modify: `src/admin/admin.controller.ts`

**Interfaces:**
- Consumes: `SmsService.getPipelineConfig()` / `updatePipelineConfig()` / `getCamenBertStatus()` (Task 4).
- Produces:
  - `GET /admin/sms/pipeline` → `{ config: SmsPipelineConfig, camenBertStatus: {...} }`
  - `PATCH /admin/sms/pipeline` → `{ config: SmsPipelineConfig }`
  - `GET /admin/sms/stats` → ajoute `totals.byArbitration`, `totals.byCbCategory`, `disagreedCount`.

- [ ] **Step 1: Créer le DTO**

Create `src/admin/dto/sms-pipeline.dto.ts` :

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateSmsPipelineDto {
  @ApiPropertyOptional({ example: true, description: 'Activer la logique de pattern/direction du regex' })
  @IsOptional()
  @IsBoolean()
  regexEnabled?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Activer l\'arbitrage CamenBert sur chaque SMS' })
  @IsOptional()
  @IsBoolean()
  camenbertEnabled?: boolean;

  @ApiPropertyOptional({ example: 0.75, description: 'Seuil de confiance CamenBert (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  camenbertThreshold?: number;
}
```

- [ ] **Step 2: Ajouter les endpoints + étendre smsStats**

Dans `src/admin/admin.controller.ts`, ajouter l'import du DTO (près des autres imports DTO, ligne 57) :

```ts
import { UpdateSmsPipelineDto } from './dto/sms-pipeline.dto';
```

Ajouter, juste après le bloc `@Get('sms/stats')` (après la ligne 456) :

```ts
  @Get('sms/pipeline')
  @ApiOperation({ summary: 'Config du pipeline SMS v2 + statut CamenBert' })
  async getSmsPipeline() {
    const [config, camenBertStatus] = await Promise.all([
      this.smsService.getPipelineConfig(),
      this.smsService.getCamenBertStatus(),
    ]);
    return { config, camenBertStatus };
  }

  @Patch('sms/pipeline')
  @ApiOperation({ summary: 'Mise à jour partielle de la config du pipeline SMS' })
  async updateSmsPipeline(@Body() dto: UpdateSmsPipelineDto) {
    const config = await this.smsService.updatePipelineConfig(dto);
    return { config };
  }
```

Dans `smsStats`, étendre le `Promise.all` (lignes 419-431) :

```ts
    const [perStatus, perOperator, perDirection, perCategory, total, rulesCount, byArbitration, byCbCategory, disagreedCount] =
      await Promise.all([
        this.prisma.smsTransaction.groupBy({ by: ['status'], where: whereRange, _count: true }),
        this.prisma.smsTransaction.groupBy({ by: ['operator'], where: whereRange, _count: true }),
        this.prisma.smsTransaction.groupBy({ by: ['direction'], where: whereRange, _count: true }),
        this.prisma.smsTransaction.groupBy({
          by: ['category'],
          where: { ...whereRange, category: { not: null } },
          _count: true,
        }),
        this.prisma.smsTransaction.count({ where: whereRange }),
        this.prisma.smsFilterRule.count({ where: { isActive: true } }),
        this.prisma.smsTransaction.groupBy({
          by: ['arbitration'],
          where: { ...whereRange, arbitration: { not: null } },
          _count: true,
        }),
        this.prisma.smsTransaction.groupBy({
          by: ['cb_category'],
          where: { ...whereRange, cb_category: { not: null } },
          _count: true,
        }),
        this.prisma.smsTransaction.count({ where: { ...whereRange, disagreed: true } }),
      ]);
```

Et dans le retour (lignes 444-455), ajouter `byArbitration`, `byCbCategory` et `disagreedCount` dans `totals` :

```ts
        byArbitration: perArbitration,
        byCbCategory: perCbCategory,
        disagreedCount,
```

(l'adapter aux noms de variables retenus, ex. `byArbitration`/`byCbCategory`.)

- [ ] **Step 3: Vérifier la compilation**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 4: Vérifier à chaud (API)**

Run (avec le backend lancé) :
```bash
curl -s -X GET http://localhost:4000/admin/sms/pipeline -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH http://localhost:4000/admin/sms/pipeline \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"camenbertThreshold":0.8}'
```
Expected: réponse JSON avec `config` (et `camenBertStatus` pour le GET).

- [ ] **Step 5: Commit**

```bash
git add src/admin/dto/sms-pipeline.dto.ts src/admin/admin.controller.ts
git commit -m "feat(admin): endpoints GET/PATCH sms/pipeline + stats arbitrage"
```

---
### Task 6: Catégorie stockée propagée aux moteurs d'analyse

**Files:**
- Modify: `src/analytics/types.ts`
- Modify: `src/analytics/shared/classifier.ts`, `src/analytics/shared/classifier.spec.ts`
- Modify: `src/analytics/sources/sms/sms-source.service.ts`
- Modify: `src/analytics/engines/revenue.engine.ts`, `expense.engine.ts`, `advice.engine.ts`

**Interfaces:**
- Consumes: colonne `category` sur `sms_transactions` (Task 1) ; type `Entry`/`Transaction`.
- Produces: `Transaction.category?: string` ; `Classifier.categorizeEntry(entry, customerId?): Promise<ExpenseCategory>` ; `SmsSource.toEntry()` renseigne `transaction.category`.

- [ ] **Step 1: Écrire le test `categorizeEntry` qui échoue**

Dans `src/analytics/shared/classifier.spec.ts`, ajouter à la fin du `describe('Classifier', ...)` :

```ts
  it('categorizeEntry préfère la catégorie stockée', async () => {
    const entry = {
      direction: 'DEBIT',
      transaction: { description: 'ACHAT CARBURANT', category: 'SALAIRE' },
    } as any;
    const result = await classifier.categorizeEntry(entry, 'cust-1');
    expect(result).toBe('SALAIRE');
  });

  it('categorizeEntry retombe sur le classifier si pas de catégorie stockée', async () => {
    const entry = {
      direction: 'DEBIT',
      transaction: { description: 'ACHAT CARBURANT' },
    } as any;
    const result = await classifier.categorizeEntry(entry, 'cust-1');
    expect(result).toBe('CARBURANT');
  });
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx jest src/analytics/shared/classifier.spec.ts`
Expected: FAIL — `categorizeEntry` n'existe pas.

- [ ] **Step 3: Ajouter `category` au type `Transaction`**

Dans `src/analytics/types.ts`, dans `export type Transaction = { ... }` (lignes 44-55), ajouter après `description?: string;` :

```ts
  /** Catégorie d'analyse précalculée (ex. SMS Mobile Money) */
  category?: string;
```

- [ ] **Step 4: Implémenter `categorizeEntry`**

Dans `src/analytics/shared/classifier.ts`, ajouter l'import du type `Entry` :

```ts
import { Entry } from '../types';
```

Et la méthode publique (après `categorizeWithCache`, ligne 120) :

```ts
  /**
   * Catégorie d'une écriture : préfère la catégorie précalculée
   * (ex. SMS Mobile Money arbitrés par CamenBert), sinon classifier.
   */
  async categorizeEntry(
    entry: Pick<Entry, 'transaction'>,
    customerId?: string,
  ): Promise<ExpenseCategory> {
    const stored = entry.transaction?.category;
    if (stored) return stored as ExpenseCategory;
    return this.categorizeWithCache(
      entry.transaction?.description ?? '',
      customerId,
    );
  }
```

- [ ] **Step 5: Renseigner `transaction.category` dans `SmsSource.toEntry`**

Dans `src/analytics/sources/sms/sms-source.service.ts`, dans l'objet `transaction` (lignes 105-111), ajouter après `description,` :

```ts
        description,
        category: sms.category ?? undefined,
```

- [ ] **Step 6: Basculer les moteurs sur `categorizeEntry`**

Remplacer, dans chacun des 8 sites ci-dessous, le bloc :
```ts
      const category = await this.classifier.categorizeWithCache(
        entry.transaction.description ?? '',
        customerId,
      );
```
par :
```ts
      const category = await this.classifier.categorizeEntry(entry, customerId);
```

Sites (vérifier au préalable que l'argument est bien `entry.transaction.description ?? ''`) :
- `src/analytics/engines/revenue.engine.ts:59`
- `src/analytics/engines/revenue.engine.ts:309`
- `src/analytics/engines/expense.engine.ts:67`
- `src/analytics/engines/expense.engine.ts:132`
- `src/analytics/engines/expense.engine.ts:214`
- `src/analytics/engines/expense.engine.ts:295`
- `src/analytics/engines/expense.engine.ts:335`
- `src/analytics/engines/advice.engine.ts:240`

**Ne pas toucher** : `overview.service.ts:822` (préview sur descriptions brutes, pas des Entry) et `debt-detector.ts:61` (signature différente).

- [ ] **Step 7: Vérifier**

Run: `npx jest src/analytics/shared/classifier.spec.ts && npx jest src/analytics && npm run build`
Expected: classifier.spec PASS (dont les 2 nouveaux tests), specs analytics verts, build OK.

- [ ] **Step 8: Commit**

```bash
git add src/analytics/types.ts src/analytics/shared/classifier.ts src/analytics/shared/classifier.spec.ts src/analytics/sources/sms/sms-source.service.ts src/analytics/engines/revenue.engine.ts src/analytics/engines/expense.engine.ts src/analytics/engines/advice.engine.ts
git commit -m "feat(analytics): propager la catégorie stockée (SMS CamenBert) aux moteurs d'analyse"
```

---
### Task 7: Admin — API client + sidebar + routing

**Files:**
- Modify: `admin/src/lib/api/index.ts`
- Modify: `admin/src/lib/components/Sidebar.svelte`
- Modify: `admin/src/lib/components/AppLayout.svelte`
- Modify: `admin/src/App.svelte`

**Interfaces:**
- Consumes: `GET/PATCH /admin/sms/pipeline` (Task 5).
- Produces: `api.smsPipelineConfig()`, `api.updateSmsPipelineConfig(data)` ; nav `pipeline` ; route `pipeline`.

- [ ] **Step 1: Ajouter les fonctions API**

Dans `admin/src/lib/api/index.ts`, dans la section `// ========== SMS (contrôle admin) ==========`, après `deleteSmsRule` :

```ts
  smsPipelineConfig: () => request<any>('/sms/pipeline'),
  updateSmsPipelineConfig: (data: {
    regexEnabled?: boolean;
    camenbertEnabled?: boolean;
    camenbertThreshold?: number;
  }) =>
    request<any>('/sms/pipeline', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
```

- [ ] **Step 2: Réorganiser la Sidebar**

Dans `admin/src/lib/components/Sidebar.svelte` :
- Imports : ajouter `Workflow` à l'import lucide (ligne 2).
- Supprimer `{ id: 'sms', icon: MessagesSquare, label: 'SMS' },` de la section `Administration`.
- Supprimer `{ id: 'centreIA', icon: Cpu, label: 'Centre IA' },` de la section `Analytics`.
- Remplacer la section `Analytics` par la nouvelle section :

```ts
    { section: 'IA & Analyse', items: [
      { id: 'sms', icon: MessagesSquare, label: 'SMS' },
      { id: 'pipeline', icon: Workflow, label: 'Pipeline d\'analyse' },
      { id: 'centreIA', icon: Cpu, label: 'Centre IA' },
    ]},
```

- [ ] **Step 3: Titre de page**

Dans `admin/src/lib/components/AppLayout.svelte`, dans `pageTitles` (lignes 26-39), ajouter :

```ts
    pipeline: "Pipeline d'analyse",
```

- [ ] **Step 4: Routing**

Dans `admin/src/App.svelte` :
- Importer la page (après l'import `Sms`, ligne 20) : `import Pipeline from './pages/Pipeline.svelte';`
- Passer la navigation à Sms : remplacer `<Sms />` (ligne 89) par `<Sms onNavigate={handleNavigate} />`.
- Ajouter la route (après le bloc `sms`, ligne 89) :

```svelte
    {:else if page === 'pipeline'}
      <Pipeline />
```

- [ ] **Step 5: Vérifier le build admin**

Run: `cd admin && npm run build`
Expected: build OK.

- [ ] **Step 6: Commit**

```bash
git add admin/src/lib/api/index.ts admin/src/lib/components/Sidebar.svelte admin/src/lib/components/AppLayout.svelte admin/src/App.svelte
git commit -m "feat(admin): section IA & Analyse (sidebar) + route Pipeline"
```

---
### Task 8: Page `Pipeline.svelte`

**Files:**
- Create: `admin/src/pages/Pipeline.svelte`

**Interfaces:**
- Consumes: `api.smsPipelineConfig()`, `api.updateSmsPipelineConfig()`, `api.smsStats({days})`, `api.debugSmsFilter()`, `api.camenBertStatus()`, composants `Card`, `ToggleSwitch`, `Button`, store `toast`.
- Produces: page `pipeline`.

- [ ] **Step 1: Créer la page**

Create `admin/src/pages/Pipeline.svelte` :

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { RefreshCw, Save, FlaskConical, Cpu, Workflow } from '@lucide/svelte';
  import { api } from '../lib/api';
  import { toast } from '../lib/stores/toast.svelte';
  import Card from '../lib/components/Card.svelte';
  import Button from '../lib/components/Button.svelte';
  import ToggleSwitch from '../lib/components/ToggleSwitch.svelte';
  import Spinner from '../lib/components/Spinner.svelte';

  let config = $state<{ regexEnabled: boolean; camenbertEnabled: boolean; camenbertThreshold: number }>({
    regexEnabled: true,
    camenbertEnabled: true,
    camenbertThreshold: 0.75,
  });
  let cbStatus = $state<any>(null);
  let stats = $state<any>(null);
  let loading = $state(true);
  let saving = $state(false);

  let testBody = $state('');
  let testResult = $state<any>(null);
  let testError = $state('');

  function count(rows: any[] | undefined, key: string) {
    const row = (rows ?? []).find((r: any) => r[key] != null);
    return row?._count ?? 0;
  }

  async function loadAll() {
    loading = true;
    try {
      const [cfg, cb, st] = await Promise.all([
        api.smsPipelineConfig(),
        api.camenBertStatus(),
        api.smsStats({ days: 30 }),
      ]);
      config = cfg.config;
      cbStatus = cb.camenBertStatus ?? cb;
      stats = st;
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      loading = false;
    }
  }

  async function saveConfig() {
    saving = true;
    try {
      const res = await api.updateSmsPipelineConfig({
        regexEnabled: config.regexEnabled,
        camenbertEnabled: config.camenbertEnabled,
        camenbertThreshold: Number(config.camenbertThreshold),
      });
      config = res.config;
      toast.success('Configuration du pipeline enregistrée');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      saving = false;
    }
  }

  async function runTest() {
    testResult = null;
    testError = '';
    if (!testBody.trim()) {
      toast.info('Saisissez le contenu du SMS');
      return;
    }
    try {
      testResult = await api.debugSmsFilter({ address: 'ORABANK', body: testBody });
    } catch (e: any) {
      testError = e.message;
    }
  }

  onMount(loadAll);

  const total = $derived(stats?.totals?.total ?? 0);
  const approved = $derived(stats?.totals?.byStatus?.find((r: any) => r.status === 'APPROVED')?._count ?? 0);
  const successRate = $derived(total > 0 ? Math.round((approved / total) * 100) : 0);
  const arbitrated = $derived(stats?.totals?.byArbitration?.find((r: any) => r.arbitration === 'CAMENBERT')?._count ?? 0);
  const ignored = $derived(stats?.totals?.byStatus?.find((r: any) => r.status === 'IGNORED')?._count ?? 0);
</script>

{#if loading}
  <div class="flex justify-center py-16"><Spinner text="Chargement du pipeline..." size="lg" /></div>
{:else}
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-2xl font-bold text-on-surface flex items-center gap-2">
        <Workflow size={22} class="text-primary" /> Pipeline d'analyse SMS
      </h2>
      <p class="text-sm text-on-surface-variant mt-1">
        Couche 1 = regex (montant + direction), couche 2 = CamenBert (type + direction), couche 3 = classifier (catégorie).
      </p>
    </div>
    <Button onclick={loadAll} variant="ghost"><RefreshCw size={16} /> Actualiser</Button>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <Card class="lg:col-span-1">
      <h3 class="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2"><Cpu size={18} class="text-primary" /> Configuration</h3>
      <div class="flex flex-col gap-4">
        <label class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-on-surface">Regex actif</p>
            <p class="text-xs text-on-surface-variant">Logique de pattern/direction du regex (le montant reste toujours extrait)</p>
          </div>
          <ToggleSwitch bind:checked={config.regexEnabled} />
        </label>
        <label class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-on-surface">CamenBert actif</p>
            <p class="text-xs text-on-surface-variant">Arbitre le type et la direction sur chaque SMS</p>
          </div>
          <ToggleSwitch bind:checked={config.camenbertEnabled} />
        </label>
        <div>
          <label class="text-sm font-medium text-on-surface block mb-1" for="cb-threshold">Seuil de confiance CamenBert</label>
          <input
            id="cb-threshold"
            type="number"
            min="0"
            max="1"
            step="0.05"
            bind:value={config.camenbertThreshold}
            class="w-full rounded-lg border border-mint-subtle bg-surface px-3 py-2 text-sm"
          />
          <p class="text-xs text-on-surface-variant mt-1">{(config.camenbertThreshold * 100).toFixed(0)} % — au-dessus, CamenBert décide.</p>
        </div>
        <Button onclick={saveConfig} disabled={saving}>
          <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </Card>

    <Card class="lg:col-span-2">
      <h3 class="text-lg font-semibold text-on-surface mb-4">Statistiques (30 derniers jours)</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="rounded-xl bg-surface-container-low border border-mint-subtle p-4">
          <p class="text-xs text-on-surface-variant uppercase tracking-wide">SMS traités</p>
          <p class="text-2xl font-extrabold text-on-surface mt-1">{total}</p>
        </div>
        <div class="rounded-xl bg-surface-container-low border border-mint-subtle p-4">
          <p class="text-xs text-on-surface-variant uppercase tracking-wide">Taux de réussite</p>
          <p class="text-2xl font-extrabold text-green-600 mt-1">{successRate} %</p>
        </div>
        <div class="rounded-xl bg-surface-container-low border border-mint-subtle p-4">
          <p class="text-xs text-on-surface-variant uppercase tracking-wide">Arbitrés CamenBert</p>
          <p class="text-2xl font-extrabold text-primary mt-1">{arbitrated}</p>
        </div>
        <div class="rounded-xl bg-surface-container-low border border-mint-subtle p-4">
          <p class="text-xs text-on-surface-variant uppercase tracking-wide">Désaccords</p>
          <p class="text-2xl font-extrabold text-error mt-1">{stats?.totals?.disagreedCount ?? 0}</p>
        </div>
        <div class="rounded-xl bg-surface-container-low border border-mint-subtle p-4">
          <p class="text-xs text-on-surface-variant uppercase tracking-wide">Ignorés</p>
          <p class="text-2xl font-extrabold text-outline mt-1">{ignored}</p>
        </div>
      </div>

      <div class="mt-6">
        <h4 class="text-sm font-semibold text-on-surface mb-2">Répartition par opérateur</h4>
        <div class="flex flex-col gap-2">
          {#each (stats?.totals?.byOperator ?? []).sort((a: any, b: any) => b._count - a._count) as op (op.operator)}
            <div class="flex items-center gap-3">
              <span class="w-28 text-xs font-medium text-on-surface-variant truncate">{op.operator ?? '—'}</span>
              <div class="flex-1 h-2 rounded-full bg-surface-container overflow-hidden">
                <div class="h-full rounded-full bg-primary" style="width:{total ? Math.max(4, Math.round((op._count / total) * 100)) : 0}%"></div>
              </div>
              <span class="w-10 text-xs text-right text-on-surface-variant">{op._count}</span>
            </div>
          {/each}
        </div>
      </div>

      <div class="mt-6 border-t border-mint-subtle pt-4">
        <h4 class="text-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
          <FlaskConical size={16} class="text-outline" /> Boîte de test (diagnostic complet)
        </h4>
        <div class="flex gap-2">
          <input
            bind:value={testBody}
            placeholder="Collez le corps d'un SMS bancaire..."
            class="flex-1 rounded-lg border border-mint-subtle bg-surface px-3 py-2 text-sm"
          />
          <Button onclick={runTest}>Tester</Button>
        </div>
        {#if testError}
          <p class="mt-3 text-sm text-error">{testError}</p>
        {:else if testResult}
          <div class="mt-3 rounded-xl bg-surface-container-low border border-mint-subtle p-3 text-sm">
            <p class="font-semibold text-on-surface">Verdict : {testResult.verdict} — {testResult.reason}</p>
            <pre class="mt-2 text-xs text-on-surface-variant overflow-x-auto whitespace-pre-wrap">{JSON.stringify(testResult.steps, null, 2)}</pre>
          </div>
        {/if}
      </div>
    </Card>
  </div>

  {#if cbStatus}
    <Card class="mt-6">
      <h3 class="text-sm font-semibold text-on-surface mb-2">Modèle CamenBert</h3>
      <p class="text-sm text-on-surface-variant">
        Prêt : {cbStatus.ready ? 'oui' : 'non'} — seuil : {(cbStatus.threshold * 100).toFixed(0)} % — inférences : {cbStatus.metrics?.totalInferences ?? 0} — latence moy. : {cbStatus.metrics?.avgLatencyMs?.toFixed?.(0) ?? 0} ms
      </p>
    </Card>
  {/if}
{/if}
```

**Note** : adapter le style aux tokens Tailwind déjà utilisés (`bg-surface`, `text-on-surface`, `border-mint-subtle`, `text-primary`, `text-error`, `bg-surface-container-low`) et vérifier que `Card`, `ToggleSwitch`, `Button`, `Spinner` acceptent les props utilisées (props suivre les usages de `Sms.svelte`).

- [ ] **Step 2: Vérifier le build admin**

Run: `cd admin && npm run build`
Expected: build OK. Si TS se plaint du `$derived` malformé, remplacer par des simples blocs `let` calculés dans `loadAll()`.

- [ ] **Step 3: Commit**

```bash
git add admin/src/pages/Pipeline.svelte
git commit -m "feat(admin): page Pipeline d'analyse (config, stats, test)"
```

---
### Task 9: Bloc compact « Pipeline d'analyse » dans `Sms.svelte`

**Files:**
- Modify: `admin/src/pages/Sms.svelte`

**Interfaces:**
- Consumes: `api.smsPipelineConfig()`, `api.updateSmsPipelineConfig()`, `onNavigate('pipeline')` (prop reçue de `App.svelte`), composants `Card`/`ToggleSwitch`.

- [ ] **Step 1: Ajouter la prop `onNavigate` et le bloc**

Dans `admin/src/pages/Sms.svelte` :
- Dans le `<script>`, ajouter la prop (après les imports, vers le haut) :

```ts
  let { onNavigate }: { onNavigate: (p: string) => void } = $props();
```

- Ajouter l'état du pipeline (après `let daysFilter = $state('14');`) :

```ts
  let pipeConfig = $state<{ regexEnabled: boolean; camenbertEnabled: boolean; camenbertThreshold: number } | null>(null);
  let pipeReady = $state(false);

  async function loadPipelineConfig() {
    try {
      const res = await api.smsPipelineConfig();
      pipeConfig = res.config;
      pipeReady = true;
    } catch {
      pipeReady = false;
    }
  }

  async function togglePipeline(key: 'regexEnabled' | 'camenbertEnabled') {
    if (!pipeConfig) return;
    const next = { ...pipeConfig, [key]: !pipeConfig[key] };
    pipeConfig = next;
    try {
      const res = await api.updateSmsPipelineConfig({ [key]: next[key] } as any);
      pipeConfig = res.config;
      toast.success('Pipeline mis à jour');
    } catch (e: any) {
      pipeConfig = { ...pipeConfig, [key]: !next[key] };
      toast.error(e.message);
    }
  }
```

- Appeler `loadPipelineConfig()` dans `onMount` (à côté du chargement des stats existant).
- Insérer le bloc compact juste après l'ouverture du contenu (après le `<h2>SMS</h2>`, vers la ligne 218) :

```svelte
  {#if pipeConfig}
    <div class="mb-5 rounded-xl bg-surface-container-low border border-mint-subtle p-4 flex flex-wrap items-center gap-4">
      <div class="flex items-center gap-2">
        <Workflow size={18} class="text-primary" />
        <span class="text-sm font-semibold text-on-surface">Pipeline d'analyse</span>
      </div>
      <label class="flex items-center gap-2 text-sm text-on-surface-variant">
        <ToggleSwitch bind:checked={pipeConfig.regexEnabled} onchange={() => togglePipeline('regexEnabled')} />
        Regex
      </label>
      <label class="flex items-center gap-2 text-sm text-on-surface-variant">
        <ToggleSwitch bind:checked={pipeConfig.camenbertEnabled} onchange={() => togglePipeline('camenbertEnabled')} />
        CamenBert
      </label>
      <span class="text-xs text-on-surface-variant">Seuil : {(pipeConfig.camenbertThreshold * 100).toFixed(0)} %</span>
      <button
        onclick={() => onNavigate('pipeline')}
        class="ml-auto text-sm font-medium text-primary hover:underline bg-transparent border-none cursor-pointer"
      >
        Ouvrir la page Pipeline →
      </button>
    </div>
  {/if}
```

- Ajouter `Workflow` à l'import lucide (ligne 3).

- [ ] **Step 2: Vérifier le build admin**

Run: `cd admin && npm run build`
Expected: build OK. Si `ToggleSwitch` ne propage pas `onchange`, utiliser un `bind:checked` + `onclick` sur la case ou un bouton dédié (adapter à l'implémentation réelle de `ToggleSwitch.svelte`).

- [ ] **Step 3: Commit**

```bash
git add admin/src/pages/Sms.svelte
git commit -m "feat(admin): bloc compact pipeline dans la page SMS"
```

---
### Task 10: Vérification globale

- [ ] **Step 1: Tests backend complets**

Run: `npx jest`
Expected: 0 échec (les erreurs de compilation TS ne bloquent pas jest avec ts-jest configuré en isolatedModules si c'est le cas — sinon corriger).

- [ ] **Step 2: Build backend**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: seules les erreurs PRÉEXISTANTES (admin `*.svelte` et app/auth `*.spec.ts`) — aucune erreur nouvelle.

- [ ] **Step 4: Build admin**

Run: `cd admin && npm run build`
Expected: OK.

- [ ] **Step 5: Smoke test e2e (optionnel, backend lancé)**

```bash
# 1) Config par défaut
curl -s http://localhost:4000/admin/sms/pipeline -H "Authorization: Bearer $TOKEN"
# 2) Désactiver le regex, vérifier un sync SMS → arbitré par CamenBert
curl -s -X PATCH http://localhost:4000/admin/sms/pipeline -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"regexEnabled":false}'
# 3) Stats avec les nouveaux agrégats
curl -s "http://localhost:4000/admin/sms/stats?days=30" -H "Authorization: Bearer $TOKEN" | jq '.totals.byArbitration, .totals.disagreedCount'
```
Expected: `byArbitration`/`byCbCategory`/`disagreedCount` présents, config persistée en Redis.

- [ ] **Step 6: Commit final (corrections éventuelles)**

```bash
git add -A
git commit -m "chore(sms): vérification globale du pipeline CamenBert"
```
(Ne commit que s'il y a des modifications réelles à ce stade.)
