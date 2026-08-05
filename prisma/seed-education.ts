/**
 * SEED — Contenu Éducation Financière (INC 2023)
 *
 * Basé sur le guide "Les Essentiels de l'Éducation Financière"
 * de l'Institut National de la Consommation (INC) — Semaine de l'éducation financière 2023.
 *
 * 6 parcours · 20 leçons · 6 quiz · 24 questions · 84 choix
 */

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not defined');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

type ContentBlockType = 'header' | 'text' | 'callout' | 'list' | 'image' | 'divider' | 'miniQuiz';

interface ContentBlock {
  type: ContentBlockType;
  text?: string;
  level?: number;
  variant?: string;
  items?: string[];
  ordered?: boolean;
  question?: string;
  choices?: string[];
  correctIndex?: number;
  explanation?: string;
}

function h(text: string, level?: number): ContentBlock {
  return { type: 'header', text, level: level ?? 1 };
}
function t(text: string): ContentBlock {
  return { type: 'text', text };
}
function c(text: string, variant: string = 'key'): ContentBlock {
  return { type: 'callout', text, variant };
}
function l(items: string[], ordered = false): ContentBlock {
  return { type: 'list', items, ordered };
}
function q(question: string, choices: string[], correctIndex: number, explanation: string): ContentBlock {
  return { type: 'miniQuiz', question, choices, correctIndex, explanation };
}

// ─── Helpers (idempotent : cherche par titre, crée si absent) ────────────────
async function upsertPath(data: {
  title: string;
  description: string;
  icon: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  order: number;
}) {
  const existing = await prisma.learningPath.findFirst({ where: { title: data.title } });
  if (existing) {
    return prisma.learningPath.update({ where: { id: existing.id }, data: { ...data, isActive: true } });
  }
  return prisma.learningPath.create({ data: { ...data, isActive: true } });
}

async function upsertLesson(data: {
  learningPathId: string;
  title: string;
  summary: string;
  videoUrl?: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  order: number;
  estimatedMinutes: number;
  minScore?: number;
  maxScore?: number;
  contentBlocks?: ContentBlock[];
}) {
  const existing = await prisma.lesson.findFirst({
    where: { learningPathId: data.learningPathId, title: data.title },
  });
  const base = { ...data, content: '', contentBlocks: data.contentBlocks as any, status: 'PUBLISHED' as const };
  if (existing) {
    return prisma.lesson.update({ where: { id: existing.id }, data: base });
  }
  return prisma.lesson.create({ data: base });
}

async function upsertQuiz(data: {
  title: string;
  description: string;
  passingScore?: number;
}) {
  const existing = await prisma.quiz.findFirst({ where: { title: data.title } });
  if (existing) {
    return prisma.quiz.update({ where: { id: existing.id }, data: { status: 'PUBLISHED', ...data } });
  }
  return prisma.quiz.create({ data: { ...data, status: 'PUBLISHED' } });
}

async function upsertQuestion(data: {
  quizId: string;
  question: string;
  type: 'MCQ' | 'TRUE_FALSE';
  explanation: string;
  order: number;
}) {
  const existing = await prisma.quizQuestion.findFirst({
    where: { quizId: data.quizId, order: data.order },
  });
  if (existing) {
    return prisma.quizQuestion.update({ where: { id: existing.id }, data });
  }
  return prisma.quizQuestion.create({ data });
}

async function upsertChoice(data: {
  questionId: string;
  text: string;
  isCorrect: boolean;
  order: number;
}) {
  const existing = await prisma.quizChoice.findFirst({
    where: { questionId: data.questionId, text: data.text },
  });
  if (existing) {
    return prisma.quizChoice.update({ where: { id: existing.id }, data });
  }
  return prisma.quizChoice.create({ data });
}

async function upsertAdviceLink(lessonId: string, adviceType: string, priority = 0) {
  try {
    await prisma.lessonAdviceLink.upsert({
      where: { lessonId_adviceType: { lessonId, adviceType } },
      update: { priority },
      create: { lessonId, adviceType, priority },
    });
  } catch {
    // ignore duplicate
  }
}

async function linkQuizToLesson(quizId: string, lessonId: string) {
  try {
    await prisma.quizLessonLink.upsert({
      where: { quizId_lessonId: { quizId, lessonId } },
      update: {},
      create: { quizId, lessonId },
    });
  } catch {
    // ignore duplicate
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1. BUDGET
// ═══════════════════════════════════════════════════════════════════════════════
async function seedBudget() {
  const path = await upsertPath({
    order: 1,
    title: 'Gestion du Budget',
    description: 'Apprenez à établir et gérer votre budget quotidien pour mieux maîtriser vos finances.',
    icon: 'BookOpen',
    difficulty: 'BEGINNER',
  });

  // Lesson 1 — Établir un budget (BEGINNER)
  const lesson1Blocks: ContentBlock[] = [
    h('Établir un budget pour mieux gérer son argent'),
    t('Un budget est un tableau qui compare vos revenus et vos dépenses sur un mois. Il vous permet de savoir où va votre argent et d\'éviter les découverts.'),
    c('Notez TOUTES vos dépenses pendant un mois avant de fixer votre budget. Vous serez surpris de ce que vous dépensez.', 'key'),
    q('Quel est le premier avantage d\'établir un budget ?',
      ['Visualiser ses revenus et dépenses', 'Augmenter ses revenus', 'Changer de banque', 'Ouvrir un livret d\'épargne'],
      0, 'Le premier avantage est de visualiser clairement où va votre argent.'),
    t('Classifiez vos dépenses par catégorie : logement, alimentation, transports, loisirs, épargne. Cela vous aide à identifier les postes où vous pouvez réduire.'),
    l(['Loyer et charges (~17%)', 'Alimentation (~13%)', 'Transports (~5%)', 'Loisirs (~10%)', 'Santé (~3%)'], false),
    q('Quel poste représente environ 17% du budget ?',
      ['Alimentation', 'Loyer et charges', 'Loisirs', 'Santé'],
      1, 'Le logement est le premier poste de dépenses à environ 17%.'),
    t('La règle des 50/30/20 est une base simple : 50% pour les besoins, 30% pour les envies, 20% pour l\'épargne. Ajustez selon votre situation.'),
    q('Selon la règle 50/30/20, quel pourcentage pour l\'épargne ?',
      ['50%', '30%', '20%', '10%'],
      2, '20% pour l\'épargne et le remboursement des dettes.'),
  ];

  const lesson1 = await upsertLesson({
    learningPathId: path.id,
    title: 'Établir un budget pour mieux gérer son argent',
    summary: 'Les bases de la gestion budgétaire : catégories de dépenses, règle 50/30/20 et conseils pratiques.',
    difficulty: 'BEGINNER',
    order: 1,
    estimatedMinutes: 10,
    minScore: 0,
    maxScore: 40,
    contentBlocks: lesson1Blocks,
  });
  await upsertAdviceLink(lesson1.id, 'BUDGET_NEEDED', 0);
  await upsertAdviceLink(lesson1.id, 'EXPENSE_HIGH', 1);
  await upsertAdviceLink(lesson1.id, 'SCORE_LOW', 2);

  // Lesson 2 — Gérer efficacement son budget (BEGINNER)
  const lesson2Blocks: ContentBlock[] = [
    h('Comment gérer efficacement son budget'),
    t('Une bonne gestion repose sur l\'équilibre entre vos ressources et vos dépenses. L\'objectif est de ne pas dépenser plus que ce que vous gagnez.'),
    c('Face à des difficultés, agissez tôt. Plus vous attendez, moins vous avez d\'options.', 'key'),
    q('Quelle est la première étape pour gérer son budget ?',
      ['Connaître ses revenus', 'Réduire ses dépenses', 'Épargner', 'Investir'],
      0, 'La première étape est de connaître précisément ses revenus.'),
    t('Suivez vos dépenses fixes (loyer, assurances), variables (alimentation, loisirs) et occasionnelles (vacances, réparations). Les fixes sont prioritaires.'),
    l(['Dépenses fixes : loyer, assurances, abonnements', 'Dépenses variables : alimentation, loisirs, vêtements', 'Dépenses occasionnelles : vacances, réparations'], false),
    q('Le loyer est une dépense :',
      ['Fixe', 'Variable', 'Occasionnelle'],
      0, 'Le loyer est une dépense fixe, au même titre que les assurances.'),
    t('Si vos dépenses dépassent vos ressources, réduisez d\'abord les dépenses non essentielles. Contactez votre banque si besoin.'),
    q('Que faire si vos dépenses dépassent vos ressources ?',
      ['Ignorer la situation', 'Réduire les dépenses non essentielles', 'Souscrire un crédit', 'Déménager'],
      1, 'Réduire les dépenses non essentielles est la première solution.'),
  ];

  const lesson2 = await upsertLesson({
    learningPathId: path.id,
    title: 'Comment gérer efficacement son budget',
    summary: 'Équilibre entre ressources et dépenses, suivi budgétaire et anticipation des imprévus.',
    videoUrl: 'https://www.inc-conso.fr/content/comment-gerer-efficacement-son-budget-avec-la-banque-de-france',
    difficulty: 'BEGINNER',
    order: 2,
    estimatedMinutes: 12,
    minScore: 0,
    maxScore: 60,
    contentBlocks: lesson2Blocks,
  });
  await upsertAdviceLink(lesson2.id, 'EXPENSE_HIGH', 0);
  await upsertAdviceLink(lesson2.id, 'BUDGET_NEEDED', 1);
  await upsertAdviceLink(lesson2.id, 'EMERGENCY_FUND', 2);

  // Quiz : Budget
  const quiz = await upsertQuiz({
    title: 'Quiz : Gestion du Budget',
    description: 'Testez vos connaissances sur la gestion budgétaire.',
    passingScore: 70,
  });

  const q1 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Selon la règle des 50/30/20, quel pourcentage de vos revenus devrait être consacré aux besoins essentiels (loyer, alimentation, factures) ?',
    type: 'MCQ',
    explanation: 'La règle des 50/30/20 propose de consacrer 50% aux besoins essentiels, 30% aux envies et 20% à l\'épargne.',
    order: 1,
  });
  await upsertChoice({ questionId: q1.id, text: '50%', isCorrect: true, order: 1 });
  await upsertChoice({ questionId: q1.id, text: '30%', isCorrect: false, order: 2 });
  await upsertChoice({ questionId: q1.id, text: '20%', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q1.id, text: '60%', isCorrect: false, order: 4 });

  const q2 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Parmi les dépenses suivantes, laquelle est considérée comme une dépense variable ?',
    type: 'MCQ',
    explanation: 'L\'alimentation est une dépense variable car elle peut fluctuer chaque mois, contrairement au loyer ou à l\'assurance qui sont des dépenses fixes.',
    order: 2,
  });
  await upsertChoice({ questionId: q2.id, text: 'Le loyer', isCorrect: false, order: 1 });
  await upsertChoice({ questionId: q2.id, text: 'L\'assurance habitation', isCorrect: false, order: 2 });
  await upsertChoice({ questionId: q2.id, text: 'L\'alimentation', isCorrect: true, order: 3 });
  await upsertChoice({ questionId: q2.id, text: 'L\'abonnement téléphonique', isCorrect: false, order: 4 });

  const q3 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Quelle est la première étape pour établir un budget efficace ?',
    type: 'MCQ',
    explanation: 'La première étape est de noter toutes vos dépenses pendant un mois pour visualiser où va votre argent.',
    order: 3,
  });
  await upsertChoice({ questionId: q3.id, text: 'Ouvrir un livret d\'épargne', isCorrect: false, order: 1 });
  await upsertChoice({ questionId: q3.id, text: 'Noter toutes ses dépenses pendant un mois', isCorrect: true, order: 2 });
  await upsertChoice({ questionId: q3.id, text: 'Demander une augmentation', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q3.id, text: 'Souscrire un crédit', isCorrect: false, order: 4 });

  await linkQuizToLesson(quiz.id, lesson1.id);

  console.log('  ✅ Budget : 2 leçons, 1 quiz (3 questions)');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2. CRÉDITS, PRÊTS ET BOURSES
