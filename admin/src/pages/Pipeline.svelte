<script lang="ts">
  import { onMount } from 'svelte';
  import { RefreshCw, Save, FlaskConical, Cpu, Workflow } from '@lucide/svelte';
  import { api } from '../lib/api';
  import { toast } from '../lib/stores/toast.svelte';
  import Card from '../lib/components/Card.svelte';
  import Button from '../lib/components/Button.svelte';
  import ToggleSwitch from '../lib/components/ToggleSwitch.svelte';
  import Spinner from '../lib/components/Spinner.svelte';

  let config = $state<{ regexEnabled: boolean; camenbertEnabled: boolean; camenbertThreshold: number }>({
    regexEnabled: true,
    camenbertEnabled: true,
    camenbertThreshold: 0.75,
  });
  let cbStatus = $state<any>(null);
  let stats = $state<any>(null);
  let loading = $state(true);
  let saving = $state(false);

  let testBody = $state('');
  let testResult = $state<any>(null);
  let testError = $state('');

  function count(rows: any[] | undefined, key: string) {
    const row = (rows ?? []).find((r: any) => r[key] != null);
    return row?._count ?? 0;
  }

  async function loadAll() {
    loading = true;
    try {
      const [cfg, cb, st] = await Promise.all([
        api.smsPipelineConfig(),
        api.camenBertStatus(),
        api.smsStats({ days: 30 }),
      ]);
      config = cfg.config;
      cbStatus = cb.camenBertStatus ?? cb;
      stats = st;
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      loading = false;
    }
  }

  async function saveConfig() {
    saving = true;
    try {
      const res = await api.updateSmsPipelineConfig({
        regexEnabled: config.regexEnabled,
        camenbertEnabled: config.camenbertEnabled,
        camenbertThreshold: Number(config.camenbertThreshold),
      });
      config = res.config;
      toast.success('Configuration du pipeline enregistrée');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      saving = false;
    }
  }

  async function runTest() {
    testResult = null;
    testError = '';
    if (!testBody.trim()) {
      toast.info('Saisissez le contenu du SMS');
      return;
    }
    try {
      testResult = await api.debugSmsFilter({ address: 'ORABANK', body: testBody });
    } catch (e: any) {
      testError = e.message;
    }
  }

  onMount(loadAll);

  const total = $derived(stats?.totals?.total ?? 0);
  const approved = $derived(stats?.totals?.byStatus?.find((r: any) => r.status === 'APPROVED')?._count ?? 0);
  const successRate = $derived(total > 0 ? Math.round((approved / total) * 100) : 0);
  const arbitrated = $derived(stats?.totals?.byArbitration?.find((r: any) => r.arbitration === 'CAMENBERT')?._count ?? 0);
  const ignored = $derived(stats?.totals?.byStatus?.find((r: any) => r.status === 'IGNORED')?._count ?? 0);
</script>

