<script lang="ts">
  import { onMount } from 'svelte';
  import { Search, ChevronLeft, ChevronRight, Check, X, Eye, XCircle, Filter, Trash2 } from '@lucide/svelte';
  import { api } from '../lib/api';
  import { toast } from '../lib/stores/toast.svelte';
  import Card from '../lib/components/Card.svelte';
  import Spinner from '../lib/components/Spinner.svelte';
  import Badge from '../lib/components/Badge.svelte';
  import Drawer from '../lib/components/Drawer.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';

  type LogRow = {
    id: string; action: string; success: boolean; email: string | null;
    userId: string | null; ipAddress: string | null; userAgent: string | null; createdAt: string;
  };

  type AuditRow = {
    id: string; entityType: string; entityId: string; action: string;
    actorId: string | null; actorRole: string | null;
    before: any; after: any; ipAddress: string | null; createdAt: string;
  };

  let tab = $state<'auth' | 'audit'>('auth');
  let loading = $state(false);
  let rows: (LogRow | AuditRow)[] = $state([]);
  let total = $state(0);
  let page = $state(1);
  let pageSize = 20;

  let actionFilter = $state('');
  let userIdFilter = $state('');
  let successFilter = $state('');
  let dateFrom = $state('');
  let dateTo = $state('');

  let selectedRow: any = $state(null);
  let showDrawer = $state(false);

  onMount(() => load());

  async function load(p?: number) {
    if (p !== undefined) page = p;
    loading = true;
    try {
      if (tab === 'auth') {
        const res = await api.listAuthLogs({
          action: actionFilter || undefined,
          userId: userIdFilter || undefined,
          success: successFilter || undefined,
          from: dateFrom || undefined,
          to: dateTo || undefined,
          page, limit: pageSize,
        });
        rows = res.data;
        total = res.total;
      } else {
        const res = await api.listAuditLogs({
          action: actionFilter || undefined,
          actorId: userIdFilter || undefined,
          from: dateFrom || undefined,
          to: dateTo || undefined,
          page, limit: pageSize,
        });
        rows = res.data;
        total = res.total;
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      loading = false;
    }
  }

  function onFilter() {
    page = 1;
    load(1);
  }

  function switchTab(t: 'auth' | 'audit') {
    tab = t;
    page = 1;
    rows = [];
    total = 0;
    actionFilter = '';
    userIdFilter = '';
    successFilter = '';
    dateFrom = '';
    dateTo = '';
    onFilter();
  }

  async function openDetail(log: any) {
    selectedRow = log;
    showDrawer = true;
  }

  const totalPages = $derived(Math.ceil(total / pageSize));

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  function actionLabel(a: string) {
    return a.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  }

  let confirm = $state<{ title: string; message: string; action: () => void } | null>(null);

  function ask(title: string, message: string, action: () => void) {
    confirm = { title, message, action };
  }
  function cancelConfirm() { confirm = null; }
  function execConfirm() { confirm?.action(); confirm = null; }

  function purgeLogs() {
    ask(
      tab === 'auth' ? 'Purger les logs authentification ?' : 'Purger les logs audit ?',
      'Tous les logs seront supprimes definitivement. Cette action est irreversible.',
      async () => {
        try {
          const result = tab === 'auth'
            ? await api.purgeAuthLogs()
            : await api.purgeAuditLogs();
          toast.success(result.message || 'Logs purges');
          page = 1;
          await load();
        } catch (e: any) {
          toast.error(e.message);
        }
      },
    );
  }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-2xl font-extrabold text-on-surface tracking-tight">Logs</h2>
  <div class="flex items-center gap-3">
    <span class="text-sm text-outline font-medium">{total} entree{total !== 1 ? 's' : ''}</span>
    <button onclick={purgeLogs} class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-all cursor-pointer">
      <Trash2 size={14} />
      Purger
    </button>
  </div>
</div>

<div class="flex gap-1 mb-4 p-1 bg-surface-container-low rounded-xl w-fit">
  <button
    onclick={() => switchTab('auth')}
    class="px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none {tab === 'auth' ? 'bg-surface text-on-surface shadow-sm' : 'text-outline hover:text-on-surface'}"
  >Authentification</button>
  <button
    onclick={() => switchTab('audit')}
    class="px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none {tab === 'audit' ? 'bg-surface text-on-surface shadow-sm' : 'text-outline hover:text-on-surface'}"
  >Audit</button>
</div>

<Card>
  <div class="flex flex-wrap items-center gap-3 mb-4">
    <div class="relative flex-1 min-w-[150px]">
      <Filter size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
      <input
        bind:value={actionFilter}
        oninput={onFilter}
        placeholder="Action…"
        class="w-full pl-9 pr-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
    {#if tab === 'auth'}
      <div class="relative flex-1 min-w-[150px]">
        <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
        <input
          bind:value={userIdFilter}
          oninput={onFilter}
          placeholder="User ID…"
          class="w-full pl-9 pr-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <select bind:value={successFilter} onchange={onFilter} class="px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
        <option value="">Tous</option>
        <option value="true">Succès</option>
        <option value="false">Échec</option>
      </select>
    {/if}
    <input type="date" bind:value={dateFrom} onchange={onFilter} class="px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" title="Du" />
    <input type="date" bind:value={dateTo} onchange={onFilter} class="px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" title="Au" />
  </div>

  {#if loading}
    <div class="flex justify-center py-12"><Spinner text="Chargement…" /></div>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-mint-subtle text-left text-outline font-semibold">
            <th class="pb-3 pr-4">Date</th>
            <th class="pb-3 pr-4">Action</th>
            {#if tab === 'auth'}
              <th class="pb-3 pr-4">Succès</th>
              <th class="pb-3 pr-4">Email</th>
            {:else}
              <th class="pb-3 pr-4">Entité</th>
              <th class="pb-3 pr-4">Actor</th>
            {/if}
            <th class="pb-3 pr-4">IP</th>
            <th class="pb-3"></th>
          </tr>
        </thead>
        <tbody>
          {#each rows as log (log.id)}
            <tr class="border-b border-mint-subtle hover:bg-surface-container-low transition-colors">
              <td class="py-2.5 pr-4 text-outline text-xs whitespace-nowrap">{formatDate(log.createdAt)}</td>
              <td class="py-2.5 pr-4 font-medium text-xs">{actionLabel(log.action)}</td>
              {#if tab === 'auth'}
                <td class="py-2.5 pr-4">
                  {#if (log as LogRow).success}
                    <span class="inline-flex items-center gap-1 text-green-700 text-xs"><Check size={14} /> Succès</span>
                  {:else}
                    <span class="inline-flex items-center gap-1 text-red-600 text-xs"><X size={14} /> Échec</span>
                  {/if}
                </td>
                <td class="py-2.5 pr-4 text-outline text-xs">{(log as LogRow).email ?? '—'}</td>
              {:else}
                <td class="py-2.5 pr-4 text-outline text-xs">{(log as AuditRow).entityType}</td>
                <td class="py-2.5 pr-4 text-outline text-xs">{(log as AuditRow).actorRole ?? '—'}</td>
              {/if}
              <td class="py-2.5 pr-4 text-outline text-xs font-mono">{log.ipAddress ?? '—'}</td>
              <td class="py-2.5">
                <button onclick={() => openDetail(log)} class="p-1.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer border-none text-outline hover:text-primary" title="Détails">
                  <Eye size={16} />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if rows.length === 0}
      <p class="text-center py-8 text-outline">Aucune entrée trouvée</p>
    {/if}
  {/if}

  {#if totalPages > 1}
    <div class="flex items-center justify-between pt-4 border-t border-mint-subtle mt-4">
      <button disabled={page <= 1} onclick={() => load(page - 1)} class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-surface-container transition-colors cursor-pointer border-none">
        <ChevronLeft size={16} /> Précédent
      </button>
      <span class="text-sm text-outline">Page {page} / {totalPages}</span>
      <button disabled={page >= totalPages} onclick={() => load(page + 1)} class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-surface-container transition-colors cursor-pointer border-none">
        Suivant <ChevronRight size={16} />
      </button>
    </div>
  {/if}
</Card>

<Drawer title="drawer" open={showDrawer} onclose={() => { showDrawer = false; }}>
  {#if selectedRow}
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold">Détail du log</h3>
        <button onclick={() => { showDrawer = false; }} class="p-1.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer border-none text-outline">
          <XCircle size={20} />
        </button>
      </div>
      <div class="space-y-3 text-sm">
        {#each Object.entries(selectedRow) as [key, val]}
          {#if !['id', '_count'].includes(key)}
            <div class="flex justify-between py-1.5 border-b border-mint-subtle">
              <span class="text-outline font-medium capitalize">{key.replace(/_/g, ' ')}</span>
              <span class="text-right max-w-[60%] truncate" title={JSON.stringify(val)}>
                {#if key === 'createdAt'}
                  {formatDate(val as string)}
                {:else if key === 'success'}
                {#if val}
                <Check size={14} />
                {:else}
                <X size={14} />
                {/if}
                  {:else if typeof val === 'object' && val !== null}
                  <span class="font-mono text-xs">{JSON.stringify(val)}</span>
                {:else}
                  {String(val ?? '—')}
                {/if}
              </span>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</Drawer>

{#if confirm}
  <ConfirmDialog open={true} title={confirm.title} message={confirm.message} onconfirm={execConfirm} oncancel={cancelConfirm} />
{/if}
