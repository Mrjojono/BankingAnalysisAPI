<script lang="ts">
  import { Send, Loader, Bell, Smartphone, CheckCheck, AlertTriangle, Users, Search, X, ChevronLeft, ChevronRight, Mail } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import { toast } from '../lib/stores/toast.svelte';
  import Drawer from '../lib/components/Drawer.svelte';
  import Spinner from '../lib/components/Spinner.svelte';

  let loading = $state(false);
  let sending = $state(false);

  let stats = $state<{ totalNotifications: number; totalPushTokens: number; unreadCount: number } | null>(null);

  let form = $state({
    title: '',
    body: '',
    type: 'ADMIN_BROADCAST',
    severity: 'INFO',
  });

  // Customer selection
  let selectedCustomers = $state<{ id: string; firstName: string; lastName: string | null; email: string }[]>([]);
  let showDrawer = $state(false);
  let searchQuery = $state('');
  let searchResults = $state<any[]>([]);
  let searchTotal = $state(0);
  let searchPage = $state(1);
  let searchLoading = $state(false);
  const PAGE_SIZE = 10;
  let emailInput = $state('');

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const types = [
    { value: 'ADMIN_BROADCAST', label: 'Message admin' },
    { value: 'ADVICE', label: 'Conseil financier' },
    { value: 'EDUCATIONAL', label: 'Éducatif' },
    { value: 'SYSTEM', label: 'Système' },
  ];

  const severities = [
    { value: 'INFO', label: 'Info', icon: Bell },
    { value: 'WARNING', label: 'Attention', icon: AlertTriangle },
    { value: 'CRITICAL', label: 'Critique', icon: AlertTriangle },
  ];

  onMount(async () => {
    await loadStats();
  });

  async function loadStats() {
    loading = true;
    try {
      stats = await api.notificationStats();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      loading = false;
    }
  }

  async function searchCustomers(page = 1) {
    searchLoading = true;
    searchPage = page;
    try {
      const res = await api.listCustomers(searchQuery, page, PAGE_SIZE);
      searchResults = res.data;
      searchTotal = res.total;
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      searchLoading = false;
    }
  }

  function onSearchInput() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => searchCustomers(1), 300);
  }

  function toggleCustomer(customer: any) {
    const idx = selectedCustomers.findIndex((c) => c.id === customer.id);
    if (idx >= 0) {
      selectedCustomers.splice(idx, 1);
    } else {
      selectedCustomers.push({ id: customer.id, firstName: customer.firstName, lastName: customer.lastName, email: customer.email });
    }
  }

  function removeCustomer(id: string) {
    const idx = selectedCustomers.findIndex((c) => c.id === id);
    if (idx >= 0) selectedCustomers.splice(idx, 1);
  }

  function isSelected(id: string) {
    return selectedCustomers.some((c) => c.id === id);
  }

  function handleEmailAdd() {
    const emails = emailInput.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean);
    for (const email of emails) {
      if (!selectedCustomers.some((c) => c.email === email)) {
        selectedCustomers.push({ id: email, firstName: '', lastName: null, email });
      }
    }
    emailInput = '';
  }

  function getCustomerLabel(c: { firstName: string; lastName: string | null; email: string }) {
    if (c.firstName) {
      return `${c.firstName} ${c.lastName ?? ''} <${c.email}>`.trim();
    }
    return c.email;
  }

  async function handleSend() {
    if (!form.title || !form.body) return;
    sending = true;
    try {
      const payload: any = { ...form };
      if (selectedCustomers.length > 0) {
        payload.customerTargets = selectedCustomers.map((c) => c.id);
      }
      const result = await api.broadcastNotification(payload);
      toast.success(result.message || 'Notification diffusée avec succès');
      form.title = '';
      form.body = '';
      selectedCustomers = [];
      await loadStats();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      sending = false;
    }
  }

  function openDrawer() {
    showDrawer = true;
    searchQuery = '';
    searchResults = [];
    searchTotal = 0;
    searchPage = 1;
    searchCustomers(1);
  }
</script>

