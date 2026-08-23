export interface GlossaryEntry {
  term: string;
  def: string;
  category:
    | 'produit'
    | 'regle'
    | 'metrique'
    | 'frais'
    | 'sigle'
    | 'score'
    | 'ia';
  seeAlso?: string[];
}

export const CATEGORIES: Record<
  string,
  { label: string; description: string }
> = {
  sigle: { label: 'Sigles', description: 'Sigles et acronymes bancaires' },
  produit: {
    label: 'Produits et services',
    description: 'Produits et services bancaires',
  },
  regle: { label: 'Règles', description: "Règles d'éligibilité et de scoring" },
  metrique: {
    label: 'Métriques',
    description: 'Métriques financières et ratios',
  },
  frais: { label: 'Frais', description: 'Frais et commissions bancaires' },
  score: {
    label: 'Score et éligibilité',
    description: 'Scores, statuts et mécanismes',
  },
  ia: {
    label: 'IA & Analytics',
    description: 'Classifieur, embeddings, matrice, entraînement',
  },
};

export const glossary: GlossaryEntry[] = [
  {
    term: 'BCEAO',
    def: "Banque Centrale des États de l'Afrique de l'Ouest. Fixe le taux d'endettement maximal à 33% des revenus et régule le secteur bancaire dans l'UEMOA.",
    category: 'sigle',
    seeAlso: [''],
  },
  {
    term: 'TAF',
    def: 'Taxe sur les Activités Financières. Taxe appliquée sur de nombreux frais et commissions bancaires (souvent 10% du montant de la commission).',
    category: 'sigle',
  },
  {
    term: 'TBB',
    def: 'Taux de Base Bancaire. Taux de référence utilisé par les banques pour le calcul des intérêts sur les prêts et découverts.',
    category: 'sigle',
  },
  {
    term: 'DAB',
    def: "Distributeur Automatique de Billets. Guichet automatique permettant les retraits d'espèces et les opérations courantes 24h/24.",
    category: 'sigle',
  },
  {
    term: 'GAB',
    def: 'Guichet Automatique de Banque. Synonyme de DAB. Terminal permettant les opérations bancaires en libre-service.',
    category: 'sigle',
  },
  {
    term: 'GIM',
    def: "Groupement Interbancaire Monétique. Réseau interbancaire qui gère l'interopérabilité des paiements par carte entre banques.",
    category: 'sigle',
  },
  {
    term: 'TPE',
    def: 'Terminal de Paiement Électronique. Appareil utilisé chez les commerçants pour accepter les paiements par carte bancaire.',
    category: 'sigle',
  },
  {
    term: 'UEMOA',
    def: 'Union Économique et Monétaire Ouest-Africaine. Zone monétaire commune de 8 pays utilisant le Franc CFA (BCEAO).',
    category: 'sigle',
  },
  {
    term: 'SWIFT',
    def: 'Society for Worldwide Interbank Financial Telecommunication. Réseau sécurisé utilisé pour les paiements et transferts internationaux.',
    category: 'sigle',
  },
  {
    term: 'CIP',
    def: "Centrale d'Incidents de Paiement. Registre central qui répertorie les incidents de paiement (chèques impayés, opposition, etc.).",
    category: 'sigle',
  },
  {
    term: 'ATD',
    def: 'Avis à Tiers Détenteur. Procédure légale de saisie administrative sur un compte bancaire pour recouvrement de dettes fiscales.',
    category: 'sigle',
  },
  {
    term: 'CEG',
    def: "Compte Épargne Garantie. Produit d'épargne réglementé avec garantie des fonds et taux d'intérêt fixé par la banque.",
    category: 'sigle',
  },
  {
    term: 'DAT',
    def: "Dépôt à Terme. Placement financier à échéance fixe (3 mois, 6 mois, 1 an...) avec un taux d'intérêt garanti, supérieur à l'épargne classique.",
    category: 'sigle',
  },
  {
    term: 'RIB',
    def: "Relevé d'Identité Bancaire. Document contenant les coordonnées bancaires complètes d'un compte (banque, guichet, numéro, clé).",
    category: 'sigle',
  },

  // ─── Produits et services ──────────────────────────────────────
  {
    term: 'Compte chèques',
    def: 'Compte bancaire de dépôt à vue permettant les opérations courantes : dépôts, retraits, virements, prélèvements. Aussi appelé compte courant.',
    category: 'produit',
  },
  {
    term: "Compte d'épargne",
    def: 'Compte rémunéré destiné à épargner. Génère des intérêts créditeurs (ex: 3,5%/an). Le capital est disponible à tout moment.',
    category: 'produit',
  },
  {
    term: 'Carte de débit',
    def: 'Carte bancaire permettant les paiements et retraits directement sur le solde du compte. Les montants sont prélevés immédiatement.',
    category: 'produit',
  },
  {
    term: 'Carte de crédit',
    def: 'Carte bancaire permettant de payer à crédit avec un débit différé (fin de mois). Souvent associée à une ligne de crédit renouvelable.',
    category: 'produit',
  },
  {
    term: 'Carte prépayée',
    def: 'Carte rechargeable non liée à un compte bancaire. Fonctionne avec un solde préchargé. Exemple typique : un plafond de chargement et un solde maximum.',
    category: 'produit',
  },
  {
    term: 'Prêt consommation',
    def: 'Prêt personnel destiné à financer des biens de consommation (véhicule, équipement, voyage, etc.). Montant généralement limité à 25 000€.',
    category: 'produit',
  },
  {
    term: 'Crédit habitat',
    def: "Prêt immobilier destiné à financer l'achat, la construction ou l'aménagement d'un logement. Durée longue (10-25 ans) et montant élevé.",
    category: 'produit',
  },
  {
    term: 'Découvert autorisé',
    def: "Facilité de caisse permettant au compte d'être à découvert jusqu'à un plafond convenu. Des agios (intérêts débiteurs) sont appliqués.",
    category: 'produit',
  },
  {
    term: 'Rachat de crédit',
    def: 'Opération financière qui consiste à regrouper plusieurs crédits en un seul prêt unique, avec une mensualité réduite et une durée allongée.',
    category: 'produit',
  },
  {
    term: 'Caution solidaire',
    def: "Engagement par lequel une personne (physique ou morale) se porte garante du remboursement d'un prêt. En cas de défaillance, le garant rembourse.",
    category: 'produit',
  },
  {
    term: "Aval d'effets de commerce",
    def: "Garantie donnée par une banque ou une personne sur un effet de commerce (traite, billet à ordre). L'avaliste s'engage à payer en cas de défaillance.",
    category: 'produit',
  },
  {
    term: 'Nantissement',
    def: "Mise en gage d'actifs (fonds de commerce, créances professionnelles, titres) en garantie d'un prêt. En cas d'impayé, le créancier peut saisir les actifs.",
    category: 'produit',
  },
  {
    term: 'Crédit documentaire',
    def: "Engagement irrévocable d'une banque de payer un fournisseur étranger sous conditions de remise de documents conformes. Utilisé en commerce international.",
    category: 'produit',
  },
  {
    term: 'Remise documentaire',
    def: "Opération de commerce international où la banque du client remet des documents d'expédition au fournisseur contre paiement ou acceptation.",
    category: 'produit',
  },

  // ─── Frais et commissions ──────────────────────────────────────
  {
    term: 'Frais de tenue de compte',
    def: 'Frais mensuels ou annuels prélevés par la banque pour la gestion et la maintenance du compte bancaire (relevés, suivi, etc.).',
    category: 'frais',
  },
  {
    term: 'Commission plus fort découvert',
    def: 'Commission prélevée mensuellement sur le montant du découvert le plus élevé du mois. Typiquement 0,05% du montant avec un minimum de 500 FCFA.',
    category: 'frais',
  },
  {
    term: "Commission d'engagement",
    def: 'Commission prélevée sur les lignes de crédit non utilisées. Rémunère la banque pour la mise à disposition permanente des fonds.',
    category: 'frais',
  },
  {
    term: "Frais d'incident",
    def: 'Frais facturés en cas de rejet de chèque, impayé de prélèvement, opposition, ou toute autre irrégularité de fonctionnement du compte.',
    category: 'frais',
  },
  {
    term: 'Frais de dossier',
    def: "Frais administratifs facturés pour l'étude, l'instruction et la mise en place d'un prêt ou d'un crédit.",
    category: 'frais',
  },
  {
    term: 'Forfait mobile money',
    def: 'Abonnement mensuel donnant accès aux services bancaires via téléphone mobile (Orange Money, MTN Mobile Money, etc.).',
    category: 'frais',
  },
  {
    term: "Commission d'activation",
    def: "Frais unique facturé lors de l'activation initiale d'un produit ou service bancaire (carte, compte épargne, etc.).",
    category: 'frais',
  },
  {
    term: 'Frais de clôture',
    def: "Frais facturés lors de la fermeture d'un compte bancaire, souvent si celle-ci intervient moins de 3 mois après l'ouverture.",
    category: 'frais',
  },
  {
    term: 'Attestation de solde',
    def: "Document officiel délivré par la banque attestant du solde d'un compte à une date donnée. Utilisé pour les dossiers administratifs, prêts, etc.",
    category: 'frais',
  },
  {
    term: 'Attestation de non-engagement',
    def: "Document certifiant qu'une personne n'a aucun engagement financier (prêt, caution, découvert) en cours auprès de la banque.",
    category: 'frais',
  },
  {
    term: 'Relevé de compte',
    def: "Document récapitulant l'ensemble des opérations (crédits, débits, frais) sur un compte bancaire sur une période donnée (mensuel généralement).",
    category: 'frais',
  },

  // ─── Règles et scoring ─────────────────────────────────────────
  {
    term: 'Règle ELIGIBILITY',
    def: "Type de règle qui détermine si un client est éligible à un produit. Chaque règle a un poids (weight) et un seuil à respecter. L'ensemble des règles ELIGIBILITY produit un score global.",
    category: 'regle',
  },
  {
    term: 'Règle FEE',
    def: 'Type de règle définissant des frais. Caractérisée par un montant fixe (flatAmount), un pourcentage, ou les deux. Peut avoir un montant minimum et/ou maximum.',
    category: 'regle',
  },
  {
    term: 'Règle LIMIT',
    def: 'Type de règle définissant une limite opérationnelle (ex: plafond de retrait DAB, montant maximum de paiement TPE par jour). Utilise un champ, un opérateur et une valeur.',
    category: 'regle',
  },
  {
    term: 'Règle INTEREST',
    def: "Type de règle définissant un taux d'intérêt. Utilise un pourcentage et une période (annuel, mensuel). Exemple: 3,5%/an sur livret d'épargne.",
    category: 'regle',
  },
  {
    term: 'Règle VALUE_DATE',
    def: "Type de règle définissant la date de valeur d'une opération. Exemple: J+1 pour les chèques, J pour les virements internes.",
    category: 'regle',
  },
  {
    term: 'Règle RATE',
    def: 'Type de règle définissant un taux applicable (taux débiteur, taux de commission). Similaire à INTEREST mais pour les taux non-intérêts.',
    category: 'regle',
  },
  {
    term: 'Poids (weight)',
    def: "Score maximum qu'une règle ELIGIBILITY peut apporter. Détermine l'importance de la règle dans la décision finale. Plus le poids est élevé, plus la règle est déterminante.",
    category: 'regle',
  },
  {
    term: 'Opérateur',
    def: 'Comparateur utilisé pour évaluer une règle: LESS_THAN (<), GREATER_THAN (>), EQUALS (=), BETWEEN (entre), NOT_EQUALS (!=). Permet de comparer la valeur du client au seuil défini.',
    category: 'regle',
  },
  {
    term: 'Seuil (value)',
    def: "Valeur limite définie dans une règle. Le client doit être en-dessous (ex: endettement < 33%) ou au-dessus (ex: revenus >= 200k) selon l'opérateur.",
    category: 'regle',
  },

  // ─── Métriques ─────────────────────────────────────────────────
  {
    term: 'StdDev (Écart-type)',
    def: 'Écart-type (Standard Deviation). Mesure de dispersion des valeurs autour de la moyenne. En analytics: stdDev des revenus mensuels = volatilité des revenus; stdDev du solde quotidien = volatilité du compte. Plus la valeur est élevée, plus les données sont dispersées.',
    category: 'metrique',
  },
  {
    term: 'Coefficient of Variation (CV)',
    def: 'Coefficient de variation = (stdDev / moyenne) × 100. Mesure relative de dispersion, exprimée en %. Permet de comparer la variabilité de différentes métriques indépendamment de leur échelle. Ex: CV = 25% sur les revenus = volatilité modérée.',
    category: 'metrique',
  },
  {
    term: 'VolatilityScore',
    def: 'Score de volatilité (0-100) calculé à partir du coefficient de variation. Plus le score est élevé, plus la métrique est stable (bon). Inversement, un score faible indique une forte volatilité (risque). Utilisé pour les revenus, le solde, et les dépenses.',
    category: 'metrique',
  },
  {
    term: 'StabilityScore',
    def: "Score de stabilité des revenus (0-100). Basé sur la régularité des entrées créditrices (écart-type des intervalles, nombre d'entrées par mois). Seuil: ≥ 80 = VERY_STABLE, ≥ 60 = STABLE, ≥ 40 = UNSTABLE, &lt; 40 = VERY_UNSTABLE.",
    category: 'metrique',
  },
  {
    term: 'StabilityLabel',
    def: 'Étiquette de stabilité des revenus: VERY_STABLE (très stable), STABLE (stable), UNSTABLE (instable), VERY_UNSTABLE (très instable), INSUFFICIENT_DATA (données insuffisantes). Déterminée par le StabilityScore.',
    category: 'metrique',
  },
  {
    term: 'VariationPercent',
    def: 'Variation en pourcentage entre deux périodes. Calcul: ((nouvelle_valeur - ancienne_valeur) / ancienne_valeur) × 100. Positif = hausse, négatif = baisse. Utilisé pour comparer mois en cours vs mois précédent.',
    category: 'metrique',
  },
  {
    term: 'Trend (tendance)',
    def: 'Direction de la tendance: UP (hausse), DOWN (baisse), STABLE (stable). Déterminée par la pente de régression linéaire sur les 6 derniers mois. Utilisée pour les revenus, les dépenses, et le score global.',
    category: 'metrique',
  },
  {
    term: 'NetFlow (flux net)',
    def: 'Différence entre le total des crédits et le total des débits sur une période: NetFlow = TotalCredits - TotalDebits. Positif = épargne nette. Négatif = déséquilibre financier. Exprimé en FCFA.',
    category: 'metrique',
  },
  {
    term: 'Rolling30Days',
    def: "Montant total des crédits (ou revenus) sur les 30 derniers jours glissants. Mesure plus réactive que la moyenne mensuelle car elle s'ajuste quotidiennement. Exprimé en FCFA.",
    category: 'metrique',
  },
  {
    term: 'Score ratio dépenses (expenseRatio)',
    def: 'Ratio dépenses/revenus exprimé en %. Calcul: (dépenses_total / revenus_total) × 100. Labels: ≤ 50% = EXCELLENT, ≤ 75% = SAIN, ≤ 90% = ATTENTION, &gt; 90% = CRITIQUE. Un ratio &gt; 100% = les dépenses dépassent les revenus.',
    category: 'metrique',
  },
  {
    term: 'OverdraftRate (taux découvert)',
    def: 'Pourcentage de jours où le compte est en découvert: (jours_découvert / jours_total) × 100. Labels: 0% = EXCELLENT, &lt; 10% = SAIN, &lt; 25% = ATTENTION, &lt; 50% = PRUDENCE, ≥ 50% = CRITIQUE.',
    category: 'metrique',
  },
  {
    term: 'OverdraftDays (jours découvert)',
    def: 'Nombre de jours calendaires où le solde du compte est négatif (à découvert) sur une période donnée. Indicateur clé de santé financière. Plus le nombre est élevé, plus le client est en difficulté de trésorerie.',
    category: 'metrique',
  },
  {
    term: 'BCEAO Threshold (seuil BCEAO)',
    def: "Seuil réglementaire de la Banque Centrale fixant le taux d'endettement maximum à 33% des revenus mensuels. Défini par la constante BCEAO_DEBT_RATIO_THRESHOLD = 33. Utilisé comme référence dans l'évaluation du debtRatio.",
    category: 'metrique',
  },
  {
    term: 'DebtRatio (taux endettement)',
    def: "Taux d'endettement = (total_mensualités_dettes / revenus_mensuels) × 100. La BCEAO fixe le maximum à 33%. Labels: &lt; 20% = EXCELLENT, &lt; 33% = SAIN, &lt; 50% = ATTENTION, ≥ 50% = CRITIQUE. Interprétation textuelle générée dynamiquement.",
    category: 'metrique',
  },
  {
    term: 'Margin (marge endettement)',
    def: "Marge de manœuvre avant d'atteindre le seuil BCEAO de 33%. Calcul: 33 - debtRatio. Positive = sous le seuil (bon). Négative = au-dessus du seuil (alerte). Exemple: margin = 8% signifie qu'il reste 8% de marge avant le plafond réglementaire.",
    category: 'metrique',
  },
  {
    term: 'MonthlyIncome (revenus mensuels)',
    def: "Revenus mensuels moyens calculés sur la période d'analyse (défaut: 6 mois). Inclut les crédits récurrents (salaire, pensions) et les entrées régulières. Source: transactions bancaires historiques. Exprimé en FCFA.",
    category: 'metrique',
  },
  {
    term: 'MonthlyExpenses (dépenses mens.)',
    def: "Dépenses mensuelles moyennes calculées sur la période d'analyse. Inclut toutes les sorties de fonds: prélèvements, paiements, retraits, virements. Exprimé en FCFA.",
    category: 'metrique',
  },
  {
    term: 'MonthlyDebtPayments (mensualités)',
    def: 'Total des mensualités de remboursement de dettes détectées. Calculé en analysant les transactions récurrentes identifiées comme des remboursements de crédit. Exprimé en FCFA.',
    category: 'metrique',
  },
  {
    term: 'SavingsRate (taux épargne)',
    def: "Taux d'épargne = (revenus - dépenses - dettes) / revenus × 100. Le seuil Garman & Forgue recommande ≥ 10%. Labels: ≥ 20% = EXCELLENT, ≥ 10% = BIEN, ≥ 5% = MOYEN, &gt; 0% = FAIBLE, ≤ 0% = CRITIQUE.",
    category: 'metrique',
  },
  {
    term: 'Garman-Forgue Threshold',
    def: "Seuil de référence de 10% pour le taux d'épargne, issu des travaux des économistes Garman & Forgue. Constante: GARMAN_FORGUE_SAVINGS_RATE_THRESHOLD = 10. En dessous de ce seuil, l'épargne est considérée insuffisante.",
    category: 'metrique',
  },
  {
    term: 'NetSavings (épargne nette)',
    def: "Épargne nette mensuelle = monthlyIncome - monthlyExpenses - monthlyDebtPayments. Montant réellement disponible pour l'épargne après toutes les dépenses et dettes. Si négatif = déficit mensuel (désépargne).",
    category: 'metrique',
  },
  {
    term: 'RegularityRate (régularité)',
    def: "Taux de régularité (0-100%) mesurant la constance d'un comportement financier. Utilisé pour: la régularité des remboursements (paiements à temps), la régularité de l'épargne (dépôts mensuels), la régularité des revenus.",
    category: 'metrique',
  },
  {
    term: 'AverageRetentionDays (rétention)',
    def: "Nombre moyen de jours pendant lesquels les revenus restent sur le compte avant d'être dépensés ou transférés. Un nombre élevé (≥ 30 jours) indique une bonne capacité de rétention. Faible (&lt; 7 jours): les revenus sont dépensés rapidement.",
    category: 'metrique',
  },
  {
    term: 'OverdraftLabel (label découvert)',
    def: 'Étiquette qualitative du taux de découvert: EXCELLENT (0%), SAIN (&lt;10%), ATTENTION (&lt;25%), PRUDENCE (&lt;50%), CRITIQUE (≥50%). Chaque niveau correspond à un区间 de risque pour la banque.',
    category: 'metrique',
  },
  {
    term: 'RatioLabel (label ratio)',
    def: 'Étiquette qualitative du ratio dépenses/revenus: EXCELLENT (≤ 50%), SAIN (≤ 75%), ATTENTION (≤ 90%), CRITIQUE (&gt; 90%). Utilisée dans les réponses API pour donner un jugement lisible sans calcul.',
    category: 'metrique',
  },
  {
    term: 'Frequency (fréquence)',
    def: "Périodicité détectée d'une dépense récurrente. Actuellement toujours MONTHLY (mensuel). Patterns détectés: écart de 25-35 jours entre occurrences, montant variant de moins de 10%. Futures fréquences possibles: WEEKLY, BIWEEKLY, QUARTERLY, YEARLY.",
    category: 'metrique',
  },
  {
    term: 'NextExpectedDate',
    def: "Date estimée de la prochaine occurrence d'une dépense récurrente. Calculée en ajoutant l'intervalle moyen aux dates d'occurrences passées. Format: ISO date (YYYY-MM-DD). Utilisé pour anticiper les flux de trésorerie.",
    category: 'metrique',
  },
  {
    term: 'DailyBalance (solde quotidien)',
    def: 'Solde du compte bancaire à la fin de chaque journée civile. Calculé à partir des transactions (crédits, débits) et du solde initial. Utilisé pour calculer la moyenne, les extrêmes, et la volatilité du solde.',
    category: 'metrique',
  },
  {
    term: 'BalanceRange (étendue solde)',
    def: 'Différence entre le solde maximum et le solde minimum sur une période: Range = MaxBalance - MinBalance. Exprimé en FCFA. Une étendue élevée indique de fortes fluctuations et potentiellement une gestion de trésorerie instable.',
    category: 'metrique',
  },
  {
    term: 'NegativePeriod (période négative)',
    def: 'Période continue pendant laquelle le solde du compte est négatif (inférieur à zéro). Caractérisée par: date de début (from), date de fin (to), durée en jours, et solde minimum observé pendant la période.',
    category: 'metrique',
  },
  {
    term: 'AverageDuration (durée moyenne)',
    def: 'Durée moyenne des périodes de découvert (jours). Calcul: somme des durées de toutes les périodes négatives / nombre de périodes. Complète le nombre total de jours de découvert en donnant le pattern: périodes longues ou fréquentes?',
    category: 'metrique',
  },
  {
    term: 'PaymentsOnTime (paiements à temps)',
    def: 'Nombre de mensualités de crédit remboursées dans les délais (à la date attendue ou avant). Utilisé pour calculer le regularityRate des remboursements. Plus le nombre est élevé, meilleure est la fiabilité du client.',
    category: 'metrique',
  },
  {
    term: 'MonthsAnalyzed (mois analysés)',
    def: "Nombre de mois civils utilisés pour l'analyse financière. Valeur par défaut: 6 (constante DEFAULT_LOOKBACK_MONTHS). Impacte la fiabilité de toutes les métriques: plus de mois = meilleure précision, mais données plus anciennes = moins représentatives.",
    category: 'metrique',
  },
  {
    term: 'Revenus mensuels (monthlyIncome)',
    def: 'Moyenne des revenus mensuels perçus sur les 3 à 6 derniers mois. Inclut salaires, pensions, revenus locatifs et autres sources régulières.',
    category: 'metrique',
  },
  {
    term: 'Ratio dépenses/revenus (expenseRatio)',
    def: "Pourcentage des revenus consommé par les dépenses courantes. Un ratio élevé (> 80%) indique une fragilité financière et une faible capacité d'épargne.",
    category: 'metrique',
  },
  {
    term: "Taux d'épargne (savingsRate)",
    def: 'Pourcentage des revenus mensuels épargné. Calcul: (revenus - dépenses) / revenus × 100. Un bon taux est supérieur à 10%.',
    category: 'metrique',
  },
  {
    term: 'Jours de découvert (overdraftDays)',
    def: 'Nombre de jours dans le mois où le compte bancaire est à découvert (solde négatif). Un nombre élevé indique des difficultés de trésorerie.',
    category: 'metrique',
  },
  {
    term: 'Régularité de remboursement',
    def: "Score (0-100) mesurant la ponctualité des remboursements de crédit. Basé sur l'historique des échéances et le respect des dates de paiement.",
    category: 'metrique',
  },
  {
    term: 'Volatilité des revenus',
    def: "Score (0-100) mesurant l'irrégularité des revenus. Des revenus très variables (travailleurs indépendants, commerçants) augmentent le risque perçu.",
    category: 'metrique',
  },
  {
    term: "Régularité d'épargne",
    def: "Score (0-100) mesurant la constance des dépôts d'épargne. Une épargne régulière (mensuelle) est un signe de discipline financière.",
    category: 'metrique',
  },
  {
    term: "Fonds d'urgence (emergencyFundScore)",
    def: "Score basé sur le nombre de mois de dépenses courantes couverts par l'épargne disponible. 3+ mois de dépenses = excellent score (100).",
    category: 'metrique',
  },
  {
    term: 'Volatilité du solde',
    def: 'Score (0-100) mesurant les fluctuations du solde bancaire. Un solde stable avec des variations prévisibles indique une bonne gestion financière.',
    category: 'metrique',
  },

  // ─── Score et éligibilité ──────────────────────────────────────
  {
    term: 'Score éligibilité',
    def: "Score global calculé à partir de toutes les règles ELIGIBILITY d'un produit. Sum des points obtenus / sum des poids max × 100. ≥ 80% = éligible.",
    category: 'score',
  },
  {
    term: 'Statut ELIGIBLE',
    def: "Le client remplit toutes les conditions d'éligibilité (score ≥ 80%). Le produit peut lui être proposé sans restriction.",
    category: 'score',
  },
  {
    term: 'Statut PARTIAL',
    def: 'Le client remplit partiellement les conditions (score ≥ 50% mais < 80%). Le produit peut être accordé sous conditions (garantie supplémentaire, apport plus élevé).',
    category: 'score',
  },
  {
    term: 'Statut NOT_ELIGIBLE',
    def: 'Le client ne remplit pas les conditions minimales (score < 50%). Le produit ne peut pas lui être accordé.',
    category: 'score',
  },
  {
    term: 'Statut PASS (règle)',
    def: 'La règle est respectée. La valeur du client est dans les limites autorisées. La règle rapporte la totalité de son poids en points.',
    category: 'score',
  },
  {
    term: 'Statut PARTIAL (règle)',
    def: 'La règle est partiellement respectée. La valeur du client est proche du seuil (écart ≤ 20%). La règle rapporte 40% de son poids en points.',
    category: 'score',
  },
  {
    term: 'Statut FAIL (règle)',
    def: "La règle n'est pas respectée. La valeur du client dépasse le seuil autorisé. La règle ne rapporte aucun point (0).",
    category: 'score',
  },
  {
    term: 'ANALYTICS_FIELD_MAP',
    def: 'Table de correspondance entre les champs des règles (field) et les métriques calculées par le moteur analytics. Permet aux règles de lire automatiquement les données financières du client.',
    category: 'score',
  },
  {
    term: 'Période (period)',
    def: 'Fréquence associée à une règle: MONTHLY (mensuel), YEARLY (annuel), PER_TRANSACTION (par opération), DAILY (quotidien), WEEKLY (hebdomadaire).',
    category: 'regle',
  },
  {
    term: 'Monnaie (currency)',
    def: 'Devise dans laquelle les montants sont exprimés: XOF (Franc CFA, défaut), EUR (Euro), USD (Dollar), GBP (Livre Sterling).',
    category: 'regle',
  },
  {
    term: 'Code produit',
    def: "Identifiant unique d'un produit bancaire dans le système. Exemples: COMPTES_PART, VISA_LIBERTE, CREDIT_HABITAT_PART. Utilisé pour regrouper les règles par produit.",
    category: 'produit',
  },
  {
    term: 'Règles informatives',
    def: 'Règles de type FEE, LIMIT, INTEREST ou VALUE_DATE. Ne sont pas scorées mais fournissent des informations sur les frais, limites et taux associés au produit.',
    category: 'regle',
  },
  {
    term: 'Opérateur BETWEEN',
    def: 'Opérateur qui vérifie si une valeur se situe entre deux bornes: valueMin ≤ clientValue ≤ valueMax. Utilisé pour les plages de valeurs acceptables.',
    category: 'regle',
  },
  {
    term: 'Page Produits',
    def: 'Interface de gestion des produits bancaires. Permet de créer, modifier, et supprimer des produits. Chaque produit a un code unique, un nom, une description, une catégorie et un statut actif/inactif. Le nombre de règles associées est affiché dans le tableau.',
    category: 'regle',
  },
  {
    term: 'Page Règles',
    def: 'Interface de gestion des règles. Permet de créer des règles de type ELIGIBILITY (scorée), FEE (frais), LIMIT (plafond), RATE (taux), VALUE_DATE (date valeur) ou INTEREST (intérêt). Chaque règle est liée à un champ métier (field), un opérateur, une valeur seuil, et optionnellement un produit.',
    category: 'regle',
  },
  {
    term: 'Page Messages (catalog)',
    def: "Interface d'édition du fichier catalog.json. Contient 4 sections: eligibility (messages d'éligibilité par pattern), advice_templates (conseils financiers), interpreter (règles d'interprétation budgétaire) et labels (libellés des catégories de budget). Utilise des placeholders {value}, {threshold}, {unit}, {label}, {gap} remplacés dynamiquement.",
    category: 'regle',
  },
  {
    term: 'Page Lexique',
    def: "Lexique bancaire contenant les définitions de tous les termes utilisés dans le système d'éligibilité. Organisé en 6 catégories: Sigles, Produits, Règles, Métriques, Frais, Score. Les définitions sont modifiables dans admin/src/lib/data/glossary.ts.",
    category: 'regle',
  },
  {
    term: 'Pattern RATE_MAX',
    def: 'Pattern de message utilisé pour les règles avec un plafond de taux (ex: endettement < 33%). Placeholders: {value} (valeur client), {threshold} (seuil max), {unit} (unité). Statuts: pass/fail/partial/advice.',
    category: 'score',
  },
  {
    term: 'Pattern RATE_MIN',
    def: 'Pattern de message pour les règles avec un minimum de taux (ex: épargne ≥ 10%). Placeholders: {value}, {threshold}, {unit}. Affiche un message différent selon le statut (pass/fail/partial/advice).',
    category: 'score',
  },
  {
    term: 'Pattern AMOUNT_MIN',
    def: "Pattern pour les règles avec un montant minimum (ex: revenus ≥ 200 000 FCFA). Placeholders: {value}, {threshold}, {unit} (souvent ' FCFA').",
    category: 'score',
  },
  {
    term: 'Pattern AMOUNT_MAX',
    def: "Pattern pour les règles avec un plafond de montant (ex: découvert max 50 000 FCFA). Utilise {value}, {threshold}, {unit}, {gap} pour indiquer l'écart à combler.",
    category: 'score',
  },
  {
    term: 'Pattern RANGE',
    def: "Pattern pour les règles BETWEEN (valeur entre min et max). Utilise {value}, {min}, {max}, {unit}. Spécifique car utilise deux bornes au lieu d'un seul seuil.",
    category: 'score',
  },
  {
    term: 'PersonalAdvice (conseil perso.)',
    def: "Conseil personnalisé généré par le moteur d'advice (GET /analytics/:customerId/advice). Champs: type (ex: SPENDING_SPIKE, INCOME_DROP, GOOD_HABIT), severity (INFO/WARNING/CRITICAL), title, message, action, metric (current, previous, change, threshold).",
    category: 'score',
  },
  {
    term: 'AdviceIntentKind (type intention)',
    def: "Enum des types d'intentions de conseil: LOGEMENT_CRITICAL, LOGEMENT_HIGH, LOGEMENT_OK, CREDIT_HIGH, CREDIT_NEAR_LIMIT, CREDIT_INCREASE, ALIMENTATION_SPIKE, ALIMENTATION_HIGH, TRANSPORT_SPIKE, TRANSPORT_HIGH, COMMERCE_SPIKE, CARBURANT_SPIKE, SANTE_HIGH, MOBILE_MONEY_HIGH, FEES_HIGH, INCOME_DROP, GOOD_HABIT (17 valeurs).",
    category: 'score',
  },
  {
    term: 'ScoreHistory (historique score)',
    def: "Historique des scores financiers mensuels. Chaque entrée: month (YYYY-MM), score (0-100), label (EXCELLENT/GOOD/FRAGILE/CRITICAL). Retourne aussi: trend (UP/DOWN/STABLE), improvement (texte résumant l'évolution, ex: '+5 points sur 6 mois').",
    category: 'score',
  },
  {
    term: 'EligibilityResult (résultat élig.)',
    def: "Résultat complet d'évaluation d'éligibilité à un produit. Champs: productCode, productName, globalScore, maxScore, scorePercent, status (ELIGIBLE/PARTIAL/NOT_ELIGIBLE), ruleResults[], infoRules[], passedRules[], failedRules[], partialRules[]. Retourné par POST /eligibility/evaluate.",
    category: 'score',
  },
  {
    term: 'RuleResult (résultat règle)',
    def: "Résultat d'évaluation d'une règle individuelle. Champs: ruleId, ruleCode, label, status (PASS/FAIL/PARTIAL), valueSource (analytics/input/not_found), clientValue, threshold, thresholdMin/Max, scoreEarned, scoreMax, message, advice. Permet de comprendre précisément pourquoi une règle a réussi/échoué.",
    category: 'score',
  },
  {
    term: 'ValueSource (source valeur)',
    def: "Indique d'où provient la valeur du client utilisée pour évaluer une règle: analytics (calculée par le moteur analytics), input (saisie manuelle), not_found (non trouvée → la règle échoue automatiquement). Trace la provenance des données dans le résultat d'évaluation.",
    category: 'score',
  },
  {
    term: 'Score éligibilité (détail)',
    def: "Le score est calculé par la fonction calculateScore(rules, metrics). Pour chaque règle: si PASS → weight, si PARTIAL → weight × 0.4, si FAIL → 0. Score final = (sum obtenus / sum poids) × 100. Arrondi à l'entier.",
    category: 'score',
  },
  {
    term: "Moteur d'éligibilité",
    def: "Composant situé dans src/services/eligibility/ qui évalue les règles d'un produit pour un client. Appelle gatherMetrics(clientId) pour collecter les données, puis évalue chaque règle via evaluateRule(). Produit un statut (ELIGIBLE/PARTIAL/NOT_ELIGIBLE) et des messages à afficher au client.",
    category: 'score',
  },
  {
    term: 'Messages catalog.json',
    def: "Fichier JSON dans src/messages/catalog.json contenant tous les modèles de messages. Organisé par section: eligibility (10 patterns), advice_templates (alertes), interpreter (règles budgétaires), labels (libellés). Modifiable via l'interface Messages de l'admin.",
    category: 'score',
  },
  {
    term: 'ANALYTICS_FIELD_MAP',
    def: 'Table de correspondance dans le code qui fait le lien entre les champs des règles (field) et les métriques calculées par le moteur analytics. Exemple: debtRatio → debt_ratio, monthlyIncome → monthly_income. Voir src/services/eligibility/ pour le mapping complet.',
    category: 'score',
  },
  {
    term: 'Pondération (weight)',
    def: "Chaque règle ELIGIBILITY a un poids (weight) de 1 à 10 qui détermine son importance. Le poids maximum total pour un produit est la somme des poids de toutes ses règles ELIGIBILITY. Une règle avec weight=10 est 2× plus importante qu'une règle weight=5.",
    category: 'regle',
  },

  // ─── IA & Analytics ─────────────────────────────────────────────
  {
    term: 'GlobalScore (score global)',
    def: 'Score financier global (0-100) calculé à partir de 4 composantes pondérées: dépenses (25%), endettement (25%), épargne (25%), stabilité (25%). Labels: ≥ 80 = EXCELLENT, ≥ 60 = GOOD, ≥ 40 = FRAGILE, &lt; 40 = CRITICAL. Retourné par GET /analytics/:customerId/score.',
    category: 'ia',
  },
  {
    term: 'ScoreComponent (composante)',
    def: 'Chacune des 4 dimensions du score global: C1_expenses, C2_debt, C3_savings, C4_stability. Chaque composante a: score (0-100), weight (poids, toujours 0.25), contribution (score × weight). La somme des contributions = globalScore.',
    category: 'ia',
  },
  {
    term: 'Interpretation (interprétation)',
    def: "Objet JSON contenant pour chaque composante du score: level (CRITIQUE/FAIBLE/MOYEN/BON/EXCELLENT), label (titre lisible), message (explication détaillée), priorities[] (actions prioritaires suggérées). Généré par l'InterpreterEngine.",
    category: 'ia',
  },
  {
    term: 'ScoreIndicator (indicateur)',
    def: "Indicateur détaillé du score contenant: name (nom lisible), value (valeur formatée, ex: '45%'), score (0-100), impact (POSITIF/NÉGATIF/NEUTRE). Retourné par GET /analytics/:customerId/score/explanation pour expliquer les forces et faiblesses.",
    category: 'ia',
  },
  {
    term: 'Recommendation (recommandation)',
    def: "Conseil personnalisé généré par le RecommendationEngine. Champs: priority (HIGH/MEDIUM/LOW), component (C1-C4), trigger (condition déclencheuse, ex: 'Taux epargne < 5%'), title, message, actionAmount (montant suggéré en FCFA), source.",
    category: 'ia',
  },
  {
    term: 'Verdict (décision SMS)',
    def: "Décision finale du filtre SMS: INSERT (le SMS sera inséré en base) ou SKIP (le SMS sera ignoré). Retourné par l'endpoint POST /admin/sms/debug. Basé sur l'analyse du parseSms, de la validation de date, et du classifieur.",
    category: 'ia',
  },
  {
    term: 'ParseSms (analyse SMS)',
    def: "Étape de diagnostic qui extrait les champs d'un SMS bancaire: operator (opérateur mobile détecté), direction (credit/débit), amount (montant parsé), sender (expéditeur). Si le parse échoue, le verdict est SKIP avec raison parseEmpty ou noId.",
    category: 'ia',
  },
  {
    term: 'DateValidation (validation date)',
    def: 'Étape de diagnostic qui vérifie si la date extraite du SMS est valide. Champs: raw (chaîne brute), valid (boolean). Si la date est invalide ou absente, le verdict est SKIP avec raison invalidDate.',
    category: 'ia',
  },
  {
    term: 'Classifier Debug (test classifieur)',
    def: 'Résultat détaillé du test du classifieur sur une description SMS. Champs: exact (match exact + score), fuse (fuzzy match + score), embedding (similarité cosinus + catégorie), embeddingTop3 (top-3 catégories), bayes (catégorie probabiliste), winner (catégorie gagnante).',
    category: 'ia',
  },
  {
    term: 'ExactMatchScore',
    def: "Score du match exact textuel. Valeur fixe = 10 (ou 0 si aucun mot-clé exact trouvé). Priorité maximale dans l'ordre des méthodes de classification. Si match exact trouvé, les autres méthodes ne sont pas consultées.",
    category: 'ia',
  },
  {
    term: 'FuseScore',
    def: "Score de la recherche approximative Fuse.js (0-10). Un score ≥ 4 est considéré fiable. Tolère les fautes de frappe et les variations orthographiques (distance de Levenshtein). Deuxième méthode dans l'ordre de priorité du classifieur.",
    category: 'ia',
  },
  {
    term: 'EmbeddingTop3',
    def: 'Top 3 des catégories les plus proches par similarité cosinus (embedding). Retourné sous forme de tableau: [{category: string, score: number}]. Score ≥ 0.5 = correspondance significative. Affiche la marge entre la 1ʳᵉ et la 2ᵉ catégorie.',
    category: 'ia',
  },
  {
    term: 'ConfusionMatrix (matrice confusion)',
    def: "Matrice de confusion du module d'évaluation d'entraînement. Structure: { [expected: string]: { [predicted: string]: count } }. Chaque ligne = intention attendue, chaque colonne = intention prédite. La diagonale = prédictions correctes. Les hors-diagonale = erreurs.",
    category: 'ia',
  },
  {
    term: 'TrainingMetrics (métriques train)',
    def: "Métriques enregistrées à chaque époque d'entraînement: epoch (numéro), loss (erreur), accuracy (précision %), top3Accuracy (bonne réponse dans le top 3 %). Permet de tracer la courbe d'apprentissage et détecter le surapprentissage.",
    category: 'ia',
  },
  {
    term: 'TrainingConfig (config train)',
    def: "Configuration de l'entraînement: epochs (nombre d'époques, défaut: 100), learningRate (taux d'apprentissage, défaut: 0.01), margin (marge loss, défaut: 0.5), dataFile (chemin fichier données), layers (1 ou 2 couches). Renvoyée par POST /admin/training/run.",
    category: 'ia',
  },
  {
    term: 'FinalAccuracy (accuracy finale)',
    def: "Précision finale après la dernière époque d'entraînement. Pourcentage de classifications correctes sur l'ensemble des données d'entraînement. Une accuracy ≥ 90% est considérée comme un bon modèle. Affichée dans l'interface Entraînement.",
    category: 'ia',
  },
  {
    term: 'ScoredCategory (catégorie scorée)',
    def: 'Paire { category: ExpenseCategory, score: number } représentant une catégorie avec son score de similarité cosinus (0-1). Utilisée par EmbeddingClassifier et retournée dans embeddingTop3. Plus le score est proche de 1, plus la correspondance est forte.',
    category: 'ia',
  },
  {
    term: 'ScoredIntent (intention scorée)',
    def: "Paire { kind: AdviceIntentKind, score: number } représentant une intention d'alerte avec son score numérique. Utilisée dans ScoringEngine et dans les erreurs de classification (errors[].scores) de la matrice de confusion. Score ≥ 0.8 = seuil de rétention.",
    category: 'ia',
  },
  {
    term: 'EvaluationReport (rapport éval.)',
    def: "Rapport complet d'évaluation d'un modèle entraîné. Champs: total (nombre d'exemples), accuracy (%), top3Accuracy (%), confusionMatrix, errors[] (liste des erreurs avec id, expected, predicted, scores). Retourné après chaque entraînement.",
    category: 'ia',
  },
  {
    term: 'SyncResult (résultat synchro)',
    def: 'Résultat de la synchronisation SMS: synced (nombre de SMS insérés), duplicates (doublons ignorés), skipped (SMS non financiers ignorés). Retourné par POST /sms/sync. Les skip reasons sont tracées par catégorie dans les logs.',
    category: 'ia',
  },
  {
    term: 'Weight Matrix',
    def: "Matrice 21×17 reliant les 21 features de base aux 17 intentions (AdviceIntent). Chaque cellule contient un poids : positif = activation, négatif = inhibition. Le score d'une intention = somme pondérée des features. Initialisée pour reproduire les 16 règles if/else historiques.",
    category: 'ia',
  },
  {
    term: 'Deep Weight Matrices (2 couches)',
    def: "Architecture à 2 couches : W1 (321×32) relie les 321 features à 32 neurones cachés, W2 (32×17) relie les 32 neurones cachés aux 17 intentions. Utilisée quand les embeddings 300D sont disponibles. Plus expressive mais nécessite plus de données d'entraînement.",
    category: 'ia',
  },
  {
    term: 'Feature Index',
    def: 'Mapping des noms de features (cat_LOGEMENT, percent, change, amount_ratio, expense_ratio…) vers leur position (0-20) dans le vecteur. Défini dans context-vector.builder.ts.',
    category: 'ia',
  },
  {
    term: 'Intent Index',
    def: "Mapping des noms d'intentions (LOGEMENT_CRITICAL, ALIMENTATION_SPIKE, GOOD_HABIT…) vers leur colonne (0-16) dans la matrice des poids. Défini dans intent-matrix.ts.",
    category: 'ia',
  },
  {
    term: 'AdviceIntent (intention)',
    def: "Résultat d'interprétation du moteur matriciel. Représente un conseil ou une alerte sur la situation financière du client. Exemples : LOGEMENT_CRITICAL (loyer > 50% revenus), ALIMENTATION_SPIKE (pic dépenses nourriture), GOOD_HABIT (bon ratio épargne). 17 intentions possibles.",
    category: 'ia',
  },
  {
    term: 'Seuil 0.8 (scoring)',
    def: "Score minimum (0.8) pour qu'une intention soit retenue par le ScoringEngine. Les intentions avec un score inférieur sont rejetées. Évite les faux positifs et ne conserve que les alertes pertinentes.",
    category: 'ia',
  },
  {
    term: 'ScoringEngine',
    def: 'Calcule le score de chaque intention en multipliant le Feature Vector par la Weight Matrix (produit scalaire). Version 1-layer : score = W × v. Version deep : score = softmax(ReLU(W1 × v) × W2). Seuil à 0.8.',
    category: 'ia',
  },
  {
    term: 'MatrixInterpreterEngine',
    def: "Nouveau moteur d'interprétation qui remplace l'ancien InterpreterEngine (if/else). Détecte automatiquement si les embeddings sont disponibles : 321 features + 2 couches si oui, 21 features + 1 couche sinon. Injection via NestJS DI override dans AnalyticsModule.",
    category: 'ia',
  },
  {
    term: 'Embedding (plongement lexical)',
    def: "Représentation vectorielle d'un mot dans un espace continu à 300 dimensions. Les mots sémantiquement proches (ex: 'loyer' et 'appartement') ont des vecteurs similaires. Chargé depuis le fichier fastText cc.fr.300.vec (français, 50 000 mots).",
    category: 'ia',
  },
  {
    term: 'Centroïde',
    def: "Vecteur moyen obtenu en moyennant les embeddings de tous les mots-clés d'une catégorie. Chaque ExpenseCategory (LOGEMENT, ALIMENTATION…) a un centroïde qui représente le sens moyen de ses mots. La classification cosine compare une description à chaque centroïde.",
    category: 'ia',
  },
  {
    term: 'Cosine Similarity',
    def: 'Mesure de similarité entre deux vecteurs : cos(θ) = (A·B) / (|A| × |B|). Résultat entre -1 (opposé) et 1 (identique). 0 = orthogonal (aucun rapport). Utilisée par EmbeddingClassifier pour classer une description dans la catégorie la plus proche.',
    category: 'ia',
  },
  {
    term: 'Exact Match',
    def: "Méthode de classification la plus rapide : recherche textuelle stricte des mots-clés dans la description. Si la description contient 'LOYER', elle est classée en LOGEMENT. Score fixe = 10. Priorité maximale dans l'ordre des méthodes.",
    category: 'ia',
  },
  {
    term: 'Fuse.js (Fuzzy Match)',
    def: "Bibliothèque de recherche approximative tolérant fautes de frappe et variations. Pour chaque mot de la description, cherche le mot-clé le plus proche. Score sur 10 : ≥ 4 = fiable. Deuxième méthode dans l'ordre de priorité.",
    category: 'ia',
  },
  {
    term: 'Bayes Classifier',
    def: "Classifieur probabiliste Naïve Bayes de la bibliothèque natural. Entraîné sur tous les mots-clés de EXPENSE_KEYWORDS. Retourne directement la catégorie la plus probable sans score numérique. Dernière méthode de l'ordre de priorité.",
    category: 'ia',
  },
  {
    term: 'EmbeddingClassifier',
    def: 'Classifieur basé sur les embeddings : calcule le centroïde de chaque ExpenseCategory, vectorise la description via TextVectorizer, puis trouve la catégorie dont le centroïde est le plus proche (cosine similarity ≥ 0.5). Peut retourner le top-N des catégories les plus proches.',
    category: 'ia',
  },
  {
    term: 'TextVectorizer',
    def: "Transforme un texte en vecteur 300D en tokenisant et en faisant la moyenne des embeddings de chaque mot. Si aucun embedding n'est trouvé pour un mot, il est ignoré. Retourne un vecteur nul si aucun mot n'est reconnu.",
    category: 'ia',
  },
  {
    term: 'EmbeddingLoader',
    def: 'Charge le fichier fastText cc.fr.300.vec en mémoire. Limité à 50 000 mots les plus fréquents pour rester sous 60 Mo RAM. Affiche une barre de progression animée. Si le fichier est absent, le système fonctionne sans embeddings (mode 21 features only).',
    category: 'ia',
  },
  {
    term: 'cc.fr.300.vec',
    def: 'Fichier de plongements lexicaux fastText pour le français. Chaque ligne = un mot + 300 nombres flottants (ses coordonnées vectorielles). Contient ~2M mots (2.4 Go), limité à 50 000. À télécharger via scripts/download-embeddings.sh (non commité dans git).',
    category: 'ia',
  },
  {
    term: 'MAX_EMBEDDING_WORDS',
    def: "Constante fixée à 50 000 mots maximum chargés depuis le fichier .vec. Évite l'explosion mémoire (2.4 Go → ~60 Mo). Les mots sont triés par fréquence décroissante dans le fichier, donc seuls les 50 000 plus fréquents sont conservés.",
    category: 'ia',
  },
  {
    term: 'Entraînement (Training)',
    def: "Processus supervisé qui optimise les poids de la matrice pour minimiser l'erreur sur des exemples connus. Utilise la descente de gradient (gradient descent) avec margin loss. Les poids entraînés sont sauvegardés dans src/analytics/matrix/trained-weights.ts.",
    category: 'ia',
  },
  {
    term: 'Époque (epoch)',
    def: "Un passage complet sur l'ensemble des données d'entraînement. Plus d'époques = plus d'apprentissage, mais risque de surapprentissage (overfitting) au-delà de 500 époques. Valeur par défaut : 100.",
    category: 'ia',
  },
  {
    term: 'Learning Rate (lr)',
    def: "Pas de la descente de gradient. Détermine la vitesse d'ajustement des poids à chaque itération. 0.01 = valeur sûre. Trop élevé (≥ 0.1) : instable, la loss peut diverger. Trop faible (≤ 0.0001) : convergence très lente.",
    category: 'ia',
  },
  {
    term: 'Loss (perte / erreur)',
    def: "Valeur à minimiser pendant l'entraînement. Mesure l'écart entre les prédictions du modèle et les résultats attendus. Doit diminuer au fil des époques. Si elle augmente ou oscille, le learning rate est trop élevé.",
    category: 'ia',
  },
  {
    term: 'Margin Loss',
    def: 'Fonction de perte avec marge : loss = max(0, marge - score_bonne_classe + score_mauvaise_classe). Encourage le modèle à être confiant dans ses prédictions en imposant un écart minimum (margin) entre le bon score et les mauvais. Valeur par défaut : 0.5.',
    category: 'ia',
  },
  {
    term: 'Accuracy (précision)',
    def: "Pourcentage de classifications correctes. Accuracy simple = la bonne intention est en première position. Top-3 accuracy = la bonne intention est dans les 3 premiers scores. Affiché à chaque époque pendant l'entraînement.",
    category: 'ia',
  },
  {
    term: 'Gradient Descent',
    def: "Algorithme d'optimisation qui ajuste les poids dans la direction opposée au gradient de la loss. Pour chaque poids : nouveau_poids = ancien_poids - lr × ∂loss/∂poids. Implémenté dans gradient-descent.ts pour 1 couche (direct) et 2 couches (backpropagation).",
    category: 'ia',
  },
  {
    term: 'Backpropagation (rétropropagation)',
    def: "Algorithme qui calcule le gradient de la loss à travers les couches du réseau. Utilise la dérivée de ReLU pour propager l'erreur de la sortie vers l'entrée. Nécessaire pour l'architecture 2 couches (W1 → ReLU → W2 → softmax).",
    category: 'ia',
  },
  {
    term: '1 couche (linéaire)',
    def: 'Architecture simple : 21 features → 17 intentions. Calcul direct : score = W × v. Pas de non-linéarité. Reproduit exactement les 16 règles if/else. Sûre, rapide, mais moins expressive que la version 2 couches.',
    category: 'ia',
  },
  {
    term: '2 couches (profond)',
    def: "Architecture avec une couche cachée de 32 neurones ReLU : 321 features (21 + 300 embeddings) → 32 → softmax → 17 intentions. Plus expressive mais nécessite les embeddings et plus de données d'entraînement.",
    category: 'ia',
  },
  {
    term: 'trained-weights.ts',
    def: "Fichier automatiquement généré par l'entraînement dans src/analytics/matrix/. Contient les poids optimisés (TRAINED_WEIGHTS pour 1 couche, TRAINED_W1 + TRAINED_W2 pour 2 couches). Non commité dans git (dans .gitignore). Chargé par loadOrBuildWeights() au démarrage.",
    category: 'ia',
  },
  {
    term: 'training-data.json',
    def: "Fichier de données d'entraînement à la racine du projet. Contient un tableau d'exemples (id, context, expected). 36 exemples initiaux couvrant les 17 intentions. Modifiable manuellement ou via l'interface Entraînement de l'admin.",
    category: 'ia',
  },
  {
    term: 'TransactionSourceProvider',
    def: "Interface TypeScript définissant le contrat pour toute source de transactions financières. Méthode fetchEntries(clientId, dateFrom, dateTo) retournant des TransactionEntry[]. Permet d'ajouter de nouvelles sources (TMoney, Orange Money…) sans modifier le code existant.",
    category: 'ia',
  },
  {
    term: 'TransactionSourceRegistry',
    def: "Orchestrateur qui agrège les transactions de toutes les sources connectées. Utilise Promise.allSettled() pour qu'une source défaillante ne bloque pas les autres. Déduplique les transactions par ID.",
    category: 'ia',
  },
  {
    term: 'DbSource',
    def: 'Ancien TransactionFetcher, devenu une source comme les autres. Lit les transactions depuis la base PostgreSQL (historique bancaire). Toujours actif et prioritaire.',
    category: 'ia',
  },
  {
    term: 'TMoneySource',
    def: "Source de transactions mobile money pour le service TMoney (opérateur togolais). Stub actuellement : retourne un tableau vide. À connecter à l'API TMoney réelle quand disponible.",
    category: 'ia',
  },
  {
    term: 'ExpenseCategory',
    def: "Énumération des 15 catégories de dépenses : LOGEMENT, ALIMENTATION, TRANSPORT, SANTE, MOBILE_MONEY, CARBURANT, COMMERCE, FRAIS_BANCAIRES, VIREMENTS, RETRAITS, DEPOTS, INTERETS, CREDIT, SALAIRE, DIVERS. Utilisée par le classifieur et le moteur d'analyse.",
    category: 'ia',
  },
  {
    term: 'EXPENSE_KEYWORDS',
    def: "Dictionnaire statique associant chaque ExpenseCategory à une liste de mots-clés. Exemple : LOGEMENT → ['LOYER', 'CEET', 'TOGOCOM', 'APPARTEMENT'…]. Environ 500 mots-clés au total. Source unique de vérité pour la classification par mots-clés.",
    category: 'ia',
  },
  {
    term: 'Classifieur (Classifier)',
    def: 'Service central de classification des descriptions bancaires. Combine 4 méthodes dans cet ordre : 1) Exact Match (mots-clés stricts), 2) Fuse.js (fuzzy), 3) Embedding (cosinus), 4) Bayes (probabiliste). Priorité : la première méthode qui trouve un résultat gagne.',
    category: 'ia',
  },
  {
    term: 'scripts/download-embeddings.sh',
    def: 'Script shell qui télécharge le fichier cc.fr.300.vec depuis le site fastText (~2.4 Go). À exécuter une fois pour activer les embeddings. Le fichier est stocké dans data/embeddings/ et ne doit pas être commité.',
    category: 'ia',
  },
  {
    term: 'MATRIX_MODULE.md',
    def: 'Documentation détaillée du module matriciel à la racine du projet. Explique le calcul des scores, la structure des matrices, et donne des exemples concrets pour chaque intention.',
    category: 'ia',
  },
  {
    term: 'Classifieur Admin (page)',
    def: 'Interface de test interactif du classifieur. Permet de saisir une description bancaire et de voir le résultat de chaque méthode (Exact, Fuse.js, Embedding, Bayes) avec leurs scores. Affiche le top-3 des similarités cosinus.',
    category: 'ia',
  },
  {
    term: 'Embeddings Admin (page)',
    def: "Interface affichant les statistiques du module d'embeddings : statut de chargement, taille du vocabulaire, nombre de catégories, mots-clés trouvés par catégorie. Permet aussi une recherche sémantique (top-5 des catégories les plus proches d'une description).",
    category: 'ia',
  },
  {
    term: 'Entraînement Admin (page)',
    def: "Interface de configuration et de lancement de l'entraînement supervisé. Paramètres : époques, learning rate, nombre de couches, marge. Affiche les données d'entraînement et les résultats (loss, accuracy, top-3) après exécution.",
    category: 'ia',
  },
  {
    term: 'InfoDrawer',
    def: "Composant Svelte réutilisable qui affiche un panneau latéral d'explications. Chaque page de l'admin Analytics (Classifieur, Embeddings, Entraînement) a son propre contenu d'aide avec des icônes lucide et des définitions claires.",
    category: 'ia',
  },
];
