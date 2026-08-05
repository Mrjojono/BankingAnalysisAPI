/**
 * Configuration des keywords pour chaque catégorie de dépense
 * Adapté aux descriptions bancaires réelles , les keywords peuvent etre enrichie par apres
 */

export enum ExpenseCategory {
  LOGEMENT = 'LOGEMENT',
  ALIMENTATION = 'ALIMENTATION',
  TRANSPORT = 'TRANSPORT',
  SANTE = 'SANTE',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CARBURANT = 'CARBURANT',
  COMMERCE = 'COMMERCE',
  FRAIS_BANCAIRES = 'FRAIS_BANCAIRES',
  VIREMENTS = 'VIREMENTS',
  RETRAITS = 'RETRAITS',
  DEPOTS = 'DEPOTS',
  INTERETS = 'INTERETS',
  CREDIT = 'CREDIT',
  SALAIRE = 'SALAIRE',
  DIVERS = 'DIVERS',
}

export const EXPENSE_KEYWORDS: Record<ExpenseCategory, string[]> = {
  [ExpenseCategory.SALAIRE]: [
    'SALAIRE',
    'VRT SALAIRE',
    'VIREMENT SALAIRE',
    'VERSEMENT SALAIRE',
    'TRAITEMENT',
    'HONORAIRES',
    'PENSION',
    'ALLOCATION',
    'REVENU',
    'PAYE',
    'PAIE',
    'REMUNERATION',
    'RÉMUNÉRATION',
    'PRIME',
    'GRATIFICATION',
    'BONUS',
    'INDEMNITE',
    'INDEMNITÉ',
  ],
  [ExpenseCategory.CREDIT]: [
    // Termes génériques
    'PRET',
    'PRÊT',
    'REMBOURSEMENT',
    'ECHEANCE',
    'ÉCHÉANCE',
    'CREDIT',
    'CRÉDIT',
    'EMPRUNT',
    'LEASING',
    'MENSUALITE',
    'MENSUALITÉ',
    'AMORTISSEMENT',
    'DETTE',
    'ENDETTEMENT',
    // Types de crédits
    'CREDIT HABITAT',
    'CREDIT IMMOBILIER',
    'CREDIT AUTO',
    'CREDIT CONSOMMATION',
    'CREDIT PERSONNEL',
    'MICRO CREDIT',
    'MICROCREDIT',
    'CREDIT SCOLAIRE',
    'CREDIT AGRICOLE',
    // Termes bancaires UEMOA
    'ECHEANCE CREDIT',
    'REMB CREDIT',
    'REMB PRET',
    'RBT CREDIT',
    'RBT PRET',
    'DETTE BANCAIRE',
  ],

  [ExpenseCategory.MOBILE_MONEY]: [
    // Opérateurs Togo
    'TMONEY',
    'FLOOZ',
    'MOOV MONEY',
    // Opérateurs régionaux UEMOA
    'MTN MOMO',
    'MTN MOBILE MONEY',
    'MOMO',
    'ORANGE MONEY',
    'WAVE',
    'FREE MONEY',
    'WIZALL',
    'YUP',
    'SAMA MONEY',
    'AIRTEL MONEY',
    'TIGO CASH',
    // Termes génériques
    'MOBILE MONEY',
    'PAIEMENT MOBILE',
    'TRANSFERT MOBILE',
    'ENVOI MOBILE',
    'RECHARGEMENT',
    'RECHARGE CREDIT',
    'TOP UP',
    'TOPUP',
    'CREDIT TELEPHONE',
    // Codes opérateurs
    'TOGOCEL',
    'MOOV',
    'ATLANTIQUE TELECOM',
  ],

  [ExpenseCategory.LOGEMENT]: [
    // Loyer
    'LOYER',
    'RENT',
    'LOCATION',
    'BAIL',
    'LOYER MENSUEL',
    'LOYER BIMESTRIEL',
    // Types de logement
    'APPARTEMENT',
    'MAISON',
    'STUDIO',
    'CHAMBRE',
    'RESIDENCE',
    'IMMEUBLE',
    'VILLA',
    'DUPLEX',
    // Charges
    'CHARGES LOCATIVES',
    'SYNDIC',
    'COPROPRIETE',
    'CAUTION',
    'DEPOT GARANTIE',
    'AVANCE LOYER',
    // Eau et électricité
    'CEET',
    'TDE',
    'FACTURE EAU',
    'FACTURE ELECTRICITE',
    'ELECTRICITE',
    'EAU POTABLE',
    'SOBEBRA',
    // Internet et téléphone fixe
    'TOGOCOM',
    'TOGO TELECOM',
    'ADSL',
    'FIBRE',
    'ABONNEMENT INTERNET',
    'ABONNEMENT TELEPHONE',
    // Entretien
    'GARDIEN',
    'MENAGE',
    'NETTOYAGE',
    'ENTRETIEN MAISON',
  ],

  [ExpenseCategory.ALIMENTATION]: [
    // Restaurants et maquis
    'RESTAURANT',
    'MAQUIS',
    'BUVETTE',
    'CABARET',
    'GARGOTE',
    'SNACK',
    'FAST FOOD',
    'PIZZERIA',
    'PIZZA',
    'BURGER',
    'KFC',
    'POULET',
    // Boulangerie et pâtisserie
    'BOULANGERIE',
    'PAIN',
    'PATISSERIE',
    'VIENNOISERIE',
    'CROISSANT',
    'GATEAU',
    // Épicerie et marché
    'EPICERIE',
    'MARCHE',
    'MARCHÉ',
    'PROVISIONS',
    'COURSES',
    'ALIMENTATION',
    'NOURRITURE',
    'VIVRES',
    // Boissons
    'CAFE',
    'CAFÉ',
    'THE',
    'THÉ',
    'JUS',
    'BOISSON',
    'EAU MINERALE',
    'BRASSERIE',
    'BAR',
    // Boucherie et poissonnerie
    'BOUCHERIE',
    'BOUCHER',
    'POISSONNERIE',
    'POISSON',
    'VIANDE',
    'POULET',
    'ABATTOIR',
    // Supermarchés locaux
    'SCORE',
    'CDPA',
    'MARINA MARKET',
    'CASH AND CARRY',
  ],

  [ExpenseCategory.COMMERCE]: [
    // Grandes surfaces
    'CARREFOUR',
    'AUCHAN',
    'LEADER PRICE',
    'SUPERMARCHE',
    'HYPERMARCHE',
    'SUPERETTE',
    // Commerce général
    'MAGASIN',
    'BOUTIQUE',
    'COMMERCE',
    'DEPOT',
    'QUINCAILLERIE',
    'DROGUERIE',
    'PHARMACIE RAYON',
    // Vêtements
    'VETEMENTS',
    'VÊTEMENTS',
    'FRIPERIE',
    'TISSU',
    'COUTURIER',
    'TAILLEUR',
    'CHAUSSURES',
    'HABITS',
    // Électronique
    'ELECTRONIQUE',
    'TELEPHONE',
    'ORDINATEUR',
    'TABLETTE',
    'INFORMATIQUE',
    'HIGH TECH',
    'SAMSUNG',
    'APPLE',
    // Marché local
    'MARCHE ADAWLATO',
    'MARCHE ASSIGAME',
    'GRAND MARCHE',
  ],

  [ExpenseCategory.TRANSPORT]: [
    // Taxi et moto
    'TAXI',
    'TAXI MOTO',
    'ZEMIDJAN',
    'ZEMI',
    'MOTO TAXI',
    'KEKE',
    'OKADA',
    // Transport en commun
    'BUS',
    'MINIBUS',
    'GBAKA',
    'TROTRO',
    'SOTRAMA',
    'TRANSPORT COMMUN',
    'STATION',
    // Applications
    'UBER',
    'BOLT',
    'YANGO',
    'HEETCH',
    'GOZEM',
    // Voyage interurbain
    'AUTOCARS',
    'AUTOCAR',
    'CAR',
    'VOYAGE',
    'BILLET',
    'GARE',
    'GARE ROUTIERE',
    // Aérien
    'AIR FRANCE',
    'ASKY',
    'ETHIOPIAN',
    'AIR AFRIQUE',
    'BILLET AVION',
    'AERIEN',
    'AEROPORT',
    // Train et bateau
    'TRAIN',
    'BATEAU',
    'FERRY',
    'PORT',
    // Livraison
    'LIVRAISON',
    'COURSIER',
    'DELIVERY',
  ],

  [ExpenseCategory.CARBURANT]: [
    // Stations locales
    'TOTAL',
    'SHELL',
    'STAR OIL',
    'PUMA ENERGY',
    'ORYX',
    'GLOPY',
    'OILIBYA',
    'PETRO',
    // Types de carburant
    'CARBURANT',
    'ESSENCE',
    'GASOIL',
    'GAZOLE',
    'SUPER',
    'PETROLE',
    'GPL',
    'GAS',
    // Station service
    'STATION SERVICE',
    'POMPE',
    'PLEIN',
    'PLEIN ESSENCE',
    'FAIRE LE PLEIN',
  ],

  [ExpenseCategory.SANTE]: [
    // Pharmacies
    'PHARMACIE',
    'PARAPHARMACIE',
    'MEDICAMENT',
    'MÉDICAMENT',
    'ORDONNANCE',
    'TRAITEMENT',
    // Consultations
    'MEDECIN',
    'MÉDECIN',
    'DOCTEUR',
    'CONSULTATION',
    'VISITE MEDICALE',
    'VISITE MÉDICALE',
    // Établissements
    'HOPITAL',
    'HÔPITAL',
    'CLINIQUE',
    'CABINET',
    'CHU',
    'CHR',
    'CENTRE DE SANTE',
    'DISPENSAIRE',
    'MATERNITE',
    'MATERNITÉ',
    'URGENCES',
    // Examens
    'LABORATOIRE',
    'LABO',
    'ANALYSE',
    'RADIO',
    'RADIOLOGIE',
    'SCANNER',
    'ECHOGRAPHIE',
    // Optique et dentaire
    'OPTICIEN',
    'LUNETTES',
    'DENTISTE',
    'ORTHODONTISTE',
    // Assurance santé
    'COTISATION SANTE',
    'ASSURANCE MALADIE',
    'MUTUELLE',
  ],

  [ExpenseCategory.FRAIS_BANCAIRES]: [
    // Frais de tenue
    'FRAIS TENUE COMPTE',
    'TENUE COMPTE',
    'FTC',
    'FRAIS GESTION',
    'COMMISSION GESTION',
    // Frais de transactions
    'FRAIS VIREMENT',
    'FRAIS RETRAIT',
    'FRAIS DEPOT',
    'FRAIS TRANSFERT',
    'FRAIS OPERATION',
    // Agios et pénalités
    'AGIO',
    'AGIOS',
    'DECOUVERT',
    'DÉCOUVERT',
    'PENALITE',
    'PÉNALITÉ',
    'INTERET DEBITEUR',
    // Carte bancaire
    'FRAIS CARTE',
    'COTISATION CARTE',
    'RENOUVELLEMENT CARTE',
    'CARTE VISA',
    'CARTE MASTERCARD',
    // Divers frais
    'COMMISSION',
    'COMMISSION BANQUE',
    'FRAIS BANCAIRES',
    'CHARGES BANCAIRES',
    'FRAIS SWIFT',
    'FRAIS INTERNATIONAL',
    'FRAIS CHANGE',
    'COMMISSION CHANGE',
  ],

  [ExpenseCategory.VIREMENTS]: [
    // Virements internes
    'VIREMENT INTERNE',
    'VIREMENT COMPTE',
    'VIR CPT',
    // Virements externes
    'VIREMENT SWIFT',
    'VIREMENT SEPA',
    'VIREMENT INTERNATIONAL',
    'VIR INT',
    'VIREMENT BANCAIRE',
    // Transferts
    'TRANSFERT',
    'TRANSFERT DE FONDS',
    'ENVOI ARGENT',
    'WESTERN UNION',
    'MONEYGRAM',
    'RIA MONEY',
    'WORLD REMIT',
    'SENDWAVE',
  ],

  [ExpenseCategory.RETRAITS]: [
    // DAB / GAB
    'RETRAIT DAB',
    'RETRAIT GAB',
    'RETRAIT DISTRIBUTEUR',
    'RETRAIT ATM',
    'DAB',
    'GAB',
    'ATM',
    // Guichet
    'RETRAIT GUICHET',
    'RETRAIT CAISSE',
    'RETRAIT AGENCE',
    'RETRAIT ESPECES',
    'RETRAIT CASH',
    // Générique
    'RETRAIT',
  ],

  [ExpenseCategory.DEPOTS]: [
    // Dépôts en agence
    'DEPOT EN AGENCE',
    'DÉPÔT EN AGENCE',
    'DEPOT GUICHET',
    'DEPOT CAISSE',
    'DEPOT ESPECES',
    'DEPOT CASH',
    // Versements
    'VERSEMENT',
    'VERSEMENT ESPECES',
    'REMISE CHEQUE',
    'REMISE CHÈQUE',
    // Générique
    'DEPOT',
    'DÉPÔT',
  ],

  [ExpenseCategory.INTERETS]: [
    // Intérêts créditeurs
    'INTERETS CREDITEURS',
    'INTÉRÊTS CRÉDITEURS',
    'INTERETS EPARGNE',
    'INTÉRÊTS ÉPARGNE',
    'INTERETS TRIMESTRIELS',
    'INTERETS MENSUELS',
    'REMUNERATION EPARGNE',
    'RÉMUNÉRATION ÉPARGNE',
    // Livrets et épargne
    'LIVRET',
    'EPARGNE',
    'ÉPARGNE',
    'COMPTE EPARGNE',
    'COMPTE ÉPARGNE',
    'PLAN EPARGNE',
    'PLAN ÉPARGNE',
    // Intérêts débiteurs
    'INTERETS DEBITEURS',
    'INTÉRÊTS DÉBITEURS',
    'INTERETS',
    'INTÉRÊTS',
  ],

  [ExpenseCategory.DIVERS]: [],
};

/**
 * Catégories qui ne sont PAS de vraies dépenses.
 * Ce sont des mouvements de fonds (virements, retraits, dépôts, salaire, etc.)
 * qui ne doivent pas apparaître dans le breakdown des dépenses.
 */
export const NON_EXPENSE_CATEGORIES = new Set<ExpenseCategory>([
  ExpenseCategory.SALAIRE,
  ExpenseCategory.VIREMENTS,
  ExpenseCategory.RETRAITS,
  ExpenseCategory.DEPOTS,
  ExpenseCategory.INTERETS,
  ExpenseCategory.CREDIT,
]);