<div class="space-y-6">
  <h1 class="text-2xl font-bold text-on-surface">Notifications</h1>

  <!-- Stats cards (unchanged) -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="bg-surface rounded-xl border border-mint-subtle p-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center">
          <Bell size={20} class="text-primary" />
        </div>
        <div>
          <p class="text-2xl font-bold text-on-surface">
            {loading ? '...' : stats?.totalNotifications ?? 0}
          </p>
          <p class="text-sm text-on-surface-variant">Total notifications</p>
        </div>
      </div>
    </div>
    <div class="bg-surface rounded-xl border border-mint-subtle p-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center">
          <Smartphone size={20} class="text-primary" />
        </div>
        <div>
          <p class="text-2xl font-bold text-on-surface">
            {loading ? '...' : stats?.totalPushTokens ?? 0}
          </p>
          <p class="text-sm text-on-surface-variant">Appareils push</p>
        </div>
      </div>
    </div>
    <div class="bg-surface rounded-xl border border-mint-subtle p-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <CheckCheck size={20} class="text-amber-700" />
        </div>
        <div>
          <p class="text-2xl font-bold text-on-surface">
            {loading ? '...' : (stats?.totalNotifications ?? 0) - (stats?.unreadCount ?? 0)}
          </p>
          <p class="text-sm text-on-surface-variant">Notifications lues</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Broadcast form -->
  <div class="bg-surface rounded-xl border border-mint-subtle p-6">
    <h2 class="text-lg font-bold text-on-surface mb-4">Diffuser une notification</h2>
    <div class="space-y-4">
      <div>
        <label for="title" class="block text-sm font-medium text-on-surface-variant mb-1">Titre</label>
        <input
          id="title"
          bind:value={form.title}
          placeholder="Titre de la notification"
          class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label for="body" class="block text-sm font-medium text-on-surface-variant mb-1">Message</label>
        <textarea
          id="body"
          bind:value={form.body}
          placeholder="Corps du message"
          rows="4"
          class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        ></textarea>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label for="type" class="block text-sm font-medium text-on-surface-variant mb-1">Type</label>
          <select
            id="type"
            bind:value={form.type}
            class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {#each types as t}
              <option value={t.value}>{t.label}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="severity" class="block text-sm font-medium text-on-surface-variant mb-1">Sévérité</label>
          <select
            id="severity"
            bind:value={form.severity}
            class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {#each severities as s}
              <option value={s.value}>{s.label}</option>
            {/each}
          </select>
        </div>
      </div>

      <!-- Customer targeting -->
      <div class="pt-2">
        <button
          onclick={openDrawer}
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface font-medium hover:bg-surface-container transition-all cursor-pointer"
        >
          <Users size={18} />
          Cibler des clients
          {#if selectedCustomers.length > 0}
            <span class="ml-1 px-2 py-0.5 rounded-full bg-primary text-on-primary text-xs font-bold">{selectedCustomers.length}</span>
          {/if}
        </button>

        {#if selectedCustomers.length > 0}
          <div class="flex flex-wrap gap-2 mt-3">
            {#each selectedCustomers as c (c.id)}
              <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-container text-primary text-sm font-medium">
                {getCustomerLabel(c)}
                <button onclick={() => removeCustomer(c.id)} class="cursor-pointer border-none p-0.5 hover:text-error transition-colors">
                  <X size={14} />
                </button>
              </span>
            {/each}
          </div>
        {/if}
      </div>

      <div class="flex items-center gap-2 pt-2">
        <button
          onclick={handleSend}
          disabled={sending || !form.title || !form.body}
          class="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer border-none"
        >
          {#if sending}
            <Loader size={18} class="animate-spin" />
          {:else}
            <Send size={18} />
          {/if}
          {sending ? 'Envoi...' : 'Diffuser'}
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Customer selection drawer -->
<Drawer open={showDrawer} title="Sélectionner des clients" widthClass="max-w-xl" onclose={() => showDrawer = false}>
  {#snippet children()}
    <div class="space-y-4">
      <!-- Search -->
      <div class="relative">
        <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
        <input
          bind:value={searchQuery}
          oninput={onSearchInput}
          placeholder="Rechercher par nom, email ou numéro de compte..."
          class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <!-- Email input -->
      <div>
        <label class="block text-sm font-medium text-on-surface-variant mb-1">Ou saisir des emails</label>
        <div class="flex gap-2">
          <input
            bind:value={emailInput}
            placeholder="emails séparés par des virgules"
            class="flex-1 px-4 py-2 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onclick={handleEmailAdd}
            disabled={!emailInput.trim()}
            class="px-4 py-2 rounded-xl bg-primary text-on-primary font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer border-none"
          >
            <Mail size={18} />
          </button>
        </div>
      </div>

      <!-- Selected count -->
      <p class="text-sm text-on-surface-variant">
        {selectedCustomers.length} client{selectedCustomers.length !== 1 ? 's' : ''} sélectionné{selectedCustomers.length !== 1 ? 's' : ''}
      </p>

      <!-- Results -->
      {#if searchLoading}
        <Spinner text="Recherche..." />
      {:else if searchResults.length === 0}
        <p class="text-center text-outline py-8">Aucun client trouvé</p>
      {:else}
        <ul class="space-y-1">
          {#each searchResults as c (c.id)}
            <li>
              <button
                onclick={() => toggleCustomer(c)}
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer text-left {isSelected(c.id) ? 'border-primary bg-primary-container/20' : 'border-mint-subtle hover:bg-surface-container'}"
              >
                <div class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0"
                  class:border-primary={isSelected(c.id)}
                  class:border-outline={!isSelected(c.id)}
                >
                  {#if isSelected(c.id)}
                    <div class="w-3 h-3 rounded-sm bg-primary"></div>
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-on-surface truncate">
                    {c.firstName} {c.lastName ?? ''}
                  </p>
                  <p class="text-xs text-on-surface-variant truncate">{c.email} · {c.accountNumber}</p>
                </div>
              </button>
            </li>
          {/each}
        </ul>

        <!-- Pagination -->
        {#if searchTotal > PAGE_SIZE}
          <div class="flex items-center justify-between pt-2">
            <button
              onclick={() => searchCustomers(searchPage - 1)}
              disabled={searchPage <= 1}
              class="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-none"
            >
              <ChevronLeft size={16} /> Précédent
            </button>
            <span class="text-sm text-on-surface-variant">
              Page {searchPage} / {Math.ceil(searchTotal / PAGE_SIZE)}
            </span>
            <button
              onclick={() => searchCustomers(searchPage + 1)}
              disabled={searchPage >= Math.ceil(searchTotal / PAGE_SIZE)}
              class="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-none"
            >
              Suivant <ChevronRight size={16} />
            </button>
          </div>
        {/if}
      {/if}
    </div>
  {/snippet}
</Drawer>
