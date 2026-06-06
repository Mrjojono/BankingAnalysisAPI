export interface GlossaryEntry {
  term: string;
  def: string;
  category: 'produit' | 'regle' | 'metrique' | 'frais' | 'sigle' | 'score';
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
    term: "Taux d'endettement (debtRatio)",
    def: 'Pourcentage des revenus mensuels consacré au remboursement des dettes. Calcul: total des mensualités / revenus × 100. Plafond BCEAO: 33%.',
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
];