// ═══════════════════════════════════════════════════════════════════════════════
async function seedCredit() {
  const path = await upsertPath({
    order: 2,
    title: 'Crédits, Prêts et Bourses',
    description: 'Comprenez les différents types de crédits, le prêt étudiant et les solutions en cas de difficultés financières.',
    icon: 'Landmark',
    difficulty: 'BEGINNER',
  });

  // Lesson 3 — Crédit à la consommation (BEGINNER)
  const lesson3Blocks: ContentBlock[] = [
    h('Crédit à la consommation : les obligations des prêteurs'),
    t('Le crédit à la consommation est encadré par le Code de la consommation. Le prêteur a des obligations strictes pour protéger l\'emprunteur.'),
    t('Avant d\'accorder un crédit, le prêteur doit vérifier votre situation financière et votre capacité de remboursement. Il doit vous informer des risques.'),
    q('Que doit vérifier le prêteur avant d\'accorder un crédit ?',
      ['Votre âge', 'Votre situation financière', 'Votre profession', 'Votre adresse'],
      1, 'Le prêteur doit vérifier votre situation financière et votre capacité de remboursement.'),
    l(['Délai de rétractation : 14 jours sans pénalité', 'Information précontractuelle obligatoire', 'TAEG affiché dans le contrat', 'Pas de frais cachés'], false),
    q('Quel est le délai de rétractation pour un crédit ?',
      ['7 jours', '14 jours', '30 jours', '1 jour'],
      1, 'La loi accorde 14 jours pour revenir sur votre décision sans pénalité.'),
    c('Ne signez jamais un crédit sans avoir lu et compris toutes les conditions. Le TAEG est le coût total du crédit.', 'warning'),
    t('Le TAEG (Taux Annuel Effectif Global) inclut tous les frais : intérêts, assurance, frais de dossier. Comparez les TAEG pour choisir le crédit le moins cher.'),
    q('Que signifie le sigle TAEG ?',
      ['Taux Annuel Effectif Global', 'Tarif des Assurances Emprunteur', 'Taux d\'Amortissement des Emprunts', 'Total des Agios et Frais'],
      0, 'Le TAEG est le Taux Annuel Effectif Global, qui inclut tous les frais du crédit.'),
  ];

  const lesson3 = await upsertLesson({
    learningPathId: path.id,
    title: 'Crédit à la consommation : les obligations des prêteurs',
    summary: 'Découvrez les règles qui protègent l\'emprunteur dans le cadre d\'un crédit à la consommation.',
    videoUrl: 'https://www.inc-conso.fr/content/credit-la-consommation-quelles-sont-les-obligations-des-preteurs-avec-familles-de-france',
    difficulty: 'BEGINNER',
    order: 1,
    estimatedMinutes: 8,
    minScore: 0,
    maxScore: 100,
    contentBlocks: lesson3Blocks,
  });
  await upsertAdviceLink(lesson3.id, 'DEBT_OK', 0);
  await upsertAdviceLink(lesson3.id, 'SCORE_MEDIUM', 1);

  // Lesson 4 — Crédit renouvelable (INTERMEDIATE)
  const lesson4Blocks: ContentBlock[] = [
    h('Crédit renouvelable : ce qu\'il faut savoir'),
    c('Le crédit renouvelable a un taux plus élevé qu\'un crédit classique. Privilégiez toujours un crédit amortissable.', 'warning'),
    t('Le crédit renouvelable est une réserve d\'argent mise à disposition par une banque ou un organisme de crédit. Vous l\'utilisez selon vos besoins et il se reconstitue au fil des remboursements.'),
    q('Le crédit renouvelable se reconstitue-t-il automatiquement ?',
      ['Oui, au fil des remboursements', 'Non, il faut une nouvelle demande'],
      0, 'Oui, le crédit renouvelable se reconstitue automatiquement au fur et à mesure des remboursements.'),
    l(['Taux d\'intérêt élevé comparé à un crédit classique', 'Risque de surendettement en cas d\'utilisation répétée', 'Réserve d\'argent qui se reconstitue'], false),
    q('Comparé à un crédit classique, le taux du crédit renouvelable est :',
      ['Plus bas', 'Plus élevé', 'Identique', 'Variable'],
      1, 'Le taux du crédit renouvelable est généralement plus élevé qu\'un crédit classique.'),
    t('Le principal risque est l\'utilisation répétée : vous remboursez, le crédit se reconstitue, vous ré-empruntez. Cela peut mener à un surendettement.'),
    q('Quel est le principal risque du crédit renouvelable ?',
      ['Les taux sont trop bas', 'Le risque de surendettement', 'La durée est trop courte'],
      1, 'L\'utilisation répétée augmente le risque de surendettement.'),
  ];

  const lesson4 = await upsertLesson({
    learningPathId: path.id,
    title: 'Crédit renouvelable : ce qu\'il faut savoir',
    summary: 'Comprenez le fonctionnement du crédit renouvelable et ses points de vigilance.',
    videoUrl: 'https://www.inc-conso.fr/content/credit-renouvelable-ce-quil-faut-savoir-avec-la-banque-de-france',
    difficulty: 'INTERMEDIATE',
    order: 2,
    estimatedMinutes: 8,
    minScore: 20,
    maxScore: 60,
    contentBlocks: lesson4Blocks,
  });
  await upsertAdviceLink(lesson4.id, 'DEBT_HIGH', 0);
  await upsertAdviceLink(lesson4.id, 'DEBT_MODERATE', 1);

  // Lesson 5 — Difficultés à rembourser (BEGINNER)
  const lesson5Blocks: ContentBlock[] = [
    h('Que faire en cas de difficultés à rembourser son crédit ?'),
    t('Si vous éprouvez des difficultés à rembourser votre crédit, réagissez le plus tôt possible. Ignorer la situation ne fait qu\'aggraver les choses.'),
    c('Contactez votre banque dès les premières difficultés. Plus vous attendez, moins vous avez de solutions.', 'key'),
    q('Quelle est la première démarche en cas de difficulté ?',
      ['Ignorer les relances', 'Contacter sa banque', 'Souscrire un nouveau crédit'],
      1, 'Contactez votre banque dès les premières difficultés pour trouver une solution.'),
    l(['Demander un délai de paiement', 'Négocier un rééchelonnement de la dette', 'Contacter la Commission de surendettement', 'Saisir le juge du contentieux'], false),
    q('Quel organisme peut être saisi en cas de surendettement ?',
      ['Le tribunal', 'La Commission de surendettement', 'Le maire', 'Le médiateur bancaire'],
      1, 'La Commission de surendettement de la Banque de France peut être saisie.'),
    t('Ne répondez pas aux offres de crédit pour rembourser un crédit. Cela aggrave votre endettement. Privilégiez le dialogue avec vos créanciers.'),
    q('Faut-il répondre aux courriers de relance ?',
      ['Oui, ne pas les ignorer', 'Non, ils disparaîtront'],
      0, 'Ne jamais ignorer les courriers de relance, cela ne ferait qu\'aggraver la situation.'),
  ];

  const lesson5 = await upsertLesson({
    learningPathId: path.id,
    title: 'Que faire en cas de difficultés à rembourser son crédit ?',
    summary: 'Les solutions contractuelles, amiables et judiciaires en cas de difficultés de remboursement.',
    videoUrl: 'https://www.inc-conso.fr/content/que-faire-en-cas-de-difficultes-rembourser-son-credit-avec-la-banque-de-france',
    difficulty: 'BEGINNER',
    order: 3,
    estimatedMinutes: 10,
    minScore: 0,
    maxScore: 60,
    contentBlocks: lesson5Blocks,
  });
  await upsertAdviceLink(lesson5.id, 'DEBT_HIGH', 0);
  await upsertAdviceLink(lesson5.id, 'OVERDRAFT_FREQUENT', 1);

  // Lesson 6 — Microcrédit (INTERMEDIATE)
  const lesson6Blocks: ContentBlock[] = [
    h('Le principe du microcrédit'),
    c('Le microcrédit est un outil d\'insertion : il inclut un accompagnement social personnalisé, pas seulement un prêt.', 'warning'),
    t('Le microcrédit est une solution de financement pour les personnes qui ne peuvent pas obtenir de crédit bancaire classique. Il permet de financer un projet professionnel ou personnel.'),
    q('Le microcrédit s\'adresse à :',
      ['Uniquement aux entrepreneurs', 'Aux personnes exclues du crédit classique', 'Uniquement aux étudiants'],
      1, 'Le microcrédit aide les personnes aux faibles revenus ou exclues du crédit classique.'),
    l(['Montants limités', 'Taux d\'intérêt modérés', 'Accompagnement social personnalisé', 'Financement de projet'], false),
    q('Les montants du microcrédit sont généralement :',
      ['Très élevés', 'Limités', 'Sans limite'],
      1, 'Les montants du microcrédit sont limités et les taux sont modérés.'),
    t('Pour obtenir un microcrédit, adressez-vous à une association spécialisée ou à une banque partenaire. Un accompagnateur vous aide à monter votre projet.'),
    q('Par quoi le microcrédit est-il souvent accompagné ?',
      ['Une formation en bourse', 'Un accompagnement social', 'Une assurance-vie'],
      1, 'Le microcrédit est souvent accompagné d\'un suivi social personnalisé.'),
  ];

  const lesson6 = await upsertLesson({
    learningPathId: path.id,
    title: 'Le principe du microcrédit',
    summary: 'Une solution de financement pour les personnes ne pouvant pas obtenir de crédit classique.',
    videoUrl: 'https://www.inc-conso.fr/content/quel-est-le-principe-du-microcredit-avec-le-reseau-des-ctrc',
    difficulty: 'INTERMEDIATE',
    order: 4,
    estimatedMinutes: 8,
    minScore: 0,
    maxScore: 40,
    contentBlocks: lesson6Blocks,
  });
  await upsertAdviceLink(lesson6.id, 'DEBT_HIGH', 0);
  await upsertAdviceLink(lesson6.id, 'SCORE_LOW', 1);

  // Lesson 7 — Prêt étudiant (BEGINNER)
  const lesson7Blocks: ContentBlock[] = [
    h('Obtenir un prêt étudiant'),
    t('Le prêt étudiant vous permet de financer vos études même sans revenus suffisants. Les banques le proposent à des taux préférentiels.'),
    c('Le prêt étudiant garanti par l\'État ne nécessite aucune caution personnelle ni garant parental.', 'key'),
    q('Le prêt étudiant peut-il financer un logement ?',
      ['Oui', 'Non'],
      0, 'Oui, il peut financer les frais de scolarité, le logement, l\'alimentation et le matériel.'),
    l(['Montant : 1 000 € à 50 000 €', 'Taux d\'intérêt préférentiel', 'Remboursement décalé après les études', 'Durée : 2 à 10 ans'], false),
    q('Quel est le montant maximum d\'un prêt étudiant classique ?',
      ['5 000 €', '20 000 €', '50 000 €'],
      2, 'Le prêt étudiant peut aller de 1 000 € à 50 000 €.'),
    t('Le prêt étudiant garanti par l\'État est accessible à tous les étudiants de moins de 28 ans, sans condition de ressources. Plafond : 20 000 €.'),
    q('Quelle est la particularité du prêt étudiant garanti par l\'État ?',
      ['Aucune caution requise', 'Taux à 0%', 'Réservé aux masters'],
      0, 'Le prêt garanti par l\'État ne nécessite aucune caution personnelle.'),
  ];

  const lesson7 = await upsertLesson({
    learningPathId: path.id,
    title: 'Obtenir un prêt étudiant',
    summary: 'Tout savoir sur le prêt étudiant et le prêt étudiant garanti par l\'État.',
    videoUrl: 'https://www.inc-conso.fr/content/quest-ce-que-le-pret-etudiant-garanti-par-letat-avec-le-reseau-des-ctrc',
    difficulty: 'BEGINNER',
    order: 5,
    estimatedMinutes: 12,
    minScore: 0,
    maxScore: 100,
    contentBlocks: lesson7Blocks,
  });
  await upsertAdviceLink(lesson7.id, 'DEBT_OK', 0);
  await upsertAdviceLink(lesson7.id, 'SCORE_MEDIUM', 1);

  // Quiz : Crédits
  const quiz = await upsertQuiz({
    title: 'Quiz : Crédits et Prêts',
    description: 'Testez vos connaissances sur les différents types de crédits et le prêt étudiant.',
    passingScore: 70,
  });

  const q1 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Quel est le délai de rétractation légal pour un crédit à la consommation ?',
    type: 'MCQ',
    explanation: 'La loi accorde 14 jours à l\'emprunteur pour revenir sur sa décision sans avoir à justifier ni payer de pénalités.',
    order: 1,
  });
  await upsertChoice({ questionId: q1.id, text: '7 jours', isCorrect: false, order: 1 });
  await upsertChoice({ questionId: q1.id, text: '14 jours', isCorrect: true, order: 2 });
  await upsertChoice({ questionId: q1.id, text: '30 jours', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q1.id, text: '1 jour', isCorrect: false, order: 4 });

  const q2 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Vrai ou faux : un crédit renouvelable se reconstitue automatiquement au fur et à mesure des remboursements.',
    type: 'TRUE_FALSE',
    explanation: 'Le crédit renouvelable est une réserve d\'argent qui se reconstitue au fil des remboursements, ce qui peut entraîner un usage répétitif et coûteux.',
    order: 2,
  });
  await upsertChoice({ questionId: q2.id, text: 'Vrai', isCorrect: true, order: 1 });
  await upsertChoice({ questionId: q2.id, text: 'Faux', isCorrect: false, order: 2 });

  const q3 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Quel est le montant maximum du prêt étudiant garanti par l\'État ?',
    type: 'MCQ',
    explanation: 'Le prêt étudiant garanti par l\'État est plafonné à 20 000 € et ne nécessite pas de caution personnelle.',
    order: 3,
  });
  await upsertChoice({ questionId: q3.id, text: '10 000 €', isCorrect: false, order: 1 });
  await upsertChoice({ questionId: q3.id, text: '20 000 €', isCorrect: true, order: 2 });
  await upsertChoice({ questionId: q3.id, text: '50 000 €', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q3.id, text: 'Sans limite', isCorrect: false, order: 4 });

  const q4 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Qui peut bénéficier d\'un microcrédit ?',
    type: 'MCQ',
    explanation: 'Le microcrédit s\'adresse aux personnes exclues du crédit bancaire classique : faibles revenus, précarité, surendettement ou fichage FICP.',
    order: 4,
  });
  await upsertChoice({ questionId: q4.id, text: 'Uniquement les entrepreneurs', isCorrect: false, order: 1 });
  await upsertChoice({ questionId: q4.id, text: 'Les personnes ne pouvant obtenir de crédit classique', isCorrect: true, order: 2 });
  await upsertChoice({ questionId: q4.id, text: 'Uniquement les étudiants', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q4.id, text: 'Tout le monde sans condition', isCorrect: false, order: 4 });

  const q5 = await upsertQuestion({
    quizId: quiz.id,
    question: 'En cas de difficultés à rembourser un crédit, quelle est la première chose à faire ?',
    type: 'MCQ',
    explanation: 'La première chose à faire est de contacter sa banque dès les premières difficultés pour trouver une solution.',
    order: 5,
  });
  await upsertChoice({ questionId: q5.id, text: 'Ignorer les courriers de relance', isCorrect: false, order: 1 });
  await upsertChoice({ questionId: q5.id, text: 'Contacter sa banque dès les premières difficultés', isCorrect: true, order: 2 });
  await upsertChoice({ questionId: q5.id, text: 'Souscrire un nouveau crédit pour rembourser l\'ancien', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q5.id, text: 'Déménager à l\'étranger', isCorrect: false, order: 4 });

  await linkQuizToLesson(quiz.id, lesson5.id);

  console.log('  ✅ Crédits : 5 leçons, 1 quiz (5 questions)');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3. CARTE BANCAIRE ET NOUVEAUX MOYENS DE PAIEMENT
