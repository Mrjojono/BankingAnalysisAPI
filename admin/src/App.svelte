<script lang="ts">
  import { ChevronRight, Calendar, PanelLeftClose, PanelLeft } from '@lucide/svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import Products from './pages/Products.svelte';
  import Rules from './pages/Rules.svelte';
  import Catalog from './pages/Catalog.svelte';
  import Glossary from './pages/Glossary.svelte';
  import Login from './pages/Login.svelte';
  import Classifier from './pages/Classifier.svelte';
  import Embedding from './pages/Embedding.svelte';
  import Training from './pages/Training.svelte';

  let page = $state('products');
  let sidebarCollapsed = $state(false);

  function today() {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  let isAuthenticated = $state(true);

   function logout() {
    isAuthenticated = false;
  }
</script>


{#if !isAuthenticated}
  <Login onlogin={() => isAuthenticated = true} />
{:else}
<div class="flex h-screen bg-background text-on-surface antialiased overflow-hidden">
  <Sidebar {logout} {page} bind:collapsed={sidebarCollapsed} onNavigate={(p) => page = p} />


  <div class="flex-1 flex flex-col overflow-hidden">
    <header class="h-16 bg-surface border-b border-mint-subtle flex items-center justify-between px-8 shrink-0">
      <div class="flex items-center gap-1 text-sm">
        <button
          onclick={() => sidebarCollapsed = !sidebarCollapsed}
          class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-all cursor-pointer border-none text-on-surface-variant"
          title={sidebarCollapsed ? 'Déplier le menu' : 'Replier le menu'}
        >
          {#if sidebarCollapsed}
            <PanelLeft size={20} />
          {:else}
            <PanelLeftClose size={20} />
          {/if}
        </button>
        <span class="text-on-surface-variant ml-1">Monitoring</span>
        <ChevronRight size={16} class="text-outline" />
        <span class="font-semibold text-on-surface">
          {page === 'products' ? 'Produits' : page === 'rules' ? 'Règles' : page === 'catalog' ? 'Messages' : page === 'classifier' ? 'Classifieur' : page === 'embedding' ? 'Embeddings' : page === 'training' ? 'Entraînement' : 'Lexique'}
        </span>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low border border-mint-subtle rounded-full text-sm font-medium text-on-surface-variant">
          <Calendar size={18} class="text-outline" />
          {today()}
        </div>
      </div>
    </header>


      <main class="flex-1 overflow-y-auto p-8 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#dfe4d8] [&::-webkit-scrollbar-thumb]:rounded-full">
        {#if page === 'products'}
          <Products />
        {:else if page === 'rules'}
          <Rules />
        {:else if page === 'catalog'}
          <Catalog />
        {:else if page === 'classifier'}
          <Classifier />
        {:else if page === 'embedding'}
          <Embedding />
        {:else if page === 'training'}
          <Training />
        {:else if page === 'glossary'}
          <Glossary />
        {/if}
      </main>
  </div>
</div>
{/if}
