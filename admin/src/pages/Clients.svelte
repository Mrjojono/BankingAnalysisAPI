<script lang="ts">
  import { onMount } from 'svelte';
  import { Search, ChevronLeft, ChevronRight, Eye, XCircle, ArrowRight, ShieldCheck } from '@lucide/svelte';
  import { api } from '../lib/api';
  import { toast } from '../lib/stores/toast.svelte';
  import Card from '../lib/components/Card.svelte';
  import Spinner from '../lib/components/Spinner.svelte';
  import Drawer from '../lib/components/Drawer.svelte';

  let { onEligibility }: { onEligibility?: (customer: any) => void } = $props();

  type CustomerRow = {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    accountNumber: string;
  };

  let loading = $state(false);
  let customers: CustomerRow[] = $state([]);
  let total = $state(0);
  let page = $state(1);
  const pageSize = 10;
  let search = $state('');

  let detail: any = null;
  let detailLoading = $state(false);
  let showDrawer = $state(false);

  onMount(() => load());

  async function load(p?: number) {
    if (p !== undefined) page = p;
    loading = true;
    try {
      const res = await api.listCustomers(search || undefined, page, pageSize);
      customers = res.data;
      total = res.total;
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      loading = false;
    }
  }

  function onSearchInput() {
    page = 1;
    load(1);
  }

  async function openDetail(id: string) {
    showDrawer = true;
    detailLoading = true;
    detail = null;
    try {
      detail = await api.getCustomerDetail(id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      detailLoading = false;
    }
  }

  const totalPages = $derived(Math.ceil(total / pageSize));

  const STATUS_COLORS: Record<string, string> = {
    ELIGIBLE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    PARTIAL: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    NOT_ELIGIBLE: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  };

  function fmtDate(d: string | null) {
    if (!d) return '·';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function fmtAmount(a: any) {
    if (a === null || a === undefined) return '·';
    return Number(a).toLocaleString('fr-FR') + ' FCFA';
  }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-2xl font-extrabold text-on-surface tracking-tight">Clients</h2>
  <span class="text-sm text-outline font-medium">{total} client{total !== 1 ? 's' : ''}</span>
</div>

<Card>
  <div class="flex flex-wrap items-center gap-3 mb-4">
    <div class="relative flex-1 min-w-[200px]">
      <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
      <input
        bind:value={search}
        oninput={onSearchInput}
        placeholder="Rechercher par nom, email ou n° de compte…"
        class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  </div>

  {#if loading}
    <div class="flex justify-center py-12"><Spinner text="Chargement…" /></div>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-mint-subtle text-left text-outline font-semibold">
            <th class="pb-3 pr-4">Client</th>
            <th class="pb-3 pr-4">Email</th>
            <th class="pb-3 pr-4">N° compte</th>
            <th class="pb-3 pr-4">Éligibilité</th>
            <th class="pb-3"></th>
          </tr>
        </thead>
        <tbody>
          {#each customers as c (c.id)}
            <tr class="border-b border-mint-subtle hover:bg-surface-container-low transition-colors">
              <td class="py-3 pr-4 font-medium">{c.firstName} {c.lastName}</td>
              <td class="py-3 pr-4 text-outline">{c.email}</td>
              <td class="py-3 pr-4 text-outline font-mono">{c.accountNumber}</td>
              <td class="py-3 pr-4">
                <button
                  onclick={() => onEligibility?.({ id: c.id, firstName: c.firstName, lastName: c.lastName })}
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer border-none"
                >
                  <ShieldCheck size={14} /> Éligibilité
                </button>
              </td>
              <td class="py-3">
                <button onclick={() => openDetail(c.id)} class="p-2 rounded-lg hover:bg-surface-container transition-colors cursor-pointer border-none text-outline hover:text-primary" title="Détails">
                  <Eye size={18} />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if customers.length === 0}
      <p class="text-center py-8 text-outline">Aucun client trouvé</p>
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

<Drawer open={showDrawer} onclose={() => { showDrawer = false; }} widthClass="max-w-2xl">
  {#if detailLoading}
    <div class="flex justify-center py-16"><Spinner text="Chargement du profil…" size="lg" /></div>
  {:else if detail}
    {@const c = detail.customer}
    {@const el = detail.eligibility}
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h3 class="text-xl font-bold">{c.firstName} {c.lastName}</h3>
        <button onclick={() => { showDrawer = false; }} class="p-1.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer border-none text-outline">
          <XCircle size={20} />
        </button>
      </div>

      {#if el}
        <div class="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-outline font-medium uppercase tracking-wider">Score moyen d'éligibilité</p>
              <p class="text-3xl font-bold mt-1">{el.averageScore}<span class="text-base text-outline"> / 100</span></p>
            </div>
            <div class="text-right">
              <p class="text-xs text-outline font-medium uppercase tracking-wider mb-1">Meilleur statut</p>
              {#if el.bestStatus}
                <span class="px-2.5 py-1 rounded-full text-xs font-semibold {STATUS_COLORS[el.bestStatus] ?? 'bg-surface text-outline'}">{el.bestStatus}</span>
              {:else}
                <span class="text-xs text-outline">Aucun produit actif</span>
              {/if}
            </div>
          </div>
          <button
            onclick={() => { showDrawer = false; onEligibility?.({ id: c.id, firstName: c.firstName, lastName: c.lastName }); }}
            class="flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-all cursor-pointer border-none shadow-sm"
          >
            Consulter l'éligibilité détaillée <ArrowRight size={16} />
          </button>
        </div>
      {/if}

      <div class="space-y-2 text-sm">
        <div class="flex justify-between py-1.5 border-b border-mint-subtle"><span class="text-outline">Email</span><span>{c.email}</span></div>
        <div class="flex justify-between py-1.5 border-b border-mint-subtle"><span class="text-outline">Téléphone</span><span>{c.telephone ?? '·'}</span></div>
        <div class="flex justify-between py-1.5 border-b border-mint-subtle"><span class="text-outline">N° compte</span><span class="font-mono">{c.accountNumber}</span></div>
        <div class="flex justify-between py-1.5 border-b border-mint-subtle"><span class="text-outline">Code client</span><span class="font-mono">{c.customerCode}</span></div>
        <div class="flex justify-between py-1.5 border-b border-mint-subtle"><span class="text-outline">KYC</span><span>{c.kycStatus}</span></div>
        <div class="flex justify-between py-1.5 border-b border-mint-subtle"><span class="text-outline">Inscrit le</span><span>{fmtDate(c.createdAt)}</span></div>
        {#if c.userConnection?.user}
          <div class="flex justify-between py-1.5 border-b border-mint-subtle"><span class="text-outline">Compte application</span><span>{c.userConnection.user.email} ({c.userConnection.user.role})</span></div>
        {/if}
      </div>

      <div class="grid grid-cols-4 gap-3">
        <div class="p-3 rounded-xl bg-surface-container-low border border-mint-subtle text-center">
          <p class="text-2xl font-bold">{c._count.accounts}</p>
          <p class="text-xs text-outline">Comptes</p>
        </div>
        <div class="p-3 rounded-xl bg-surface-container-low border border-mint-subtle text-center">
          <p class="text-2xl font-bold">{c._count.smsTransactions}</p>
          <p class="text-xs text-outline">SMS</p>
        </div>
        <div class="p-3 rounded-xl bg-surface-container-low border border-mint-subtle text-center">
          <p class="text-2xl font-bold">{c._count.sentTransactions + c._count.receivedTransactions}</p>
          <p class="text-xs text-outline">Transactions</p>
        </div>
        <div class="p-3 rounded-xl bg-surface-container-low border border-mint-subtle text-center">
          <p class="text-2xl font-bold">{c._count.beneficiaries ?? 0}</p>
          <p class="text-xs text-outline">Bénéficiaires</p>
        </div>
      </div>

      {#if detail.smsByStatus && detail.smsByStatus.length > 0}
        <div>
          <h4 class="font-bold text-sm uppercase tracking-wider text-outline mb-2">SMS analysés par statut</h4>
          <div class="flex flex-wrap gap-2">
            {#each detail.smsByStatus as s}
              <span class="px-3 py-1 rounded-full bg-surface-container-low border border-mint-subtle text-xs font-semibold">{s.status} · {s._count}</span>
            {/each}
          </div>
        </div>
      {/if}

      <div>
        <h4 class="font-bold text-sm uppercase tracking-wider text-outline mb-2">Dernières transactions</h4>
        {#if detail.recent && detail.recent.length > 0}
          <div class="space-y-2">
            {#each detail.recent as t}
              <div class="p-3 rounded-xl bg-surface-container-low border border-mint-subtle text-xs">
                <div class="flex justify-between">
                  <span class="truncate max-w-[240px]">{t.description ?? t.transactionType}</span>
                  <span class="font-semibold">{t.transactionType} · {fmtAmount(t.amount)}</span>
                </div>
                <div class="flex justify-between mt-1 text-outline">
                  <span>{fmtDate(t.transactionDate)}</span>
                  <span>{t.status}</span>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-sm text-outline text-center py-3">Aucune transaction</p>
        {/if}
      </div>
    </div>
  {/if}
</Drawer>
