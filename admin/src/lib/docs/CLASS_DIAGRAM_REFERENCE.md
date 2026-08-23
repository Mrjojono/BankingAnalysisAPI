# Référence Technique : Diagramme de Classes UML

Document dédié à la construction des diagrammes de classes UML.  
Contient tous les modèles Prisma, DTOs, services, contrôleurs, guards et décorateurs avec leurs attributs, types et relations.

---

## 1. Modèles de Données (Prisma ORM)

### 1.1 Enums

```prisma
enum Role {
  CLIENT        // Utilisateur client, accès mobile
  AGENT         // Conseiller bancaire
  ADMIN         // Administrateur back-office
  SUPER_ADMIN   // Super-administrateur
}

enum KycStatus {
  PENDING            // En attente
  UNDER_REVIEW       // En cours de vérification
  VERIFIED           // Vérifié
  REJECTED           // Rejeté
  SUSPENDED          // Suspendu
  EXPIRED            // Expiré
  REQUIRES_UPDATE    // Mise à jour requise
  LIMITED            // Accès limité
}

enum AccountType {
  CHECKING         // Compte courant
  SAVINGS          // Compte épargne
  LOAN             // Compte prêt
  CORPORATE        // Compte entreprise
  MOBILE_MONEY     // Compte mobile money
}

enum TransactionCategory {
  SALARY           // Salaire
  FOOD             // Alimentation
  TRANSPORT        // Transport
  HOUSING          // Logement
  UTILITIES        // Services publics
  HEALTH           // Santé
  EDUCATION        // Éducation
  ENTERTAINMENT    // Loisirs
  TRANSFER         // Virement
  SAVINGS          // Épargne
  TAXES            // Impôts
  INSURANCE        // Assurance
  SHOPPING         // Achats
  PHONE            // Téléphone/Internet
  ATM              // Retrait
  OTHER            // Autre
}

enum NotificationType {
  ADVICE           // Conseil financier
  SCORE_CHANGE     // Changement de score
  ELIGIBILITY      // Éligibilité produit
  EDUCATIONAL      // Leçon éducative
  SYSTEM           // Système
  ADMIN_BROADCAST  // Diffusion admin
  WEEKLY_DIGEST    // Résumé hebdomadaire
}

enum NotificationChannel {
  PUSH             // Notification push mobile
  EMAIL            // Email
  IN_APP           // Notification in-app
}

enum LessonDifficulty {
  BEGINNER         // Débutant
  INTERMEDIATE     // Intermédiaire
  ADVANCED         // Avancé
}

enum LessonStatus {
  DRAFT            // Brouillon
  PUBLISHED        // Publié
  ARCHIVED         // Archivé
}

enum QuizQuestionType {
  MCQ              // QCM (choix multiple, une bonne réponse)
  TRUE_FALSE       // Vrai/Faux
}

enum QuizStatus {
  DRAFT            // Brouillon
  PUBLISHED        // Publié
  ARCHIVED         // Archivé
}

enum RuleType {
  ELIGIBILITY      // Règle d'éligibilité
  LIMIT            // Limite
  FEE              // Frais
  VALUE_DATE       // Date de valeur
  INTEREST         // Intérêt
}

enum RulePeriod {
  DAILY            // Quotidien
  WEEKLY           // Hebdomadaire
  MONTHLY          // Mensuel
  YEARLY           // Annuel
  PER_TRANSACTION  // Par transaction
}

enum RuleOperator {
  GREATER_THAN     // >
  LESS_THAN        // <
  EQUALS           // ==
  GREATER_OR_EQUAL // >=
  LESS_OR_EQUAL    // <=
  BETWEEN          // Entre
  NOT_EQUALS       // !=
  IN               // Dans liste
  NOT_IN           // Pas dans liste
}
```

### 1.2 Entités (Classes Persistantes)

#### User
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant unique |
| email | String | UNIQUE, NOT NULL | Email de connexion |
| password | String? | NULLABLE | Hash bcrypt du mot de passe |
| role | Role | DEFAULT 'CLIENT' | Rôle utilisateur |
| mfaEnabled | Boolean | DEFAULT false | MFA activée |
| mfaSecret | String? | NULLABLE | Secret TOTP |
| backupCodes | String? | NULLABLE | Codes de secours MFA |
| createdAt | DateTime | DEFAULT now() | Date de création |
| updatedAt | DateTime | @updatedAt | Dernière modification |
| deletedAt | DateTime? | NULLABLE | Soft delete |

**Relations :**
- `sessions` → Session[] (1..*)
- `otpCodes` → OtpCode[] (0..*)
- `mfaAttempts` → MFAAttempt[] (0..*)
- `authLogs` → AuthLog[] (0..*)
- `bankConnections` → UserBankConnection[] (0..*)
- `pushTokens` → PushToken[] (0..*)
- `notifications` → Notification[] (0..*)
- `notificationPreference` → NotificationPreference? (0..1)
- `pathProgress` → UserPathProgress[] (0..*)
- `lessonProgress` → UserLessonProgress[] (0..*)
- `quizAttempts` → QuizAttempt[] (0..*)

#### BankCustomer
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant unique |
| firstName | String | NOT NULL | Prénom |
| lastName | String | NOT NULL | Nom |
| email | String | NOT NULL | Email |
| telephone | String? | NULLABLE | Téléphone |
| accountNumber | String | UNIQUE | Numéro de compte |
| customerCode | String | UNIQUE | Code client CBS |
| kycStatus | KycStatus | DEFAULT 'PENDING' | Statut KYC |
| isPhoneVerified | Boolean | DEFAULT false | Téléphone vérifié |
| deletedAt | DateTime? | NULLABLE | Soft delete |

