<script lang="ts">
  import { onMount } from 'svelte';
  import { Users, Bell, Activity, CreditCard, FileText, BarChart3, TrendingUp, GraduationCap, CheckCircle2 } from '@lucide/svelte';
  import { api } from '../lib/api';
  import { toast } from '../lib/stores/toast.svelte';
  import Card from '../lib/components/Card.svelte';
  import DoughnutChart from '../lib/components/charts/DoughnutChart.svelte';
  import BarChart from '../lib/components/charts/BarChart.svelte';

  let loading = $state(true);
  let data: any = $state(null);

  onMount(load);

  async function load() {
    loading = true;
    try {
      data = await api.dashboardAnalytics();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      loading = false;
    }
  }

  const kycColors: Record<string, string> = {
    VERIFIED: '#22c55e', PENDING: '#eab308', UNDER_REVIEW: '#f59e0b',
    REJECTED: '#ef4444', SUSPENDED: '#a855f7', EXPIRED: '#6b7280',
    REQUIRES_UPDATE: '#f97316', LIMITED: '#ec4899',
  };

  function sum(arr: any[]) {
    return arr.reduce((a, b) => a + (b.count ?? 0), 0);
  }

  function formatNum(n: number) {
    return n.toLocaleString('fr-FR');
  }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-2xl font-extrabold text-on-surface tracking-tight">Dashboard Analytics</h2>
  <button onclick={load} class="px-4 py-2 rounded-xl text-sm font-semibold bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer border-none text-outline">
    Actualiser
  </button>
</div>

