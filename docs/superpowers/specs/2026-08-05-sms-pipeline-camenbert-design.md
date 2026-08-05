# Design — Pipeline d'analyse SMS v2 (CamenBert en arbitre)

Date : 2026-08-05
Statut : validé (brainstorming)

## Contexte / Problème

L'analyse des SMS Mobile Money repose aujourd'hui presque exclusivement sur le
parseur regex (`parseSms`), avec CamenBert cantonné à un rôle minuscule :
compléter la direction quand le regex échoue (`sms.service.ts:144-153`).

Constats :
- Le regex est fragile et imprévisible (formats `CFA` vs `FCFA`, accents,
  séparateurs de milliers, verbes avec « de »…) → des transactions réelles
  sont ignorées.
- Le résultat riche de CamenBert (le **type** de transaction, ex.
  `CREDIT_SALAIRE`, `DEBIT_PAIEMENT`) est calculé puis jeté : jamais stocké,
  jamais utilisé. Un modèle ONNX de ~450 Mo utilisé pour presque rien =
  gaspillage de ressources.

Objectif : **CamenBert devient l'arbitre sémantique du pipeline SMS**, pour
polir l'analyse et tendre vers 100 % de réussite, avec la possibilité de
désactiver la logique regex depuis l'admin.

## Décisions clés

1. **Modèle A — arbitre systématique** : le regex extrait le montant, puis
   CamenBert valide/redresse la direction **et le type** sur **chaque SMS**.
   En cas de désaccord, CamenBert gagne si confiance ≥ seuil.
2. **Toggle regex dans l'admin** : désactiver le regex désactive sa logique de
   pattern/direction (CamenBert décide seul). L'extraction du **montant**
   reste toujours regex (CamenBert ne sait pas extraire de montant).
3. **Type mappé en catégorie d'analyse** : le type CamenBert est stocké et
   mappé vers les catégories existantes (SALAIRE, VIREMENTS, MOBILE_MONEY…).
4. **Organisation admin** : nouvelle section sidebar **« IA & Analyse »**
   regroupant `SMS`, `Pipeline d'analyse` (nouvelle page) et `Centre IA`.
   La page SMS reçoit aussi un bloc compact « Pipeline d'analyse » en haut.

## Architecture du pipeline

### 1. Flux dans `sms.service.ts`

```
1. id + date           (inchangé, normalizeDateSent)
2. regex parseSms      → montant + direction candidate + opérateur
                        (toujours actif pour le MONTANT)
3. CamenBert classify  → type + direction + confiance
                        (appelé sur CHAQUE SMS si camenbertEnabled)
4. Arbitrage           → direction finale + type + catégorie
5. Dédup / règles / statut
```

### 2. Table de décision de l'arbitrage

| regexEnabled | cbOk (conf ≥ seuil) | direction finale | type | statut |
|---|---|---|---|---|
| oui | oui | CamenBert (gagne sur désaccord) | cbCategory | APPROVED |
| oui | non | regex ; si null → classifier existant (DIVERS) | null | selon conf regex |
| non | oui | CamenBert | cbCategory | APPROVED |
| non | non | null | — | SKIP |

- `camenBertOk` = `camenbertEnabled && camenbert.confidence >= camenbertThreshold`.
- Direction = `camenBertOk ? camenbert.direction : regex.direction`.
- Type stocké = `camenBertOk ? camenbert.category : null`.
- `disagreed` = vrai si regex a une direction ET CamenBert une direction
  différente ET camenBertOk.
- Statut `APPROVED` si `amount != null && direction != null &&
  (camenBertOk || regexConfidence >= 0.8)`, sinon `PENDING`.
- `arbitration` = `CAMENBERT` si camenBertOk (désaccord), `AGREED` si regex et
  CamenBert donnent la même direction, sinon `REGEX` (regex seul).

## Données (migration SQL manuscrite)

Nouvelles colonnes sur `sms_transactions` (migration `20260805000001_sms_pipeline`) :