**Relations :**
- `bankConnections` → UserBankConnection[] (0..*)
- `transactions` → Transaction[] (0..*)
- `financialScores` → FinancialScore[] (0..*)
- `accounts` → BankAccount[] (0..*)

#### UserBankConnection
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| userId | UUID | FK → User.id | Référence utilisateur |
| bankCustomerId | UUID | FK → BankCustomer.id | Référence client |
| role | String | NOT NULL | Rôle dans la connexion |
| createdAt | DateTime | DEFAULT now() | Date de création |

**Relations :**
- `user` → User (N:1)
- `bankCustomer` → BankCustomer (N:1)

#### Transaction
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| bankCustomerId | UUID | FK → BankCustomer.id | Référence client |
| date | DateTime | NOT NULL | Date de la transaction |
| amount | Decimal | NOT NULL | Montant |
| type | String | NOT NULL ('CREDIT'/'DEBIT') | Type |
| description | String | NOT NULL | Libellé brut |
| categorizedDescription | String? | NULLABLE | Libellé catégorisé |
| category | TransactionCategory | DEFAULT 'OTHER' | Catégorie |
| rawSmsId | UUID? | FK → RawSms.id (NULLABLE) | Source SMS |
| isVerified | Boolean | DEFAULT false | Vérifié par l'utilisateur |

**Relations :**
- `bankCustomer` → BankCustomer (N:1)
- `rawSms` → RawSms? (N:1)

#### FinancialScore
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| bankCustomerId | UUID | FK → BankCustomer.id | Référence client |
| scoreValue | Int | NOT NULL (0-100) | Score global |
| expenseRatioScore | Int? | NULLABLE | Score ratio dépenses |
| savingsRateScore | Int? | NULLABLE | Score taux épargne |
| debtRatioScore | Int? | NULLABLE | Score ratio dettes |
| revenueStabilityScore | Int? | NULLABLE | Score stabilité revenus |
| balanceVolatilityScore | Int? | NULLABLE | Score volatilité solde |
| details | Json | NOT NULL | Détail complet du calcul |
| calculatedAt | DateTime | DEFAULT now() | Date de calcul |

**Relations :**
- `bankCustomer` → BankCustomer (N:1)

#### BankAccount
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| bankCustomerId | UUID | FK → BankCustomer.id | Référence client |
| accountNumber | String | NOT NULL | Numéro de compte |
| accountType | AccountType | NOT NULL | Type de compte |
| balance | Decimal | NOT NULL | Solde actuel |
| currency | String | DEFAULT 'XOF' | Devise |

**Relations :**
- `bankCustomer` → BankCustomer (N:1)

#### Product
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| name | String | NOT NULL | Nom du produit |
| description | String? | NULLABLE | Description |
| type | String | NOT NULL | Type de produit |
| minScoreEligible | Int? | NULLABLE | Score minimum |
| isActive | Boolean | DEFAULT true | Actif |
| rules | Rule[] | 0..* | Règles associées |

#### Rule
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| name | String | NOT NULL | Nom de la règle |
| description | String? | NULLABLE | Description |
| type | RuleType | NOT NULL | Type de règle |
| productTargetId | UUID? | FK → Product.id | Produit cible |
| conditions | Json | NOT NULL | Conditions (DSL JSON) |
| priority | Int | DEFAULT 0 | Priorité |
| isActive | Boolean | DEFAULT true | Active |
| period | RulePeriod | DEFAULT 'MONTHLY' | Période d'application |
| operator | RuleOperator | NOT NULL | Opérateur |
| field | String | NOT NULL | Champ évalué |
| value | Json | NOT NULL | Valeur seuil |
| createdAt | DateTime | DEFAULT now() | Date de création |
| updatedAt | DateTime | @updatedAt | Dernière mise à jour |

**Relations :**
- `productTarget` → Product? (N:1)

#### LearningPath (Parcours)
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| title | String | NOT NULL | Titre du parcours |
| description | String? | NULLABLE | Description |
| icon | String? | NULLABLE | Icône (nom Lucide) |
| difficulty | LessonDifficulty | NOT NULL | Difficulté |
| order | Int | DEFAULT 0 | Ordre d'affichage |
| isActive | Boolean | DEFAULT true | Actif |
| createdAt | DateTime | DEFAULT now() | Date de création |
| updatedAt | DateTime | @updatedAt | Dernière mise à jour |

**Relations :**
- `lessons` → Lesson[] (0..*)
- `progress` → UserPathProgress[] (0..*)

#### Lesson (Leçon)
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| learningPathId | UUID | FK → LearningPath.id | Parcours parent |
| title | String | NOT NULL | Titre |
| content | String | NOT NULL | Contenu Markdown |
| summary | String? | NULLABLE | Résumé |
| imageUrl | String? | NULLABLE | URL image |
| videoUrl | String? | NULLABLE | URL vidéo |
| difficulty | LessonDifficulty | NOT NULL | Difficulté |
| order | Int | DEFAULT 0 | Ordre |
| estimatedMinutes | Int? | NULLABLE | Durée estimée |
| status | LessonStatus | DEFAULT 'DRAFT' | Statut |
| minScore | Int? | NULLABLE | Score minimum requis |
| maxScore | Int? | NULLABLE | Score maximum |
| relatedProductId | UUID? | FK → BankProduct.id | Produit lié |

