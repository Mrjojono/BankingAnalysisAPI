<script lang="ts">
  import { api } from '../../api';
  import Spinner from '../Spinner.svelte';

  let {
    smsAddress = 'ORABANK',
  }: {
    smsAddress?: string;
  } = $props();

  let classifierResult = $state<any>(null);
  let cbResult = $state<any>(null);
  let smsResult = $state<any>(null);
  let desc = $state('');
  let cbBody = $state('');
  let smsBody = $state('');
  let classifierLoading = $state(false);
  let cbLoading = $state(false);
  let smsLoading = $state(false);

  const emit = (event: string, detail?: any) => {};

  const CB_CATEGORY_COLORS: Record<string, string> = {
    CREDIT_DEPOT: 'bg-teal-50 text-teal-700 ring-teal-200',
    CREDIT_SALAIRE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    CREDIT_TRANSFERT: 'bg-green-50 text-green-700 ring-green-200',
    DEBIT_PAIEMENT: 'bg-blue-50 text-blue-700 ring-blue-200',
    DEBIT_RETRAIT: 'bg-pink-50 text-pink-700 ring-pink-200',
    DEBIT_TRANSFERT: 'bg-purple-50 text-purple-700 ring-purple-200',
    DEBIT_ACHAT_CREDIT: 'bg-amber-50 text-amber-700 ring-amber-200',
    DEBIT_FRAIS: 'bg-red-50 text-red-700 ring-red-200',
    UNKNOWN: 'bg-slate-50 text-slate-700 ring-slate-200',
  };

  async function testClassifier() {
    if (!desc.trim()) return;
    classifierLoading = true;
    try { classifierResult = await api.testClassifier(desc); } finally { classifierLoading = false; }
  }

  async function testCamenBert() {
    if (!cbBody.trim()) return;
    cbLoading = true;
    try { cbResult = await api.testCamenBert(cbBody); } finally { cbLoading = false; }
  }

  async function testSmsFilter() {
    if (!smsBody.trim()) return;
    smsLoading = true;
    try { smsResult = await api.debugSmsFilter({ address: smsAddress, body: smsBody }); } finally { smsLoading = false; }
  }

  function scoreBar(score: number) {
    if (score >= 0.75) return 'bg-green-400';
    if (score >= 0.5) return 'bg-amber-400';
    return 'bg-outline/30';
  }
</script>

<div class="space-y-6">
  <!-- Classifieur -->
  <div>
    <label for="cb-test-desc" class="block text-xs font-semibold text-outline mb-2">Classifieur (RegEx + Fuse.js + Embeddings + Bayes)</label>
    <div class="flex gap-2">
      <input id="cb-test-desc" bind:value={desc} placeholder="Ex: Paiement Loyer M. Kodjo"
        onkeydown={(e) => e.key === 'Enter' && testClassifier()}
        class="flex-1 px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      <button onclick={testClassifier} disabled={classifierLoading || !desc.trim()}
        class="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50 border-none">
        {classifierLoading ? '...' : 'Tester'}
      </button>
    </div>
    {#if classifierResult}
      <div class="mt-3 text-xs space-y-2">
        <div class="p-3 rounded-xl bg-surface-container-low">
          <span class="font-semibold text-outline">Gagnant:</span>
          <span class="font-bold text-on-surface ml-1">{classifierResult.winner}</span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          {#each ['Exact', 'Fuse.js', 'Embedding', 'Bayes'] as method}
            {#if classifierResult[method.toLowerCase()]}
              <div class="p-2 rounded-lg bg-surface-container-low">
                <div class="text-outline">{method}</div>
                <div class="font-semibold text-on-surface">{classifierResult[method.toLowerCase()].category}</div>
                <div class="font-mono text-outline">{classifierResult[method.toLowerCase()].score?.toFixed(2) ?? ''}</div>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- CamenBert -->
  <div>
    <label for="cb-test-body" class="block text-xs font-semibold text-outline mb-2">CamenBert</label>
    <div class="flex gap-2">
      <input id="cb-test-body" bind:value={cbBody} placeholder="Corps du SMS"
        onkeydown={(e) => e.key === 'Enter' && testCamenBert()}
        class="flex-1 px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      <button onclick={testCamenBert} disabled={cbLoading || !cbBody.trim()}
        class="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50 border-none">
        {cbLoading ? '...' : 'Tester'}
      </button>
    </div>
    {#if cbResult?.ready && cbResult?.result}
      <div class="mt-3 text-xs">
        <div class="p-3 rounded-xl bg-surface-container-low space-y-1">
          <div class="flex justify-between">
            <span class="text-outline">Catégorie</span>
            <span class="font-bold px-2 py-0.5 rounded {CB_CATEGORY_COLORS[cbResult.result.category]}">{cbResult.result.category}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-outline">Direction</span>
            <span class="font-semibold {cbResult.result.direction === 'CREDIT' ? 'text-green-600' : 'text-red-600'}">{cbResult.result.direction}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-outline">Confiance</span>
            <span class="font-mono font-semibold">{(cbResult.result.confidence * 100).toFixed(1)}%</span>
          </div>
          <div class="flex justify-between">
            <span class="text-outline">Inséré</span>
            <span class="font-bold {cbResult.wouldInsert ? 'text-green-600' : 'text-red-600'}">{cbResult.wouldInsert ? 'OUI' : 'NON'}</span>
          </div>
        </div>
        {#if cbResult.result.rawScores}
          <div class="mt-2 space-y-1">
            {#each Object.entries(cbResult.result.rawScores).sort((a, b) => b[1] - a[1]) as [cat, score]}
              <div class="flex items-center gap-2">
                <span class="w-28 text-xs text-outline truncate">{cat}</span>
                <div class="flex-1 h-4 rounded bg-surface-container-low overflow-hidden">
                  <div class="h-full rounded transition-all {scoreBar(score)}" style="width: {(score * 100).toFixed(0)}%"></div>
                </div>
                <span class="w-10 text-right text-xs font-mono text-outline">{(score * 100).toFixed(0)}%</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if cbResult && !cbResult.ready}
      <div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">{cbResult.message}</div>
    {/if}
  </div>

  <!-- SMS Filter -->
  <div>
    <label for="cb-test-sms" class="block text-xs font-semibold text-outline mb-2">Filtrage SMS complet</label>
    <div class="flex gap-2">
      <input id="cb-test-sms" bind:value={smsAddress} placeholder="Expéditeur"
        class="w-32 px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      <input bind:value={smsBody} placeholder="Corps du SMS"
        onkeydown={(e) => e.key === 'Enter' && testSmsFilter()}
        class="flex-1 px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      <button onclick={testSmsFilter} disabled={smsLoading || !smsBody.trim()}
        class="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50 border-none">
        {smsLoading ? '...' : 'Tester'}
      </button>
    </div>
    {#if smsResult}
      <div class="mt-3 text-xs">
        <div class="flex items-center gap-2 mb-2">
          <span class="px-2 py-0.5 rounded text-xs font-bold {smsResult.verdict === 'INSERT' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}">{smsResult.verdict}</span>
          <span class="text-outline">{smsResult.reason}</span>
        </div>
        {#if smsResult.steps}
          <div class="space-y-1">
            {#each smsResult.steps as step}
              <div class="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low">
                <span class="font-semibold text-outline w-24">{step.step}</span>
                {#if step.result}
                  <span class="text-on-surface">{JSON.stringify(step.result).slice(0, 100)}</span>
                {:else if step.error}
                  <span class="text-red-600">{step.error}</span>
                {:else}
                  <span class="text-outline">—</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