// ═══════════════════════════════════════════════════════════════════════════════
async function seedCarteBancaire() {
  const path = await upsertPath({
    order: 3,
    title: 'Carte Bancaire et Moyens de Paiement',
    description: 'Maîtrisez l\'utilisation de votre carte bancaire, les nouveaux moyens de paiement et les néobanques.',
    icon: 'CreditCard',
    difficulty: 'BEGINNER',
  });

  // Lesson 8 — Comment payer avec sa carte (BEGINNER)
  const lesson8Blocks: ContentBlock[] = [
    h('Comment payer avec sa carte bancaire'),
    t('Pour payer par carte, le commerçant utilise un terminal de paiement électronique (TPE). L\'ordre de payer donné par carte est irrévocable.'),
    c('Vérifiez le montant avant de valider : une fois le paiement accepté, l\'ordre est irrévocable.', 'key'),
    q('L\'ordre de payer par carte bancaire est-il révocable ?',
      ['Oui', 'Non, il est irrévocable'],
      1, 'L\'ordre de payer donné au moyen d\'une carte est irrévocable.'),
    l(['Ne jamais communiquer votre code confidentiel', 'Vérifier le montant avant de valider', 'Conserver vos tickets de paiement', 'Activer les notifications de transactions'], false),
    q('Un commerçant peut-il refuser le paiement par carte ?',
      ['Oui, mais doit l\'indiquer avant', 'Non, c\'est interdit'],
      0, 'Un commerçant peut refuser mais doit l\'indiquer clairement avant la vente.'),
    t('La loi interdit aux commerçants de facturer des frais supplémentaires pour un paiement par carte. Si un commerçant le fait, signalez-le.'),
    q('Un commerçant peut-il facturer des frais pour un paiement par carte ?',
      ['Oui', 'Non, c\'est interdit par la loi'],
      1, 'La loi interdit les frais supplémentaires pour un paiement par carte.'),
  ];

  const lesson8 = await upsertLesson({
    learningPathId: path.id,
    title: 'Comment payer avec sa carte bancaire',
    summary: 'Les règles et précautions à connaître pour utiliser sa carte bancaire en toute sécurité.',
    difficulty: 'BEGINNER',
    order: 1,
    estimatedMinutes: 10,
    minScore: 0,
    maxScore: 100,
    contentBlocks: lesson8Blocks,
  });
  await upsertAdviceLink(lesson8.id, 'OVERDRAFT_OK', 0);
  await upsertAdviceLink(lesson8.id, 'SAVINGS_OK', 1);

  // Lesson 9 — Nouveaux moyens de paiement (BEGINNER)
  const lesson9Blocks: ContentBlock[] = [
    h('Les nouveaux moyens de paiement'),
    t('Smartphones, montres connectées, sans contact : les moyens de paiement évoluent. Ces solutions sont pratiques mais ont chacune leurs caractéristiques.'),
    c('Le paiement sans contact est limité à 50 € par transaction en France.', 'key'),
    q('Quelles technologies permettent le paiement mobile ?',
      ['Apple Pay, Google Pay, Samsung Pay', 'Uniquement PayPal', 'Le virement bancaire'],
      0, 'Apple Pay, Google Pay et Samsung Pay sont les principales solutions de paiement mobile.'),
    l(['Paiement mobile : Apple Pay, Google Pay, Samsung Pay', 'Sans contact : limité à 50 € par transaction', 'E-wallet : PayPal, Lydia, Revolut', 'Néobanques : 100% mobile, sans agence'], false),
    q('Quel est le plafond du paiement sans contact en France ?',
      ['20 €', '50 €', '100 €'],
      1, 'Le plafond du sans contact est de 50 € par transaction en France.'),
    t('Les e-wallets évitent de saisir vos coordonnées bancaires à chaque achat en ligne. Les néobanques offrent des frais réduits mais pas de conseiller dédié.'),
    q('Quel est un inconvénient des néobanques ?',
      ['Frais plus élevés', 'Pas de conseiller dédié', 'Pas d\'application mobile'],
      1, 'Les néobanques n\'ont pas de conseiller dédié ni d\'agence physique.'),
  ];

  const lesson9 = await upsertLesson({
    learningPathId: path.id,
    title: 'Les nouveaux moyens de paiement',
    summary: 'Découvrez les solutions de paiement mobile, sans contact, e-wallet et les néobanques.',
    videoUrl: 'https://www.inc-conso.fr/content/regler-nos-achats-laide-des-nouveaux-moyens-de-paiement-avec-le-reseau-des-ctrc',
    difficulty: 'BEGINNER',
    order: 2,
    estimatedMinutes: 12,
    minScore: 0,
    maxScore: 100,
    contentBlocks: lesson9Blocks,
  });
  await upsertAdviceLink(lesson9.id, 'SAVINGS_OK', 0);
  await upsertAdviceLink(lesson9.id, 'EXPENSE_OK', 1);

  // Lesson 10 — Carte et jeunes (BEGINNER)
  const lesson10Blocks: ContentBlock[] = [
    h('La carte bancaire et les jeunes'),
    t('La carte bancaire est liée à un compte bancaire, qui peut être ouvert au nom du jeune par ses parents. Les parents restent responsables du compte jusqu\'à la majorité.'),
    c('Les parents sont responsables du compte jusqu\'à la majorité. Vers 16-18 ans, le jeune peut avoir une carte de paiement avec plafond.', 'key'),
    q('Qui est responsable du compte bancaire d\'un mineur ?',
      ['Le mineur seul', 'Les parents', 'La banque'],
      1, 'Les parents restent responsables du compte bancaire de leur enfant mineur.'),
    l(['Les parents sont responsables jusqu\'à la majorité', 'Carte de retrait pour les plus jeunes', 'Carte de paiement avec plafond à 16-18 ans', 'Signalement immédiat des anomalies'], false),
    q('À partir de quel âge un jeune peut-il avoir une carte de paiement ?',
      ['12-14 ans', '16-18 ans', 'Dès la naissance'],
      1, 'À partir de 16-18 ans, le jeune peut avoir une carte de paiement avec plafond.'),
    t('Apprenez à gérer votre compte, vérifiez régulièrement votre solde et ne communiquez jamais votre code à personne.'),
    q('Que faire en cas d\'anomalie sur son compte ?',
      ['Attendre le relevé suivant', 'La signaler immédiatement', 'Changer de banque'],
      1, 'Signalez immédiatement toute anomalie à votre banque.'),
  ];

  const lesson10 = await upsertLesson({
    learningPathId: path.id,
    title: 'La carte bancaire et les jeunes',
    summary: 'Tout savoir sur l\'ouverture d\'un compte et l\'utilisation d\'une carte bancaire pour les jeunes.',
    difficulty: 'BEGINNER',
    order: 3,
    estimatedMinutes: 8,
    minScore: 0,
    maxScore: 40,
    contentBlocks: lesson10Blocks,
  });
  await upsertAdviceLink(lesson10.id, 'BUDGET_NEEDED', 0);
  await upsertAdviceLink(lesson10.id, 'SAVINGS_LOW', 1);

  // Quiz : Carte bancaire
  const quiz = await upsertQuiz({
    title: 'Quiz : Carte Bancaire et Paiements',
    description: 'Testez vos connaissances sur l\'utilisation de la carte bancaire et les nouveaux moyens de paiement.',
    passingScore: 70,
  });

  const q1 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Un commerçant peut-il appliquer des frais supplémentaires pour un paiement par carte bancaire ?',
    type: 'TRUE_FALSE',
    explanation: 'Non, la loi interdit aux commerçants de facturer des frais supplémentaires pour un paiement par carte bancaire.',
    order: 1,
  });
  await upsertChoice({ questionId: q1.id, text: 'Vrai', isCorrect: false, order: 1 });
  await upsertChoice({ questionId: q1.id, text: 'Faux', isCorrect: true, order: 2 });

  const q2 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Quel est le montant maximum d\'un paiement sans contact en France ?',
    type: 'MCQ',
    explanation: 'Le plafond du paiement sans contact est de 50 € par transaction en France.',
    order: 2,
  });
  await upsertChoice({ questionId: q2.id, text: '20 €', isCorrect: false, order: 1 });
  await upsertChoice({ questionId: q2.id, text: '50 €', isCorrect: true, order: 2 });
  await upsertChoice({ questionId: q2.id, text: '100 €', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q2.id, text: 'Il n\'y a pas de limite', isCorrect: false, order: 4 });

  const q3 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Qui est responsable du compte bancaire d\'un mineur ?',
    type: 'MCQ',
    explanation: 'Les parents restent responsables du compte bancaire de leur enfant mineur jusqu\'à sa majorité ou son émancipation.',
    order: 3,
  });
  await upsertChoice({ questionId: q3.id, text: 'Le mineur seul', isCorrect: false, order: 1 });
  await upsertChoice({ questionId: q3.id, text: 'Les parents', isCorrect: true, order: 2 });
  await upsertChoice({ questionId: q3.id, text: 'La banque', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q3.id, text: 'L\'État', isCorrect: false, order: 4 });

  const q4 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Quel est un inconvénient des néobanques par rapport aux banques traditionnelles ?',
    type: 'MCQ',
    explanation: 'Les néobanques n\'ont pas d\'agences physiques ni de conseiller dédié, ce qui peut être un inconvénient pour certains clients.',
    order: 4,
  });
  await upsertChoice({ questionId: q4.id, text: 'Frais plus élevés', isCorrect: false, order: 1 });
  await upsertChoice({ questionId: q4.id, text: 'Pas de conseiller dédié', isCorrect: true, order: 2 });
  await upsertChoice({ questionId: q4.id, text: 'Ouverture de compte lente', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q4.id, text: 'Pas d\'application mobile', isCorrect: false, order: 4 });

  await linkQuizToLesson(quiz.id, lesson9.id);

  console.log('  ✅ Carte Bancaire : 3 leçons, 1 quiz (4 questions)');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  4. CRYPTOACTIFS