**Relations :**
- `learningPath` → LearningPath (N:1)
- `relatedProduct` → BankProduct? (N:1)
- `adviceLinks` → LessonAdviceLink[] (0..*)
- `progress` → UserLessonProgress[] (0..*)
- `quizLinks` → QuizLessonLink[] (0..*)

#### LessonAdviceLink
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| lessonId | UUID | FK → Lesson.id | Leçon |
| adviceType | String | NOT NULL | Type de conseil |
| priority | Int | DEFAULT 0 | Priorité |

**Contrainte :** UNIQUE(lessonId, adviceType)

#### UserPathProgress
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| userId | UUID | FK → User.id | Utilisateur |
| learningPathId | UUID | FK → LearningPath.id | Parcours |
| startedAt | DateTime | DEFAULT now() | Début |
| completedAt | DateTime? | NULLABLE | Complété le |
| lessonsCompleted | Int | DEFAULT 0 | Leçons complétées |

**Contrainte :** UNIQUE(userId, learningPathId)

#### UserLessonProgress
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| userId | UUID | FK → User.id | Utilisateur |
| lessonId | UUID | FK → Lesson.id | Leçon |
| completed | Boolean | DEFAULT false | Complétée |
| completedAt | DateTime? | NULLABLE | Date de complétion |
| viewedAt | DateTime | DEFAULT now() | Dernière consultation |

**Contrainte :** UNIQUE(userId, lessonId)

#### Quiz
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| title | String | NOT NULL | Titre |
| description | String? | NULLABLE | Description |
| status | QuizStatus | DEFAULT 'DRAFT' | Statut |
| passingScore | Int | DEFAULT 70 | Score de passage (%) |
| createdAt | DateTime | DEFAULT now() | Création |
| updatedAt | DateTime | @updatedAt | Modification |

**Relations :**
- `questions` → QuizQuestion[] (0..*)
- `lessonLinks` → QuizLessonLink[] (0..*)
- `attempts` → QuizAttempt[] (0..*)

#### QuizQuestion
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| quizId | UUID | FK → Quiz.id | Quiz parent |
| question | String | NOT NULL | Texte de la question |
| type | QuizQuestionType | DEFAULT 'MCQ' | Type |
| explanation | String? | NULLABLE | Explication post-réponse |
| order | Int | DEFAULT 0 | Ordre |

**Relations :**
- `quiz` → Quiz (N:1)
- `choices` → QuizChoice[] (0..*)
- `answers` → QuizAnswer[] (0..*)

#### QuizChoice
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| questionId | UUID | FK → QuizQuestion.id | Question parent |
| text | String | NOT NULL | Texte du choix |
| isCorrect | Boolean | DEFAULT false | Bonne réponse |
| order | Int | DEFAULT 0 | Ordre |

**Relations :**
- `question` → QuizQuestion (N:1)
- `answers` → QuizAnswer[] (0..*)

#### QuizLessonLink
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| quizId | UUID | FK → Quiz.id | Quiz |
| lessonId | UUID | FK → Lesson.id | Leçon |

**Contrainte :** UNIQUE(quizId, lessonId)

#### QuizAttempt (Tentative)
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| userId | UUID | FK → User.id | Utilisateur |
| quizId | UUID | FK → Quiz.id | Quiz |
| score | Int | NOT NULL | Points obtenus |
| total | Int | NOT NULL | Points maximum |
| passed | Boolean | NOT NULL | Réussi (score >= passingScore) |
| startedAt | DateTime | DEFAULT now() | Début |
| completedAt | DateTime? | NULLABLE | Soumission |

**Relations :**
- `user` → User (N:1)
- `quiz` → Quiz (N:1)
- `answers` → QuizAnswer[] (0..*)

#### QuizAnswer
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| attemptId | UUID | FK → QuizAttempt.id | Tentative |
| questionId | UUID | FK → QuizQuestion.id | Question |
| choiceId | UUID | FK → QuizChoice.id | Choix choisi |
| isCorrect | Boolean | NOT NULL | Correct ou non |

#### Notification
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| userId | UUID | FK → User.id | Destinataire |
| type | NotificationType | NOT NULL | Type |
| channel | NotificationChannel | NOT NULL | Canal |
| title | String | NOT NULL | Titre |
| body | String | NOT NULL | Corps |
| data | Json? | NULLABLE | Données supplémentaires |
| isRead | Boolean | DEFAULT false | Lue |
| createdAt | DateTime | DEFAULT now() | Envoi |

#### PushToken
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| userId | UUID | FK → User.id | Utilisateur |
| token | String | NOT NULL | Token Expo Push |
| platform | String? | NULLABLE | Plateforme ('ios'/'android') |
| createdAt | DateTime | DEFAULT now() | Enregistrement |

**Contrainte :** UNIQUE(token)

#### NotificationPreference
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Identifiant |
| userId | UUID | FK → User.id (UNIQUE) | Utilisateur |
| pushEnabled | Boolean | DEFAULT true | Push activé |
| emailEnabled | Boolean | DEFAULT true | Email activé |
| disabledTypes | NotificationType[] | DEFAULT [] | Types désactivés |

---

## 2. Architecture NestJS : Modules, Contrôleurs, Services

### 2.1 Structure des Modules

