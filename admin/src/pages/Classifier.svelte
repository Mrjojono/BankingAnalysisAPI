<script lang="ts">
  import { FlaskConical, Search, AlertCircle, Info, CheckCheck, ArrowRight, Layers, Brain, Hash, Scale, Crosshair, MessageSquare, Smartphone } from '@lucide/svelte';
  import { api } from '../lib/api';
  import InfoDrawer from '../lib/components/InfoDrawer.svelte';

  let desc = $state('');
  let loading = $state(false);
  let result = $state<any | null>(null);
  let error = $state('');
  let infoOpen = $state(false);

  let smsAddress = $state('');
  let smsBody = $state('');
  let smsLoading = $state(false);
  let smsResult = $state<any | null>(null);
  let smsError = $state('');

  const CATEGORY_COLORS: Record<string, string> = {
    LOGEMENT: 'bg-green-50 text-green-700 ring-green-200',
    ALIMENTATION: 'bg-orange-50 text-orange-700 ring-orange-200',
    TRANSPORT: 'bg-blue-50 text-blue-700 ring-blue-200',
    SANTE: 'bg-red-50 text-red-700 ring-red-200',
    MOBILE_MONEY: 'bg-purple-50 text-purple-700 ring-purple-200',
    CARBURANT: 'bg-amber-50 text-amber-700 ring-amber-200',
    COMMERCE: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
    FRAIS_BANCAIRES: 'bg-gray-50 text-gray-700 ring-gray-200',
    VIREMENTS: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    RETRAITS: 'bg-pink-50 text-pink-700 ring-pink-200',
    DEPOTS: 'bg-teal-50 text-teal-700 ring-teal-200',
    INTERETS: 'bg-lime-50 text-lime-700 ring-lime-200',
    CREDIT: 'bg-rose-50 text-rose-700 ring-rose-200',
    SALAIRE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    DIVERS: 'bg-slate-50 text-slate-700 ring-slate-200',
  };

  const METHOD_ICONS: Record<string, any> = {
    exact: Hash,
    fuse: Scale,
    embedding: Layers,
    bayes: Brain,
  };

  async function test() {
    if (!desc.trim()) return;
    loading = true;
    error = '';
    result = null;
    try {
      result = await api.testClassifier(desc);
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function testSmsFilter() {
    if (!smsBody.trim()) return;
    smsLoading = true;
    smsError = '';
    smsResult = null;
    try {
      smsResult = await api.debugSmsFilter({
        address: smsAddress.trim() || 'ORABANK',
        body: smsBody,
      });
    } catch (e: any) {
      smsError = e.message;
    } finally {
      smsLoading = false;
    }
  }
</script>

<div class="w-full">
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <FlaskConical size={24} class="text-primary" />
      <h2 class="text-2xl font-bold text-on-surface">Test Classifieur</h2>
    </div>
    <button
      onclick={() => infoOpen = true}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface-variant text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer border-none"
      title="Comment ça marche ?"
    >
      <Info size={14} /> Aide
    </button>
  </div>

  <InfoDrawer open={infoOpen} onclose={() => infoOpen = false} section="classifier" />

  <div class="bg-white border border-mint-subtle rounded-2xl p-6">
    <label for="classifier-desc" class="block text-sm font-semibold text-on-surface mb-2">
      Saisir une description bancaire
    </label>
    <div class="flex gap-3">
      <input
        id="classifier-desc"
        bind:value={desc}
        placeholder="Ex: Paiement Loyer M. Kodjo"
        onkeydown={(e) => e.key === 'Enter' && test()}
        class="flex-1 px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
      />
      <button
        onclick={test}
        disabled={loading || !desc.trim()}
        class="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none"
      >
        <Search size={18} />
        Tester
      </button>
    </div>
  </div>

  {#if loading}
    <div class="mt-6 p-8 text-center text-outline">
      <div class="animate-pulse flex flex-col items-center gap-2">
        <div class="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        Analyse en cours...
      </div>
    </div>
  {/if}

  {#if error}
    <div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
      <AlertCircle size={18} /> {error}
    </div>
  {/if}

  {#if result && !loading}
    <div class="mt-6 space-y-4">
      <div class="bg-white border border-mint-subtle rounded-2xl overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-surface-container-low border-b border-mint-subtle">
              <th class="text-left px-4 py-3 font-semibold text-on-surface">Méthode</th>
              <th class="text-left px-4 py-3 font-semibold text-on-surface">Catégorie</th>
              <th class="text-right px-4 py-3 font-semibold text-on-surface">Score</th>
              <th class="text-left px-4 py-3 font-semibold text-on-surface w-44">Interprétation</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-mint-subtle">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <Hash size={16} class="text-outline" />
                  <span class="font-medium text-on-surface">Exact</span>
                </div>
              </td>
              <td class="px-4 py-3">
                {#if result.exact}
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 {CATEGORY_COLORS[result.exact.category] || 'bg-gray-50 text-gray-700'}">
                    <CheckCheck size={12} /> {result.exact.category}
                  </span>
                {:else}
                  <span class="text-outline">— Aucun mot-clé exact trouvé</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-right font-mono text-on-surface">{result.exact?.score ?? '-'}</td>
              <td class="px-4 py-3 text-xs text-outline">Correspondance textuelle stricte</td>
            </tr>
            <tr class="border-b border-mint-subtle">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <Scale size={16} class="text-outline" />
                  <span class="font-medium text-on-surface">Fuse.js</span>
                </div>
              </td>
              <td class="px-4 py-3">
                {#if result.fuse}
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 {CATEGORY_COLORS[result.fuse.category] || ''}">
                    {result.fuse.category}
                  </span>
                {:else}
                  <span class="text-outline">— Aucune correspondance floue</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-right font-mono">{result.fuse?.score?.toFixed(1) ?? '-'}</td>
              <td class="px-4 py-3 text-xs">
                {#if result.fuse}
                  <span class={result.fuse.score >= 4 ? 'text-green-700' : result.fuse.score >= 2 ? 'text-amber-700' : 'text-red-700'}>
                    {result.fuse.score >= 4 ? 'Fiable (≥ 4)' : result.fuse.score >= 2 ? 'Moyen' : 'Faible'}
                  </span>
                {:else}
                  <span class="text-outline">—</span>
                {/if}
              </td>
            </tr>
            <tr class="border-b border-mint-subtle">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <Layers size={16} class="text-outline" />
                  <span class="font-medium text-on-surface">Embedding</span>
                </div>
              </td>
              <td class="px-4 py-3">
                {#if result.embedding}
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 {CATEGORY_COLORS[result.embedding.category] || ''}">
                    {result.embedding.category}
                  </span>
                {:else}
                  <span class="text-outline">— Embeddings non chargés</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-right font-mono">{result.embedding?.score?.toFixed(3) ?? '-'}</td>
              <td class="px-4 py-3 text-xs">
                {#if result.embedding}
                  <span class={result.embedding.score >= 0.7 ? 'text-green-700' : result.embedding.score >= 0.5 ? 'text-amber-700' : 'text-red-700'}>
                    {result.embedding.score >= 0.7 ? 'Proche (≥ 0.7)' : result.embedding.score >= 0.5 ? 'Moyen (≥ 0.5)' : 'Éloigné (< 0.5)'}
                  </span>
                {:else}
                  <span class="text-outline">—</span>
                {/if}
              </td>
            </tr>
            <tr class="border-b border-mint-subtle">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <Brain size={16} class="text-outline" />
                  <span class="font-medium text-on-surface">Bayes</span>
                </div>
              </td>
              <td class="px-4 py-3">
                {#if result.bayes}
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 {CATEGORY_COLORS[result.bayes] || ''}">
                    {result.bayes}
                  </span>
                {:else}
                  <span class="text-outline">— Non disponible</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-right font-mono text-green-600">✓</td>
              <td class="px-4 py-3 text-xs text-outline">Classification probabiliste</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="bg-white border border-mint-subtle rounded-2xl p-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Crosshair size={18} class="text-primary" />
          <span class="text-sm font-semibold text-on-surface">Vainqueur (priorité : Exact → Fuse → Embedding → Bayes)</span>
        </div>
        <span class="px-4 py-2 rounded-full text-sm font-bold ring-1 {CATEGORY_COLORS[result.winner] || ''}">
          {result.winner}
        </span>
      </div>

      {#if result.embeddingTop3?.length}
        <div class="bg-white border border-mint-subtle rounded-2xl p-4">
          <div class="flex items-center gap-2 mb-3">
            <Layers size={16} class="text-primary" />
            <h3 class="text-sm font-semibold text-on-surface">Top 3 similarité cosinus (embedding)</h3>
            <span class="text-xs text-outline ml-1">— 1 = identique, 0 = différent</span>
          </div>
          <div class="space-y-2">
            {#each result.embeddingTop3 as item, i}
              <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-low">
                <div class="flex items-center gap-3">
                  <span class="w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span class="font-medium text-on-surface text-sm">{item.category}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-outline">
                    {item.score >= 0.7 ? 'Très proche' : item.score >= 0.5 ? 'Proche' : item.score >= 0.3 ? 'Éloigné' : 'Très éloigné'}
                  </span>
                  <span class="font-mono text-sm px-2 py-0.5 rounded {item.score >= 0.7 ? 'bg-green-100 text-green-800' : item.score >= 0.5 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}">
                    {item.score.toFixed(4)}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <hr class="my-10 border-mint-subtle" />

  <div class="flex items-center gap-3 mb-6">
    <Smartphone size={24} class="text-primary" />
    <h2 class="text-2xl font-bold text-on-surface">Test Filtrage SMS</h2>
  </div>

  <div class="bg-white border border-mint-subtle rounded-2xl p-6">
    <label for="sms-address" class="block text-sm font-semibold text-on-surface mb-2">
      Expéditeur (address)
    </label>
    <input
      id="sms-address"
      bind:value={smsAddress}
      placeholder="ORABANK (laisser vide pour défaut)"
      class="w-full mb-4 px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
    />
    <label for="sms-body" class="block text-sm font-semibold text-on-surface mb-2">
      Corps du SMS
    </label>
    <div class="flex gap-3">
      <input
        id="sms-body"
        bind:value={smsBody}
        placeholder="Ex: Virement TMoney de 5000 CFA de M. Kodjo"
        onkeydown={(e) => e.key === 'Enter' && testSmsFilter()}
        class="flex-1 px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
      />
      <button
        onclick={testSmsFilter}
        disabled={smsLoading || !smsBody.trim()}
        class="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none"
      >
        <Search size={18} />
        Tester
      </button>
    </div>
  </div>

  {#if smsLoading}
    <div class="mt-6 p-8 text-center text-outline">
      <div class="animate-pulse flex flex-col items-center gap-2">
        <div class="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        Analyse en cours...
      </div>
    </div>
  {/if}

  {#if smsError}
    <div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
      <AlertCircle size={18} /> {smsError}
    </div>
  {/if}

  {#if smsResult && !smsLoading}
    <div class="mt-6 space-y-4">
      <div class="bg-white border border-mint-subtle rounded-2xl p-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Crosshair size={18} class="text-primary" />
          <span class="text-sm font-semibold text-on-surface">Verdict</span>
        </div>
        <span class="px-4 py-2 rounded-full text-sm font-bold ring-1 {smsResult.verdict === 'INSERT' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-red-50 text-red-700 ring-red-200'}">
          {smsResult.verdict}
        </span>
      </div>

      <div class="bg-white border border-mint-subtle rounded-2xl p-4">
        <div class="flex items-center gap-2 mb-3">
          <Info size={16} class="text-primary" />
          <h3 class="text-sm font-semibold text-on-surface">Raison</h3>
        </div>
        <p class="text-sm text-on-surface">{smsResult.reason}</p>
      </div>

      <div class="bg-white border border-mint-subtle rounded-2xl overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-surface-container-low border-b border-mint-subtle">
              <th class="text-left px-4 py-3 font-semibold text-on-surface">Étape</th>
              <th class="text-left px-4 py-3 font-semibold text-on-surface">Détail</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-mint-subtle">
              <td class="px-4 py-3 font-medium text-on-surface">parseSms</td>
              <td class="px-4 py-3 text-sm text-outline">
                opérateur: {smsResult.steps.parseSms.operator ?? '—'} |
                direction: {smsResult.steps.parseSms.direction ?? '—'} |
                montant: {smsResult.steps.parseSms.amount ?? '—'} |
                expéditeur: {smsResult.steps.parseSms.sender ?? '—'}
              </td>
            </tr>
            <tr class="border-b border-mint-subtle">
              <td class="px-4 py-3 font-medium text-on-surface">Date</td>
              <td class="px-4 py-3 text-sm text-outline">
                {smsResult.steps.dateValidation.raw ?? 'non fournie'}
                {#if smsResult.steps.dateValidation.valid === true}
                  <span class="text-green-600">✓ valide</span>
                {:else if smsResult.steps.dateValidation.valid === false}
                  <span class="text-red-600">✗ invalide</span>
                {:else}
                  <span class="text-outline">—</span>
                {/if}
              </td>
            </tr>
            <tr class="border-b border-mint-subtle">
              <td class="px-4 py-3 font-medium text-on-surface">Classifier</td>
              <td class="px-4 py-3 text-sm text-outline">
                {#if smsResult.steps.classifier.error}
                  <span class="text-red-600">Erreur: {smsResult.steps.classifier.error}</span>
                {:else if smsResult.steps.classifier}
                  vainqueur: {smsResult.steps.classifier.winner ?? '—'}
                {:else}
                  non exécuté
                {/if}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