// ═══════════════════════════════════════════════════════════════════════════════
async function seedCrypto() {
  const path = await upsertPath({
    order: 4,
    title: 'Cryptoactifs',
    description: 'Comprenez ce que sont les cryptoactifs, leurs risques et en quoi ils diffèrent de la monnaie traditionnelle.',
    icon: 'Shield',
    difficulty: 'ADVANCED',
  });

  // Lesson 11 — Crypto précautions (ADVANCED)
  const lesson11Blocks: ContentBlock[] = [
    h('Cryptoactifs : précautions avant d\'investir'),
    t('Les crypto-monnaies sont des actifs numériques qui s\'échangent en ligne sur des plateformes non régulées. C\'est un placement très risqué.'),
    t('Avant d\'investir, vous devez comprendre le fonctionnement de la blockchain, la volatilité du marché et les risques de perte totale.'),
    l(['Comprendre la technologie avant d\'investir', 'Pouvoir perdre la totalité de sa mise', 'Vérifier le sérieux des intermédiaires', 'Connaître les frais associés'], false),
    q('Faut-il comprendre le fonctionnement avant d\'investir ?',
      ['Oui, c\'est essentiel', 'Non, ce n\'est pas nécessaire'],
      0, 'Il est essentiel de comprendre la technologie avant d\'investir.'),
    c('N\'investissez jamais dans ce que vous ne comprenez pas. Les cryptoactifs sont à haut risque et sans filet de sécurité.', 'key'),
    t('Les plateformes d\'échange ne sont pas toutes fiables. Certaines sont de véritables arnaques. Vérifiez toujours leur sérieux avant de déposer des fonds.'),
    q('Que faut-il vérifier sur les intermédiaires financiers en crypto ?',
      ['Leur sérieux', 'Leur localisation', 'Leur âge'],
      0, 'Vérifiez toujours le sérieux des intermédiaires financiers avant d\'investir.'),
    t('Frais de transaction, de retrait et de conversion peuvent réduire considérablement vos gains. Lisez attentivement la grille tarifaire.'),
    q('Les frais liés aux cryptoactifs peuvent-ils réduire vos gains ?',
      ['Oui, considérablement', 'Non, ils sont négligeables'],
      0, 'Frais de transaction, de retrait et de conversion peuvent réduire vos gains.'),
  ];

  const lesson11 = await upsertLesson({
    learningPathId: path.id,
    title: 'Cryptoactifs : précautions avant d\'investir',
    summary: 'Les questions essentielles à se poser avant d\'investir dans les cryptoactifs.',
    videoUrl: 'https://www.inc-conso.fr/content/crypto-monnaies-quels-risques-pour-les-investisseurs-avec-lautorite-des-marches-financiers',
    difficulty: 'ADVANCED',
    order: 1,
    estimatedMinutes: 8,
    minScore: 60,
    maxScore: 100,
    contentBlocks: lesson11Blocks,
  });
  await upsertAdviceLink(lesson11.id, 'SCORE_HIGH', 0);

  // Lesson 12 — Crypto risques (ADVANCED)
  const lesson12Blocks: ContentBlock[] = [
    h('Cryptoactifs : quels risques pour les investisseurs ?'),
    t('Les cryptoactifs sont des placements non régulés. En cas de faillite, d\'arnaque ou de piratage, aucune autorité publique ne vous protège.'),
    t('La volatilité est extrême : les cours peuvent chuter de 50% ou plus en une journée. Vous pouvez perdre la totalité de votre investissement.'),
    l(['Aucune protection publique en cas de problème', 'Volatilité extrême des cours', 'Perte définitive d\'accès si clé privée perdue', 'Vulnérabilité au piratage', 'Impact environnemental important'], false),
    q('Existe-t-il une autorité qui protège les détenteurs de crypto ?',
      ['Oui, la Banque Centrale', 'Non, aucune protection publique'],
      1, 'Aucune autorité publique ne protège les utilisateurs de cryptoactifs.'),
    c('Aucune autorité publique ne vous protège. En cas de problème, vous ne pouvez compter que sur vous-même.', 'key'),
    t('Si vous perdez votre clé privée, vous perdez définitivement l\'accès à vos fonds. Il n\'existe aucun service de récupération. La sécurité repose entièrement sur vous.'),
    q('Que se passe-t-il si vous perdez votre clé privée ?',
      ['Vous pouvez la réinitialiser', 'Vous perdez l\'accès à vos fonds', 'La banque vous la redonne'],
      1, 'Si vous perdez votre clé privée, vous perdez définitivement l\'accès à vos fonds.'),
    t('Une transaction bitcoin consomme autant d\'énergie que 834 000 transactions par carte bancaire. L\'impact environnemental est considérable.'),
    q('Combien de transactions par carte équivalent à une transaction Bitcoin en énergie ?',
      ['1 000', '834 000', '1 million'],
      1, 'Une transaction Bitcoin équivaut à 834 000 transactions par carte bancaire.'),
  ];

  const lesson12 = await upsertLesson({
    learningPathId: path.id,
    title: 'Cryptoactifs : quels risques pour les investisseurs ?',
    summary: 'Les risques majeurs des cryptoactifs : volatilité, sécurité, absence de protection réglementaire.',
    videoUrl: 'https://www.inc-conso.fr/content/crypto-monnaies-quels-risques-pour-les-investisseurs-avec-lautorite-des-marches-financiers',
    difficulty: 'ADVANCED',
    order: 2,
    estimatedMinutes: 10,
    minScore: 40,
    maxScore: 100,
    contentBlocks: lesson12Blocks,
  });
  await upsertAdviceLink(lesson12.id, 'SCORE_MEDIUM', 0);
  await upsertAdviceLink(lesson12.id, 'SAVINGS_OK', 1);

  // Lesson 13 — Crypto vs monnaie (ADVANCED)
  const lesson13Blocks: ContentBlock[] = [
    h('Cryptoactifs et monnaie : quelles différences ?'),
    t('Les cryptoactifs et la monnaie sont souvent confondus. Pourtant, leurs différences sont profondes et fondamentales.'),
    t('La monnaie remplit trois fonctions : unité de compte, intermédiaire des échanges et réserve de valeur. Les cryptoactifs ne remplissent que très partiellement ces fonctions.'),
    l(['Unité de compte : mesurer la valeur des biens', 'Intermédiaire des échanges : moyen de paiement accepté', 'Réserve de valeur : conserve sa valeur dans le temps'], true),
    q('Quelles sont les trois fonctions de la monnaie ?',
      ['Achat, vente, échange', 'Unité de compte, intermédiaire des échanges, réserve de valeur', 'Paiement, épargne, crédit'],
      1, 'La monnaie a trois fonctions : unité de compte, intermédiaire des échanges, réserve de valeur.'),
    c('Les cryptoactifs n\'ont pas cours légal et ne sont pas acceptés comme moyen de paiement courant.', 'key'),
    t('Les cryptoactifs n\'ont pas cours légal : personne n\'est obligé de les accepter. Ils ne sont pas acceptés dans les commerces pour les échanges quotidiens.'),
    q('Les cryptoactifs ont-ils cours légal ?',
      ['Oui, comme l\'euro', 'Non, personne n\'est obligé de les accepter'],
      1, 'Les cryptoactifs n\'ont pas cours légal, contrairement à l\'euro.'),
    t('La volatilité des cryptoactifs est trop forte pour qu\'ils soient une réserve de valeur fiable. Ce sont des actifs spéculatifs, pas des monnaies.'),
    q('Pourquoi les cryptoactifs ne sont-ils pas une bonne réserve de valeur ?',
      ['Ils sont trop stables', 'À cause de leur volatilité', 'Ils sont trop chers'],
      1, 'La volatilité des cryptoactifs est trop forte pour être une réserve de valeur stable.'),
  ];

  const lesson13 = await upsertLesson({
    learningPathId: path.id,
    title: 'Cryptoactifs et monnaie : quelles différences ?',
    summary: 'Pourquoi les cryptoactifs ne sont pas des monnaies et comment les distinguer.',
    difficulty: 'ADVANCED',
    order: 3,
    estimatedMinutes: 10,
    minScore: 40,
    maxScore: 100,
    contentBlocks: lesson13Blocks,
  });
  await upsertAdviceLink(lesson13.id, 'SAVINGS_OK', 0);

  // Quiz : Crypto
  const quiz = await upsertQuiz({
    title: 'Quiz : Cryptoactifs',
    description: 'Testez vos connaissances sur les cryptoactifs et leurs risques.',
    passingScore: 70,
  });

  const q1 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Les cryptoactifs sont-ils considérés comme des monnaies ayant cours légal ?',
    type: 'TRUE_FALSE',
    explanation: 'Non. Contrairement à l\'euro ou au dollar, les cryptoactifs n\'ont pas cours légal. Personne n\'est obligé de les accepter comme moyen de paiement.',
    order: 1,
  });
  await upsertChoice({ questionId: q1.id, text: 'Vrai', isCorrect: false, order: 1 });
  await upsertChoice({ questionId: q1.id, text: 'Faux', isCorrect: true, order: 2 });

  const q2 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Combien de transactions par carte bancaire équivalent à une transaction Bitcoin en termes de coût énergétique ?',
    type: 'MCQ',
    explanation: 'Une transaction bitcoin a un coût énergétique équivalent à 834 000 transactions par carte bancaire.',
    order: 2,
  });
  await upsertChoice({ questionId: q2.id, text: '834 000 transactions', isCorrect: true, order: 1 });
  await upsertChoice({ questionId: q2.id, text: '10 000 transactions', isCorrect: false, order: 2 });
  await upsertChoice({ questionId: q2.id, text: '1 000 transactions', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q2.id, text: '1 million de transactions', isCorrect: false, order: 4 });

  const q3 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Quelle autorité publique protège les détenteurs de cryptoactifs en cas de faillite ou de fraude ?',
    type: 'MCQ',
    explanation: 'Aucune autorité publique ne protège les utilisateurs de cryptoactifs, car ils fonctionnent sans intermédiaire centralisé ni institution de contrôle.',
    order: 3,
  });
  await upsertChoice({ questionId: q3.id, text: 'La Banque Centrale', isCorrect: false, order: 1 });
  await upsertChoice({ questionId: q3.id, text: 'Aucune autorité publique', isCorrect: true, order: 2 });
  await upsertChoice({ questionId: q3.id, text: 'L\'AMF', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q3.id, text: 'Le Fonds Monétaire International', isCorrect: false, order: 4 });

  const q4 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Quelles sont les trois fonctions traditionnelles de la monnaie ?',
    type: 'MCQ',
    explanation: 'La monnaie a trois fonctions : unité de compte, intermédiaire des échanges et réserve de valeur. Les cryptoactifs ne remplissent que très partiellement ces fonctions.',
    order: 4,
  });
  await upsertChoice({ questionId: q4.id, text: 'Unité de compte, intermédiaire des échanges, réserve de valeur', isCorrect: true, order: 1 });
  await upsertChoice({ questionId: q4.id, text: 'Valeur, confiance, sécurité', isCorrect: false, order: 2 });
  await upsertChoice({ questionId: q4.id, text: 'Paiement, épargne, crédit', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q4.id, text: 'Comptabilité, budget, investissement', isCorrect: false, order: 4 });

  await linkQuizToLesson(quiz.id, lesson12.id);

  console.log('  ✅ Cryptoactifs : 3 leçons, 1 quiz (4 questions)');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  5. CONSOMMATION RESPONSABLE
