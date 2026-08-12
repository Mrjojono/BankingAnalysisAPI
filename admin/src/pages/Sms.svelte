<script lang="ts">
  import { onMount } from 'svelte';
  import { RefreshCw, Plus, Trash2, ShieldCheck, ShieldOff, FlaskConical, MessagesSquare, FilterX, Info, Workflow } from '@lucide/svelte';
  import { api } from '../lib/api';
  import { toast } from '../lib/stores/toast.svelte';
  import Button from '../lib/components/Button.svelte';
  import Card from '../lib/components/Card.svelte';
  import ToggleSwitch from '../lib/components/ToggleSwitch.svelte';
  import CustomerSearch from '../lib/components/CustomerSearch.svelte';

  type Tab = 'analyse' | 'rules' | 'tester';
  let tab = $state<Tab>('analyse');

  let { onNavigate }: { onNavigate: (p: string) => void } = $props();

  // ========== Onglet Analyse (agrégats RGPD) ==========
  let stats = $state<any>(null);
  let statsLoading = $state(false);
  let operatorFilter = $state('');
  let statusFilter = $state('');
  let directionFilter = $state('');
  let customerFilter = $state('');
  let daysFilter = $state('30');

  let pipeConfig = $state<{ regexEnabled: boolean; camenbertEnabled: boolean; camenbertThreshold: number } | null>(null);
  let pipeReady = $state(false);

  async function loadPipelineConfig() {
    try {
      const res = await api.smsPipelineConfig();
      pipeConfig = res.config;
      pipeReady = true;
    } catch {
      pipeReady = false;
    }
  }

  async function togglePipeline(key: 'regexEnabled' | 'camenbertEnabled') {
    if (!pipeConfig) return;
    const next = { ...pipeConfig, [key]: !pipeConfig[key] };
    pipeConfig = next;
    try {
      const res = await api.updateSmsPipelineConfig({ [key]: next[key] } as any);
      pipeConfig = res.config;
      toast.success('Pipeline mis à jour');
    } catch (e: any) {
      pipeConfig = { ...pipeConfig, [key]: !next[key] };
      toast.error(e.message);
    }
  }

  async function loadStats() {
    statsLoading = true;
    try {
      stats = await api.smsStats({
        operator: operatorFilter || undefined,
        status: statusFilter || undefined,
        direction: directionFilter || undefined,
        customerId: customerFilter || undefined,
        days: Number(daysFilter),
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      statsLoading = false;
    }
  }

  function resetStatsFilters() {
    operatorFilter = '';
    statusFilter = '';
    directionFilter = '';
    customerFilter = '';
    daysFilter = '30';
    loadStats();
  }

  function statusCount(status: string) {
    const row = stats?.totals?.byStatus?.find((r: any) => r.status === status);
    return row?._count ?? 0;
  }

  function groupRows(rows: any[]) {
    return [...(rows ?? [])].sort((a, b) => b._count - a._count);
  }

  function pct(n: number) {
    const total = stats?.totals?.total ?? 0;
    if (!total) return '0 %';
    return `${Math.round((n / total) * 100)} %`;
  }

  function barWidth(n: number) {
    const total = stats?.totals?.total ?? 0;
    if (!total) return '0%';
    return `${Math.max(4, Math.round((n / total) * 100))}%`;
  }

  function startRuleForOperator(op: string) {
    tab = 'rules';
    openNewRule();
    ruleForm.operator = op;
  }

  // ========== Onglet Règles ==========
  interface SmsRule {
    id: string;
    customerId: string | null;
    operator: string | null;
    address: string | null;
    keyword: string | null;
    direction: string | null;
    action: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    customer?: { id: string; firstName: string; lastName?: string | null; accountNumber?: string } | null;
  }

  let rules = $state<SmsRule[]>([]);
  let showRuleForm = $state(false);
  let editingRule = $state<SmsRule | null>(null);
  let ruleCustomer = $state<{ id: string; firstName: string } | null>(null);
  let ruleForm = $state({
    operator: '',
    address: '',
    keyword: '',
    direction: '',
    action: 'IGNORE',
    description: '',
  });

  const OPERATOR_SUGGESTIONS = ['MIXX', 'FLOOZ', 'MOOV', 'ORANGE', 'WAVE'];

  function customerLabel(c?: SmsRule['customer']) {
    if (!c) return 'Tous les clients';
    return `${c.firstName}${c.lastName ? ` ${c.lastName}` : ''}${c.accountNumber ? ` (${c.accountNumber})` : ''}`;
  }

  async function loadRules() {
    try {
      rules = await api.listSmsRules();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function openNewRule() {
    editingRule = null;
    ruleCustomer = null;
    ruleForm = { operator: '', address: '', keyword: '', direction: '', action: 'IGNORE', description: '' };
    showRuleForm = true;
  }

  function openEditRule(r: SmsRule) {
    editingRule = r;
    ruleCustomer = r.customer ? { id: r.customer.id, firstName: r.customer.firstName } : null;
    ruleForm = {
      operator: r.operator ?? '',
      address: r.address ?? '',
      keyword: r.keyword ?? '',
      direction: r.direction ?? '',
      action: r.action ?? 'IGNORE',
      description: r.description ?? '',
    };
    showRuleForm = true;
  }

  async function saveRule() {
    const payload: Record<string, unknown> = { ...ruleForm };
    for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null;
    payload.customerId = ruleCustomer?.id ?? null;
    try {
      if (editingRule) {
        await api.updateSmsRule(editingRule.id, payload);
        toast.success('Règle mise à jour');
      } else {
        await api.createSmsRule(payload);
        toast.success('Règle créée');
      }
      showRuleForm = false;
      loadRules();
      loadStats();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function toggleRule(r: SmsRule) {
    try {
      await api.toggleSmsRuleStatus(r.id, !r.isActive);
      toast.info(r.isActive ? 'Règle désactivée' : 'Règle activée');
      loadRules();
      loadStats();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function deleteRule(r: SmsRule) {
    try {
      await api.deleteSmsRule(r.id);
      toast.success('Règle supprimée');
      loadRules();
      loadStats();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  // ========== Onglet Testeur ==========
  let debugAddress = $state('MIXTONE');
  let debugBody = $state('');
  let debugDate = $state('');
  let debugLoading = $state(false);
  let debugResult = $state<any>(null);

  async function runDebug() {
    if (!debugBody.trim()) {
      toast.info('Saisissez le contenu du SMS');
      return;
    }
    debugLoading = true;
    debugResult = null;
    try {
      debugResult = await api.debugSmsFilter({
        address: debugAddress.trim() || 'UNKNOWN',
        body: debugBody,
        dateSent: debugDate || undefined,
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      debugLoading = false;
    }
  }

  onMount(() => {
    loadStats();
    loadRules();
    loadPipelineConfig();
  });
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-xl font-extrabold text-on-surface">SMS</h2>
      <p class="text-sm text-on-surface-variant">
        Analyse des transactions Mobile Money et règles d'ignorance.
      </p>
    </div>
    <Button variant="secondary" size="sm" onclick={() => { if (tab === 'analyse') loadStats(); else if (tab === 'rules') loadRules(); }}>
      <RefreshCw size={16} /> Rafraîchir
    </Button>
  </div>

  {#if pipeConfig}
    <div class="mb-5 rounded-xl bg-surface-container-low border border-mint-subtle p-4 flex flex-wrap items-center gap-4">
      <div class="flex items-center gap-2">
        <Workflow size={18} class="text-primary" />
        <span class="text-sm font-semibold text-on-surface">Pipeline d'analyse</span>
      </div>
      <label class="flex items-center gap-2 text-sm text-on-surface-variant">
        <ToggleSwitch checked={pipeConfig.regexEnabled} onchange={() => togglePipeline('regexEnabled')} />
        Regex
      </label>
      <label class="flex items-center gap-2 text-sm text-on-surface-variant">
        <ToggleSwitch checked={pipeConfig.camenbertEnabled} onchange={() => togglePipeline('camenbertEnabled')} />
        CamenBert
      </label>
      <span class="text-xs text-on-surface-variant">Seuil : {(pipeConfig.camenbertThreshold * 100).toFixed(0)} %</span>
      <button
        onclick={() => onNavigate('pipeline')}
        class="ml-auto text-sm font-medium text-primary hover:underline bg-transparent border-none cursor-pointer"
      >
        Ouvrir la page Pipeline →
      </button>
    </div>
  {/if}

  <div class="flex gap-1 p-1 bg-surface-container-low rounded-xl w-fit border border-mint-subtle">
    <button onclick={() => tab = 'analyse'}
      class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none {tab === 'analyse' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}">
      <MessagesSquare size={16} /> Analyse
    </button>
    <button onclick={() => tab = 'rules'}
      class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none {tab === 'rules' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}">
      <ShieldCheck size={16} /> Règles d'ignorance
    </button>
    <button onclick={() => tab = 'tester'}
      class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none {tab === 'tester' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}">
      <FlaskConical size={16} /> Testeur SMS
    </button>
  </div>

  {#if tab === 'analyse'}
    <div class="flex items-start gap-3 p-3 rounded-xl bg-[#f0f7e8] border border-mint-subtle text-sm text-on-surface-variant">
      <Info size={18} class="shrink-0 mt-0.5 text-primary" />
      <p>
        Vue agrégée : volumes par opérateur, statut, catégorie et sens.
        Les statuts sont attribués automatiquement par le pipeline : approuvées (parse fiable),
        ambiguës (exclues des analyses), ignorées (règles d'ignorance).
        Aucun contenu de SMS ni identité de client n'est affiché (RGPD).
      </p>
    </div>

    <Card>
      <div class="flex flex-wrap items-center gap-3 p-4 border-b border-mint-subtle">
        <select bind:value={operatorFilter} onchange={() => loadStats()}
          class="px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none">
          <option value="">Tous les opérateurs</option>
          {#each [...new Set([...(stats?.totals?.byOperator?.map((r: any) => r.operator).filter(Boolean) ?? []), 'MIXX', 'FLOOZ', 'MOOV'])] as op}
            <option value={op}>{op}</option>
          {/each}
        </select>
        <select bind:value={statusFilter} onchange={() => loadStats()}
          class="px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none">
          <option value="">Tous les statuts</option>
          <option value="APPROVED">Approuvées</option>
          <option value="PENDING">Ambiguës</option>
          <option value="IGNORED">Ignorées</option>
        </select>
        <select bind:value={directionFilter} onchange={() => loadStats()}
          class="px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none">
          <option value="">Crédit et débit</option>
          <option value="CREDIT">Crédit</option>
          <option value="DEBIT">Débit</option>
        </select>
        <select bind:value={daysFilter} onchange={() => loadStats()}
          class="px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none">
          <option value="7">7 derniers jours</option>
          <option value="14">14 derniers jours</option>
          <option value="30">30 derniers jours</option>
        </select>
        <div class="w-64">
          <CustomerSearch placeholder="Filtrer sur un client (agrégé)" onSelect={(c) => { customerFilter = c.id; loadStats(); }} />
        </div>
        <Button variant="secondary" size="sm" onclick={resetStatsFilters}>
          <FilterX size={16} /> Réinitialiser
        </Button>
      </div>

      {#if statsLoading}
        <p class="p-8 text-center text-sm text-on-surface-variant">Chargement…</p>
      {:else if stats}
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
          <div class="rounded-xl border border-mint-subtle bg-white p-4">
            <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Total ({daysFilter} jours)</p>
            <p class="mt-1 text-3xl font-extrabold text-on-surface">{stats.totals.total}</p>
          </div>
          <div class="rounded-xl border border-mint-subtle bg-green-50 p-4">
            <p class="text-xs font-semibold text-green-700 uppercase tracking-wide">Approuvées</p>
            <p class="mt-1 text-3xl font-extrabold text-green-800">{statusCount('APPROVED')}</p>
          </div>
          <div class="rounded-xl border border-mint-subtle bg-amber-50 p-4">
            <p class="text-xs font-semibold text-amber-700 uppercase tracking-wide">Ambiguës</p>
            <p class="mt-1 text-3xl font-extrabold text-amber-800">{statusCount('PENDING')}</p>
          </div>
          <div class="rounded-xl border border-mint-subtle bg-gray-50 p-4">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ignorées</p>
            <p class="mt-1 text-3xl font-extrabold text-gray-600">{statusCount('IGNORED')}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          <Card>
            <h3 class="text-sm font-bold text-on-surface mb-3">Volume par opérateur</h3>
            {#if groupRows(stats.totals.byOperator).length === 0}
              <p class="text-sm text-on-surface-variant">Aucune donnée.</p>
            {:else}
              {#each groupRows(stats.totals.byOperator) as r (r.operator ?? 'null')}
                <div class="flex items-center gap-3 py-1.5">
                  <span class="w-24 text-sm font-medium text-on-surface truncate">{r.operator ?? 'Inconnu'}</span>
                  <div class="flex-1 h-6 rounded-lg bg-surface-container-low overflow-hidden">
                    <div class="h-full bg-primary rounded-lg flex items-center px-2" style="width: {barWidth(r._count)}">
                      <span class="text-xs font-bold text-white">{r._count}</span>
                    </div>
                  </div>
                  <span class="w-12 text-xs text-on-surface-variant text-right">{pct(r._count)}</span>
                  <button onclick={() => startRuleForOperator(r.operator ?? '')} title="Créer une règle d'ignorance pour cet opérateur"
                    class="p-1.5 rounded-lg cursor-pointer border-none text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors">
                    <ShieldOff size={15} />
                  </button>
                </div>
              {/each}
            {/if}
          </Card>

          <Card>
            <h3 class="text-sm font-bold text-on-surface mb-3">Répartition par statut</h3>
            {#each [['APPROVED', 'Approuvées'], ['PENDING', 'Ambiguës'], ['IGNORED', 'Ignorées']] as [code, label]}
              <div class="flex items-center gap-3 py-1.5">
                <span class="w-24 text-sm font-medium text-on-surface">{label}</span>
                <div class="flex-1 h-6 rounded-lg bg-surface-container-low overflow-hidden">
                  <div class="h-full rounded-lg flex items-center px-2 {code === 'APPROVED' ? 'bg-green-600' : code === 'PENDING' ? 'bg-amber-500' : 'bg-gray-400'}" style="width: {barWidth(statusCount(code))}">
                    <span class="text-xs font-bold text-white">{statusCount(code)}</span>
                  </div>
                </div>
                <span class="w-12 text-xs text-on-surface-variant text-right">{pct(statusCount(code))}</span>
              </div>
            {/each}
          </Card>

          <Card>
            <h3 class="text-sm font-bold text-on-surface mb-3">Volume par catégorie</h3>
            {#if groupRows(stats.totals.byCategory).length === 0}
              <p class="text-sm text-on-surface-variant">Aucune catégorie détectée.</p>
            {:else}
              {#each groupRows(stats.totals.byCategory) as r (r.category ?? 'null')}
                <div class="flex items-center gap-3 py-1.5">
                  <span class="w-32 text-sm font-medium text-on-surface truncate">{r.category ?? 'Inconnu'}</span>
                  <div class="flex-1 h-6 rounded-lg bg-surface-container-low overflow-hidden">
                    <div class="h-full bg-[#7a9e2f] rounded-lg flex items-center px-2" style="width: {barWidth(r._count)}">
                      <span class="text-xs font-bold text-white">{r._count}</span>
                    </div>
                  </div>
                  <span class="w-12 text-xs text-on-surface-variant text-right">{pct(r._count)}</span>
                </div>
              {/each}
            {/if}
          </Card>

          <Card>
            <h3 class="text-sm font-bold text-on-surface mb-3">Volume par sens</h3>
            {#each ['CREDIT', 'DEBIT'] as d}
              {@const row = (stats.totals.byDirection ?? []).find((r: any) => r.direction === d)}
              <div class="flex items-center gap-3 py-1.5">
                <span class="w-24 text-sm font-medium text-on-surface">{d === 'CREDIT' ? 'Crédit (reçu)' : 'Débit (dépensé)'}</span>
                <div class="flex-1 h-6 rounded-lg bg-surface-container-low overflow-hidden">
                  <div class="h-full bg-sky-600 rounded-lg flex items-center px-2" style="width: {barWidth(row?._count ?? 0)}">
                    <span class="text-xs font-bold text-white">{row?._count ?? 0}</span>
                  </div>
                </div>
                <span class="w-12 text-xs text-on-surface-variant text-right">{pct(row?._count ?? 0)}</span>
              </div>
            {/each}
          </Card>

          <div class="lg:col-span-2">
            <Card>
              <h3 class="text-sm font-bold text-on-surface mb-3">Évolution quotidienne ({daysFilter} jours)</h3>
              {#if (stats.totals.perDay ?? []).every((d: any) => d.count === 0)}
                <p class="text-sm text-on-surface-variant">Aucun SMS sur cette période.</p>
              {:else}
                <div class="flex items-end gap-1 h-28">
                  {#each stats.totals.perDay as d (d.date)}
                    <div class="flex-1 flex flex-col items-center gap-1 group">
                      <div class="w-full rounded-t-md bg-primary/80 group-hover:bg-primary transition-colors"
                        style="height: {d.count === 0 ? '2px' : `${Math.max(6, Math.round((d.count / Math.max(...stats.totals.perDay.map((x: any) => x.count))) * 100))}%`}"></div>
                      <span class="text-[10px] text-on-surface-variant">{d.date.slice(8)}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </Card>
          </div>
        </div>
      {/if}
    </Card>
  {/if}

  {#if tab === 'rules'}
    <Card>
      <div class="flex items-center justify-between p-4 border-b border-mint-subtle">
        <p class="text-sm text-on-surface-variant max-w-2xl">
          Une règle marque automatiquement les SMS correspondants en IGNORED lors de la synchronisation.
          Elle peut viser un opérateur, un émetteur précis, un mot-clé ou une combinaison. Sans client choisi, elle s'applique à tous.
        </p>
        <Button size="sm" onclick={openNewRule}>
          <Plus size={16} /> Nouvelle règle
        </Button>
      </div>

      <div class="divide-y divide-mint-subtle">
        {#if rules.length === 0}
          <p class="p-6 text-center text-sm text-on-surface-variant">Aucune règle définie pour le moment.</p>
        {:else}
          {#each rules as r (r.id)}
            <div class="flex items-center gap-4 p-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  {#if r.operator}
                    <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-primary-container text-on-primary-container">{r.operator}</span>
                  {:else}
                    <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-surface-container text-on-surface-variant">Tous opérateurs</span>
                  {/if}
                  {#if r.address}
                    <code class="px-2 py-0.5 rounded bg-surface-container text-xs font-mono">expéditeur {r.address}</code>
                  {/if}
                  {#if r.keyword}
                    <code class="px-2 py-0.5 rounded bg-surface-container text-xs font-mono">mot-clé « {r.keyword} »</code>
                  {/if}
                  {#if r.direction}
                    <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">{r.direction === 'CREDIT' ? 'Crédit' : 'Débit'}</span>
                  {/if}
                  <span class="text-xs text-on-surface-variant">{customerLabel(r.customer)}</span>
                </div>
                {#if r.description}
                  <p class="mt-1 text-xs text-on-surface-variant">{r.description}</p>
                {/if}
              </div>
              <ToggleSwitch checked={r.isActive} onchange={() => toggleRule(r)} activeLabel="Active" inactiveLabel="Inactive" title="Activer ou désactiver" />
              <div class="flex items-center gap-1">
                <Button size="sm" variant="ghost" onclick={() => openEditRule(r)}>Modifier</Button>
                <Button size="sm" variant="ghost" onclick={() => deleteRule(r)}>
                  <Trash2 size={16} class="text-error" />
                </Button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </Card>

    {#if showRuleForm}
      <Card>
        <h3 class="text-lg font-bold text-on-surface mb-4">{editingRule ? 'Modifier la règle' : 'Nouvelle règle'}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-semibold text-on-surface-variant block mb-1">Opérateur (texte libre)</label>
            <input bind:value={ruleForm.operator} list="operator-suggestions" placeholder="MIXX, FLOOZ, MOOV, autre…"
              class="w-full px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none" />
            <datalist id="operator-suggestions">
              {#each OPERATOR_SUGGESTIONS as op}
                <option value={op} />
              {/each}
            </datalist>
            <p class="mt-1 text-xs text-on-surface-variant">Saisissez librement, un opérateur absent de la liste reste possible.</p>
          </div>
          <div>
            <label class="text-xs font-semibold text-on-surface-variant block mb-1">Sens</label>
            <select bind:value={ruleForm.direction} class="w-full px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none">
              <option value="">Tous les sens</option>
              <option value="DEBIT">Débit</option>
              <option value="CREDIT">Crédit</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold text-on-surface-variant block mb-1">Émetteur à ignorer</label>
            <input bind:value={ruleForm.address} placeholder="ex. ORANGE, 8977, +22890…"
              class="w-full px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none" />
            <p class="mt-1 text-xs text-on-surface-variant">Ignore tout SMS venant de cet expéditeur (short code ou numéro).</p>
          </div>
          <div>
            <label class="text-xs font-semibold text-on-surface-variant block mb-1">Mot-clé dans le contenu</label>
            <input bind:value={ruleForm.keyword} placeholder="ex. PROMO, OFFRE"
              class="w-full px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label class="text-xs font-semibold text-on-surface-variant block mb-1">Action</label>
            <select bind:value={ruleForm.action} class="w-full px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none">
              <option value="IGNORE">IGNORE (exclure des analyses)</option>
              <option value="ALLOW">ALLOW (sauf les règles d'ignore)</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold text-on-surface-variant block mb-1">Client concerné (optionnel)</label>
            <CustomerSearch placeholder="Rechercher un client…" onSelect={(c) => { ruleCustomer = { id: c.id, firstName: c.firstName }; }} />
            <p class="mt-1 text-xs text-on-surface-variant">Vide = règle globale pour tous les clients.</p>
          </div>
          <div class="md:col-span-2">
            <label class="text-xs font-semibold text-on-surface-variant block mb-1">Description</label>
            <input bind:value={ruleForm.description} placeholder="Pourquoi cette règle ?"
              class="w-full px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none" />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onclick={() => showRuleForm = false}>Annuler</Button>
          <Button onclick={saveRule}>{editingRule ? 'Enregistrer' : 'Créer la règle'}</Button>
        </div>
      </Card>
    {/if}
  {/if}

  {#if tab === 'tester'}
    <Card>
      <div class="p-4">
        <p class="text-sm text-on-surface-variant mb-4">
          Collez un SMS pour visualiser chaque étape du filtrage : parseSms, validation de date, CamenBert et classifieur.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label class="text-xs font-semibold text-on-surface-variant block mb-1">Émetteur (adresse)</label>
            <input bind:value={debugAddress} placeholder="ex. MIXTONE, FLOOZ"
              class="w-full px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label class="text-xs font-semibold text-on-surface-variant block mb-1">Date d'envoi (optionnel)</label>
            <input bind:value={debugDate} type="datetime-local"
              class="w-full px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none" />
          </div>
          <div class="flex items-end">
            <Button onclick={runDebug} disabled={debugLoading}>
              {#if debugLoading}
                <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              {:else}
                <FlaskConical size={16} />
              {/if}
              Tester
            </Button>
          </div>
        </div>
        <label class="text-xs font-semibold text-on-surface-variant block mb-1">Contenu du SMS</label>
        <textarea bind:value={debugBody} rows={4} placeholder="ex. MIXX (ex-TMoney) : Vous avez recu 50000 FCFA de la part de KOFFI AGBEKO. Solde: 150000 FCFA. Ref: 8812"
          class="w-full px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none resize-y font-mono"></textarea>
      </div>

      {#if debugResult}
        <div class="px-4 pb-4 flex flex-col gap-3">
          <div class="flex items-center gap-3 p-3 rounded-xl border border-mint-subtle bg-surface-container-low">
            <span class="text-sm font-bold">Verdict :</span>
            <span class={debugResult.verdict === 'INSERT' ? 'inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800' : 'inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800'}>{debugResult.verdict}</span>
            <span class="text-xs text-on-surface-variant">{debugResult.reason}</span>
          </div>
          <pre class="p-3 rounded-xl bg-surface-container text-xs text-on-surface overflow-x-auto">{JSON.stringify(debugResult.steps, null, 2)}</pre>
        </div>
      {/if}
    </Card>
  {/if}
</div>