```
src/
├── app.module.ts             ← Module racine (importe tous les modules)
├── app.controller.ts         ← Health check /debug
├── main.ts                   ← Point d'entrée (bootstrap)
│
├── auth/                     ← MOD-01 : Authentification
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts    ← /auth
│   ├── jwt-auth.guard.ts     ← Guard JWT réutilisable
│   ├── jwt.strategy.ts       ← Stratégie Passport JWT
│   ├── roles.guard.ts        ← Guard rôles (ADMIN, SUPER_ADMIN)
│   ├── roles.decorator.ts    ← @Roles('ADMIN')
│   ├── user-id.decorator.ts  ← @UserId() extrait l'ID du token
│   └── dto/
│       ├── login.dto.ts
│       ├── register.dto.ts
│       └── verify-otp.dto.ts
│
├── prisma/                   ← Accès base de données
│   ├── prisma.module.ts
│   └── prisma.service.ts     ← Wrapper PrismaClient (singleton)
│
├── analytics/                ← MOD-02 : Profil Financier 360
│   ├── analytics.module.ts
│   ├── analytics.controller.ts  ← /analytics
│   ├── services/
│   │   ├── overview.service.ts   ← Agrégation des métriques
│   │   └── score.engine.ts       ← Calcul du score global
│   └── dto/
│       └── overview.dto.ts
│
├── sms/                      ← MOD-03 : Décodeur de Relevé
│   ├── sms.module.ts
│   ├── sms.controller.ts     ← /sms
│   ├── sms.service.ts        ← Parsing + classification
│   ├── classifiers/
│   │   ├── bayes.classifier.ts
│   │   └── fuse.classifier.ts
│   └── dto/
│       ├── sms-upload.dto.ts
│       └── sms-debug.dto.ts
│
├── eligibility/              ← MOD-04 : Moteur d'Éligibilité
│   ├── eligibility.module.ts
│   ├── eligibility.controller.ts  ← /eligibility
│   ├── eligibility.service.ts
│   ├── matrix/
│   │   ├── matrix-eligibility.engine.ts
│   │   └── rule.engine.ts
│   └── dto/
│       └── eligibility-query.dto.ts
│
├── education/                ← MOD-05 : Éducation Financière
│   ├── education.module.ts
│   ├── education.service.ts
│   ├── education.controller.ts     ← /education (public)
│   ├── education-admin.controller.ts ← /api/admin/education
│   ├── matrix/                     ← Moteur de recommandation IA
│   │   ├── education-matrix.module.ts
│   │   ├── education-matrix.engine.ts
│   │   ├── education-context.builder.ts
│   │   ├── education-intent-matrix.ts
│   │   ├── education-scoring.engine.ts
│   │   └── types.ts
│   └── dto/
│       ├── create-path.dto.ts
│       ├── update-path.dto.ts
│       ├── create-lesson.dto.ts
│       ├── update-lesson.dto.ts
│       ├── create-advice-link.dto.ts
│       └── lesson-response.dto.ts
│
├── quiz/                     ← Module Quiz
│   ├── quiz.module.ts
│   ├── quiz.service.ts
│   ├── quiz.controller.ts        ← /quiz (public)
│   ├── quiz-admin.controller.ts  ← /api/admin/quiz
│   └── dto/
│       ├── create-quiz.dto.ts
│       ├── update-quiz.dto.ts
│       ├── create-question.dto.ts
│       └── submit-answer.dto.ts
│
├── notifications/            ← Notifications
│   ├── notifications.module.ts
│   ├── notifications.service.ts
│   ├── notifications.controller.ts  ← /notifications
│   ├── notifications.gateway.ts     ← WebSocket /notifications
│   └── dto/
│       ├── register-push.dto.ts
│       └── broadcast.dto.ts
│
├── admin/                    ← Admin dashboard
│   ├── admin.module.ts
│   ├── admin.controller.ts   ← /api/admin
│   └── admin.gateway.ts      ← WebSocket /admin
│
└── redis/                    ← Cache & files d'attente
    ├── redis.module.ts
    └── redis.service.ts
```

### 2.2 Contrôleurs API : Endpoints par Module

#### AuthController : `/auth`
| Méthode | Route | Guard | Description |
|---------|-------|-------|-------------|
| POST | /auth/register | - | Créer un compte |
| POST | /auth/login | - | Connexion (email + password) |
| POST | /auth/verify-otp | - | Vérifier code OTP MFA |
| POST | /auth/enable-mfa | JWT | Activer MFA |
| POST | /auth/refresh | - | Rafraîchir le JWT |

#### AnalyticsController : `/analytics`
| Méthode | Route | Guard | Description |
|---------|-------|-------|-------------|
| GET | /analytics/overview | JWT | Métriques financières + score |
| GET | /analytics/score/history | JWT | Historique des scores |

#### EducationController : `/education` (utilisateur, JWT requis)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /education/paths | Lister les parcours avec progression |
| GET | /education/paths/:id | Détail d'un parcours + leçons |
| GET | /education/lessons/:id | Contenu d'une leçon |
| PATCH | /education/lessons/:id/complete | Marquer une leçon terminée |
| GET | /education/recommendations | Leçons recommandées |

#### EducationAdminController : `/api/admin/education`
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /api/admin/education/paths | Lister tous les parcours |
| POST | /api/admin/education/paths | Créer un parcours |
| PATCH | /api/admin/education/paths/:id | Modifier un parcours |
| DELETE | /api/admin/education/paths/:id | Supprimer un parcours |
| GET | /api/admin/education/lessons | Lister les leçons |
| GET | /api/admin/education/lessons/:id | Détail d'une leçon |
| POST | /api/admin/education/lessons | Créer une leçon |
| PATCH | /api/admin/education/lessons/:id | Modifier une leçon |
| DELETE | /api/admin/education/lessons/:id | Archiver une leçon |
| POST | /api/admin/education/advice-links | Lier un conseil à une leçon |
| DELETE | /api/admin/education/advice-links/:id | Supprimer le lien |
| POST | /api/admin/education/canvas/save | Sauvegarder les connexions du canvas |
| GET | /api/admin/education/stats/paths | Stats parcours |
| GET | /api/admin/education/stats/lessons | Stats leçons |

