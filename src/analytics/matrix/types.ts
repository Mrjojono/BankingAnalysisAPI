/**
 * Types du moteur matriciel.
 *
 * Le principe : transformer le contexte financier (RuleContext)
 * en vecteur numérique, le multiplier par une matrice de poids,
 * et obtenir des scores pour chaque intention possible.
 */

/**
 * Un vecteur = un tableau de nombres.
 * Chaque case représente une feature (catégorie, pourcentage, variation...).
 */
export type FeatureVector = number[];

/**
 * Matrice des poids : [lignes_features][colonnes_intentions]
 * - Chaque ligne = une feature du contexte
 * - Chaque colonne = une intention (LOGEMENT_HIGH, ALIMENTATION_SPIKE...)
 * - Chaque cellule = poids de cette feature pour cette intention
 *
 * Exemple :
 * ```
 *                LOGEMENT_HIGH  |  ALIMENTATION_SPIKE  |  CREDIT_HIGH
 * cat=LOGEMENT        1.0       |        0.0           |     0.0
 * cat=ALIMENTATION    0.0       |        1.0           |     0.0
 * percent             0.5       |        0.1           |     0.3
 * change              0.0       |        0.9           |     0.0
 * ```
 */
export type WeightMatrix = number[][];

/**
 * Mapping : nom de la feature → index dans le vecteur.
 * Permet de savoir à quelle case correspond "percent" ou "change".
 */
export type FeatureIndex = Record<string, number>;

/**
 * Mapping : nom de l'intention → index dans la matrice (colonne).
 * Permet de savoir quel score correspond à "LOGEMENT_HIGH".
 */
export type IntentIndex = Record<string, number>;

/**
 * Résultat du scoring : une intention avec son score.
 */
export type ScoredIntent = {
  kind: string;
  score: number;
};

/**
 * Matrice de la première couche (entrée → couche cachée).
 * Dimensions : [FEATURE_COUNT] × [HIDDEN_SIZE]
 */
export type HiddenWeights = number[][];

/**
 * Matrice de la deuxième couche (couche cachée → intentions).
 * Dimensions : [HIDDEN_SIZE] × [INTENT_COUNT]
 */
export type OutputWeights = number[][];

/**
 * Structure complète pour une architecture 2 couches.
 */
export type DeepWeightMatrices = {
  W1: HiddenWeights;
  W2: OutputWeights;
  hiddenSize: number;
};
