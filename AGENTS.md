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
- **Backend tourne dans WSL — `adb reverse tcp:4000 tcp:4000` pour mobile**

## Modules principaux
- `src/auth/` — JWT, MFA TOTP, email, rate limiting (3 paliers)
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

## Seeds
- `npm run seed:admin` — admin `admin@orabank.tg` / `Admin123!`
- `npm run seed:demo` — clients Koffi & Aminata avec transactions 2026
- `npm run seed:education` — contenu éducatif
- `npm run seed:analytics` — données analytics
- Ordre recommandé: `seed:admin` → `seed:demo`

### Magic link et deep links
- `auth.service.ts:314` — le magic link utilise `APP_URL` (configuration `.env`)
- `GET /auth/set-password` sert une page HTML qui redirige vers `oraapp://set-password?token=...&acc=...`

### Nettoyage registrations inachevées
- Si un User lié a `password = null` lors d'un register, il est supprimé (dans `register()` et `createUser()`).
- Cela évite le conflit UNIQUE sur email.

### SMS incoming
- Les SMS Android arrivent sans `id` natif.
- `sms.service.ts` génère un hash synthétique via `hashSms(address, body, dateSent)` (DJB2).
- Évite le skip `noId`.

### MFA Email
- Pas de migration Prisma (`mfaMethod` dans schema mais pas sur User à cause du drift).
- La méthode MFA (`TOTP`/`EMAIL`) est stockée dans Redis via la clé `mfa_method:${userId}` avec TTL 1 an.
- `enableEmailMfa()` génère un OTP stocké dans `mfa_email_otp:${userId}` (300s TTL).
- `verifyEmailMfa()` active MFA + enregistre `mfa_method:EMAIL`.
- Lors du login MFA, si la méthode est `EMAIL`, un OTP est envoyé et vérifié dans `loginMfa()`.
- `mfaStatus()` lit la méthode depuis Redis (par défaut `TOTP` si non trouvé).
- `disableMfa()` nettoie la clé `mfa_method`.
- Endpoints : `POST auth/mfa/enable-email`, `POST auth/mfa/verify-email`.

### Points d'attention
- `EligibilityResult.status` utilise `'ELIGIBLE'` (pas `'PASS'`)
- `EligibilityResult` a `globalScore` (pas `score`)
- `AdviceEngine.generate()` prend un `customerId` (BankCustomer), pas un `userId`
- `@otplib/preset-default` exporte `authenticator` et `totp` en tant qu'objets
- `User` n'a pas de champ `mfaMethod` en DB — méthode stockée exclusivement dans Redis