// ═══════════════════════════════════════════════════════════════════════════════
async function seedConsoResponsable() {
  const path = await upsertPath({
    order: 5,
    title: 'Consommation Responsable',
    description: 'Apprenez à consommer de façon responsable pour faire des économies tout en respectant l\'environnement.',
    icon: 'Leaf',
    difficulty: 'BEGINNER',
  });

  // Lesson 14 — Sobriété énergétique (BEGINNER)
  const lesson14Blocks: ContentBlock[] = [
    h('Sobriété énergétique : les gestes du quotidien'),
    t('La sobriété énergétique, c\'est mieux consommer les énergies (électricité, gaz, eau) sans détériorer votre confort de vie. Chaque geste compte.'),
    c('19°C dans les pièces à vivre, 17°C dans les chambres : baisser d\'1°C réduit la facture de chauffage de 7%.', 'key'),
    q('Quel geste permet d\'économiser l\'électricité au quotidien ?',
      ['Laisser les appareils en veille', 'Éteindre les lumières en quittant une pièce', 'Utiliser des ampoules halogènes'],
      1, 'Éteindre les lumières en quittant une pièce réduit votre consommation d\'électricité.'),
    l(['Éteindre les lumières en quittant une pièce', 'Utiliser des ampoules LED', 'Débrancher les appareils en veille', 'Laver à 30°C plutôt qu\'à 60°C'], false),
    q('Quelle température est recommandée dans les pièces à vivre ?',
      ['21°C', '19°C', '17°C'],
      1, '19°C dans les pièces à vivre et 17°C dans les chambres.'),
    t('Préférez les douches aux bains, installez des mousseurs sur les robinets et réparez les fuites rapidement. Ces gestes réduisent votre facture d\'eau.'),
    q('Quel équipement permet d\'économiser jusqu\'à 50% d\'eau au robinet ?',
      ['Un mitigeur', 'Un mousseur', 'Un robinet thermostatique'],
      1, 'Les mousseurs sur les robinets permettent d\'économiser jusqu\'à 50% d\'eau.'),
  ];

  const lesson14 = await upsertLesson({
    learningPathId: path.id,
    title: 'Sobriété énergétique : les gestes du quotidien',
    summary: 'Les gestes simples pour réduire sa consommation d\'énergie au quotidien.',
    videoUrl: 'https://www.inc-conso.fr/content/sobriete-energetique-quels-gestes-adopter-au-quotidien-avec-la-clcv',
    difficulty: 'BEGINNER',
    order: 1,
    estimatedMinutes: 10,
    minScore: 0,
    maxScore: 60,
    contentBlocks: lesson14Blocks,
  });
  await upsertAdviceLink(lesson14.id, 'EXPENSE_HIGH', 0);
  await upsertAdviceLink(lesson14.id, 'BUDGET_NEEDED', 1);

  // Lesson 15 — Achats responsables (BEGINNER)
  const lesson15Blocks: ContentBlock[] = [
    h('Acheter responsable pour faire des économies'),
    t('Acheter responsable, c\'est choisir des produits durables et économes en énergie. C\'est bon pour votre portefeuille et pour la planète.'),
    c('Privilégiez les appareils de classe énergétique A ou supérieure : ils consomment moins sur toute leur durée de vie.', 'key'),
    q('Quelle classe énergétique faut-il privilégier ?',
      ['Classe B', 'Classe A ou supérieure', 'Classe C'],
      1, 'Choisissez des appareils de classe énergétique A ou supérieure.'),
    l(['Choisir des produits de qualité et durables', 'Éviter le suremballage', 'Acheter local quand c\'est possible', 'Préférer le réutilisable au jetable'], false),
    q('Consommer responsable permet-il de faire des économies ?',
      ['Oui, en réduisant les dépenses superflues', 'Non, c\'est plus cher', 'Cela dépend'],
      0, 'Consommer responsable signifie prendre conscience de ses besoins et réduire ses dépenses superflues.'),
    t('Une consommation responsable est respectueuse de l\'environnement, bénéfique pour l\'économie locale et meilleure pour votre santé.'),
    q('Qu\'est-ce qu\'une consommation responsable ?',
      ['Acheter le moins cher possible', 'Une consommation respectueuse et économique', 'Ne plus consommer'],
      1, 'Consommer responsable, c\'est respectueux de l\'environnement et économique.'),
  ];

  const lesson15 = await upsertLesson({
    learningPathId: path.id,
    title: 'Acheter responsable pour faire des économies',
    summary: 'Comment faire des choix d\'achat responsables et économiques.',
    videoUrl: 'https://www.inc-conso.fr/content/faire-des-economies-en-consommant-responsable-avec-la-banque-de-france',
    difficulty: 'BEGINNER',
    order: 2,
    estimatedMinutes: 10,
    minScore: 0,
    maxScore: 60,
    contentBlocks: lesson15Blocks,
  });
  await upsertAdviceLink(lesson15.id, 'SAVINGS_LOW', 0);
  await upsertAdviceLink(lesson15.id, 'EXPENSE_HIGH', 1);

  // Lesson 16 — Économiser l'eau (BEGINNER)
  const lesson16Blocks: ContentBlock[] = [
    h('Économiser l\'eau : réduire sa facture en polluant moins'),
    t('La qualité et la disponibilité de l\'eau sont des enjeux majeurs. Réduire votre consommation d\'eau est bon pour votre budget et pour l\'environnement.'),
    c('Installer des mousseurs sur les robinets permet d\'économiser jusqu\'à 50% d\'eau pour quelques euros.', 'key'),
    q('Quel geste réduit le plus votre facture d\'eau ?',
      ['Arroser le soir', 'Prendre des douches de 5 minutes', 'Utiliser l\'eau de pluie'],
      1, 'Prendre des douches (5 min) plutôt que des bains est le geste le plus efficace.'),
    l(['Prendre des douches plutôt que des bains', 'Installer des mousseurs sur les robinets', 'Utiliser les programmes éco du lave-linge', 'Récupérer l\'eau de pluie pour l\'arrosage'], false),
    q('L\'eau de pluie peut-elle être utilisée pour l\'arrosage ?',
      ['Oui', 'Non, c\'est interdit'],
      0, 'Oui, récupérez l\'eau de pluie pour l\'arrosage du jardin.'),
    t('Ne jetez rien dans les toilettes : lingettes, médicaments, huiles. Utilisez des produits d\'entretien biodégradables.'),
    q('Que ne faut-il surtout pas jeter dans les toilettes ?',
      ['Du papier toilette', 'Des lingettes et médicaments', 'Du savon'],
      1, 'Ne jetez pas de lingettes, médicaments ou huiles dans les toilettes.'),
  ];

  const lesson16 = await upsertLesson({
    learningPathId: path.id,
    title: 'Économiser l\'eau : réduire sa facture en polluant moins',
    summary: 'Les gestes pour réduire sa consommation d\'eau et limiter la pollution.',
    videoUrl: 'https://www.inc-conso.fr/content/eau-potable-reduire-sa-facture-deau-en-polluant-moins-avec-lunaf',
    difficulty: 'BEGINNER',
    order: 3,
    estimatedMinutes: 8,
    minScore: 0,
    maxScore: 60,
    contentBlocks: lesson16Blocks,
  });
  await upsertAdviceLink(lesson16.id, 'EXPENSE_HIGH', 0);
  await upsertAdviceLink(lesson16.id, 'SAVINGS_LOW', 1);

  // Quiz : Consommation responsable
  const quiz = await upsertQuiz({
    title: 'Quiz : Consommation Responsable',
    description: 'Testez vos connaissances sur les gestes éco-responsables et les économies d\'énergie.',
    passingScore: 70,
  });

  const q1 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Quelle est la température recommandée pour le chauffage dans les pièces à vivre ?',
    type: 'MCQ',
    explanation: '19°C est la température recommandée pour les pièces à vivre, 17°C pour les chambres.',
    order: 1,
  });
  await upsertChoice({ questionId: q1.id, text: '21°C', isCorrect: false, order: 1 });
  await upsertChoice({ questionId: q1.id, text: '19°C', isCorrect: true, order: 2 });
  await upsertChoice({ questionId: q1.id, text: '22°C', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q1.id, text: '17°C', isCorrect: false, order: 4 });

  const q2 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Quel geste est le plus efficace pour économiser l\'eau ?',
    type: 'MCQ',
    explanation: 'Prendre des douches plutôt que des bains est le geste le plus efficace pour économiser l\'eau au quotidien.',
    order: 2,
  });
  await upsertChoice({ questionId: q2.id, text: 'Prendre des douches plutôt que des bains', isCorrect: true, order: 1 });
  await upsertChoice({ questionId: q2.id, text: 'Boire de l\'eau en bouteille', isCorrect: false, order: 2 });
  await upsertChoice({ questionId: q2.id, text: 'Arroser les plantes tous les jours', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q2.id, text: 'Laver la voiture chaque semaine', isCorrect: false, order: 4 });

  const q3 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Vrai ou faux : consommer responsable permet aussi de réaliser des économies.',
    type: 'TRUE_FALSE',
    explanation: 'Vrai. Consommer responsable, c\'est prendre conscience de ses besoins réels et réduire ses dépenses superflues.',
    order: 3,
  });
  await upsertChoice({ questionId: q3.id, text: 'Vrai', isCorrect: true, order: 1 });
  await upsertChoice({ questionId: q3.id, text: 'Faux', isCorrect: false, order: 2 });

  await linkQuizToLesson(quiz.id, lesson15.id);

  console.log('  ✅ Consommation Responsable : 3 leçons, 1 quiz (3 questions)');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  6. LUTTE CONTRE LES ARNAQUES
