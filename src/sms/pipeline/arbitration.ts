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
    input.camenbertEnabled && input.cbConfidence >= input.camenbertThreshold;

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
