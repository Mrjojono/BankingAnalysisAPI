<script lang="ts">
  import { Search, X } from '@lucide/svelte';
  import { api } from '../../lib/api';
  import { toast } from '../../lib/stores/toast.svelte';

  interface Customer {
    id: string;
    firstName: string;
    lastName?: string | null;
    email?: string;
    accountNumber?: string;
  }

  let {
    onSelect,
    placeholder = 'Rechercher un client par nom, email ou n° de compte',
  }: {
    onSelect: (customer: Customer) => void;
    placeholder?: string;
  } = $props();

  let rootEl = $state<HTMLDivElement | null>(null);
  let query = $state('');
  let open = $state(false);
  let suggestions = $state<Customer[]>([]);
  let loading = $state(false);
  let highlight = $state(-1);
  let selected = $state<Customer | null>(null);

  let timer: ReturnType<typeof setTimeout> | undefined;
  let searchSeq = 0;

  function fullName(c: Customer) {
    return `${c.firstName}${c.lastName ? ` ${c.lastName}` : ''}`;
  }

  function onInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    selected = null;
    query = v;
    open = true;
    clearTimeout(timer);
    const seq = ++searchSeq;
    if (v.trim().length < 2) {
      suggestions = [];
      loading = false;
      highlight = -1;
      return;
    }
    loading = true;
    highlight = -1;
    timer = setTimeout(async () => {
      try {
        const res = await api.listCustomers(v.trim(), 1, 8);
        if (seq !== searchSeq) return;
        suggestions = res?.data ?? [];
        highlight = suggestions.length > 0 ? 0 : -1;
        open = true;
      } catch (e: any) {
        if (seq !== searchSeq) return;
        suggestions = [];
        highlight = -1;
        toast.error(e.message);
      } finally {
        if (seq === searchSeq) loading = false;
      }
    }, 300);
  }

  function select(c: Customer) {
    selected = c;
    query = fullName(c);
    suggestions = [];
    highlight = -1;
    open = false;
    onSelect(c);
  }

  function clear() {
    selected = null;
    query = '';
    suggestions = [];
    highlight = -1;
    open = false;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        highlight = (highlight + 1) % suggestions.length;
        open = true;
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        highlight = (highlight - 1 + suggestions.length) % suggestions.length;
        open = true;
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlight >= 0 && suggestions[highlight]) select(suggestions[highlight]);
    } else if (e.key === 'Escape') {
      open = false;
    }
  }

  function onClickWindow(e: MouseEvent) {
    if (rootEl && !rootEl.contains(e.target as Node)) open = false;
  }
</script>

<svelte:window onclick={onClickWindow} />

<div class="relative" bind:this={rootEl}>
  <div class="relative">
    <Search size={18} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
    <input
      bind:value={query}
      oninput={onInput}
      onkeydown={onKeydown}
      placeholder={placeholder}
      aria-label="Rechercher un client"
      autocomplete="off"
      class="w-full pl-10 pr-10 py-2.5 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none transition-all"
    />
    {#if selected || query}
      <button
        onclick={clear}
        aria-label="Effacer"
        class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md cursor-pointer bg-transparent border-none text-outline hover:text-on-surface transition-colors"
      >
        <X size={16} />
      </button>
    {/if}
  </div>

  {#if open}
    <div class="absolute top-full mt-2 w-full z-30 bg-white rounded-xl border border-mint-subtle shadow-lg overflow-hidden">
      {#if loading}
        <div class="flex items-center gap-3 px-4 py-3">
          <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span class="text-sm text-on-surface-variant">Recherche…</span>
        </div>
      {:else if suggestions.length === 0}
        <div class="px-4 py-3 text-sm text-on-surface-variant">
          {query.trim().length < 2 ? 'Saisissez au moins 2 caractères.' : 'Aucun client trouvé.'}
        </div>
      {:else}
        <ul class="max-h-72 overflow-y-auto">
          {#each suggestions as c, i}
            <li>
              <button
                onclick={() => select(c)}
                onmouseenter={() => { highlight = i; }}
                class="w-full text-left px-4 py-2.5 flex items-center gap-3 cursor-pointer border-none bg-transparent transition-colors {i === highlight ? 'bg-surface-container' : ''}"
              >
                <div class="flex-1 min-w-0">
                  <span class="text-sm font-semibold text-on-surface block truncate">{fullName(c)}</span>
                  {#if c.email}
                    <span class="text-xs text-on-surface-variant block truncate">{c.email}</span>
                  {/if}
                </div>
                {#if c.accountNumber}
                  <code class="bg-surface-container px-1.5 py-0.5 rounded text-xs font-mono text-on-surface-variant shrink-0">{c.accountNumber}</code>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>
