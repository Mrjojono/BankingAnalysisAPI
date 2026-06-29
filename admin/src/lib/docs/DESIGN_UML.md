# Analyse de Conception et Guide UML - Application Orabank Togo

Projet : "Conception et developpement d'une application mobile d'analyse financiere personnalisee et d'accompagnement bancaire intelligent"

Stack : React Native + Expo (mobile), NestJS + Prisma (backend), Svelte 5 (admin), PostgreSQL (BDD)
Methode : Scrum
Modules : MOD-01 a MOD-05 + Module Quiz (en cours)

---

## 1. Evaluation de la Coherence et Completude Globale

### 1.1 Forces de la conception

**Coherence fonctionnelle forte**
Le flux principal du systeme suit une logique metier solide : le client s'authentifie (MOD-01), importe ses releves bancaires (MOD-03), le systeme decode et classe ses transactions, calcule un score de sante financiere (MOD-02), determine son eligibilite aux produits bancaires (MOD-04), puis lui propose des lecons et conseils adaptes (MOD-05). Le module Quiz vient naturellement cloturer ce parcours en evaluant la comprehension du client. Cette chaine Auth -\u003e Decodage -\u003e Profil 360 -\u003e Eligibilite -\u003e Education -\u003e Quiz est coherente et reflete un vrai processus d'accompagnement bancaire.

**Stack technique robuste et justifiable**
Le choix de React Native/Expo pour le mobile, NestJS pour le backend et Prisma/PostgreSQL pour la persistance est moderne, performant et largement documente. TypeScript assure la coherence des types entre frontend et backend. Svelte 5 pour le panneau d'administration est un choix pertinent pour une interface reactive et legere. Cette stack est facilement justifiable dans un memoire academique.

**Gestion dynamique des donnees cles**
La decision de gerer les regles d'eligibilite et le contenu educatif via une interface d'administration est un point fort majeur. Cela demontre une comprehension des besoins de flexibilite : les conseillers bancaires peuvent modifier les criteres d'eligibilite ou ajouter des lecons sans intervention technique.

**Identification des acteurs**
Tous les acteurs essentiels sont identifies : Client bancaire (utilisateur principal), Conseiller bancaire (intermediaire), Administrateur (gestion du contenu et des regles), CBS simule (source de donnees), Twilio/Nodemailer (services tiers pour MFA), BCEAO (cadre reglementaire). Cela montre une vision complete de l'ecosysteme.

**Securite prioritaire**
L'implementation de la MFA (OTP par SMS et email), des JWT guards, du rate-limiting a trois paliers et de la biometrie est un argument de qualite pour une application financiere. La separation des guards et decorators NestJS est conforme aux bonnes pratiques.

### 1.2 Points d'attention et faiblesses identifiees

**Scope trop large pour un projet academique**
Le projet couvre l'ensemble du cycle bancaire : ingestion de donnees, scoring, recommendation, formation et evaluation. Pour le memoire, il faut absolument definir les limites de l'implementation reelle. Par exemple : un seul format de releve supporte (CSV Orabank), un nombre limite de regles d'eligibilite, un quiz prototype avec 5-10 questions.

**Integration CBS uniquement simulee**
Le systeme ne se connecte pas a un vrai Core Banking System. Les donnees sont importees via des fichiers. Cela doit etre clairement presente comme une limitation dans le memoire, tout en expliquant le format attendu des fichiers et la strategie d'integration future.

**Role de la BCEAO peu explicite**
La BCEAO est mentionnee comme acteur mais son influence reelle sur le systeme n'est pas clairement definie. Dans le memoire, il faut preciser qu'elle impose un cadre reglementaire (conformite KYC, protection des donnees financieres) sans interagir directement avec le systeme.

**Confidentialite des donnees financieres**
Le stockage des transactions et des scores financiers necessite une reflexion sur le chiffrement au repos, la duree de retention et les mesures d'anonymisation. Ce point doit etre aborde dans la section securite du memoire.

**Module Quiz pas encore implemente**
Le module Quiz est la derniere brique du systeme. Son integration avec les modules existants (notamment MOD-05 Education et MOD-02 Profil) doit etre planifiee en coherence avec l'architecture existante.

---

## 2. Diagrammes UML Prioritaires a Produire

### 2.1 Diagramme de Cas d'Utilisation (Use Case Diagram)

**Justification** : C'est le point d'entree fonctionnel du memoire. Il delimite le perimetre du systeme et montre ce que chaque acteur peut faire. Il est indispensable pour le chapitre "Analyse des besoins".

**Ce qu'il doit absolument contenir :**