// ═══════════════════════════════════════════════════════════════════════════════
async function seedArnaques() {
  const path = await upsertPath({
    order: 6,
    title: 'Lutte contre les Arnaques',
    description: 'Protégez-vous des fraudes bancaires et des arnaques en ligne grâce à nos conseils pratiques.',
    icon: 'ShieldCheck',
    difficulty: 'INTERMEDIATE',
  });

  // Lesson 17 — Fraude carte (BEGINNER)
  const lesson17Blocks: ContentBlock[] = [
    h('Fraude à la carte bancaire : comment réagir'),
    t('Si vous n\'avez pas donné votre accord pour une opération de paiement, la banque doit vous rembourser. Mais vous devez agir vite.'),
    c('Faites opposition immédiatement au 0 892 705 705. Chaque minute compte en cas de fraude.', 'key'),
    q('Quelle est la première chose à faire en cas de fraude bancaire ?',
      ['Attendre le relevé mensuel', 'Faire opposition immédiatement', 'Contacter le commerçant'],
      1, 'Faites opposition immédiatement auprès de votre banque.'),
    l(['Faire opposition au 0 892 705 705', 'Déposer plainte au commissariat', 'Confirmer par lettre recommandée', 'Surveiller ses relevés'], true),
    q('Après l\'opposition, quelle est la deuxième démarche ?',
      ['Attendre', 'Déposer plainte', 'Changer de carte'],
      1, 'Après l\'opposition, déposez plainte au commissariat ou par courrier.'),
    t('Vous disposez de 13 mois pour contester une opération non autorisée par carte bancaire. La banque doit vous rembourser sans frais.'),
    q('Quel est le délai pour contester une opération non autorisée ?',
      ['30 jours', '13 mois', '2 ans'],
      1, 'Vous disposez de 13 mois pour contester une opération non autorisée.'),
  ];

  const lesson17 = await upsertLesson({
    learningPathId: path.id,
    title: 'Fraude à la carte bancaire : comment réagir',
    summary: 'Les démarches à suivre en cas de fraude à la carte bancaire et vos droits au remboursement.',
    videoUrl: 'https://www.inc-conso.fr/content/fraude-la-carte-bancaire-comment-reagir-avec-familles-rurales',
    difficulty: 'BEGINNER',
    order: 1,
    estimatedMinutes: 8,
    minScore: 0,
    maxScore: 100,
    contentBlocks: lesson17Blocks,
  });
  await upsertAdviceLink(lesson17.id, 'OVERDRAFT_FREQUENT', 0);
  await upsertAdviceLink(lesson17.id, 'SCORE_LOW', 1);

  // Lesson 18 — Contester une opération (INTERMEDIATE)
  const lesson18Blocks: ContentBlock[] = [
    h('Contester une opération de paiement'),
    c('La banque doit vous rembourser sans frais une opération non autorisée, sauf en cas de négligence grave.', 'warning'),
    t('L\'ordre de payer par carte bancaire est irrévocable. Vérifiez attentivement vos relevés et contestez immédiatement toute opération suspecte.'),
    q('Quel type d\'opération peut être contesté ?',
      ['Seulement les virements', 'Opérations non autorisées, mal exécutées ou litige commercial', 'Aucune'],
      1, 'Vous pouvez contester une opération non autorisée, mal exécutée ou en cas de litige.'),
    l(['Opération non autorisée : 13 mois pour contester', 'Opération mal exécutée : 13 mois', 'Virement non autorisé : 70 jours'], false),
    q('Quel est le délai pour contester un virement non autorisé ?',
      ['13 mois', '70 jours', '30 jours'],
      1, 'Le délai est de 70 jours pour un virement non autorisé.'),
    t('La banque doit rembourser immédiatement et sans frais le montant de l\'opération frauduleuse, sauf si elle prouve votre négligence grave.'),
    q('La banque doit-elle rembourser sans frais une opération frauduleuse ?',
      ['Oui', 'Non, des frais peuvent être appliqués'],
      0, 'Oui, la banque doit rembourser immédiatement et sans frais.'),
  ];

  const lesson18 = await upsertLesson({
    learningPathId: path.id,
    title: 'Contester une opération de paiement',
    summary: 'Les motifs et délais pour contester une opération par carte bancaire.',
    difficulty: 'INTERMEDIATE',
    order: 2,
    estimatedMinutes: 10,
    minScore: 0,
    maxScore: 100,
    contentBlocks: lesson18Blocks,
  });
  await upsertAdviceLink(lesson18.id, 'OVERDRAFT_FREQUENT', 0);

  // Lesson 19 — Arnaques en ligne (BEGINNER)
  const lesson19Blocks: ContentBlock[] = [
    h('Se protéger des arnaques lors d\'achats en ligne'),
    t('Les arnaques en ligne sont de plus en plus nombreuses et les pirates de plus en plus rusés. Quelques réflexes simples vous protègent.'),
    c('Ne cliquez jamais sur un lien suspect. Tapez toujours vous-même l\'adresse du site officiel.', 'key'),
    q('Comment vérifier si un site marchand est fiable ?',
      ['Regarder son design', 'Vérifier les avis clients et la réputation', 'Regarder le nombre de produits'],
      1, 'Vérifiez la réputation via les avis clients et les forums.'),
    l(['Vérifier la réputation du site vendeur', 'Assurer que le site est sécurisé (https://)', 'Comparer les prix : offre trop belle = arnaque', 'Lire les conditions générales'], false),
    q('Un site sécurisé pour les paiements commence par :',
      ['http://', 'https://', 'ftp://'],
      1, 'Les sites sécurisés utilisent le protocole https:// avec un cadenas.'),
    t('Ne communiquez jamais votre code de carte par email ou téléphone. Activez la double authentification quand elle est disponible.'),
    q('Que faire si vous recevez un email suspect de votre banque ?',
      ['Cliquer sur le lien', 'Ne pas cliquer et contacter le service client', 'Répondre à l\'email'],
      1, 'Ne cliquez pas sur les liens suspects, contactez directement le service client.'),
  ];

  const lesson19 = await upsertLesson({
    learningPathId: path.id,
    title: 'Se protéger des arnaques lors d\'achats en ligne',
    summary: 'Les réflexes à adopter pour éviter les arnaques lors de vos achats sur Internet.',
    videoUrl: 'https://www.inc-conso.fr/content/comment-se-proteger-des-arnaques-lors-dachats-en-ligne-avec-lunaf',
    difficulty: 'BEGINNER',
    order: 3,
    estimatedMinutes: 10,
    minScore: 0,
    maxScore: 100,
    contentBlocks: lesson19Blocks,
  });
  await upsertAdviceLink(lesson19.id, 'SCORE_LOW', 0);
  await upsertAdviceLink(lesson19.id, 'SCORE_MEDIUM', 1);

  // Lesson 20 — Utilisation frauduleuse (INTERMEDIATE)
  const lesson20Blocks: ContentBlock[] = [
    h('Utilisation frauduleuse de la carte : procédure'),
    c('Ne communiquez jamais votre code confidentiel, même à un employé de banque. La banque ne vous le demandera jamais.', 'warning'),
    t('En cas d\'utilisation frauduleuse de votre carte, des démarches précises sont à effectuer pour obtenir le remboursement intégral.'),
    q('Quel est le numéro du service d\'opposition bancaire ?',
      ['0 800 000 000', '0 892 705 705', '17'],
      1, 'Le numéro du service d\'opposition est le 0 892 705 705.'),
    l(['Faire opposition au 0 892 705 705', 'Déposer plainte au commissariat', 'Envoyer une lettre recommandée à sa banque', 'Suivre le traitement du dossier'], true),
    q('Après l\'opposition, comment confirmer la fraude à sa banque ?',
      ['Par téléphone', 'Par lettre recommandée', 'Par email'],
      1, 'Envoyez une lettre recommandée à votre banque pour confirmer la fraude.'),
    t('Pour éviter la fraude : ne communiquez jamais votre code, vérifiez régulièrement vos relevés et activez les alertes SMS de transactions.'),
    q('Peut-on écrire son code confidentiel sur sa carte ?',
      ['Oui, pour ne pas l\'oublier', 'Non, il faut le mémoriser'],
      1, 'Ne notez jamais votre code sur la carte, mémorisez-le.'),
  ];

  const lesson20 = await upsertLesson({
    learningPathId: path.id,
    title: 'Utilisation frauduleuse de la carte : procédure',
    summary: 'La procédure complète en cas d\'utilisation frauduleuse et les précautions pour l\'éviter.',
    difficulty: 'INTERMEDIATE',
    order: 4,
    estimatedMinutes: 10,
    minScore: 0,
    maxScore: 100,
    contentBlocks: lesson20Blocks,
  });
  await upsertAdviceLink(lesson20.id, 'OVERDRAFT_FREQUENT', 0);
  await upsertAdviceLink(lesson20.id, 'SCORE_LOW', 1);

  // Quiz : Arnaques
  const quiz = await upsertQuiz({
    title: 'Quiz : Lutte contre les Arnaques',
    description: 'Testez vos connaissances sur les fraudes bancaires et la protection en ligne.',
    passingScore: 70,
  });

  const q1 = await upsertQuestion({
    quizId: quiz.id,
    question: 'En cas de fraude à la carte bancaire, quel est le délai maximum pour contester une opération non autorisée ?',
    type: 'MCQ',
    explanation: 'Vous disposez de 13 mois pour contester une opération non autorisée par carte bancaire.',
    order: 1,
  });
  await upsertChoice({ questionId: q1.id, text: '13 mois', isCorrect: true, order: 1 });
  await upsertChoice({ questionId: q1.id, text: '30 jours', isCorrect: false, order: 2 });
  await upsertChoice({ questionId: q1.id, text: '6 mois', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q1.id, text: '2 ans', isCorrect: false, order: 4 });

  const q2 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Vrai ou faux : Il est sécuritaire de communiquer son code de carte bancaire par email à un commerçant de confiance.',
    type: 'TRUE_FALSE',
    explanation: 'Faux. Vous ne devez jamais communiquer votre code confidentiel par email, téléphone ou SMS, quelle que soit la personne.',
    order: 2,
  });
  await upsertChoice({ questionId: q2.id, text: 'Vrai', isCorrect: false, order: 1 });
  await upsertChoice({ questionId: q2.id, text: 'Faux', isCorrect: true, order: 2 });

  const q3 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Que devez-vous faire en premier si vous constatez une utilisation frauduleuse de votre carte bancaire ?',
    type: 'MCQ',
    explanation: 'La première démarche est de faire opposition immédiatement auprès de votre banque, puis de déposer plainte.',
    order: 3,
  });
  await upsertChoice({ questionId: q3.id, text: 'Attendre le relevé de compte mensuel', isCorrect: false, order: 1 });
  await upsertChoice({ questionId: q3.id, text: 'Faire opposition immédiatement', isCorrect: true, order: 2 });
  await upsertChoice({ questionId: q3.id, text: 'Contacter le commerçant', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q3.id, text: 'Changer de banque', isCorrect: false, order: 4 });

  const q4 = await upsertQuestion({
    quizId: quiz.id,
    question: 'La banque doit-elle rembourser une opération frauduleuse si vous n\'avez pas donné votre accord ?',
    type: 'TRUE_FALSE',
    explanation: 'Oui. La banque doit rembourser immédiatement et sans frais les opérations que vous n\'avez pas autorisées.',
    order: 4,
  });
  await upsertChoice({ questionId: q4.id, text: 'Vrai', isCorrect: true, order: 1 });
  await upsertChoice({ questionId: q4.id, text: 'Faux', isCorrect: false, order: 2 });

  const q5 = await upsertQuestion({
    quizId: quiz.id,
    question: 'Quel réflexe permet de détecter rapidement une fraude bancaire ?',
    type: 'MCQ',
    explanation: 'Vérifier régulièrement ses relevés et activer les alertes SMS permet de détecter rapidement toute opération suspecte.',
    order: 5,
  });
  await upsertChoice({ questionId: q5.id, text: 'Vérifier ses relevés bancaires régulièrement', isCorrect: true, order: 1 });
  await upsertChoice({ questionId: q5.id, text: 'Garder tous ses tickets de caisse', isCorrect: false, order: 2 });
  await upsertChoice({ questionId: q5.id, text: 'Changer de mot de passe tous les jours', isCorrect: false, order: 3 });
  await upsertChoice({ questionId: q5.id, text: 'Utiliser une seule carte pour tous les achats', isCorrect: false, order: 4 });

  await linkQuizToLesson(quiz.id, lesson17.id);

  console.log('  ✅ Arnaques : 4 leçons, 1 quiz (5 questions)');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n🌱 Seed Éducation Financière (INC 2023)\n');

  // Nettoyage ancien parcours "test" si présent
  const oldTest = await prisma.learningPath.findFirst({ where: { title: 'test' } });
  if (oldTest) {
    await prisma.lesson.deleteMany({ where: { learningPathId: oldTest.id } });
    await prisma.learningPath.delete({ where: { id: oldTest.id } });
    console.log('  🗑️ Ancien parcours "test" supprimé');
  }

  await seedBudget();
  await seedCredit();
  await seedCarteBancaire();
  await seedCrypto();
  await seedConsoResponsable();
  await seedArnaques();

  const counts = {
    paths: await prisma.learningPath.count(),
    lessons: await prisma.lesson.count({ where: { status: 'PUBLISHED' } }),
    quizzes: await prisma.quiz.count(),
    questions: await prisma.quizQuestion.count(),
    choices: await prisma.quizChoice.count(),
    links: await prisma.quizLessonLink.count(),
    adviceLinks: await prisma.lessonAdviceLink.count(),
  };

  console.log(`\n✅ Seed terminé :
    ${counts.paths} parcours
    ${counts.lessons} leçons
    ${counts.quizzes} quiz
    ${counts.questions} questions
    ${counts.choices} réponses
    ${counts.links} liens quiz ↔ leçon
    ${counts.adviceLinks} liens conseil ↔ leçon\n`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
