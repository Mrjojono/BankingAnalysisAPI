# Contrat d'API — Synchronisation SMS mobile

> Contrat backend pour l'application mobile (repo séparé).
> Base URL : `https://<API>/api` (WSL en dev : `adb reverse tcp:4000 tcp:4000`).

Authentification : `Authorization: Bearer <accessToken>` (JWT utilisateur).

---

## 1. État de synchronisation (watermark)

`GET /sms/state`

Renvoie le dernier SMS déjà reçu par le serveur. L'app peut reprendre la
synchronisation incrémentale à partir de ce point.

```json
{
  "watermark": {
    "smsId": 4821,
    "dateSent": "2026-07-30T10:15:00.000Z"
  }
}
```

- `watermark: null` si aucun SMS n'a encore été synchronisé (première sync).
- Sémantique : tous les SMS de la boîte de réception Android dont la date
  (`date`) est **postérieure** au watermark doivent être envoyés.

---

## 2. Synchronisation

`POST /sms/sync`

Body : `{ "messages": [ ... ] }`, maximum **200 SMS par requête**.

Chaque message (souscription `READ_SMS`) :

```json
{
  "id": 1234,
  "address": "MIXTONE",
  "body": "MIXX (ex-TMoney) : Vous avez recu 50000 FCFA de la part de KOFFI AGBEKO. Solde: 150000 FCFA. Ref: 8812",
  "dateSent": "2026-07-30T10:15:00.000Z"
}
```

- `id` : ID natif du message Android (négatif sur certains appareils,
  accepté tel quel). S'il est absent, un ID synthétique est généré côté serveur.
- `address` : expéditeur (short code opérateur ou numéro).
- `body` : contenu texte (max 500 caractères stockés).
- `dateSent` : date d'envoi du SMS.

Réponse :

```json
{
  "synced": 42,
  "duplicates": 3,
  "skipped": 7,
  "watermark": {
    "smsId": 1270,
    "dateSent": "2026-07-30T11:02:00.000Z"
  }
}
```

- `synced` : nombre de SMS insérés.
- `duplicates` : SMS déjà présents (dédupliqués par `smsId` **et** par
  empreinte `fingerprint`).
- `skipped` : SMS ignorés (pas une transaction financière, date invalide…).
- `watermark` : point de reprise à utiliser pour la prochaine sync.

**Idempotence** : rejouer les mêmes messages ne crée pas de doublons.

### Pipeline de traitement côté serveur

1. `parseSms` → opérateur (MIXX/FLOOZ/MOOV), sens, montant, solde, référence, contrepartie.
2. Si sens manquant : complété par CamenBert (confiance ≥ 0.75), sinon classifieur.
3. Règles d'ignorance (globales puis par client) → statut `IGNORED`.
4. Statut : `APPROVED` si parse fiable (confiance ≥ 0.8), sinon `PENDING`
   (revue admin). Seuls les `APPROVED` alimentent les analyses.
5. Déduplication par `fingerprint` (référence, sinon
   opérateur|sens|montant|contrepartie|minute).

---

## 3. Règles métier côté mobile

- Lire **tous** les SMS (`content://sms/inbox`), pas seulement ceux d'opérateurs
  connus : le serveur filtre (promos, OTP, etc.).
- Envoyer par lots de 200, triés par date croissante, en s'arrêtant dès qu'un
  message antérieur ou égal au watermark est rencontré.
- Ne **pas** logger les corps de SMS côté mobile (RGPD).
- Demander la permission `READ_SMS` au premier lancement en expliquant
  l'usage (analyse de dépenses Mobile Money).

---

## 4. Codes d'erreur

| Code | Sens |
|------|------|
| 400 | `messages` absent ou > 200 éléments |
| 401 | Token manquant/expiré |
| 429 | Trop de requêtes (30/min) |
