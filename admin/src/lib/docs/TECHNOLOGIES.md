# Stack Technique — Orabank Backend App

> **Résumé —** Cette application est un back-office bancaire développé pour **Orabank Togo**.  
> Elle importe les transactions des clients, calcule leur santé financière via 6 moteurs de scoring (dépenses, revenus, dettes, épargne, soldes), génère un score global 0-100, puis déclenche des **conseils personnalisés** grâce à un moteur IA matriciel entraîné par descente de gradient.  
> L'ensemble expose une API REST NestJS + WebSocket, consommée par un panneau d'administration **Svelte 5**.
>
> Destinataire : analystes programmeurs, équipes techniques.

## Vue d'ensemble

```
FRONTEND (Admin)
  Svelte 5 + TypeScript + Vite 6 + Tailwind CSS 4

BACKEND (API)
  NestJS 11 + TypeScript + Express + Socket.IO

DATABASE & CACHE
  PostgreSQL 15 + Prisma ORM 7.8 + Redis 7

IA / NLP
  fastText + natural + Fuse.js + Moteur matriciel personnalisé
```

---

## 1. Runtime & Langage

| Technologie | Version | Rôle |
|---|---|---|
| **Node.js** | — | Moteur d'exécution JavaScript du backend |
| **TypeScript** | ^5.7 | Langage principal (backend + frontend admin) |
| **ES2023** | cible | Niveau de transpilation TypeScript |

---

## 2. Backend — NestJS

| Technologie | Version | Rôle |
|---|---|---|
| **@nestjs/core** | ^11.0.1 | Cœur du framework NestJS (DI, modules, cycles de vie) |
| **@nestjs/common** | ^11.0.1 | Décorateurs (`@Module`, `@Controller`, `@Injectable`, pipes, guards) |
| **@nestjs/platform-express** | ^11.0.1 | Adaptateur HTTP Express |
| **@nestjs/cli** | ^11.0.0 | CLI NestJS (`nest build`, `nest start`) |
| **@nestjs/schematics** | ^11.0.0 | Génération de code NestJS |
| **@nestjs/testing** | ^11.0.1 | Utilitaires de test (`Test.createTestingModule`) |
| **@nestjs/swagger** | ^11.4.4 | Génération OpenAPI / Swagger |
| **@scalar/nestjs-api-reference** | ^1.1.19 | Interface utilisateur Scalar pour la doc API (`/api/docs`) |
| **reflect-metadata** | ^0.2.2 | Polyfill nécessaire aux décorateurs NestJS |
| **rxjs** | ^7.8.1 | Programmation réactive (observables NestJS) |
| **dotenv** | ^17.4.2 | Chargement des variables d'environnement (`.env`) |

### Modules métier (NestJS) — Explications détaillées

#### AuthModule — Authentification & Sécurité

Gère l'authentification des administrateurs. Il utilise **JWT** (JSON Web Tokens) avec deux tokens : un **access token** (court, 15 min) et un **refresh token** (long, 7 jours) pour maintenir la session sans redemander le mot de passe. Les mots de passe sont hachés avec **bcryptjs** avant stockage.

Fonctionnalités :
- **Inscription** — création de compte admin avec mot de passe haché
- **Connexion** — vérification du mot de passe, génération des tokens JWT
- **Refresh token** — renouvellement silencieux du token sans déconnexion
- **MFA** (Multi-Factor Authentication) — validation en deux étapes via OTP (email, SMS, TOTP)
- **Rôles** — système de guards NestJS (`@Roles('ADMIN')`) pour restreindre l'accès aux endpoints sensibles
- **Session** — suivi des connexions actives avec horodatage

#### PrismaModule — Accès à la base de données

Point d'accès unique à la base de données via **Prisma ORM**. Il expose un `PrismaService` (singleton) que tous les autres modules utilisent pour lire/écrire dans PostgreSQL.

Ce module encapsule :
- La connexion à la base de données (via `PrismaPg` adapter)
- Les migrations Prisma pour faire évoluer le schéma
- Le client typé généré automatiquement depuis le schéma (auto-complétion TypeScript)

#### RedisModule — Cache distribué

Couche de cache basée sur **Redis** pour accélérer les accès fréquents et réduire la charge sur PostgreSQL.

Ce qu'il cache :
- **Règles globales** — les règles de classification et d'éligibilité sont chargées depuis Redis au lieu de la BDD à chaque requête
- **Surcharges classifieur** — les surcharges utilisateur pour les règles de classification, stockées par `userId`
- **Sessions** — données de session temporaires