#### QuizController : `/quiz` (utilisateur, JWT requis)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /quiz/by-lesson/:lessonId | Quiz d'une leçon (questions sans réponses) |
| POST | /quiz/:id/start | Démarrer une tentative |
| POST | /quiz/:id/submit | Soumettre les réponses |
| GET | /quiz/attempts | Historique des tentatives |
| GET | /quiz/attempts/:attemptId | Détail d'une tentative |

#### QuizAdminController : `/api/admin/quiz`
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /api/admin/quiz | Lister tous les quiz |
| POST | /api/admin/quiz | Créer un quiz |
| GET | /api/admin/quiz/:id | Détail d'un quiz |
| PATCH | /api/admin/quiz/:id | Modifier un quiz |
| DELETE | /api/admin/quiz/:id | Supprimer un quiz |
| POST | /api/admin/quiz/:id/questions | Ajouter une question |
| PATCH | /api/admin/quiz/questions/:qid | Modifier une question |
| DELETE | /api/admin/quiz/questions/:qid | Supprimer une question |
| POST | /api/admin/quiz/questions/:qid/choices | Ajouter un choix |
| PATCH | /api/admin/quiz/choices/:cid | Modifier un choix |
| DELETE | /api/admin/quiz/choices/:cid | Supprimer un choix |
| POST | /api/admin/quiz/:id/lessons/:lessonId | Lier un quiz à une leçon |
| DELETE | /api/admin/quiz/:id/lessons/:lessonId | Délier un quiz d'une leçon |

#### NotificationsController : `/notifications`
| Méthode | Route | Guard | Description |
|---------|-------|-------|-------------|
| GET | /notifications | JWT | Historique paginé |
| GET | /notifications/unread | JWT | Non lues |
| PATCH | /notifications/:id/read | JWT | Marquer lue |
| POST | /notifications/read-all | JWT | Tout marquer lu |
| GET | /notifications/preferences | JWT | Préférences |
| PATCH | /notifications/preferences | JWT | Modifier préférences |
| POST | /notifications/push/register | JWT | Enregistrer token push |
| POST | /notifications/push/unregister | JWT | Désenregistrer token |
| POST | /notifications/broadcast | JWT+Roles(ADMIN) | Diffusion admin |

### 2.3 Services : Méthodes et Responsabilités

#### QuizService
```typescript
class QuizService {
  // Admin CRUD
  listQuizzes(): Promise<Quiz[]>
  getQuiz(id: string): Promise<Quiz & { questions, choices, lessonLinks }>
  createQuiz(data: CreateQuizDto): Promise<Quiz>
  updateQuiz(id: string, data: UpdateQuizDto): Promise<Quiz>
  deleteQuiz(id: string): Promise<void>

  // Questions
  addQuestion(quizId: string, data: CreateQuestionDto): Promise<QuizQuestion>
  updateQuestion(questionId: string, data: UpdateQuestionDto): Promise<QuizQuestion>
  deleteQuestion(questionId: string): Promise<void>

  // Choices
  addChoice(questionId: string, data: ChoiceDto): Promise<QuizChoice>
  updateChoice(choiceId: string, data: UpdateChoiceDto): Promise<QuizChoice>
  deleteChoice(choiceId: string): Promise<void>

  // Lesson links
  linkToLesson(quizId: string, lessonId: string): Promise<QuizLessonLink>
  unlinkFromLesson(quizId: string, lessonId: string): Promise<void>

  // User quiz taking
  getQuizForLesson(lessonId: string, userId: string): Promise<{ quiz, lastAttempt }>
  startAttempt(quizId: string, userId: string): Promise<QuizAttempt>
  submitAttempt(quizId: string, userId: string, answers: AnswerEntry[]): Promise<QuizAttempt & { answers }>
  getUserAttempts(userId: string): Promise<QuizAttempt[]>
  getAttemptDetail(attemptId: string, userId: string): Promise<QuizAttempt & { answers }>

  // Matrix engine integration
  getUserCompletionRate(userId: string): Promise<number>
}
```

#### EducationService
```typescript
class EducationService {
  // User-facing
  getPaths(userId: string): Promise<LearningPath[]>
  getPathDetail(pathId: string, userId: string): Promise<LearningPath & { lessons }>
  getLessonDetail(lessonId: string, userId: string): Promise<Lesson>
  completeLesson(lessonId: string, userId: string): Promise<void>
  getRecommendations(userId: string, customerId: string): Promise<Recommendation[]>

  // Admin
  listAllPaths(): Promise<LearningPath[]>
  createPath(data: CreatePathDto): Promise<LearningPath>
  updatePath(id: string, data: UpdatePathDto): Promise<LearningPath>
  deletePath(id: string): Promise<void>
  listAllLessons(pathId?: string): Promise<Lesson[]>
  getLesson(id: string): Promise<Lesson>
  createLesson(data: CreateLessonDto): Promise<Lesson>
  updateLesson(id: string, data: UpdateLessonDto): Promise<Lesson>
  deleteLesson(id: string): Promise<void>
  createAdviceLink(data: CreateAdviceLinkDto): Promise<LessonAdviceLink>
  deleteAdviceLink(id: string): Promise<void>
  saveCanvas(edges: Edge[]): Promise<{ updated: number }>

  // Stats
  getPathStats(): Promise<PathStat[]>
  getLessonStats(): Promise<LessonStat[]>
}
```