Acteurs a representer :
- Client bancaire : acteur principal, interagit avec tous les modules
- Conseiller bancaire : consulte les profils clients, gere certaines regles
- Administrateur : gere le contenu educatif, les regles d'eligibilite, les quiz, les notifications broadcast
- CBS (systeme externe simule) : fournit les donnees bancaires via fichiers
- Twilio : service externe d'envoi de SMS pour l'OTP
- Nodemailer : service externe d'envoi d'email pour l'OTP
- BCEAO : acteur passif, impose le cadre reglementaire (pas d'interaction directe)

Cas d'utilisation par module :

MOD-01 (Authentification) :
- S'authentifier (login email/mot de passe)
- Gerer la MFA (activer/desactiver, choisir canal OTP)
- Activer la biometrie (empreinte/Face ID)
- Reinitialiser le mot de passe

MOD-02 (Profil Financier 360) :
- Visualiser le score de sante financiere
- Consulter l'historique des scores
- Voir la repartition des depenses par categorie
- Recevoir des conseils personnalises

MOD-03 (Decodeur de Releve) :
- Importer un releve bancaire (PDF/CSV)
- Importer des SMS bancaires
- Visualiser les transactions decodees
- Corriger une categorisation

MOD-04 (Moteur d'Eligibilite) :
- Consulter son eligibilite aux produits bancaires
- Simuler une eligibilite (que se passe-t-il si je change mes habitudes)
- Gerer les regles d'eligibilite (admin/conseiller)
- Gerer le catalogue de produits (admin)

MOD-05 (Education Financiere) :
- Consulter les lecons educatives
- Marquer une lecon comme terminee
- Recevoir des conseils contextualises (lies au score)
- Gerer le contenu educatif (admin)

Module Quiz :
- Passer un quiz
- Voir ses resultats et son score
- Consulter l'historique de ses quiz
- Creer/modifier un quiz (admin)
- Voir les statistiques des quiz (admin)

Notifications (transversal) :
- Recevoir des notifications push
- Gerer ses preferences de notification
- Envoyer un broadcast (admin)

Relations a representer :
- "include" : S'authentifier inclut obligatoirement Gerer la MFA (la MFA est obligatoire)
- "include" : Importer un releve inclut Decoder les transactions
- "include" : Passer un quiz inclut Calculer le score du quiz
- "extend" : Consulter le score peut optionnellement declencher Recevoir des conseils personnalises
- "extend" : Passer un quiz peut optionnellement declencher Recommander une lecon
- "extend" : Consulter son eligibilite peut optionnellement declencher Recevoir une notification

Limite du systeme : toutes les fonctionnalites sont encadrees dans un rectangle "Systeme Orabank Togo". Les acteurs externes (Twilio, Nodemailer, CBS, BCEAO) sont en dehors.

### 2.2 Diagramme de Classes (Class Diagram - Vue Conceptuelle)

**Justification** : C'est le coeur de la modelisation de donnees. Il correspond directement au schema Prisma et a la base PostgreSQL. Il est indispensable pour le chapitre "Conception du modele de donnees".

**Ce qu'il doit absolument contenir :**

Entites (classes) avec leurs attributs principaux :

User :
- id : UUID (PK)
- email : String (unique)
- passwordHash : String
- role : UserRole (enum)
- mfaEnabled : Boolean
- mfaSecret : String (nullable)
- bioAuthEnabled : Boolean
- createdAt : DateTime
- updatedAt : DateTime

BankCustomer :
- id : UUID (PK)
- firstName : String
- lastName : String
- email : String
- telephone : String
- accountNumber : String (unique)
- customerCode : String (unique)
- kycStatus : KycStatus (enum)
- deletedAt : DateTime (nullable, soft delete)

UserBankConnection :
- id : UUID (PK)
- userId : UUID (FK vers User)
- bankCustomerId : UUID (FK vers BankCustomer)
- role : String
- createdAt : DateTime

Transaction :
- id : UUID (PK)
- bankCustomerId : UUID (FK vers BankCustomer)
- date : DateTime
- amount : Decimal
- type : String (CREDIT/DEBIT)
- description : String
- categorizedDescription : String
- category : TransactionCategory (enum)
- rawSmsId : UUID (FK, nullable)

FinancialScore :
- id : UUID (PK)
- bankCustomerId : UUID (FK vers BankCustomer)
- scoreValue : Int (0-100)
- details : Json (detail du calcul par critere)
- calculatedAt : DateTime

BankAccount :
- id : UUID (PK)
- bankCustomerId : UUID (FK vers BankCustomer)
- accountNumber : String
- accountType : String
- balance : Decimal
- currency : String (XOF par defaut)

Product :
- id : UUID (PK)
- name : String
- description : String
- type : String
- minScoreEligible : Int
- isActive : Boolean

Rule :
- id : UUID (PK)
- name : String
- description : String
- productTargetId : UUID (FK vers Product)
- conditions : Json (DSL JSON des regles)
- priority : Int
- isActive : Boolean

Lesson :
- id : UUID (PK)
- title : String
- content : Text
- category : String
- targetAudience : String
- minScore : Int
- maxScore : Int
- relatedProductId : UUID (FK, nullable)
- isPublished : Boolean
- createdAt : DateTime

Notification :
- id : UUID (PK)
- userId : UUID (FK vers User)
- type : NotificationType (enum)
- channel : NotificationChannel (enum)
- title : String
- body : String
- data : Json (nullable)
- isRead : Boolean (defaut false)
- createdAt : DateTime

NotificationPreference :
- id : UUID (PK)
- userId : UUID (FK vers User)
- pushEnabled : Boolean
- emailEnabled : Boolean
- disabledTypes : NotificationType[] (tableau d'enums)

PushToken :
- id : UUID (PK)
- userId : UUID (FK vers User)
- token : String (token Expo Push)
- platform : String (ios/android)
- createdAt : DateTime

Quiz :
- id : UUID (PK)
- title : String
- description : String (nullable)
- difficulty : Int (1-3 : facile, moyen, difficile)
- isActive : Boolean
- publishedAt : DateTime (nullable)
- createdAt : DateTime
- updatedAt : DateTime

Question :
- id : UUID (PK)
- quizId : UUID (FK vers Quiz)
- text : String
- explanation : String (explication affichee apres la reponse)
- order : Int
- type : String (SINGLE_CHOICE, MULTIPLE_CHOICE)

Option :
- id : UUID (PK)
- questionId : UUID (FK vers Question)
- text : String
- isCorrect : Boolean (defaut false)

QuizResult :
- id : UUID (PK)
- userId : UUID (FK vers User)
- quizId : UUID (FK vers Quiz)
- score : Int (pourcentage 0-100)
- totalQuestions : Int
- correctAnswers : Int
- answers : Json (detail des reponses)
- completedAt : DateTime

Enumerations a representer :
- UserRole : USER, ADMIN, ADVISOR
- KycStatus : VERIFIED, PENDING, REJECTED
- TransactionCategory : FOOD, TRANSPORT, SALARY, UTILITIES, TRANSFER, ENTERTAINMENT, HEALTH, EDUCATION, OTHER
- NotificationType : ADVICE, SCORE_CHANGE, ELIGIBILITY, EDUCATIONAL, SYSTEM, ADMIN_BROADCAST, WEEKLY_DIGEST, QUIZ_AVAILABLE
- NotificationChannel : PUSH, EMAIL, IN_APP

Relations et cardinalites :
- User (1) --- (0..*) Notification : un utilisateur recoit zero ou plusieurs notifications
- User (1) --- (0..*) PushToken : un utilisateur enregistre zero ou plusieurs tokens push
- User (1) --- (1) NotificationPreference : un utilisateur a exactement une preference
- User (1) --- (0..*) UserBankConnection : un utilisateur est lie a zero ou plusieurs clients bancaires
- User (1) --- (0..*) QuizResult : un utilisateur passe zero ou plusieurs quiz
- BankCustomer (1) --- (0..*) Transaction : un client possede zero ou plusieurs transactions
- BankCustomer (1) --- (0..*) FinancialScore : un client a zero ou plusieurs scores historiques
- BankCustomer (1) --- (0..*) BankAccount : un client a zero ou plusieurs comptes
- BankCustomer (1) --- (0..*) UserBankConnection : un client bancaire est lie a zero ou plusieurs utilisateurs
- Product (1) --- (0..*) Rule : un produit a zero ou plusieurs regles d'eligibilite
- Product (1) --- (0..*) Lesson : un produit est associe a zero ou plusieurs lecons
- Quiz (1) --- (1..*) Question : un quiz contient au moins une question
- Question (1) --- (2..*) Option : une question a au moins deux options de reponse
- Quiz (1) --- (0..*) QuizResult : un quiz a zero ou plusieurs resultats

### 2.3 Diagrammes de Sequence - Scenarios Cles

**Justification** : Ils illustrent le comportement dynamique du systeme et l'ordre chronologique des interactions. Choisir 3 a 4 scenarios critiques pour le memoire.

**Scenario 1 : Authentification avec MFA**

Participants : Client, Application Mobile, AuthService (NestJS), Twilio ou Nodemailer, Base de donnees

Sequence des messages :
1. Le client saisit son email et mot de passe dans l'application mobile
2. L'application envoie une requete POST /auth/login avec email et passwordHash
3. Le AuthService interroge la base de donnees pour verifier les credentials
4. La base retourne le record utilisateur (ou erreur si inconnu)
5. Le AuthService verifie le mot de passe (bcrypt.compare)
6. Si MFA est active, le AuthService genere un code OTP
7. Le AuthService appelle Twilio (SMS) ou Nodemailer (email) pour envoyer le code
8. Le service tiers envoie le code au client
9. Le client saisit le code OTP dans l'application
10. L'application envoie POST /auth/verify-otp avec le code
11. Le AuthService valide le code (comparaison + expiration)
12. Si valide, le AuthService genere un JWT (access token + refresh token)
13. Le JWT est retourne a l'application mobile
14. L'application stocke le token de maniere securisee (SecureStore Expo)

Points importants a montrer : les alternatives (echec de login, code OTP expire, trop de tentatives -\u003e rate limiting), les retours d'erreur.

**Scenario 2 : Import et Decodage d'un Releve Bancaire**

Participants : Client, Application Mobile, SmsController (NestJS), DecoderService, ClassificateurNLP (Bayes + Fuse.js), Base de donnees

Sequence des messages :
1. Le client selectionne un fichier PDF/CSV ou des SMS dans l'application
2. L'application envoie POST /sms/upload avec le fichier en multipart
3. Le SmsController recoit le fichier et le transmet au DecoderService
4. Le DecoderService parse le fichier (extraction texte du PDF ou parsing CSV)
5. Le DecoderService extrait les transactions brutes (date, montant, libelle)
6. Le DecoderService envoie les transactions brutes au ClassificateurNLP
7. Le ClassificateurNLP applique l'algorithme de Bayes pour la categorisation
8. Le ClassificateurNLP utilise Fuse.js pour la recherche floue sur les libelles
9. Le ClassificateurNLP retourne les transactions avec leurs categories
10. Le DecoderService persiste les transactions dans la table Transaction
11. Le DecoderService retourne un resume (nombre de transactions importees, repartition par categorie)
12. L'application affiche le resume au client

Points importants a montrer : le traitement en lot (batch), la gestion des doublons, la confiance de la classification (score de certitude).

**Scenario 3 : Calcul du Score de Sante Financiere**

Participants : Client, Application Mobile, AnalyticsService (OverviewService), ScoreEngine, Base de donnees, NotificationsService

Sequence des messages :
1. Le client demande son score via l'application (ou declenchement automatique apres import)
2. L'application appelle GET /analytics/overview
3. Le AnalyticsService recupere toutes les transactions du client (avec filtre de periode)
4. Le ScoreEngine calcule le score selon plusieurs criteres ponderes :
   - Ratio depenses/revenus
   - Regularite de l'epargne
   - Diversification des depenses
   - Frequence des decouvert
   - Tendance sur les derniers mois
5. Le ScoreEngine retourne un score global (0-100) avec le detail par critere
6. Le AnalyticsService persiste le score dans la table FinancialScore
7. Le AnalyticsService compare avec le score precedent
8. Si la variation est superieure ou egale a 5 points, le NotificationsService cree une notification de type SCORE_CHANGE
9. La notification est envoyee via WebSocket (room user:{id}) et/ou Expo Push
10. Le score et les details sont retournes a l'application

**Scenario 4 : Passage d'un Quiz (nouveau module)**

Participants : Client, Application Mobile, QuizController (NestJS), QuizService, Base de donnees, NotificationsService

Sequence des messages :
1. Le client accede a la section Quiz dans l'application
2. L'application appelle GET /quiz pour lister les quiz actifs
3. Le QuizController retourne la liste paginee des quiz disponibles
4. Le client choisit un quiz
5. L'application appelle GET /quiz/:id pour recuperer les questions et options
6. Le QuizController charge les questions avec leurs options (sans indiquer les bonnes reponses)
7. Le client repond aux questions une par une
8. L'application envoie POST /quiz/:id/submit avec le tableau des reponses {questionId, optionId}
9. Le QuizService compare chaque reponse avec les bonnes options
10. Le QuizService calcule le score (pourcentage de bonnes reponses)
11. Le QuizService persiste le resultat dans la table QuizResult
12. Le QuizService determine le badge obtenu (Bronze \u003c 60%, Argent 60-80%, Or \u003e 80%)
13. Le QuizService identifie les lecons recommandees en fonction des questions echouees
14. Le resultat (score, badge, lecons recommandees) est retourne a l'application
15. Si c'est le premier quiz du client ou une amelioration significative, le NotificationsService cree une notification

### 2.4 Diagramme de Composants

**Justification** : Montre la structure logicielle modulaire du backend NestJS, les interactions entre modules et la separation frontend/backend/admin.

**Ce qu'il doit contenir :**

Composants backend (NestJS) :
- AuthModule : fournit les services d'authentification, JWT, MFA. Expose les endpoints /auth/*. Depend de Twilio et Nodemailer.
- AnalyticsModule : fournit le calcul du score financier (OverviewService, ScoreEngine). Depend du DecoderModule pour les transactions.
- SmsModule (DecoderModule) : fournit le parsing et la classification des releves bancaires. Expose /sms/*. Utilise le ClassificateurNLP interne.
- EligibilityModule : fournit le moteur d'eligibilite (MatrixEligibilityEngine). Depend de l'AnalyticsModule pour le score. Expose /eligibility/*.
- EducationModule : fournit les lecons et conseils. Depend de l'AnalyticsModule pour le ciblage. Expose /lessons/*, /advice/*.
- QuizModule : fournit le CRUD quiz et la logique de passage. Depend de l'EducationModule pour la recommandation de lecons. Expose /quiz/*.
- NotificationsModule : fournit l'envoi de notifications (push Expo, WebSocket, email). Consomme par tous les autres modules. Expose /notifications/*.
- AdminModule : fournit les endpoints d'administration. Consomme les services de tous les modules. Expose /admin/*.

Composants frontend :
- Application Mobile (React Native + Expo) : consomme l'API REST du backend via HTTPS. Recoit les notifications push via Expo Push et les notifications temps reel via WebSocket.
- Panneau d'Administration (Svelte 5) : consomme les endpoints /admin/* du backend via HTTPS. Permet le CRUD sur les regles, lecons, quiz et le broadcast de notifications.

Interfaces (ports fournis/requis) :
- Chaque module fournit une interface REST (controller) et consomme les services des modules dont il depend.
- Le NotificationsModule fournit un port WebSocket (/notifications) en plus du REST.
- Le AuthModule fournit un guard (JwtAuthGuard) reutilise par tous les autres modules.

### 2.5 Diagramme de Deploiement

**Justification** : Montre l'architecture physique et logicielle, les noeuds materiels/logiciels et les protocoles de communication.

**Ce qu'il doit contenir :**

Noeuds :
- Smartphone (iOS/Android) : heberge l'application React Native compilee via Expo. Communique avec le backend via HTTPS (API REST) et WSS (WebSocket).
- Serveur Backend (VM ou conteneur Docker) : heberge l'application NestJS, le serveur WebSocket (Socket.io), et potentiellement un serveur Svelte pour l'admin.
- Serveur de Base de Donnees : heberge PostgreSQL. Accessible uniquement depuis le backend via le protocole SQL/TCP (port 5432).
- Services Tiers (noeuds externes) : Twilio (API SMS), Nodemailer (serveur SMTP), Expo Push Service (API REST pour notifications push).

Artefacts deployes :
- Sur le smartphone : Application Orabank (bundle React Native)
- Sur le backend : API NestJS (Node.js), Prisma ORM, module WebSocket
- Sur le serveur Svelte : Panneau d'administration (build statique ou SSR)
- Sur PostgreSQL : base de donnees orabank_db

Protocoles de communication :
- Smartphone \u003c-\u003e Backend : HTTPS (REST API, port 443), WSS (WebSocket, port 443)
- Backend \u003c-\u003e PostgreSQL : TCP/SQL (port 5432, connexion Prisma)
- Backend \u003c-\u003e Twilio : HTTPS (API REST Twilio)
- Backend \u003c-\u003e Nodemailer : SMTP (port 587, TLS)
- Backend \u003c-\u003e Expo Push : HTTPS (API REST Expo)
- Admin Svelte \u003c-\u003e Backend : HTTPS (REST API, port 443)

---

## 3. Analyse du Modele de Donnees

### 3.1 Entites Centrales (a detailler dans le memoire)

Ces entites representent le coeur metier de l'application. Elles doivent apparaitre dans le diagramme de classes avec tous leurs attributs, types, contraintes et relations.

**User** : Entite d'authentification. Separe volontairement de BankCustomer car un utilisateur de l'app (avec un compte, un mot de passe, une MFA) n'est pas forcement un client bancaire au sens du CBS. La relation passe par UserBankConnection.

**BankCustomer** : Represente le client bancaire physique tel qu'il existe dans le CBS. Contient les donnees d'identite, le numero de compte et le statut KYC. Le soft delete (deletedAt) permet de garder l'historique.

**Transaction** : Entite la plus volumineuse. Chaque ligne represente une operation bancaire decodee. La categorisation (category) est le resultat du traitement NLP. Le lien vers rawSmsId permet de tracer l'origine.

**Notification** : Represente chaque notification envoyee. Le champ type (enum NotificationType) permet de filtrer par categorie. Le champ data (JSON) contient les metadonnees specifiques a chaque type.

**Rule** : Represente une regle d'eligibilite configurable. Le champ conditions (JSON) contient le DSL de la regle (operateurs, seuils, criteres). La priorite permet de gerer les conflits entre regles.

**Lesson** : Represente une lecon d'education financiere. Les champs minScore et maxScore permettent de cibler les lecons en fonction du niveau financier du client. Le lien avec Product permet de suggerer des produits en rapport.

**Quiz, Question, Option, QuizResult** : Ensemble d'entites pour le module Quiz. Quiz est le conteneur, Question porte le texte et l'ordre, Option represente les choix de reponse (avec isCorrect), QuizResult stocke le resultat de chaque passage.

### 3.2 Entites Secondaires (a decrire brievement)

Ces entites sont importantes pour le fonctionnement mais peuvent etre presentees de maniere synthetique dans le memoire (un tableau recapitulatif suffit).

**UserBankConnection** : Table de liaison entre User et BankCustomer. Permet a un utilisateur d'etre associe a un ou plusieurs comptes bancaires, et inversement.

**BankAccount** : Detail d'un compte bancaire (numero, type, solde, devise). Lie a BankCustomer.

**Product** : Catalogue des produits bancaires (pret, epargne, assurance). Lie aux regles d'eligibilite.

**PushToken** : Stocke les tokens Expo Push de chaque appareil. Permet l'envoi cible de notifications.

**FinancialScore** : Historique des scores calcules. Permet de suivre l'evolution du score dans le temps.

**MFAConfig / Session** : Details techniques de la configuration MFA et des sessions actives.

### 3.3 Entites Omissibles ou a Resumer Fortement

Ces entites existent dans le code mais n'ont pas besoin d'etre detaillees dans le memoire. Une simple mention de leur existence et de leur role suffit.

**RawSms** : "Le systeme stocke temporairement les SMS bruts avant decodage pour permettre le rejeu en cas d'erreur."

**SmsCategory / SmsRule** : "Le moteur NLP utilise des categories et des regles de classification configurables, stockees en base."

**AuditLog / ActivityLog** : "Le systeme inclut un module d'audit pour la tracabilite des actions sensibles (connexions, modifications de regles, exports de donnees)."

**NotificationPreference** : "Les utilisateurs peuvent personnaliser leurs preferences de notification (activer/desactiver le push, l'email, ou certains types de notifications)."

---

## 4. Points de Conception a Risque

### 4.1 Fiabilite du Decodeur de Releve Bancaire (MOD-03)

Risque : La precision de l'extraction (OCR sur PDF) et de la classification NLP (Bayes + Fuse.js) depend fortement de la qualite et de la variete des donnees d'entree. Sans jeu de donnees d'entrainement suffisant, le taux d'erreur peut etre eleve.

Impact : Des transactions mal categorisees faussent le score financier, ce qui entraine des recommandations d'eligibilite erronees et des conseils inadequats. Toute la chaine en aval est affectee.

Mitigation recommandee :
- Se limiter a un format de releve specifique (par exemple le CSV Orabank Togo) pour le prototype
- Constituer un jeu de donnees d'entrainement a partir de releves anonymises
- Afficher un indicateur de confiance sur chaque categorisation
- Permettre au client de corriger manuellement une categorisation (boucle de feedback)

### 4.2 Performance du Calcul du Score (MOD-02)

Risque : Le calcul du score analyse l'historique complet des transactions d'un client. Sur un grand volume (plusieurs annees de transactions), le temps de reponse peut devenir inacceptable.

Impact : Latence de plusieurs secondes sur l'ecran de score, surcharge du backend et de la base de donnees, mauvaise experience utilisateur.

Mitigation recommandee :
- Pre-calculer le score quotidiennement via un CRON job (pas de calcul a la volee)
- Limiter l'historique analyse (par exemple les 6 derniers mois)
- Indexer les colonnes bankCustomerId et date dans la table Transaction
- Mettre en cache le score courant (Redis ou en memoire)

### 4.3 Complexite du Moteur d'Eligibilite (MOD-04)

Risque : Les regles d'eligibilite configurables (DSL JSON) peuvent devenir tres complexes et difficiles a tester, comprendre et maintenir. Des erreurs logiques dans les regles peuvent donner des resultats d'eligibilite incorrects.

Impact : Un client eligible est refuse, ou un client non eligible est accepte. Cela peut avoir des consequences commerciales et reglementaires.

Mitigation recommandee :
- Definir un DSL simple et documente (operateurs limites : \u003e, \u003c, \u003e=, \u003c=, ==, AND, OR)
- Fournir une interface admin intuitive avec une previsualisation du resultat
- Ecrire des tests unitaires pour chaque regle
- Implementer un mode "simulation" qui permet de tester une regle sans l'activer

### 4.4 Securite des Donnees Sensibles

Risque : Le systeme manipule des donnees financieres sensibles (transactions, scores, identites). Un vol ou une fuite de ces donnees aurait des consequences graves.

Impact : Violation de la confidentialite, non-conformite aux exigences reglementaires (BCEAO, loi togolaise sur la protection des donnees), perte de confiance.

Mitigation recommandee :
- Chiffrement des donnees en transit : HTTPS/TLS 1.3 pour toutes les communications, WSS pour les WebSockets
- Chiffrement au repos : utiliser pgcrypto pour les champs les plus sensibles (transactions, scores)
- Stockage des secrets : variables d'environnement, jamais en dur dans le code
- Audit : journalisation de toutes les actions sensibles via AuditLog
- Expiration des tokens : JWT avec duree de vie courte (15 min access, 7 jours refresh)
- Rate limiting : 3 paliers pour prevenir le brute force

### 4.5 Resilience et Gestion des Erreurs

Risque : Les services tiers (Twilio, Nodemailer, Expo Push) peuvent etre temporairement indisponibles. Des transactions peuvent ne pas etre traitees, des notifications manquees.

Impact : Donnees inconsistantes, notifications perdues, experience utilisateur degradee, impossibilite de se connecter (MFA bloquee).

Mitigation recommandee :
- Retries avec backoff exponentiel pour les appels aux services tiers
- File d'attente (BullMQ/Redis) pour les taches critiques (envoi de notifications, decodage de releves)
- Circuit breaker pour eviter les cascades d'erreurs
- Canal MFA alternatif : si Twilio echoue, basculer sur Nodemailer (et inversement)
- Logging structure (Winston/Pino) pour le diagnostic

### 4.6 Module Quiz - Risques Specifiques

Risque triche : Le client pourrait tenter de soumettre des reponses en boucle pour obtenir un meilleur score, ou inspecter le payload API pour trouver les bonnes reponses.

Risque contenu perime : Les questions peuvent devenir obsoletes si elles ne sont pas mises a jour regulierement.

Risque surcharge mobile : Un quiz avec trop de questions degrade l'experience sur mobile.

Mitigation recommandee :
- Ne jamais envoyer isCorrect dans la reponse GET /quiz/:id (les bonnes reponses restent cote serveur)
- Limiter le nombre de tentatives par quiz et par jour
- Limiter le nombre de questions par quiz (maximum 15-20)
- Ajouter un champ publishedAt et un flag isActive pour gerer le cycle de vie des quiz
- Interface admin de gestion des quiz avec previsualisation

---

## 5. Recommandation pour l'Ordre de Presentation dans le Memoire

### Chapitre 1 : Introduction Generale
Contenu : Contexte du projet (Orabank Togo, secteur bancaire togolais, enjeux de l'inclusion financiere), problematique (comment accompagner les clients dans la gestion de leurs finances via le digital), objectifs du projet, perimetre (les 5 modules + Quiz), methodologie (Scrum : sprints, backlog, ceremonies).

### Chapitre 2 : Analyse des Besoins et Specifications Fonctionnelles
Contenu : Description des acteurs et de leurs roles, exigences fonctionnelles par module (sous forme de user stories ou de tableaux), exigences non-fonctionnelles (performance, securite, disponibilite, compatibilite), diagramme de cas d'utilisation global avec les relations include/extend.
Conseil : Presenter un diagramme de cas d'utilisation general puis un par module pour plus de clarte.

### Chapitre 3 : Conception Architecturale et Technique
Contenu : Architecture generale du systeme (client/serveur, API REST, WebSocket), justification des choix technologiques (React Native + Expo, NestJS, Prisma, PostgreSQL, Svelte 5), diagramme de composants (vue modules NestJS + frontends), diagramme de deploiement (infrastructure, protocoles), description de chaque module avec son role et ses dependances.
Conseil : Inclure un tableau comparatif des technologies envisagees vs choisies pour justifier chaque decision.

### Chapitre 4 : Conception Detaillee du Modele de Donnees
Contenu : Diagramme de classes complet avec toutes les entites centrales, classification des entites (centrales, secondaires, omissibles) avec justification, description des enumerations, mapping entre le modele conceptuel et le schema Prisma, contraintes d'integrite (PK, FK, uniques, cascades).
Conseil : Presenter les entites centrales avec un tableau detaille (attribut, type, contrainte, description) puis les secondaires sous forme synthetique.

### Chapitre 5 : Conception Dynamique (Comportement du Systeme)
Contenu : Diagrammes de sequence pour les 3-4 scenarios cles (authentification MFA, import/decodage, calcul du score, passage d'un quiz), description textuelle de chaque scenario, gestion des cas d'erreur et des alternatives.
Conseil : Pour chaque diagramme de sequence, ajouter un paragraphe explicatif qui decrit le flux en langage naturel.

### Chapitre 6 : Implementation et Realisation
Contenu : Structure du projet (arborescence des dossiers), detail de l'implementation de chaque module (guards, services, controllers, DTOs), extraits de code significatifs (pas de copier-coller massif, uniquement les parties illustratives), captures d'ecran de l'application mobile et du panneau d'administration, description du module Quiz (conception, implementation, integration).
Conseil : Privilegier les captures d'ecran annotees et les extraits de code commentes plutot que le code brut.

### Chapitre 7 : Tests et Validation
Contenu : Strategie de tests (unitaires avec Jest, integration avec Supertest, E2E mobile avec Detox ou manuels), couverture de test, resultats des tests, validation des performances (temps de reponse API, temps de calcul du score).
Conseil : Inclure un tableau recapitulatif des tests par module avec le resultat.

### Chapitre 8 : Conclusion et Perspectives
Contenu : Bilan du travail realise, rappel des objectifs atteints, limitations connues (CBS simule, format de releve limite, quiz prototype), perspectives d'evolution (integration CBS reelle, quiz adaptatif avec IA, support multilingue, gamification avancee).

---

## 6. Analyse Specifique du Module Quiz

### 6.1 Positionnement dans l'Architecture

Le module Quiz est le dernier maillon de la chaine educative. Il se positionne apres le module Education Financiere (MOD-05) et sert a :
- Evaluer la comprehension du client sur les notions financieres abordees dans les lecons
- Renforcer l'apprentissage par la pratique (feedback immediat)
- Personnaliser les prochaines recommandations en fonction des lacunes identifiees
- Mesurer l'efficacite du programme educatif (statistiques pour l'admin)

### 6.2 Integration avec les Modules Existants

Avec le module Education (MOD-05) :
- Apres la fin d'un quiz, le systeme recommande des lecons liees aux questions echouees
- Les lecons peuvent contenir un lien "Tester vos connaissances" qui redirige vers un quiz associe

Avec le module Analytics (MOD-02) :
- Le score de quiz peut etre utilise comme facteur secondaire dans le score financier global (bonus de +1 a +5 points si le client est actif dans l'education)
- Les statistiques de quiz alimentent le dashboard d'overview

Avec le module Notifications :
- Quand un nouveau quiz est publie, une notification QUIZ_AVAILABLE est envoyee aux utilisateurs eligibles
- Quand un client atteint un badge Or, une notification de felicitation est envoyee

Avec le module Admin :
- L'administrateur peut creer, modifier, activer/desactiver et supprimer des quiz
- L'administrateur peut consulter les statistiques de participation et de reussite

### 6.3 Modele de Donnees du Quiz

Entites : Quiz, Question, Option, QuizResult (voir section 2.2 pour les attributs detailles)

Relations :
- Quiz (1) -\u003e Question (1..*) : un quiz contient au moins une question, une question appartient a un seul quiz
- Question (1) -\u003e Option (2..*) : une question a au moins deux options, une option appartient a une seule question
- User (1) -\u003e QuizResult (0..*) : un utilisateur peut avoir zero ou plusieurs resultats de quiz
- Quiz (1) -\u003e QuizResult (0..*) : un quiz peut avoir zero ou plusieurs resultats

Contraintes :
- Un quiz doit avoir au moins une question pour etre publie
- Une question doit avoir exactement une option correcte (pour SINGLE_CHOICE) ou au moins une (pour MULTIPLE_CHOICE)
- Le score est calcule cote serveur, jamais cote client
- Le champ answers dans QuizResult stocke le detail de chaque reponse pour permettre l'analyse

### 6.4 Endpoints API du Quiz

Endpoints publics (necessitent JwtAuthGuard) :
- GET /quiz : liste des quiz actifs, pagines, tries par date de publication
- GET /quiz/:id : detail d'un quiz avec ses questions et options (sans isCorrect)
- POST /quiz/:id/submit : soumission des reponses, retourne le score et le feedback
- GET /quiz/history : historique des quiz passes par l'utilisateur courant

Endpoints admin (necessitent JwtAuthGuard + RolesGuard ADMIN) :
- POST /admin/quiz : creation d'un quiz complet (quiz + questions + options en une seule requete)
- PATCH /admin/quiz/:id : modification d'un quiz (titre, description, statut)
- DELETE /admin/quiz/:id : suppression logique (isActive = false)
- GET /admin/quiz/:id/stats : statistiques de participation et de reussite

### 6.5 Logique Metier du Quiz

Calcul du score :
- Score = (nombre de bonnes reponses / nombre total de questions) * 100
- Arrondi a l'entier le plus proche

Attribution des badges :
- Bronze : score \u003c 60%
- Argent : score entre 60% et 80%
- Or : score \u003e 80%

Recommandation de lecons :
- Pour chaque question echouee, le systeme identifie la categorie de la question
- Il cherche les lecons de la meme categorie dont le minScore correspond au niveau du client
- Il retourne les 3 lecons les plus pertinentes

---

Fin du document.
