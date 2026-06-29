# Agent Instructions - Orabank Backend

## Architecture
- NestJS + Prisma + PostgreSQL
- Admin panel: Svelte 5 (admin/src/)
- Mobile: React Native + Expo (mobile/)
- Méthode Scrum, niveau académique licence/master

## Stack Principles
- JWT Auth avec guards, decorators, rate limiting
- @Global() modules pour injection sans forwardRef
- WebSocket Gateway distinct par domaine (/notifications, /admin)
- Expo Push Notifications (pas de FCM natif)
- Mail: Resend (API) + Pug templates dans src/templates/
- Test mail: `npm run test:mail` (nécessite RESEND_API_KEY dans .env)

## Modules principaux
- `src/auth/` — JWT, MFA TOTP, rate limiting (3 paliers)
- `src/analytics/` — OverviewService (conseils, scores)
- `src/eligibility/` — MatrixEligibilityEngine + rule engine
- `src/notifications/` — Module notifications complet
- `src/admin/` — AdminController + endpoints broadcast
- `src/sms/` — Parsing + classification SMS

## Notifications
- **Modèle DB**: `PushToken`, `Notification`, `NotificationPreference`
- **Enums**: `NotificationType` (ADVICE, SCORE_CHANGE, ELIGIBILITY, EDUCATIONAL, SYSTEM, ADMIN_BROADCAST, WEEKLY_DIGEST), `NotificationChannel`
- **WebSocket**: Gateway `/notifications` avec JWT handshake, rooms `user:{id}`
- **Push**: Expo Push API, envoi par utilisateur ou broadcast, nettoyage tokens invalides
- **Cron**: Daily tip (10h lun-ven), weekly digest (8h lundi)
- **Admin broadcast**: POST admin/notifications/broadcast (target: 'all' | string[])

### Intégration
- `AdviceEngine.generate()` → notification ADVICE si WARNING/CRITICAL (max 3)
- `ScoreEngine` → notification SCORE_CHANGE si delta ≥ 5
- `EligibilityService` → notification ELIGIBILITY si ELIGIBLE/PARTIAL

### Endpoints REST /notifications
- GET `/` — historique paginé
- GET `/unread` — non lues
- PATCH `/:id/read` — marquer lue
- POST `/read-all` — tout marquer lu
- GET/PATCH `/preferences` — préférences push/email/types
- POST `/push/register` — enregistrer token Expo
- POST `/push/unregister` — désenregistrer token

### Points d'attention
- `EligibilityResult.status` utilise `'ELIGIBLE'` (pas `'PASS'`)
- `EligibilityResult` a `globalScore` (pas `score`)
- `AdviceEngine.generate()` prend un `customerId` (BankCustomer), pas un `userId`
- `@otplib/preset-default` exporte `authenticator` et `totp` en tant qu'objets