#### EducationMatrixEngine
```typescript
class EducationMatrixEngine {
  getRecommendedAdviceTypes(customerId: string): Promise<string[]>
  // Calcule les conseils pertinents basés sur les métriques financières
  // Utilise : buildEducationVector(), buildEducationWeightMatrix(),
  //          computeScores(), selectActiveAdviceTypes()
  // Métriques utilisées : expenseRatio, savingsRate, debtRatio,
  //   overdraftDays, revenueVolatility, globalScore,
  //   expenseScore, savingsScore, debtScore, stabilityScore,
  //   quizCompletionRate, lessonsCompleted
}
```

#### NotificationsService
```typescript
class NotificationsService {
  getNotifications(userId: string, page: number): Promise<PaginatedResult>
  getUnreadCount(userId: string): Promise<number>
  markAsRead(notificationId: string, userId: string): Promise<void>
  markAllAsRead(userId: string): Promise<void>
  getPreferences(userId: string): Promise<NotificationPreference>
  updatePreferences(userId: string, data: PreferenceDto): Promise<NotificationPreference>
  registerPushToken(userId: string, token: string, platform?: string): Promise<PushToken>
  unregisterPushToken(userId: string, token: string): Promise<void>
  sendNotification(userId: string, type: NotificationType, title: string, body: string, data?: any): Promise<void>
  sendBulkNotification(userIds: string[], type: NotificationType, title: string, body: string): Promise<void>
  broadcast(data: BroadcastDto, adminId: string): Promise<void>
  // Envoi push via Expo, WebSocket via Gateway
}
```

### 2.4 Guards et Décorateurs

#### JwtAuthGuard (`auth/jwt-auth.guard.ts`)
- **Type** : CanActivate (NestJS Guard)
- **Fonction** : Vérifie la validité du JWT dans le header `Authorization: Bearer <token>`
- **Utilisation** : `@UseGuards(JwtAuthGuard)` sur tout contrôleur nécessitant une authentification
- **Comportement** : Extrait le payload JWT et l'attache à `req.user`

#### RolesGuard (`auth/roles.guard.ts`)
- **Type** : CanActivate (NestJS Guard)
- **Fonction** : Vérifie que le rôle de l'utilisateur correspond aux rôles requis
- **Utilisation** : `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('ADMIN', 'SUPER_ADMIN')`
- **Dépendance** : Nécessite JwtAuthGuard en amont

#### @Roles('ADMIN', 'SUPER_ADMIN') (`auth/roles.decorator.ts`)
- **Type** : Décorateur de méthode/contrôleur
- **Fonction** : Définit les rôles autorisés pour une route
- **Utilisation** : `@Roles('ADMIN')`

#### @UserId() (`auth/user-id.decorator.ts`)
- **Type** : Décorateur de paramètre
- **Fonction** : Extrait `user.id` du payload JWT depuis `req.user`
- **Utilisation** : `getDetail(@UserId() userId: string)`

#### ThrottlerGuard (global, `@nestjs/throttler`)
- **Configuration** : 3 paliers
  - `short` : 3 req/1s
  - `medium` : 20 req/10s
  - `long` : 100 req/60s

### 2.5 WebSocket Gateways

#### NotificationsGateway
- **Namespace** : `/notifications`
- **Authentification** : JWT handshake (token dans `auth.token`)
- **Rooms** : Rejoint automatiquement `user:{userId}` à la connexion
- **Événements émis** : `notification` (payload : `{ type, title, body, data }`)

#### AdminGateway
- **Namespace** : `/admin`
- **Authentification** : JWT handshake + rôle ADMIN
- **Rooms** : `admin`

---

## 3. DTOs (Data Transfer Objects)

### 3.1 Auth DTOs

#### LoginDto
```typescript
class LoginDto {
  email: string;        // @IsEmail()
  password: string;     // @IsString(), @MinLength(6)
}
```

#### RegisterDto
```typescript
class RegisterDto {
  email: string;        // @IsEmail()
  password: string;     // @IsString(), @MinLength(8)
}
```

### 3.2 Education DTOs

#### CreatePathDto
```typescript
class CreatePathDto {
  title: string;                    // @IsString()
  description?: string;             // @IsOptional() @IsString()
  icon?: string;                    // @IsOptional() @IsString()
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';  // @IsEnum()
  order?: number;                   // @IsOptional() @IsInt() @Min(0)
  isActive?: boolean;               // @IsOptional()
}
```

#### UpdatePathDto extends PartialType(CreatePathDto) {}

#### CreateLessonDto
```typescript
class CreateLessonDto {
  learningPathId: string;              // @IsUUID()
  title: string;                       // @IsString()
  content: string;                     // @IsString() (Markdown)
  summary?: string;                    // @IsOptional() @IsString()
  imageUrl?: string;                   // @IsOptional() @IsString()
  videoUrl?: string;                   // @IsOptional() @IsString()
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';  // @IsEnum()
  order?: number;                      // @IsOptional() @IsInt() @Min(0)
  estimatedMinutes?: number;           // @IsOptional() @IsInt() @Min(1)
  minScore?: number;                   // @IsOptional() @IsInt() @Min(0) @Max(100)
  maxScore?: number;                   // @IsOptional() @IsInt() @Min(0) @Max(100)
  relatedProductId?: string;           // @IsOptional() @IsUUID()
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';  // @IsOptional() @IsEnum()
}
```

#### UpdateLessonDto extends PartialType(CreateLessonDto) {}

### 3.3 Quiz DTOs