#### MailModule — Envoi d'emails

Envoie des emails transactionnels via **Nodemailer** avec des templates **Pug**. Utilisé pour :
- **OTP** (One-Time Password) — envoi de codes de vérification à usage unique
- **Confirmation d'inscription** — email de bienvenue après création de compte

#### AnalyticsModule — Moteur de scoring financier

C'est le cœur de l'analyse financière. Il prend les transactions bancaires brutes d'un client et calcule des indicateurs de santé financière. Il est composé de plusieurs sous-moteurs qui s'enchaînent :

1. **RevenueEngine** — analyse les revenus (flux de trésorerie mensuels, régularité, volatilité)
2. **ExpenseEngine** — catégorise les dépenses (logement, alimentation, transport…), distingue le récurrent du variable
3. **BalanceEngine** — examine les soldes (solde moyen, jours à découvert, volatilité)
4. **DebtEngine** — calcule le ratio d'endettement (norme BCEAO : max 33%), historique de remboursement
5. **SavingsEngine** — mesure l'épargne (taux d'épargne, couverture du fonds d'urgence)
6. **ScoreEngine** — agrège tout ça en un **score global 0-100** (4 composantes C1-C4, 11 sous-scores)
7. **RecommendationEngine** — génère des recommandations personnalisées à partir des scores
8. **AdviceEngine / MatrixInterpreterEngine** — utilise le moteur matriciel pour transformer les features en conseils concrets (parmi 17 intentions)

#### GatewayModule — WebSocket temps réel

Configure **Socket.IO** côté serveur pour pousser des mises à jour en temps réel vers l'interface admin. Utilisé notamment pour le tableau de bord (dashboard) qui doit refléter les changements sans rechargement manuel.

#### AdminModule — API REST d'administration

Expose les endpoints CRUD pour l'interface admin (le panneau Svelte). Contient les contrôleurs et services pour :
- **Produits bancaires** — créer, lire, modifier, supprimer les produits (Compte, Carte, Crédit…)
- **Règles métier** — gérer les règles d'éligibilité, frais, limites, intérêts
- **Classifieur** — API pour tester le classifieur de transactions et gérer les surcharges
- **Embeddings** — consulter les stats des plongements, rechercher des voisins sémantiques
- **Entraînement** — lancer l'entraînement du modèle matriciel et gérer les données d'entraînement
- **Catalogue messages** — éditer les templates de messages (conseils, scores, éligibilité)
- **Lexique** — API pour le glossaire des termes bancaires

#### EligibilityModule — Moteur d'éligibilité matriciel

Détermine si un client est éligible à un produit bancaire. Remplace l'ancien système de règles `if/else` par un **calcul matriciel vectorisé** :

- Le client est représenté par un **vecteur de métriques financières** (12 features : debtRatio, monthlyIncome, etc.)
- Chaque produit est représenté par une **colonne de poids dans une matrice**
- Le score d'éligibilité = `vecteur client × matrice produits`
- Le résultat est normalisé en 3 statuts : **ELIGIBLE**, **PARTIAL** (éligible sous conditions), **NOT_ELIGIBLE**

Sous-module **EligibilityMatrixModule** : construit et charge la matrice d'éligibilité depuis la BDD (avec cache Redis).

#### SmsModule — Parsing SMS Mobile Money

Analyse les SMS reçus des opérateurs de mobile money (T-Money, Flooz…) pour en extraire des transactions structurées. Utile dans les pays où les notifications bancaires passent par SMS plutôt que par des APIs.

#### MatrixModule — Moteur d'interprétation matriciel

C'est le **cerveau de l'AdviceEngine**. Il prend les 21 features financières calculées par l'AnalyticsModule et détermine **la meilleure intention de conseil** parmi 17 possibles.

Comment ça marche concrètement :
1. Le `RuleContext` (catégorie, pourcentages, montants…) est transformé en **vecteur de 21 nombres** (features)
2. Ce vecteur est passé au moteur matriciel qui le multiplie par une **matrice de poids** (21 × 17)
3. Le résultat donne **17 scores** — un pour chaque intention possible (LOGEMENT_CRITICAL, GOOD_HABIT, etc.)
4. L'intention avec le **score le plus élevé** est sélectionnée comme conseil à donner au client

Le module propose deux architectures :
- **1 couche** : simple multiplication vecteur × matrice (21 → 17)
- **2 couches** (deep) : passage par une couche cachée de 32 neurones avec ReLU avant la sortie (321 → 32 → 17) — utilisé quand les embeddings fastText sont activés

