# Guide d'Architecture et Conception : Application Orabank Togo

Ce document synthétise l'évaluation de la conception globale, les diagrammes UML prioritaires, l'analyse du modèle de données, les points de risque et l'ordre de présentation recommandé pour le mémoire de fin d'études.

---

## 1. Évaluation de la Cohérence et Complétude Globale

Votre conception est **très cohérente** et **très ambitieuse mais complète** pour un projet académique de licence/master.

**Forces :**

1.  **Cohérence fonctionnelle forte :** Chaque module s'intègre logiquement dans l'objectif "analyse financière personnalisée et accompagnement bancaire". Le flux Authentification -> Décodage -> Profil 360° -> Éligibilité -> Éducation est très bien structuré.
2.  **Stack Technique Robuste :** Le choix de React Native/Expo, NestJS, Prisma et PostgreSQL est moderne, performant et adapté aux exigences d'une application bancaire. L'expertise sur cette stack sera valorisée.
3.  **Gestion Dynamique des Données Clés :** La décision de gérer les règles d'éligibilité et le contenu éducatif via une interface d'administration est un point fort majeur. Cela démontre une compréhension des besoins de flexibilité et d'autonomie pour les administrateurs/conseillers bancaires.
4.  **Identification des Acteurs :** Tous les acteurs essentiels pour un tel écosystème bancaire sont identifiés, ce qui est un signe de complétude.
5.  **Sécurité Prioritaire :** L'accent mis sur la MFA et la biométrie est une preuve de bonne pratique pour une application financière.

**Points d'attention et suggestions pour la complétude (pour le mémoire) :**