{#if loading}
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    {#each [1,2,3,4] as _}
      <div class="bg-white border border-mint-subtle rounded-xl p-6 animate-pulse">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-mint-subtle"></div>
          <div class="space-y-2 flex-1">
            <div class="h-5 w-16 bg-mint-subtle rounded"></div>
            <div class="h-3 w-24 bg-mint-subtle rounded"></div>
          </div>
        </div>
      </div>
    {/each}
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
    {#each [1,2] as _}
      <div class="bg-white border border-mint-subtle rounded-xl p-6 animate-pulse">
        <div class="h-4 w-32 bg-mint-subtle rounded mb-6"></div>
        <div class="flex items-center gap-6">
          <div class="w-[120px] aspect-square rounded-full bg-mint-subtle"></div>
          <div class="flex-1 space-y-2">
            {#each [1,2,3,4] as _}
              <div class="h-3 bg-mint-subtle rounded"></div>
            {/each}
          </div>
        </div>
      </div>
    {/each}
  </div>
{:else if data}
  <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
    <Card>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><Users size={20} class="text-blue-700" /></div>
        <div><p class="text-2xl font-bold">{formatNum(data.users.total)}</p><p class="text-xs text-outline font-medium">Utilisateurs</p></div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center"><CreditCard size={20} class="text-green-700" /></div>
        <div><p class="text-2xl font-bold">{formatNum(data.customers.total)}</p><p class="text-xs text-outline font-medium">Clients bancaires</p></div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><Activity size={20} class="text-purple-700" /></div>
        <div><p class="text-2xl font-bold">{formatNum(data.transactions.total)}</p><p class="text-xs text-outline font-medium">Transactions</p></div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Bell size={20} class="text-amber-700" /></div>
        <div><p class="text-2xl font-bold">{formatNum(sum(data.notifications))}</p><p class="text-xs text-outline font-medium">Notifications</p></div>
      </div>
    </Card>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">

    <Card>
      <div class="flex items-center gap-2 mb-4"><FileText size={18} class="text-outline" /><h3 class="font-bold text-sm uppercase tracking-wider text-outline">Statut KYC</h3></div>
      {#if data.kyc.length > 0}
        <div class="flex items-stretch gap-6">
          <div class="shrink-0" style="width: 130px; height: 130px">
            <DoughnutChart
              labels={data.kyc.map((k: any) => k.status.replace(/_/g, ' '))}
              values={data.kyc.map((k: any) => k.count)}
              colors={data.kyc.map((k: any) => kycColors[k.status] ?? '#ccc')}
            />
          </div>
          <div class="flex-1 min-w-0 flex flex-col justify-center gap-1">
            {#each data.kyc as kyc}
              <div class="flex items-center justify-between text-xs gap-2">
                <span class="flex items-center gap-1.5 min-w-0">
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background: {kycColors[kyc.status] ?? '#ccc'}"></span>
                  <span class="truncate">{kyc.status.replace(/_/g, ' ')}</span>
                </span>
                <span class="font-semibold whitespace-nowrap">{formatNum(kyc.count)}</span>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <p class="text-sm text-outline text-center py-8">Aucune donnée KYC</p>
      {/if}
    </Card>

    <Card>
      <div class="flex items-center gap-2 mb-4"><BarChart3 size={18} class="text-outline" /><h3 class="font-bold text-sm uppercase tracking-wider text-outline">Notifications par type</h3></div>
      {#if data.notifications.length > 0}
        <div style="height: 220px">
          <BarChart
            labels={data.notifications.map((n: any) => n.type.replace(/_/g, ' '))}
            values={data.notifications.map((n: any) => n.count)}
            color="#3b82f6"
          />
        </div>
      {:else}
        <p class="text-sm text-outline text-center py-8">Aucune notification</p>
      {/if}
    </Card>

  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

    <Card>
      <div class="flex items-center gap-2 mb-4"><GraduationCap size={18} class="text-outline" /><h3 class="font-bold text-sm uppercase tracking-wider text-outline">Éducation financière</h3></div>
      <div class="space-y-1">
        <div class="flex items-center justify-between py-2 border-b border-mint-subtle">
          <span class="text-sm text-outline">Inscrits à un parcours</span>
          <span class="font-bold">{formatNum(data.education.totalEnrolled)}</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-mint-subtle">
          <span class="text-sm text-outline">Parcours complétés</span>
          <span class="font-bold">{formatNum(data.education.completedPaths)}</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-mint-subtle">
          <span class="text-sm text-outline">Taux de complétion</span>
          <span class="font-bold">{data.education.completionRate}%</span>
        </div>
        <div class="flex items-center justify-between py-2">
          <span class="text-sm text-outline">Leçons complétées</span>
          <span class="font-bold">{formatNum(data.education.completedLessons)}</span>
        </div>
      </div>
      {#if data.education.totalEnrolled > 0}
        <div class="mt-4">
          <div class="flex justify-between text-xs text-outline mb-1">
            <span>Taux de complétion</span>
            <span>{data.education.completionRate}%</span>
          </div>
          <div class="w-full h-2 bg-mint-subtle rounded-full overflow-hidden">
            <div class="h-full bg-green-500 rounded-full transition-all" style="width: {data.education.completionRate}%"></div>
          </div>
        </div>
      {/if}
    </Card>

    <Card>
      <div class="flex items-center gap-2 mb-4"><CheckCircle2 size={18} class="text-outline" /><h3 class="font-bold text-sm uppercase tracking-wider text-outline">Quiz</h3></div>
      <div class="space-y-1">
        <div class="flex items-center justify-between py-2 border-b border-mint-subtle">
          <span class="text-sm text-outline">Tentatives complétées</span>
          <span class="font-bold">{formatNum(data.quizzes.total)}</span>
        </div>
        <div class="flex items-center justify-between py-2">
          <span class="text-sm text-outline">Score moyen</span>
          <span class="font-bold">{data.quizzes.averageScore}%</span>
        </div>
      </div>
    </Card>

    <Card>
      <div class="flex items-center gap-2 mb-4"><TrendingUp size={18} class="text-outline" /><h3 class="font-bold text-sm uppercase tracking-wider text-outline">Répartition clients</h3></div>
      {#if data.kyc.length > 0}
        <div style="height: 220px">
          <BarChart
            labels={data.kyc.map((k: any) => k.status.replace(/_/g, ' '))}
            values={data.kyc.map((k: any) => k.count)}
            colors={data.kyc.map((k: any) => kycColors[k.status] ?? '#3a6a00')}
          />
        </div>
      {:else}
        <p class="text-sm text-outline text-center py-8">Aucune donnée</p>
      {/if}
    </Card>

  </div>
{/if}