Les poids de la matrice ne sont pas codés en dur : ils sont **appris par entraînement** (voir TrainingModule).

#### EmbeddingsModule — Plongements NLP fastText

Enrichit l'analyse financière avec la **compréhension du sens des mots**. Quand une transaction a une description texte (ex: « VIR SEPA FR76 30002… »), ce module la transforme en un vecteur de 300 nombres qui représente son sens.

- Utilise le modèle pré-entraîné **fastText français** (`cc.fr.300.vec`) de Meta
- Charge les 50 000 mots les plus fréquents (sur 2 millions disponibles)
- Quand le texte est trop long, il **moyenne les vecteurs** de chaque mot
- Le vecteur de 300 dimensions est **concaténé aux 21 features financières** → vecteur final de 321 dimensions
- Permet au moteur matriciel de « comprendre » ce que le client achète, pas seulement combien il dépense

#### TrainingModule — Entraînement par descente de gradient

Module d'**apprentissage supervisé** qui ajuste les poids de la matrice du MatrixModule. Il prend des exemples étiquetés (situation financière → intention attendue) et optimise les poids pour que les prédictions du moteur matriciel correspondent aux attentes.

Points clés :
- Fonction de perte : **margin loss** (marge de tolérance configurable)
- Algorithme : **descente de gradient** (stochastic ou batch selon configuration)
- Paramètres ajustables : **epochs** (nombre de passages), **learning rate** (vitesse d'apprentissage), **layers** (1 ou 2 couches), **margin**
- Données d'entraînement : fichier `training-data.json` (36 exemples couvrant les 17 intentions)
- Lancement : `npx ts-node src/scripts/train.ts --epochs 100`
- Le résultat est une matrice de poids optimisée qui remplace l'ancienne matrice

#### TransactionSourcesModule — Abstraction des sources

Couche d'abstraction qui permet de traiter les transactions bancaires **quelle que soit leur provenance** :
- **Source BDD** : transactions directement en base (via Prisma)
- **Source SMS** : transactions extraites de SMS mobile money (via SmsModule)

Cela permet à l'AnalyticsModule de travailler indifféremment avec les deux sources.

---

## 3. Base de données & ORM

| Technologie | Version | Rôle |
|---|---|---|
| **PostgreSQL 15** | 15-alpine | Base de données relationnelle principale (Docker) |
| **Prisma** | ^7.8.0 | ORM : schéma, migrations, client typé |
| **@prisma/adapter-pg** | ^7.8.0 | Adaptateur Prisma pour PostgreSQL |
| **pg** (node-postgres) | ^8.21.0 | Pilote PostgreSQL utilisé par Prisma |

**Schéma Prisma :** 20+ modèles, 12+ énumérations (comptes, transactions, produits, règles…)

---

## 4. Cache & File d'attente

| Technologie | Version | Rôle |
|---|---|---|
| **Redis 7** | 7-alpine | Cache : règles globales, surcharges classifieur, sessions (Docker) |
| **ioredis** | ^5.11.0 | Client Redis TypeScript |

---

## 5. Authentification & Sécurité

| Technologie | Version | Rôle |
|---|---|---|
| **jsonwebtoken** | ^9.0.3 | Génération et vérification JWT (access + refresh tokens) |
| **bcryptjs** | ^3.0.3 | Hachage et vérification des mots de passe |
| **otp-generator** | ^4.0.1 | Génération de codes à usage unique (OTP) |
| **class-validator** | ^0.15.1 | Validation des DTO (décorateurs `@IsString`, `@IsEmail`…) |
| **class-transformer** | ^0.5.1 | Transformation / sérialisation des DTO |

---

## 6. WebSockets

| Technologie | Version | Rôle |
|---|---|---|
| **socket.io** | ^4.8.3 | Communication temps réel (serveur) |
| **@nestjs/platform-socket.io** | ^11.1.24 | Intégration Socket.IO dans NestJS |
| **@nestjs/websockets** | ^11.1.24 | Décorateurs `@WebSocketGateway`, `@WebSocketServer` |

---

## 7. Email

| Technologie | Version | Rôle |
|---|---|---|
| **nodemailer** | ^8.0.8 | Envoi d'emails (transport SMTP) |
| **@nestjs-modules/mailer** | ^2.3.6 | Module NestJS pour Nodemailer (templates Pug) |
| **pug** | ^3.0.4 | Moteur de templates pour les emails (OTP, confirmation) |

---

## 8. IA / NLP / Machine Learning

**NLP** = Natural Language Processing (Traitement Automatique du Langage Naturel).

Cette section explique **ce que fait** chaque brique IA, sans détailler les formules mathématiques.

| Technologie | Version | Rôle |
|---|---|---|
| **natural** | ^8.1.1 | BayesClassifier pour la catégorisation de transactions |
| **Fuse.js** | ^7.4.1 | Recherche floue sur descriptions vs mots-clés (seuil 0.35) |
| **fastText** (cc.fr.300.vec) | — | Plongements word2vec français (300 dimensions, 50 000 mots) |
| **Moteur matriciel** (custom) | — | Vecteur 21 features × matrice 21×17 → 17 intentions scorées |
| **Réseau profond** (custom) | — | Architecture 2 couches (321→32→17) avec ReLU + Softmax |
| **Descente de gradient** (custom) | — | Optimisation par perte margin (epochs, learning rate configurables) |
| **decimal.js** | ^10.6.0 | Précision arithmétique pour les calculs financiers |

### natural (BayesClassifier)

**Sigle :** — (nom de la librairie)

- **C'est quoi ?** Un classifieur naïf bayésien. Il apprend à classer des textes dans des catégories en se basant sur des exemples déjà étiquetés.
- **Ce qu'on en fait ici :** On l'utilise pour catégoriser les **descriptions de transactions bancaires** (ex: « VIR SEPA FR76 30002… ») dans des catégories prédéfinies (logement, alimentation, transport, etc.). Le modèle est entraîné avec des exemples de transactions déjà classées, puis il prédit la catégorie des nouvelles transactions.

### Fuse.js

**Sigle :** — (nom de la librairie)

- **C'est quoi ?** Une bibliothèque de **recherche floue** (fuzzy search). Elle permet de trouver des correspondances approximatives entre une chaîne de caractères et une liste de mots-clés, même en cas de fautes d'orthographe ou de variations.
- **Ce qu'on en fait ici :** Quand une description de transaction ne correspond pas exactement aux mots-clés connus, Fuse.js calcule un score de similarité (seuil à 0.35) pour trouver la catégorie la plus proche. Exemple : « VIR SEPA » pourrait correspondre à « virement » même si le libellé exact n'est pas dans la liste.

### fastText (Embeddings / Plongements vectoriels)

**Sigle :** — (nom de la librairie Meta)

- **C'est quoi ?** fastText est une bibliothèque de Meta (Facebook) pour créer des **plongements de mots** (word embeddings). Un plongement transforme un mot en un **vecteur de nombres** (ici 300 dimensions) qui représente son sens. Les mots ayant un sens proche (ex: « logement » et « appartement ») ont des vecteurs similaires.
- **Modèle utilisé :** `cc.fr.300.vec` — un modèle pré-entraîné sur des textes français, capable de représenter plus de 2 millions de mots. On charge les 50 000 mots les plus fréquents (pour des raisons de mémoire).
- **Ce qu'on en fait ici :** On enrichit le **vecteur de contexte** (21 features financières de base) avec les embeddings de la description de la transaction. Le vecteur passe de 21 à 321 dimensions (21 features financières + 300 dimensions du plongement). Cela permet au moteur matriciel de « comprendre » le sens de la description texte, pas seulement les chiffres.

### Moteur matriciel (Matrix Engine)

**Sigle :** — (moteur custom)

- **C'est quoi ?** Un système qui remplace des `if/else` par un calcul matriciel. Au lieu d'écrire des règles du type « si le taux d'endettement > 50% ET la catégorie = LOGEMENT → ALERTE », on représente ces connaissances sous forme de **poids dans une matrice**.
- **Principe général :** On transforme la situation financière du client en un **vecteur de 21 nombres** (features). Ce vecteur est multiplié par une **matrice de poids** (21 colonnes × 17 lignes). Le résultat donne un **score pour chacune des 17 intentions** possibles. L'intention qui obtient le score le plus haut est sélectionnée.
- **Ce qu'on en fait ici :** C'est le cerveau de l'**AdviceEngine**. Il remplace l'ancien système de règles conditionnelles pour décider quel conseil donner au client. Si le score le plus haut est LOGEMENT_CRITICAL, on envoie un conseil sur le logement ; si c'est GOOD_HABIT, on félicite le client, etc.

### Réseau profond (Deep Network)

**Sigle :** — (architecture custom)

- **C'est quoi ?** Une version améliorée du moteur matriciel avec **une couche cachée supplémentaire**. Le vecteur de 321 dimensions (features financières + embeddings) passe d'abord par une couche de 32 neurones (avec fonction d'activation ReLU), puis donne les 17 scores finaux.
- **Ce qu'on en fait ici :** Le mode « 2 couches » du moteur d'interprétation, qui permet de capturer des relations plus complexes entre les features financières et le texte des descriptions.

### Descente de gradient (Training)

**Sigle :** — (algorithme custom)

- **C'est quoi ?** Un algorithme d'**apprentissage supervisé** qui ajuste automatiquement les poids de la matrice pour qu'elle donne les bonnes réponses. On lui fournit des exemples (situation → intention attendue), et il modifie petit à petit les poids pour minimiser les erreurs.
- **Ce qu'on en fait ici :** Le fichier `training-data.json` contient 36 exemples étiquetés. La CLI `npx ts-node src/scripts/train.ts --epochs 100` lance l'entraînement. On peut configurer le nombre d'époques, le taux d'apprentissage, le nombre de couches (1 ou 2) et la marge de tolérance.

### decimal.js

**Sigle :** — (nom de la librairie)

- **C'est quoi ?** Une bibliothèque de calcul avec **précision arbitraire**. JavaScript gère mal les décimales (ex: `0.1 + 0.2 = 0.30000000000000004`). decimal.js garantit que les calculs financiers sont exacts au centime près.
- **Ce qu'on en fait ici :** Tous les calculs de scores financiers (ScoreEngine, ExpenseEngine, etc.) utilisent decimal.js pour éviter les erreurs d'arrondi.

### Moteurs financiers (Analytics)

| Moteur | Explication |
|---|---|
| **ScoreEngine** | Calcule un score global de santé financière (0-100) à partir de 4 composantes (C1 à C4) et 11 sous-scores. |
| **ExpenseEngine** | Analyse les dépenses : combien le client dépense, dans quelles catégories, si c'est récurrent ou variable, et le ratio dépenses/revenus. |
| **RevenueEngine** | Analyse les revenus : flux de trésorerie mensuels, régularité des entrées, volatilité (coefficient de variation). |
| **BalanceEngine** | Analyse les soldes : solde moyen, jours à découvert, volatilité du solde. |
| **DebtEngine** | Analyse les dettes : ratio d'endettement (norme BCEAO), historique de remboursement sur 6 mois, utilisation du crédit. |
| **SavingsEngine** | Analyse l'épargne : taux d'épargne, couverture du fonds d'urgence en mois, régularité de l'épargne. |
| **RecommendationEngine** | À partir des scores, génère des recommandations personnalisées (ex: « Réduisez vos dépenses logement »). |
| **AdviceEngine / MatrixInterpreterEngine** | Utilise le moteur matriciel pour transformer les features financières en conseils concrets classés dans les 17 intentions. |

### Les 17 intentions de conseil

Quand le moteur matriciel analyse la situation du client, il choisit **une intention** parmi 17. Chaque intention correspond à un type de conseil :

| Intention | Quand est-elle choisie ? |
|---|---|
| **LOGEMENT_CRITICAL** | Dépenses logement très élevées, situation critique |
| **LOGEMENT_HIGH** | Dépenses logement élevées mais pas critiques |
| **LOGEMENT_OK** | Dépenses logement dans les normes |
| **CREDIT_HIGH** | Endettement élevé par rapport aux capacités |
| **CREDIT_NEAR_LIMIT** | Endettement proche de la limite BCEAO |
| **CREDIT_INCREASE** | Opportunité d'augmenter le crédit |
| **ALIMENTATION_SPIKE** | Pic anormal de dépenses alimentaires |
| **ALIMENTATION_HIGH** | Dépenses alimentaires élevées de façon régulière |
| **TRANSPORT_SPIKE** | Pic anormal de dépenses transport |
| **TRANSPORT_HIGH** | Dépenses transport élevées de façon régulière |
| **COMMERCE_SPIKE** | Pic anormal de dépenses commerciales |
| **CARBURANT_SPIKE** | Pic anormal de dépenses carburant |
| **SANTE_HIGH** | Dépenses santé élevées |
| **MOBILE_MONEY_HIGH** | Volume important de transactions mobile money |
| **FEES_HIGH** | Frais bancaires élevés |
| **INCOME_DROP** | Baisse significative des revenus |
| **GOOD_HABIT** | Bon comportement financier (félicitations) |

---

## 9. Frontend — Admin (Svelte)

| Technologie | Version | Rôle |
|---|---|---|
| **Svelte** | ^5.25.0 | Framework UI réactif (runes : `$state`, `$derived`, `$effect`) |
| **Vite** | ^6.3.0 | Bundler et serveur de développement |
| **@sveltejs/vite-plugin-svelte** | ^5.0.3 | Plugin Svelte pour Vite |
| **@tsconfig/svelte** | ^5.0.4 | Configuration TypeScript pour Svelte |
| **Tailwind CSS** | ^4.3.0 | Framework CSS utilitaire (thème personnalisé vert) |
| **@tailwindcss/vite** | ^4.3.0 | Plugin Tailwind CSS pour Vite |
| **@lucide/svelte** | ^1.17.0 | Bibliothèque d'icônes SVG (30+ icônes utilisées) |
| **@xyflow/svelte** | ^1.6.0 | Visualisation de graphes interactifs (relations produits-règles) |
| **@humanspeak/svelte-markdown** | ^1.6.0 | Rendu Markdown dans l'interface |

### Pages admin (10)

| Page | Rôle |
|---|---|
| **Login** | Écran d'authentification |
| **Products** | CRUD produits bancaires (10 catégories) |
| **Rules** | CRUD règles métier (types, opérateurs, seuils) |
| **Catalog** | Édition du catalogue de messages (conseils, scores, éligibilité) |
| **Classifier** | Test du classifieur de transactions avec outil SMS |
| **Embedding** | Visualisation des plongements, recherche sémantique |
| **Training** | Gestion des exemples d'entraînement, lancement du training |
| **Graph** | Graphe interactif produits ↔ règles |
| **Glossary** | Lexique des termes bancaires |
| **Docs** | Documentation technique embarquée (ce fichier et les guides matriciels) |

---

## 10. Infrastructure & Déploiement

| Technologie | Version | Rôle |
|---|---|---|
| **Docker Compose** | — | Orchestration des conteneurs (3 services) |
| **PostgreSQL 15-alpine** | 15-alpine | Base de données (image Docker légère) |
| **Redis 7-alpine** | 7-alpine | Cache (image Docker légère avec persistance) |
| **Portainer CE** | latest | Interface web de gestion Docker (ports 9000, 9443) |
| **Fuseau horaire** | Africa/Lagos | Tous les conteneurs |

### Services Docker

```yaml
services:
  postgres:
    image: postgres:15-alpine
    port: 5432
    volume: postgres-data (persistant)

  redis:
    image: redis:7-alpine
    port: 6379
    auth: requis (REDIS_PASSWORD)
    volume: redis-data (persistant)

  portainer:
    image: portainer/portainer-ce:latest
    ports: 9000, 9443
    mode: Docker-in-Docker
```

---

## 11. Qualité & Tests

| Technologie | Version | Rôle |
|---|---|---|
| **Jest** | ^30.0.0 | Framework de test unitaire et E2E |
| **ts-jest** | ^29.2.5 | Transformation TypeScript pour Jest |
| **supertest** | ^7.0.0 | Test d'endpoints HTTP |
| **@nestjs/testing** | ^11.0.1 | `Test.createTestingModule()` |

---

## 12. Linting & Formatage

| Technologie | Version | Rôle |
|---|---|---|
| **ESLint** | ^9.18.0 | Linter TypeScript (flat config) |
| **typescript-eslint** | ^8.60.0 | Règles TypeScript avancées |
| **eslint-plugin-prettier** | ^5.2.2 | Prettier intégré dans ESLint |
| **eslint-config-prettier** | ^10.0.1 | Désactive les règles ESLint conflictuelles |
| **Prettier** | ^3.4.2 | Formateur de code (single quotes, trailing commas) |
| **globals** | ^17.0.0 | Déclarations de globaux ESLint |

---

## 13. Scripts & Données

| Script / Fichier | Rôle |
|---|---|
| `prisma/seed-admin.ts` | Crée l'utilisateur admin initial |
| `prisma/seed-orabank.ts` | 4600+ lignes de produits et règles Orabank Togo (conditions 2024) |
| `src/scripts/train.ts` | CLI d'entraînement matriciel (`npx ts-node src/scripts/train.ts --epochs 100`) |
| `scripts/download-embeddings.sh` | Télécharge les plongements fastText français (~800 Mo) |
| `training-data.json` | 36 exemples d'entraînement (17 intentions) |




*Document généré le 20 juin 2026 — 70+ technologies identifiées.*