#### CreateQuizDto
```typescript
class CreateQuizDto {
  title: string;                      // @IsString()
  description?: string;               // @IsOptional() @IsString()
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';  // @IsOptional() @IsEnum()
  passingScore?: number;              // @IsOptional() @IsInt() @Min(0) @Max(100)
}
```

#### CreateQuestionDto
```typescript
class ChoiceDto {
  text: string;               // @IsString()
  isCorrect: boolean;         // @IsBoolean()
  order?: number;             // @IsOptional() @IsInt() @Min(0)
}

class CreateQuestionDto {
  question: string;                      // @IsString()
  type?: 'MCQ' | 'TRUE_FALSE';          // @IsOptional() @IsEnum()
  explanation?: string;                  // @IsOptional() @IsString()
  order?: number;                        // @IsOptional() @IsInt() @Min(0)
  choices: ChoiceDto[];                  // @IsArray() @ValidateNested({ each: true }) @Type(() => ChoiceDto)
}
```

#### SubmitQuizDto
```typescript
class AnswerEntryDto {
  questionId: string;   // @IsUUID()
  choiceId: string;     // @IsUUID()
}

class SubmitQuizDto {
  answers: AnswerEntryDto[];  // @IsArray() @ValidateNested()
}
```

---

## 4. Frontend Admin (Svelte 5)

### 4.1 Structure des Pages

```
admin/src/
├── App.svelte                  ← Point d'entrée, layout, navigation
├── app.css                     ← Styles globaux + Tailwind
│
├── lib/
│   ├── api/
│   │   └── index.ts            ← APIClient (tous les appels fetch)
│   ├── stores/
│   │   └── auth.svelte.ts      ← $state Auth store (JWT + refresh)
│   │
│   ├── components/
│   │   ├── Button.svelte       ← Bouton (primary/secondary/ghost)
│   │   ├── Input.svelte        ← Champ de formulaire
│   │   ├── Drawer.svelte       ← Panneau latéral coulissant
│   │   ├── Sidebar.svelte      ← Navigation latérale
│   │   │
│   │   ├── graph/
│   │   │   ├── Graph.svelte    ← Page graphe de produits
│   │   │   └── GraphCanvas.svelte ← Composant SvelteFlow réutilisable
│   │   │
│   │   └── education/
│   │       ├── BlockEditor.svelte       ← Éditeur Markdown par blocs
│   │       ├── StatsCards.svelte        ← Cartes statistiques
│   │       ├── PathsTable.svelte        ← Tableau parcours
│   │       ├── LessonsTable.svelte      ← Tableau leçons
│   │       ├── CanvasView.svelte        ← Canvas interactif (XYFlow)
│   │       ├── PathNode.svelte          ← Nœud parcours (custom node)
│   │       ├── LessonNode.svelte        ← Nœud leçon (custom node)
│   │       ├── QuizList.svelte          ← Liste des quiz
│   │       ├── QuizDrawer.svelte        ← Formulaire quiz
│   │       ├── QuizQuestionEditor.svelte ← Éditeur questions/choix
│   │       └── QuizLessonPicker.svelte  ← Sélecteur de leçons liées
│   │
│   └── docs/
│       └── DESIGN_UML.md       ← Document d'analyse de conception
│
├── pages/
│   ├── Login.svelte            ← Page de connexion
│   ├── Dashboard.svelte        ← Tableau de bord
│   ├── Education.svelte        ← Gestion éducation + quiz
│   ├── Products.svelte         ← Gestion produits
│   ├── Rules.svelte            ← Gestion règles
│   ├── Training.svelte         ← Entraînement NLP
│   ├── SmsDebug.svelte         ← Débogage SMS
│   ├── Logs.svelte             ← Logs d'audit
│   ├── Notifications.svelte    ← Gestion notifications
│   ├── Users.svelte            ← Gestion utilisateurs
│   └── Settings.svelte         ← Paramètres
│
└── vite.config.ts              ← Configuration Vite + proxy API
```

### 4.2 API Client

```typescript
// admin/src/lib/api/index.ts
const BASE = '/api/admin';

async function request<T>(url: string, opts?: RequestInit): Promise<T> {
  // Injecte Content-Type: application/json
  // Injecte Authorization: Bearer <token> depuis getAuth()
  // Handle 401 → tryRefresh() → retry
  // Retourne res.json() ou throw Error
}

export const api = {
  // Auth
  login(email, password): Promise<{ accessToken, refreshToken, user }>
  refreshToken(refreshToken): Promise<{ accessToken, refreshToken }>

  // Education
  listEducationPaths(): Promise<LearningPath[]>
  listEducationLessons(pathId?): Promise<Lesson[]>
  createEducationPath(data): Promise<LearningPath>
  updateEducationPath(id, data): Promise<LearningPath>
  deleteEducationPath(id): Promise<void>
  getEducationLesson(id): Promise<Lesson>
  createEducationLesson(data): Promise<Lesson>
  updateEducationLesson(id, data): Promise<Lesson>
  deleteEducationLesson(id): Promise<void>
  createEducationAdviceLink(data): Promise<LessonAdviceLink>
  deleteEducationAdviceLink(id): Promise<void>
  saveEducationCanvas(edges): Promise<{ updated: number }>
  getEducationPathStats(): Promise<PathStat[]>
  getEducationLessonStats(): Promise<LessonStat[]>

  // Quiz
  listQuizzes(): Promise<Quiz[]>
  getQuiz(id): Promise<QuizDetail>
  createQuiz(data): Promise<Quiz>
  updateQuiz(id, data): Promise<Quiz>
  deleteQuiz(id): Promise<void>
  addQuestion(quizId, data): Promise<QuizQuestion>
  updateQuestion(qid, data): Promise<QuizQuestion>
  deleteQuestion(qid): Promise<void>
  addChoice(qid, data): Promise<QuizChoice>
  updateChoice(cid, data): Promise<QuizChoice>
  deleteChoice(cid): Promise<void>
  linkQuizToLesson(quizId, lessonId): Promise<QuizLessonLink>
  unlinkQuizFromLesson(quizId, lessonId): Promise<void>

  // ... autres modules
}
```

