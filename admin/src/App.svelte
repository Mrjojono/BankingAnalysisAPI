<script lang="ts">
  import { onMount } from 'svelte';
  import AppLayout from './lib/components/AppLayout.svelte';
  import Spinner from './lib/components/Spinner.svelte';
  import Products from './pages/Products.svelte';
  import Rules from './pages/Rules.svelte';
  import Catalog from './pages/Catalog.svelte';
  import Glossary from './pages/Glossary.svelte';
  import Docs from './pages/Docs.svelte';
  import Login from './pages/Login.svelte';
  import Classifier from './pages/Classifier.svelte';
  import Embedding from './pages/Embedding.svelte';
  import Training from './pages/Training.svelte';
  import Graph from './pages/Graph.svelte';
  import Notifications from './pages/Notifications.svelte';
  import Education from './pages/Education.svelte';
  import { getAuth, checkAuth } from './lib/stores/auth.svelte';

  const auth = getAuth();
  let page = $state('products');
  let graphProductId = $state<string | null>(null);
  let graphRuleId = $state<string | null>(null);
  let initializing = $state(true);

  onMount(async () => {
    const ok = await checkAuth();
    if (!ok) auth.user = null;
    initializing = false;
  });

  function handleLogin() {
    if (!auth.user) {
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
</script>

{#if initializing}
  <div class="min-h-screen bg-background flex items-center justify-center">
    <Spinner text="Vérification de la session..." size="lg" />
  </div>
{:else if !auth.user}
  <Login onlogin={handleLogin} />
{:else}
  <AppLayout {page} onNavigate={handleNavigate}>
    {#if page === 'products'}
      <Products onNavigate={handleNavigate} />
    {:else if page === 'rules'}
      <Rules onNavigate={handleNavigate} />
    {:else if page === 'catalog'}
      <Catalog />
    {:else if page === 'classifier'}
      <Classifier />
    {:else if page === 'embedding'}
      <Embedding />
    {:else if page === 'training'}
      <Training />
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
    {/if}
  </AppLayout>
{/if}