{#if loading}
  <div class="flex justify-center py-16"><Spinner text="Chargement du pipeline..." size="lg" /></div>
{:else}
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-2xl font-bold text-on-surface flex items-center gap-2">
        <Workflow size={22} class="text-primary" /> Pipeline d'analyse SMS
      </h2>
      <p class="text-sm text-on-surface-variant mt-1">
        Couche 1 = regex (montant + direction), couche 2 = CamenBert (type + direction), couche 3 = classifier (catégorie).
      </p>
    </div>
    <Button onclick={loadAll} variant="ghost"><RefreshCw size={16} /> Actualiser</Button>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <Card class="lg:col-span-1">
      <h3 class="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2"><Cpu size={18} class="text-primary" /> Configuration</h3>
      <div class="flex flex-col gap-4">
        <label class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-on-surface">Regex actif</p>
            <p class="text-xs text-on-surface-variant">Logique de pattern/direction du regex (le montant reste toujours extrait)</p>
          </div>
          <ToggleSwitch checked={config.regexEnabled} onchange={(v) => (config.regexEnabled = v)} />
        </label>
        <label class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-on-surface">CamenBert actif</p>
            <p class="text-xs text-on-surface-variant">Arbitre le type et la direction sur chaque SMS</p>
          </div>
          <ToggleSwitch checked={config.camenbertEnabled} onchange={(v) => (config.camenbertEnabled = v)} />
        </label>
        <div>
          <label class="text-sm font-medium text-on-surface block mb-1" for="cb-threshold">Seuil de confiance CamenBert</label>
          <input
            id="cb-threshold"
            type="number"
            min="0"
            max="1"
            step="0.05"
            bind:value={config.camenbertThreshold}
            class="w-full rounded-lg border border-mint-subtle bg-surface px-3 py-2 text-sm"
          />
          <p class="text-xs text-on-surface-variant mt-1">{(config.camenbertThreshold * 100).toFixed(0)} % — au-dessus, CamenBert décide.</p>
        </div>
        <Button onclick={saveConfig} disabled={saving}>
          <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </Card>

    <Card class="lg:col-span-2">
      <h3 class="text-lg font-semibold text-on-surface mb-4">Statistiques (30 derniers jours)</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="rounded-xl bg-surface-container-low border border-mint-subtle p-4">
          <p class="text-xs text-on-surface-variant uppercase tracking-wide">SMS traités</p>
          <p class="text-2xl font-extrabold text-on-surface mt-1">{total}</p>
        </div>
        <div class="rounded-xl bg-surface-container-low border border-mint-subtle p-4">
          <p class="text-xs text-on-surface-variant uppercase tracking-wide">Taux de réussite</p>
          <p class="text-2xl font-extrabold text-green-600 mt-1">{successRate} %</p>
        </div>
        <div class="rounded-xl bg-surface-container-low border border-mint-subtle p-4">
          <p class="text-xs text-on-surface-variant uppercase tracking-wide">Arbitrés CamenBert</p>
          <p class="text-2xl font-extrabold text-primary mt-1">{arbitrated}</p>
        </div>
        <div class="rounded-xl bg-surface-container-low border border-mint-subtle p-4">
          <p class="text-xs text-on-surface-variant uppercase tracking-wide">Désaccords</p>
          <p class="text-2xl font-extrabold text-error mt-1">{stats?.totals?.disagreedCount ?? 0}</p>
        </div>
        <div class="rounded-xl bg-surface-container-low border border-mint-subtle p-4">
          <p class="text-xs text-on-surface-variant uppercase tracking-wide">Ignorés</p>
          <p class="text-2xl font-extrabold text-outline mt-1">{ignored}</p>
        </div>
      </div>

      <div class="mt-6">
        <h4 class="text-sm font-semibold text-on-surface mb-2">Répartition par opérateur</h4>
        <div class="flex flex-col gap-2">
          {#each (stats?.totals?.byOperator ?? []).sort((a: any, b: any) => b._count - a._count) as op (op.operator)}
            <div class="flex items-center gap-3">
              <span class="w-28 text-xs font-medium text-on-surface-variant truncate">{op.operator ?? '—'}</span>
              <div class="flex-1 h-2 rounded-full bg-surface-container overflow-hidden">
                <div class="h-full rounded-full bg-primary" style="width:{total ? Math.max(4, Math.round((op._count / total) * 100)) : 0}%"></div>
              </div>
              <span class="w-10 text-xs text-right text-on-surface-variant">{op._count}</span>
            </div>
          {/each}
        </div>
      </div>

      <div class="mt-6 border-t border-mint-subtle pt-4">
        <h4 class="text-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
          <FlaskConical size={16} class="text-outline" /> Boîte de test (diagnostic complet)
        </h4>
        <div class="flex gap-2">
          <input
            bind:value={testBody}
            placeholder="Collez le corps d'un SMS bancaire..."
            class="flex-1 rounded-lg border border-mint-subtle bg-surface px-3 py-2 text-sm"
          />
          <Button onclick={runTest}>Tester</Button>
        </div>
        {#if testError}
          <p class="mt-3 text-sm text-error">{testError}</p>
        {:else if testResult}
          <div class="mt-3 rounded-xl bg-surface-container-low border border-mint-subtle p-3 text-sm">
            <p class="font-semibold text-on-surface">Verdict : {testResult.verdict} — {testResult.reason}</p>
            <pre class="mt-2 text-xs text-on-surface-variant overflow-x-auto whitespace-pre-wrap">{JSON.stringify(testResult.steps, null, 2)}</pre>
          </div>
        {/if}
      </div>
    </Card>
  </div>

  {#if cbStatus}
    <Card class="mt-6">
      <h3 class="text-sm font-semibold text-on-surface mb-2">Modèle CamenBert</h3>
      <p class="text-sm text-on-surface-variant">
        Prêt : {cbStatus.ready ? 'oui' : 'non'} — seuil : {(cbStatus.threshold * 100).toFixed(0)} % — inférences : {cbStatus.metrics?.totalInferences ?? 0} — latence moy. : {cbStatus.metrics?.avgLatencyMs?.toFixed?.(0) ?? 0} ms
      </p>
    </Card>
  {/if}
{/if}