---

## 5. Règles Métier et Contraintes

### 5.1 Quiz

- **PassingScore** : défaut 70% : configurable par quiz
- **Une tentative par quiz à la fois** : pas de soumission sans `startAttempt`
- **Choix unique correct** : une seule `isCorrect = true` par question (validé côté serveur)
- **isCorrect jamais exposé** : dans les réponses GET, `QuizChoice` ne contient pas `isCorrect`
- **Score = (bonnes réponses / total) × 100** : calculé côté serveur uniquement
- **Réussite → leçon marquée complétée** : si `passed && quiz lié à une leçon` → `UserLessonProgress.completed = true`
- **Historique des 10 dernières tentatives** : utilisé par le matrix engine pour `quizCompletionRate`

### 5.2 Éducation

- **Canvas** : connexions path→lesson enregistrées comme `lesson.learningPathId`
- **Recommandations** : basées sur `EducationMatrixEngine` (métriques financières → advice types → lessons)
- **AdviceLinks** : associent un type de conseil financier à une leçon
- **Score range** : `minScore` / `maxScore` filtrent les leçons selon le score global de l'utilisateur

### 5.3 Sécurité

- **MFA obligatoire** : après login, redirection vers OTP si `mfaEnabled`
- **Rate limiting** : 3 paliers (court: 3/s, moyen: 20/10s, long: 100/60s)
- **JWT** : access token (15 min) + refresh token (7 jours)
- **MFA brûlée** : impossibilité de réutiliser le même code OTP
- **Biométrie** : stockée côté mobile (SecureStore), pas de stockage serveur
- **Admin protégé** : tous les endpoints admin nécessitent JWT + rôle ADMIN/SUPER_ADMIN

---

## 6. Relations UML Résumées (Cardinalités)

```
User (1) ─── (0..*) Session
User (1) ─── (0..*) OtpCode
User (1) ─── (0..*) MFAAttempt
User (1) ─── (0..*) AuthLog
User (1) ─── (0..*) UserBankConnection ─── (1) BankCustomer
User (1) ─── (0..*) PushToken
User (1) ─── (0..*) Notification
User (1) ─── (0..1) NotificationPreference
User (1) ─── (0..*) UserPathProgress ─── (1) LearningPath
User (1) ─── (0..*) UserLessonProgress ─── (1) Lesson
User (1) ─── (0..*) QuizAttempt ─── (1) Quiz

BankCustomer (1) ─── (0..*) Transaction
BankCustomer (1) ─── (0..*) FinancialScore
BankCustomer (1) ─── (0..*) BankAccount

LearningPath (1) ─── (0..*) Lesson
Lesson (1) ─── (0..*) LessonAdviceLink (adviceType)
Lesson (1) ─── (0..*) QuizLessonLink ─── (1) Quiz

Quiz (1) ─── (0..*) QuizQuestion (1) ─── (0..*) QuizChoice
Quiz (1) ─── (0..*) QuizAttempt (1) ─── (0..*) QuizAnswer

Product (1) ─── (0..*) Rule
Lesson (0..*) ─── (0..1) BankProduct (relatedProduct)
```

---

## 7. Moteur Matriciel : Recommandation Éducative

### 7.1 Matrice de Pondération

12 features → 16 advice types :
```
Feature Vector (12 dimensions) :
  [0]  expense_ratio         → metrics.expenseRatio / 100
  [1]  savings_rate          → metrics.savingsRate / 100
  [2]  debt_ratio            → metrics.debtRatio / 100
  [3]  overdraft_frequency   → metrics.overdraftDays / 31
  [4]  revenue_stability     → metrics.revenueVolatilityScore / 100
  [5]  global_score          → metrics.globalScore / 100
  [6]  expense_score         → metrics.expenseRatioScore / 100
  [7]  savings_score         → metrics.savingsRateScore / 100
  [8]  debt_score            → metrics.debtRatioScore / 100
  [9]  stability_score       → metrics.balanceVolatilityScore / 100
  [10] quiz_completion_rate  → metrics.quizCompletionRate (ratio 0-1)
  [11] lessons_completed     → metrics.lessonsCompleted / 20
```

### 7.2 Advice Types Générés

```
SAVINGS_LOW         → Ratio épargne faible
EXPENSE_HIGH        → Dépenses élevées
EXPENSE_SPIKE       → Pic de dépenses
DEBT_HIGH           → Endettement élevé
DEBT_INCREASE       → Dette en augmentation
OVERDRAFT_FREQUENT  → Découverts fréquents
INCOME_DROP         → Baisse de revenus
INCOME_IRREGULAR    → Revenus irréguliers
MOBILE_MONEY_HIGH   → Fort usage mobile money
FEES_HIGH           → Frais bancaires élevés
LOGOUT_CRITICAL     → Risque critique
LOGOUT_HIGH         → Risque élevé
CREDIT_HIGH         → Crédit élevé
ALIMENTATION_HIGH   → Dépenses alimentaires élevées
TRANSPORT_HIGH      → Dépenses transport élevées
GOOD_HABIT          → Bonnes habitudes (renforcement positif)
```
