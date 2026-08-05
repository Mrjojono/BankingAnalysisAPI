<script lang="ts">
  import { Send, Loader, Bell, Smartphone, CheckCheck, AlertTriangle, Users, Search, X, ChevronLeft, ChevronRight, Mail, Trash2, Clock, Plus, RefreshCw, Calendar } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import { toast } from '../lib/stores/toast.svelte';
  import Drawer from '../lib/components/Drawer.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import Spinner from '../lib/components/Spinner.svelte';

  let loading = $state(false);
  let sending = $state(false);
  let tab = $state<'broadcast' | 'scheduled'>('broadcast');

  let stats = $state<{ totalNotifications: number; totalPushTokens: number; unreadCount: number; totalScheduled: number } | null>(null);

  // ---- Broadcast form ----
  let form = $state({
    title: '',
    body: '',
    type: 'ADMIN_BROADCAST',
    severity: 'INFO',
  });

  // Customer selection for broadcast
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

  // ---- Scheduled notifications ----
  let scheduledList = $state<any[]>([]);
  let scheduledLoading = $state(false);
  let scheduledDrawerOpen = $state(false);
  let editingScheduled = $state<any | null>(null);

  const recurrenceOptions = [
    { value: '', label: 'Une seule fois' },
    { value: 'DAILY', label: 'Chaque jour' },
    { value: 'WEEKLY', label: 'Chaque semaine' },
    { value: 'MONTHLY', label: 'Chaque mois' },
  ];

  const targetTypes = [
    { value: 'all', label: 'Tous les utilisateurs' },
    { value: 'user_ids', label: 'IDs utilisateurs' },
    { value: 'customer_targets', label: 'Clients (IDs ou emails)' },
  ];

  // ---- Purge ----
  let confirm = $state<{ title: string; message: string; action: () => void } | null>(null);

  function ask(title: string, message: string, action: () => void) {
    confirm = { title, message, action };
  }

  function cancelConfirm() { confirm = null; }
  function execConfirm() { confirm?.action(); confirm = null; }

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

  // ---- Broadcast ----
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
    if (c.firstName) return `${c.firstName} ${c.lastName ?? ''} <${c.email}>`.trim();
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

  // ---- Purge ----
  function openPurgeConfirm() {
    ask(
      'Purger les notifications ?',
      'Toutes les notifications seront supprimées définitivement. Cette action est irréversible.',
      async () => {
        try {
          const result = await api.purgeNotifications();
          toast.success(result.message || 'Notifications purgées');
          await loadStats();
        } catch (e: any) {
          toast.error(e.message);
        }
      },
    );
  }

  // ---- Scheduled ----
  async function loadScheduled() {
    scheduledLoading = true;
    try {
      scheduledList = await api.listScheduled();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      scheduledLoading = false;
    }
  }

  function openScheduledForm(s?: any) {
    if (s) {
      editingScheduled = {
        ...s,
        scheduledAt: s.scheduledAt ? s.scheduledAt.slice(0, 16) : '',
      };
    } else {
      editingScheduled = {
        title: '',
        body: '',
        type: 'ADMIN_BROADCAST',
        severity: 'INFO',
        scheduledAt: '',
        recurrence: '',
        targetType: 'all',
        targetIds: undefined,
      };
    }
    scheduledDrawerOpen = true;
  }

  async function saveScheduled() {
    if (!editingScheduled) return;
    const isUpdate = !!editingScheduled.id;
    try {
      const data: any = {
        title: editingScheduled.title,
        body: editingScheduled.body,
        type: editingScheduled.type,
        severity: editingScheduled.severity,
        scheduledAt: new Date(editingScheduled.scheduledAt).toISOString(),
        recurrence: editingScheduled.recurrence || undefined,
        targetType: editingScheduled.targetType,
      };

      if (editingScheduled.targetIds?.length > 0) {
        data.targetIds = editingScheduled.targetIds
          .split(/[\n,;]+/)
          .map((s: string) => s.trim())
          .filter(Boolean);
      }

      if (isUpdate) {
        await api.updateScheduled(editingScheduled.id, data);
        toast.success('Notification programmée modifiée');
      } else {
        await api.createScheduled(data);
        toast.success('Notification programmée créée');
      }
      scheduledDrawerOpen = false;
      editingScheduled = null;
      await loadScheduled();
      await loadStats();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function deleteScheduled(id: string) {
    ask(
      'Supprimer cette programmation ?',
      'Cette notification programmée sera supprimée définitivement.',
      async () => {
        try {
          await api.deleteScheduled(id);
          toast.success('Programmation supprimée');
          scheduledList = scheduledList.filter((s) => s.id !== id);
        } catch (e: any) {
          toast.error(e.message);
        }
      },
    );
  }

  function toggleActive(item: any) {
    api.updateScheduled(item.id, { active: !item.active }).then(() => {
      item.active = !item.active;
      toast.success(item.active ? 'Programmation activée' : 'Programmation désactivée');
    }).catch((e: any) => toast.error(e.message));
  }

  function formatDate(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  const recurrenceLabels: Record<string, string> = {
    DAILY: 'Chaque jour',
    WEEKLY: 'Chaque semaine',
    MONTHLY: 'Chaque mois',
  };

  const targetLabels: Record<string, string> = {
    all: 'Tous',
    user_ids: 'IDs utilisateurs',
    customer_targets: 'Clients',
  };
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-on-surface">Notifications</h1>
    <button
      onclick={openPurgeConfirm}
      class="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-all cursor-pointer"
    >
      <Trash2 size={16} />
      Purger
    </button>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div class="bg-surface rounded-xl border border-mint-subtle p-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center">
          <Bell size={20} class="text-primary" />
        </div>
        <div>
          <p class="text-2xl font-bold text-on-surface">{loading ? '...' : stats?.totalNotifications ?? 0}</p>
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
          <p class="text-2xl font-bold text-on-surface">{loading ? '...' : stats?.totalPushTokens ?? 0}</p>
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
          <p class="text-2xl font-bold text-on-surface">{loading ? '...' : (stats?.totalNotifications ?? 0) - (stats?.unreadCount ?? 0)}</p>
          <p class="text-sm text-on-surface-variant">Notifications lues</p>
        </div>
      </div>
    </div>
    <div class="bg-surface rounded-xl border border-mint-subtle p-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center">
          <Clock size={20} class="text-primary" />
        </div>
        <div>
          <p class="text-2xl font-bold text-on-surface">{loading ? '...' : stats?.totalScheduled ?? 0}</p>
          <p class="text-sm text-on-surface-variant">Programmées</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="flex gap-1 border-b border-mint-subtle">
    <button
      onclick={() => tab = 'broadcast'}
      class="px-5 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer bg-transparent {-tab === 'broadcast' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}"
    >
      <Send size={16} class="inline mr-1.5" />
      Diffuser
    </button>
    <button
      onclick={() => { tab = 'scheduled'; loadScheduled(); }}
      class="px-5 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer bg-transparent {-tab === 'scheduled' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}"
    >
      <Clock size={16} class="inline mr-1.5" />
      Programmées
    </button>
  </div>

  {#if tab === 'broadcast'}
    <!-- Broadcast form -->
    <div class="bg-surface rounded-xl border border-mint-subtle p-6">
      <div class="space-y-4">
        <div>
          <label for="title" class="block text-sm font-medium text-on-surface-variant mb-1">Titre</label>
          <input id="title" bind:value={form.title} placeholder="Titre de la notification"
            class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label for="body" class="block text-sm font-medium text-on-surface-variant mb-1">Message</label>
          <textarea id="body" bind:value={form.body} placeholder="Corps du message" rows="4"
            class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary resize-none"></textarea>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label for="type" class="block text-sm font-medium text-on-surface-variant mb-1">Type</label>
            <select id="type" bind:value={form.type}
              class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary">
              {#each types as t}
                <option value={t.value}>{t.label}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="severity" class="block text-sm font-medium text-on-surface-variant mb-1">Sévérité</label>
            <select id="severity" bind:value={form.severity}
              class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary">
              {#each severities as s}
                <option value={s.value}>{s.label}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="pt-2">
          <button onclick={openDrawer}
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface font-medium hover:bg-surface-container transition-all cursor-pointer">
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
          <button onclick={handleSend} disabled={sending || !form.title || !form.body}
            class="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer border-none">
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
  {:else}
    <!-- Scheduled tab -->
    <div class="bg-surface rounded-xl border border-mint-subtle p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-on-surface">Notifications programmées</h2>
        <button onclick={() => openScheduledForm()}
          class="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary-hover transition-all cursor-pointer border-none">
          <Plus size={16} />
          Nouvelle
        </button>
      </div>

      {#if scheduledLoading}
        <Spinner text="Chargement..." />
      {:else if scheduledList.length === 0}
        <p class="text-center text-outline py-12">Aucune notification programmée</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-mint-subtle text-left text-on-surface-variant">
                <th class="pb-3 font-medium">Titre</th>
                <th class="pb-3 font-medium">Programmée le</th>
                <th class="pb-3 font-medium">Répétition</th>
                <th class="pb-3 font-medium">Cible</th>
                <th class="pb-3 font-medium">Type</th>
                <th class="pb-3 font-medium">Statut</th>
                <th class="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each scheduledList as item (item.id)}
                <tr class="border-b border-mint-subtle/50 hover:bg-surface-container/30 transition-colors">
                  <td class="py-3 pr-4">
                    <p class="font-medium text-on-surface">{item.title}</p>
                    <p class="text-xs text-on-surface-variant truncate max-w-xs">{item.body}</p>
                  </td>
                  <td class="py-3 pr-4 whitespace-nowrap text-on-surface-variant">{formatDate(item.scheduledAt)}</td>
                  <td class="py-3 pr-4 whitespace-nowrap text-on-surface-variant">{recurrenceLabels[item.recurrence] ?? '—'}</td>
                  <td class="py-3 pr-4 whitespace-nowrap text-on-surface-variant">{targetLabels[item.targetType] ?? item.targetType}</td>
                  <td class="py-3 pr-4 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-container/30 text-primary">{item.type}</span>
                  </td>
                  <td class="py-3 pr-4 whitespace-nowrap">
                    <button onclick={() => toggleActive(item)}
                      class="px-2.5 py-1 rounded-full text-xs font-medium border-none cursor-pointer transition-colors {item.active ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}">
                      {item.active ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td class="py-3 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1">
                      <button onclick={() => openScheduledForm(item)}
                        class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer border-none">
                        <RefreshCw size={14} />
                      </button>
                      <button onclick={() => deleteScheduled(item.id)}
                        class="p-2 rounded-lg text-error hover:bg-red-50 transition-all cursor-pointer border-none">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Confirm dialog -->
{#if confirm}
  <ConfirmDialog open={true} title={confirm.title} message={confirm.message} onconfirm={execConfirm} oncancel={cancelConfirm} />
{/if}

<!-- Customer selection drawer -->
<Drawer open={showDrawer} title="Sélectionner des clients" widthClass="max-w-xl" onclose={() => showDrawer = false}>
  {#snippet children()}
    <div class="space-y-4">
      <div class="relative">
        <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
        <input bind:value={searchQuery} oninput={onSearchInput} placeholder="Rechercher par nom, email ou numéro de compte..."
          class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <label class="block text-sm font-medium text-on-surface-variant mb-1" for="notif-email-input">Ou saisir des emails</label>
        <div class="flex gap-2">
          <input id="notif-email-input" bind:value={emailInput} placeholder="emails séparés par des virgules"
            class="flex-1 px-4 py-2 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary" />
          <button onclick={handleEmailAdd} disabled={!emailInput.trim()}
            class="px-4 py-2 rounded-xl bg-primary text-on-primary font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer border-none">
            <Mail size={18} />
          </button>
        </div>
      </div>
      <p class="text-sm text-on-surface-variant">
        {selectedCustomers.length} client{selectedCustomers.length !== 1 ? 's' : ''} sélectionné{selectedCustomers.length !== 1 ? 's' : ''}
      </p>
      {#if searchLoading}
        <Spinner text="Recherche..." />
      {:else if searchResults.length === 0}
        <p class="text-center text-outline py-8">Aucun client trouvé</p>
      {:else}
        <ul class="space-y-1">
          {#each searchResults as c (c.id)}
            <li>
              <button onclick={() => toggleCustomer(c)}
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer text-left {isSelected(c.id) ? 'border-primary bg-primary-container/20' : 'border-mint-subtle hover:bg-surface-container'}">
                <div class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0"
                  class:border-primary={isSelected(c.id)} class:border-outline={!isSelected(c.id)}>
                  {#if isSelected(c.id)}
                    <div class="w-3 h-3 rounded-sm bg-primary"></div>
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-on-surface truncate">{c.firstName} {c.lastName ?? ''}</p>
                  <p class="text-xs text-on-surface-variant truncate">{c.email} · {c.accountNumber}</p>
                </div>
              </button>
            </li>
          {/each}
        </ul>
        {#if searchTotal > PAGE_SIZE}
          <div class="flex items-center justify-between pt-2">
            <button onclick={() => searchCustomers(searchPage - 1)} disabled={searchPage <= 1}
              class="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-none">
              <ChevronLeft size={16} /> Précédent
            </button>
            <span class="text-sm text-on-surface-variant">Page {searchPage} / {Math.ceil(searchTotal / PAGE_SIZE)}</span>
            <button onclick={() => searchCustomers(searchPage + 1)} disabled={searchPage >= Math.ceil(searchTotal / PAGE_SIZE)}
              class="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-none">
              Suivant <ChevronRight size={16} />
            </button>
          </div>
        {/if}
      {/if}
    </div>
  {/snippet}
</Drawer>

<!-- Scheduled form drawer -->
<Drawer open={scheduledDrawerOpen} title={editingScheduled?.id ? 'Modifier la programmation' : 'Nouvelle programmation'} widthClass="max-w-lg" onclose={() => { scheduledDrawerOpen = false; editingScheduled = null; }}>
  {#snippet children()}
    {#if editingScheduled}
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-on-surface-variant mb-1" for="sched-title">Titre</label>
          <input id="sched-title" bind:value={editingScheduled.title} placeholder="Titre"
            class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label class="block text-sm font-medium text-on-surface-variant mb-1" for="sched-body">Message</label>
          <textarea id="sched-body" bind:value={editingScheduled.body} placeholder="Corps du message" rows="3"
            class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary resize-none"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-on-surface-variant mb-1" for="sched-type">Type</label>
            <select id="sched-type" bind:value={editingScheduled.type}
              class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary">
              {#each types as t}
                <option value={t.value}>{t.label}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-on-surface-variant mb-1" for="sched-severity">Sévérité</label>
            <select id="sched-severity" bind:value={editingScheduled.severity}
              class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary">
              {#each severities as s}
                <option value={s.value}>{s.label}</option>
              {/each}
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-on-surface-variant mb-1" for="sched-date">Date de livraison</label>
          <input id="sched-date" type="datetime-local" bind:value={editingScheduled.scheduledAt}
            class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label class="block text-sm font-medium text-on-surface-variant mb-1" for="sched-recurrence">Répétition</label>
          <select id="sched-recurrence" bind:value={editingScheduled.recurrence}
            class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary">
            {#each recurrenceOptions as r}
              <option value={r.value}>{r.label}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-on-surface-variant mb-1" for="sched-target">Cible</label>
          <select id="sched-target" bind:value={editingScheduled.targetType}
            class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            onchange={() => { editingScheduled.targetIds = ''; }}>
            {#each targetTypes as t}
              <option value={t.value}>{t.label}</option>
            {/each}
          </select>
        </div>
        {#if editingScheduled.targetType !== 'all'}
          <div>
            <label class="block text-sm font-medium text-on-surface-variant mb-1" for="sched-targetids">
              {editingScheduled.targetType === 'user_ids' ? 'IDs utilisateurs' : 'IDs ou emails clients'}
            </label>
            <textarea id="sched-targetids" bind:value={editingScheduled.targetIds} placeholder="Un par ligne" rows="3"
              class="w-full px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary resize-none"></textarea>
          </div>
        {/if}
        <div class="flex justify-end gap-2 pt-2">
          <button onclick={() => { scheduledDrawerOpen = false; editingScheduled = null; }}
            class="px-4 py-2.5 rounded-xl border border-mint-subtle text-on-surface font-medium hover:bg-surface-container transition-all cursor-pointer bg-transparent">
            Annuler
          </button>
          <button onclick={saveScheduled} disabled={!editingScheduled.title || !editingScheduled.body || !editingScheduled.scheduledAt}
            class="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer border-none">
            {editingScheduled?.id ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>
    {/if}
  {/snippet}
</Drawer>
