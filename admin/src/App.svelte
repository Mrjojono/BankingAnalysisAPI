<script lang="ts">
  import { onMount } from 'svelte';
  import AppLayout from './lib/components/AppLayout.svelte';
  import Spinner from './lib/components/Spinner.svelte';
  import Landing from './pages/Landing.svelte';
  import Products from './pages/Products.svelte';
  import Rules from './pages/Rules.svelte';
  import Catalog from './pages/Catalog.svelte';
  import Glossary from './pages/Glossary.svelte';
  import Docs from './pages/Docs.svelte';
  import Login from './pages/Login.svelte';
  import CentreIA from './pages/CentreIA.svelte';
  import Graph from './pages/Graph.svelte';
  import Notifications from './pages/Notifications.svelte';
  import Education from './pages/Education.svelte';
  import Users from './pages/Users.svelte';
  import Logs from './pages/Logs.svelte';
  import DashboardAnalytics from './pages/DashboardAnalytics.svelte';
  import Eligibility from './pages/Eligibility.svelte';
import Sms from './pages/Sms.svelte';
import Pipeline from './pages/Pipeline.svelte';
import Clients from './pages/Clients.svelte';
import Monitoring from './pages/Monitoring.svelte';
import { getAuth, checkAuth } from './lib/stores/auth.svelte';

  const auth = getAuth();
  let page = $state('products');
  let showLogin = $state(false);
  let graphProductId = $state<string | null>(null);
  let graphRuleId = $state<string | null>(null);
  let eligibilityCustomer = $state<any>(null);
  let initializing = $state(true);

  onMount(async () => {
    const ok = await checkAuth();
    if (!ok) auth.user = null;
    initializing = false;
  });

  function handleLogin() {
    if (!auth.user) {
      showLogin = false;
      page = 'products';
    }
  }

  function handleNavigate(p: string, productId?: string | null, ruleId?: string | null) {
    if (p === 'graph') {
      graphProductId = productId ?? null;
      graphRuleId = ruleId ?? null;
    }
    page = p;
  }

  function handleEligibility(customer: any) {
    eligibilityCustomer = customer;
    page = 'eligibility';
  }
</script>

{#if initializing}
  <div class="min-h-screen bg-background flex items-center justify-center">
    <Spinner text="Vérification de la session..." size="lg" />
  </div>
{:else if !auth.user && !showLogin}
  <Landing onlogin={() => showLogin = true} />
{:else if !auth.user && showLogin}
  <Login onlogin={handleLogin} />
{:else}
  <AppLayout {page} onNavigate={handleNavigate}>
    {#if page === 'products'}
      <Products onNavigate={handleNavigate} />
    {:else if page === 'rules'}
      <Rules onNavigate={handleNavigate} />
    {:else if page === 'catalog'}
      <Catalog />
    {:else if page === 'centreIA'}
      <CentreIA />
    {:else if page === 'graph'}
      <Graph productId={graphProductId} ruleId={graphRuleId} onNavigate={handleNavigate} />
    {:else if page === 'glossary'}
      <Glossary />
    {:else if page === 'docs'}
      <Docs />
    {:else if page === 'notifications'}
      <Notifications />
    {:else if page === 'education'}
      <Education />
    {:else if page === 'users'}
      <Users />
    {:else if page === 'logs'}
      <Logs />
    {:else if page === 'dashboard'}
      <DashboardAnalytics />
    {:else if page === 'eligibility'}
      <Eligibility initialCustomer={eligibilityCustomer} />
    {:else if page === 'sms'}
      <Sms onNavigate={handleNavigate} />
    {:else if page === 'pipeline'}
      <Pipeline />
    {:else if page === 'clients'}
      <Clients onEligibility={handleEligibility} />
    {:else if page === 'monitoring'}
      <Monitoring />
    {/if}
  </AppLayout>
{/if}