| colonne | type | sens |
|---|---|---|
| `cb_category` | TEXT | type CamenBert brut (`DEBIT_PAIEMENT`…) |
| `cb_confidence` | DOUBLE | confiance du modèle |
| `category` | TEXT | catégorie d'analyse mappée (ou NULL) |
| `arbitration` | TEXT | `REGEX` \| `CAMENBERT` \| `AGREED` |
| `disagreed` | BOOLEAN | désaccord regex vs CamenBert |

Rappel convention : pas de `prisma migrate dev` ; SQL via
`docker exec postgres_dev psql -U joan -d bank_joan` + insert
`_prisma_migrations` (checksum `'handwritten'`).

## Mapping type CamenBert → catégorie d'analyse

| Type CamenBert | Catégorie analyse |
|---|---|
| CREDIT_SALAIRE | SALAIRE |
| CREDIT_TRANSFERT | VIREMENTS |
| CREDIT_DEPOT | DEPOTS |
| DEBIT_ACHAT_CREDIT | MOBILE_MONEY |
| DEBIT_FRAIS | FRAIS_BANCAIRES |
| DEBIT_PAIEMENT | null → classifier mots-clés (le commerçant décide : ALIMENTATION, TRANSPORT…) |
| DEBIT_RETRAIT | null → classifier |
| DEBIT_TRANSFERT | null → classifier |
| UNKNOWN | null → classifier |

Le mapping est volontairement conservateur : seule la catégorie dérivable du
**type d'opération** est imposée ; sinon le classifier actuel décide à partir
de la description (commerçant, lieu…).

## Moteurs d'analyse

- Ajouter un champ optionnel `category?: string` à `Entry.transaction`
  (`src/analytics/types.ts`).
- `SmsSource.toEntry()` renseigne `transaction.category` depuis la colonne
  `sms_transactions.category`.
- `revenue.engine.ts`, `expense.engine.ts`, `advice.engine.ts` : préférer la
  catégorie stockée (`entry.transaction.category`) si présente, sinon
  `classifier.categorizeWithCache(description)` (comportement actuel).

## Config & endpoints admin

- Config en Redis, clé `sms_pipeline_config` (même pattern que `mfa_method`) :
  `{ regexEnabled: boolean, camenbertEnabled: boolean, camenbertThreshold: number }`.
  Défauts : `{ true, true, 0.75 }`.
- `GET /admin/sms/pipeline` → config + statut CamenBert (ready, metrics, labels).
- `PATCH /admin/sms/pipeline` → mise à jour partielle de la config.

## Interface admin

- Sidebar : nouvelle section **« IA & Analyse »** avec `SMS`, `Pipeline d'analyse`,
  `Centre IA` (déplacés depuis Administration/Analytics).
- Nouvelle page `Pipeline.svelte` :
  - Toggle « Regex actif », toggle « CamenBert actif », seuil de confiance.
  - Stats en direct : SMS traités, taux de réussite, arbitrés par CamenBert,
    désaccords, ignorés, répartition par opérateur.
  - Boîte de test (réutilise `POST /admin/sms/debug`).
- Page `Sms.svelte` : bloc compact « Pipeline d'analyse » en haut (toggles +
  statut + lien vers la page Pipeline).

## Observabilité / Stats

Compteurs dérivés de `sms_transactions` (colonnes `arbitration`, `disagreed`,
`cb_category`, `status`) :
- Taux de réussite = APPROVED / (total − dédupliqués).
- Nombre d'arbitrages CamenBert (`arbitration = CAMENBERT`).
- Nombre de désaccords (`disagreed = true`).
- Répartition par `operator`.

## Tests

- **Unit** :
  - `arbitrate()` — table de décision complète (regex on/off × CamenBert conf).
  - `mapCbCategoryToAnalysis()` — mapping ci-dessus.
  - Parseur existant (24 tests) inchangés.
- **Intégration** : pipeline `syncSms` avec CamenBert mocké (retour type +
  confiance fixe), vérification des colonnes `cb_category` / `arbitration` /
  `category` / statut.

## Hors périmètre (futur)

- Utiliser CamenBert sur les **descriptions de transactions bancaires** (pas
  seulement les SMS).
- Réentraînement / fine-tuning du modèle (`CamenBertTrainingService`).