1.  **Scope et Profondeur :** Le projet est vaste. Pour le mémoire, il sera crucial de bien définir les limites de l'implémentation pour chaque module. Concentrez-vous sur la *démonstration* des concepts plutôt que sur une implémentation exhaustive de chaque fonctionnalité.
2.  **Intégration CBS (Simulation) :** Puisque c'est une simulation par fichier client, documentez bien le *format attendu* des fichiers (PDF/CSV, structure des données) et les étapes du processus de décodage. Mentionnez les limitations de cette approche (pas de données en temps réel).
3.  **Rôle de la BCEAO :** Explicitez son influence (exigences de conformité, contexte) pour éviter l'ambiguïté.
4.  **Gestion des Relevés (MOD-03) :** Détailler le stockage, la durée et les mesures de confidentialité/anonymisation des données sensibles.
5.  **Personnalisation des Conseils (MOD-05) :** Précisez les critères de contextualisation des leçons/conseils (score, dépenses, historique d'éligibilité).
6.  **Sécurité :** Au-delà de l'authentification, mentionnez la sécurité des données au repos (chiffrement DB ?) et en transit (HTTPS, JWT).

---

## 2. Diagrammes UML Prioritaires

Ces diagrammes sont essentiels pour illustrer l'architecture, le comportement et la structure des données.

### 2.1. Diagramme de Cas d'Utilisation (Use Case Diagram)
*   **Justification :** Point d'entrée fonctionnel, délimite le périmètre et les fonctionnalités du point de vue des acteurs.
*   **Contenu essentiel :**
    *   **Acteurs :** Client bancaire, Conseiller bancaire, Administrateur, CBS (simulé), Twilio, Nodemailer.
    *   **Cas d'utilisation par module :** `S'authentifier`, `Gérer MFA`, `Importer Relevé Bancaire`, `Visualiser Score`, `Consulter Éligibilité Produit`, `Gérer Règles Éligibilité`, `Consulter Leçon Éducative`, `Gérer Contenu Éducatif`, etc.
    *   **Relations :** `<<include>>`, `<<extend>>`, relations acteurs-CU.
    *   **Délimitation du système :** Encadrer les CU du système.

### 2.2. Diagramme de Classes (Class Diagram) - Vue Conceptuelle du Modèle de Données
*   **Justification :** Cœur de la modélisation de données, lien direct avec Prisma/PostgreSQL, montre la structure statique des entités.
*   **Contenu essentiel :**
    *   **Entités clés :** `User`, `BankCustomer`, `Notification`, `PushToken`, `Transaction`, `BankAccount`, `Rule`, `Product`, `Lesson`, `FinancialScore`, `MFAConfig`, `Session`.
    *   **Attributs :** Clés (ID, email, nom, montant, date), types, contraintes (PK, FK, unique, nullable).
    *   **Relations :** Associations (1-1, 1-N, N-N), cardinalités, navigabilité.
    *   **Types énumérés :** `NotificationType`, `NotificationChannel`, `KycStatus`, `TransactionCategory`.

### 2.3. Diagramme de Séquence (Sequence Diagram) - Pour les Flux Clés
*   **Justification :** Illustre le comportement dynamique, l'ordre chronologique des interactions entre objets pour des scénarios critiques.
*   **Contenu essentiel (choisir 2-3 scénarios) :**
    *   **Exemple 1 : Authentification MFA**
        *   Acteurs/Objets : `Client bancaire`, `App Mobile`, `Backend (AuthService)`, `Twilio/Nodemailer`, `Base de données`.
        *   Messages : `login()`, `demanderMFA()`, `envoyerOTP()`, `validerOTP()`, `générerJWT()`.
    *   **Exemple 2 : Import et Analyse de Relevé**
        *   Acteurs/Objets : `Client bancaire`, `App Mobile`, `Backend (SmsController/AnalyticsService)`, `Relevé Fichier`, `Classifier (NLP)`, `Base de données`.
        *   Messages : `importerRelevé(fichier)`, `uploaderFichier()`, `décoderRelevé()`, `parserTransactions()`, `classifierTransactions()`, `enregistrerTransactions()`.
    *   **Exemple 3 : Calcul du Score de Santé Financière**
        *   Acteurs/Objets : `Client bancaire`, `App Mobile`, `Backend (FinancialScoreService)`, `Base de données`, `NotificationsService`.
        *   Messages : `demanderScore()`, `récupérerTransactions()`, `calculerScore()`, `évaluerRègles()`, `persisterScore()`, `notifierScoreMisAJour()`.

### 2.4. Diagramme de Composants (Component Diagram)
*   **Justification :** Montre la structure logicielle du système (Backend NestJS en modules) et leurs interactions.
*   **Contenu essentiel :**
    *   **Composants :** `App Mobile` (Frontend), `MOD-01 Authentification`, `MOD-02 Profil Financier`, `MOD-03 Décodeur`, `MOD-04 Moteur Eligibilité`, `MOD-05 Éducation`.
    *   **Interfaces :** Services offerts (ports fournis) et dépendances (ports requis) entre les composants.

### 2.5. Diagramme de Déploiement (Deployment Diagram)
*   **Justification :** Essentiel pour montrer l'architecture physique et logicielle, et comment les composants communiquent.
*   **Contenu essentiel :**
    *   **Nœuds :** `Appareil Mobile` (Smartphone Client), `Serveur Backend` (Machine Virtuelle/Conteneur), `Base de données` (PostgreSQL), `Services Tiers` (Twilio, Nodemailer, Expo Push, CBS simulé).
    *   **Composants déployés :** `Application Mobile`, `Application NestJS`, `Prisma ORM`, `Base de données PostgreSQL`.
    *   **Relations :** Associations (réseau, connexion API) entre les nœuds, protocoles (HTTPS, TCP/IP, API REST).

---

## 3. Analyse du Modèle de Données (Pertinence pour le Mémoire)

### Entités Centrales (Absolument Essentielles)

Détailler avec tous les attributs clés, relations et contraintes.

1.  **`User` (Utilisateur Authentifié)** : `id`, `email`, `passwordHash`, `role`, `mfaEnabled`, `bioAuthEnabled`.
2.  **`BankCustomer` (Client Bancaire Physique)** : `id`, `firstName`, `lastName`, `email`, `telephone`, `accountNumber`, `customerCode`, `kycStatus`, `deletedAt`.
3.  **`Transaction` (Transaction Décodée)** : `id`, `bankCustomerId`, `date`, `amount`, `type`, `description`, `categorizedDescription`, `category`, `rawSmsId`.
4.  **`Notification` (Notification Envoyée)** : `id`, `userId`, `type`, `channel`, `title`, `body`, `data`, `isRead`, `createdAt`.
5.  **`Rule` (Règle d'Éligibilité)** : `id`, `name`, `description`, `productTargetId`, `conditions`, `priority`, `isActive`.
6.  **`Lesson` / `Advice` (Contenu Éducatif / Conseil)** : `id`, `title`, `content`, `category`, `targetAudience`, `minScore`, `maxScore`, `relatedProduct`.

### Entités Secondaires (Importantes, mais à résumer)

Présenter de manière plus concise (moins d'attributs détaillés, focus sur les relations).

1.  **`UserBankConnection`** : `id`, `userId`, `bankCustomerId`, `role`.
2.  **`BankAccount`** : `id`, `bankCustomerId`, `accountNumber`, `accountType`, `balance`, `currency`.
3.  **`Product` (Produit Bancaire)** : `id`, `name`, `description`, `minScoreEligible`.
4.  **`PushToken`** : `id`, `userId`, `token`, `platform`.
5.  **`FinancialScore` (Historique des scores)** : `id`, `bankCustomerId`, `scoreValue`, `calculatedAt`.
6.  **`MFAConfig` / `Session`** : Détails techniques pour l'authentification.

### Entités Omissibles ou à Résumer Fortement dans le Mémoire

Mentionner leur existence, sans détailler les attributs.

1.  **`RawSms` (SMS Bruts)** : "Stockage temporaire des SMS non parsés par le Décodeur."
2.  **`SmsCategory` / `SmsRule` (pour le NLP)** : "Le moteur NLP utilise des catégories et règles SMS configurables."
3.  **`AuditLog` / `ActivityLog`** : "Le système inclut un module d'audit pour la traçabilité."
4.  **`NotificationPreference`** : "Les utilisateurs peuvent gérer leurs préférences de notification."

---

## 4. Points de Conception à Risque ou Mal Couverts

### 4.1. Fiabilité et Précision du Décodeur de Relevé Bancaire (MOD-03)
*   **Risque :** Erreurs d'OCR sur PDF, difficulté de parsing de formats variés, faible précision de la classification NLP sans données d'entraînement.
*   **Impact :** Fausse analyse financière, score incorrect.
*   **Mitigation :** Utiliser librairie OCR mature, se concentrer sur un format spécifique, constituer un jeu de données NLP, mécanismes d'apprentissage continu.

### 4.2. Performance du Calcul du Score de Santé Financière (MOD-02)
*   **Risque :** Calcul lent sur grand volume d'historique de transactions.
*   **Impact :** Mauvaise UX, surcharge backend/DB.
*   **Mitigation :** Pré-calcul/cache (CRON), optimisation des requêtes, limitation de l'historique analysé.

### 4.3. Complexité du Moteur d'Éligibilité (MOD-04)
*   **Risque :** Règles configurables complexes, difficiles à gérer/tester/maintenir.
*   **Impact :** Erreurs logiques dans l'éligibilité.
*   **Mitigation :** Définir un DSL simple pour les règles (JSON structuré), utiliser un moteur de règles (ex: `json-rules-engine`), interface admin intuitive.

### 4.4. Sécurité des Données Sensibles (Transactions, MFA)
*   **Risque :** Vol/compromission de données bancaires et secrets MFA.
*   **Impact :** Violation de données, non-conformité réglementaire.
*   **Mitigation :** Chiffrement au repos (si besoin réel), chiffrement en transit (HTTPS/WSS), gestion des secrets via variables d'environnement, journaux d'audit.

### 4.5. Gestion des Erreurs et Resynchronisation
*   **Risque :** Échecs des services tiers, transactions non traitées, inconsistances de données.
*   **Impact :** Données inconsistantes, notifications manquées, UX dégradée.
*   **Mitigation :** Mécanismes de réessai (retries), files d'attente (Redis Queue/BullMQ) pour tâches critiques/asynchrones, logging robuste.

### 4.6. Expérience Utilisateur (Front-end) face à l'Ampleur du Projet
*   **Risque :** Application mobile complexe et surchargée en UX/UI.
*   **Impact :** Difficulté d'adoption, confusion utilisateur.
*   **Mitigation :** Priorisation de l'UX, utilisation d'un Design System (ex: NativeBase, React Native Paper).

---

## 5. Recommandation sur l'Ordre de Présentation dans le Mémoire

Pour un mémoire académique, privilégiez une structure logique guidant le lecteur de la problématique à la solution.

#### **Chapitre 1 : Introduction Générale**
*   Contexte (Orabank, enjeux), Problématique, Objectifs, Périmètre, Méthodologie (Scrum).

#### **Chapitre 2 : Analyse des Besoins et Spécifications Fonctionnelles**
*   Acteurs, Diagrammes de Cas d'Utilisation (Général + par Module), Exigences Fonctionnelles/Non Fonctionnelles.

#### **Chapitre 3 : Conception Architecturale et Technique**
*   Architecture Générale, Diagramme de Composants, Diagramme de Déploiement, Choix Technologiques, Conception des Modules Clés (Authentification, Décodeur, Moteur d'Éligibilité).

#### **Chapitre 4 : Conception Détaillée du Modèle de Données**
*   Modèle Conceptuel (Diagramme de Classes), Justification des choix (entités centrales/secondaires/omissibles).

#### **Chapitre 5 : Implémentation et Réalisation**
*   Structure du Projet, Détail des Modules Implémentés (Profil Financier 360°, Éducation Financière), Exemples d'Écrans, Stratégie de Tests, Résolution des Points à Risque.

#### **Chapitre 6 : Conclusion et Perspectives**
*   Bilan, Limitations, Perspectives d'Évolution.

---

Ce guide est un outil pour structurer votre réflexion et votre rédaction. Bonne chance pour votre projet de fin d'études !
