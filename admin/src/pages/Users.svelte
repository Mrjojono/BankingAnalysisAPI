<script lang="ts">
  import { onMount } from 'svelte';
  import { Search, ChevronLeft, ChevronRight, Shield, ShieldOff, Trash2, XCircle, Key, UserCheck, UserX, LogOut, Eye, Loader, AlertTriangle } from '@lucide/svelte';
  import { api } from '../lib/api';
  import { toast } from '../lib/stores/toast.svelte';
  import Card from '../lib/components/Card.svelte';
  import Spinner from '../lib/components/Spinner.svelte';
  import Badge from '../lib/components/Badge.svelte';
  import Drawer from '../lib/components/Drawer.svelte';
  import Input from '../lib/components/Input.svelte';
  import Button from '../lib/components/Button.svelte';

  type UserRow = {
    id: string; email: string; role: string; status: string;
    emailVerifiedAt: string | null; lastLoginAt: string | null;
    loginCount: number; createdAt: string;
  };

  type BankConnection = { id: string; role: string; bankCustomer: { id: string; firstName: string; lastName: string; accountNumber: string; customerCode: string } };

  type UserDetail = UserRow & {
    mfaEnabled: boolean; updatedAt: string; deletedAt: string | null;
    _count: { sessions: number; notifications: number; pushTokens: number };
    bankConnections?: BankConnection[];
  };

  type Session = { id: string; userAgent: string | null; ipAddress: string | null; createdAt: string; expiresAt: string };

  let loading = $state(false);
  let users: UserRow[] = $state([]);
  let total = $state(0);
  let page = $state(1);
  let pageSize = 15;
  let search = $state('');
  let roleFilter = $state('');
  let statusFilter = $state('');

  let selectedUser: UserDetail | null = $state(null);
  let userSessions: Session[] = $state([]);
  let detailLoading = $state(false);
  let sessionsLoading = $state(false);
  let showDrawer = $state(false);
  let updating = $state(false);
  let deleting = $state(false);
  let revokingSessions = $state(false);
  let confirmDelete = $state<string | null>(null);

  const roles = ['CLIENT', 'AGENT', 'ADMIN', 'SUPER_ADMIN'];
  const statuses = ['ACTIVE', 'SUSPENDED', 'BANNED'];

  onMount(() => loadUsers());

  async function loadUsers(p?: number) {
    if (p !== undefined) page = p;
    loading = true;
    try {
      const res = await api.listUsers({ q: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined, page, limit: pageSize });
      users = res.data;
      total = res.total;
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      loading = false;
    }
  }

  function onSearchInput() {
    page = 1;
    loadUsers(1);
  }

  async function openDetail(id: string) {
    showDrawer = true;
    detailLoading = true;
    sessionsLoading = true;
    selectedUser = null;
    userSessions = [];
    try {
      const [user, sessions] = await Promise.all([
        api.getUser(id),
        api.getUserSessions(id),
      ]);
      selectedUser = user;
      userSessions = sessions;
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      detailLoading = false;
      sessionsLoading = false;
    }
  }

  async function changeRole(userId: string, role: string) {
    updating = true;
    try {
      await api.updateUser(userId, { role });
      toast.success('Rôle modifié');
      if (selectedUser?.id === userId) selectedUser = { ...selectedUser!, role };
      loadUsers();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      updating = false;
    }
  }

  async function changeStatus(userId: string, status: string) {
    updating = true;
    try {
      await api.updateUser(userId, { status });
      toast.success(`Statut → ${status}`);
      if (selectedUser?.id === userId) selectedUser = { ...selectedUser!, status };
      loadUsers();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      updating = false;
    }
  }

  async function handleDelete(userId: string) {
    deleting = true;
    try {
      await api.deleteUser(userId);
      toast.success('Compte application supprimé');
      confirmDelete = null;
      showDrawer = false;
      loadUsers();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      deleting = false;
    }
  }

  async function handleRevokeSessions(userId: string) {
    revokingSessions = true;
    try {
      const res = await api.revokeUserSessions(userId);
      toast.success(res.message);
      userSessions = [];
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      revokingSessions = false;
    }
  }

  const totalPages = $derived(Math.ceil(total / pageSize));

  function roleBadge(role: string) {
    const colors: Record<string, string> = { CLIENT: '', AGENT: 'bg-amber-100 text-amber-800', ADMIN: 'bg-blue-100 text-blue-800', SUPER_ADMIN: 'bg-purple-100 text-purple-800' };
    return colors[role] ?? '';
  }

  function statusBadge(status: string) {
    const colors: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-800', SUSPENDED: 'bg-yellow-100 text-yellow-800', BANNED: 'bg-red-100 text-red-800' };
    return colors[status] ?? '';
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-2xl font-extrabold text-on-surface tracking-tight">Utilisateurs</h2>
  <span class="text-sm text-outline font-medium">{total} utilisateur{total !== 1 ? 's' : ''}</span>
</div>

<Card>
  <div class="flex flex-wrap items-center gap-3 mb-4">
    <div class="relative flex-1 min-w-[200px]">
      <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
      <input
        bind:value={search}
        oninput={onSearchInput}
        placeholder="Rechercher par email…"
        class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
    <select bind:value={roleFilter} onchange={onSearchInput} class="px-3 py-2.5 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
      <option value="">Tous les rôles</option>
      {#each roles as r}
        <option value={r}>{r}</option>
      {/each}
    </select>
    <select bind:value={statusFilter} onchange={onSearchInput} class="px-3 py-2.5 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
      <option value="">Tous les statuts</option>
      {#each statuses as s}
        <option value={s}>{s}</option>
      {/each}
    </select>
  </div>

  {#if loading}
    <div class="flex justify-center py-12"><Spinner text="Chargement…" /></div>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-mint-subtle text-left text-outline font-semibold">
            <th class="pb-3 pr-4">Email</th>
            <th class="pb-3 pr-4">Rôle</th>
            <th class="pb-3 pr-4">Statut</th>
            <th class="pb-3 pr-4">Dernière connexion</th>
            <th class="pb-3 pr-4">Connexions</th>
            <th class="pb-3 pr-4">Inscrit le</th>
            <th class="pb-3"></th>
          </tr>
        </thead>
        <tbody>
          {#each users as user (user.id)}
            <tr class="border-b border-mint-subtle hover:bg-surface-container-low transition-colors">
              <td class="py-3 pr-4 font-medium">{user.email}</td>
              <td class="py-3 pr-4"><span class="px-2.5 py-0.5 rounded-full text-xs font-semibold {roleBadge(user.role)}">{user.role}</span></td>
              <td class="py-3 pr-4"><span class="px-2.5 py-0.5 rounded-full text-xs font-semibold {statusBadge(user.status)}">{user.status}</span></td>
              <td class="py-3 pr-4 text-outline">{formatDate(user.lastLoginAt)}</td>
              <td class="py-3 pr-4 text-outline">{user.loginCount}</td>
              <td class="py-3 pr-4 text-outline">{formatDate(user.createdAt)}</td>
              <td class="py-3">
                <button onclick={() => openDetail(user.id)} class="p-2 rounded-lg hover:bg-surface-container transition-colors cursor-pointer border-none text-outline hover:text-primary" title="Détails">
                  <Eye size={18} />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if users.length === 0}
      <p class="text-center py-8 text-outline">Aucun utilisateur trouvé</p>
    {/if}
  {/if}

  {#if totalPages > 1}
    <div class="flex items-center justify-between pt-4 border-t border-mint-subtle mt-4">
      <button disabled={page <= 1} onclick={() => loadUsers(page - 1)} class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-surface-container transition-colors cursor-pointer border-none">
        <ChevronLeft size={16} /> Précédent
      </button>
      <span class="text-sm text-outline">Page {page} / {totalPages}</span>
      <button disabled={page >= totalPages} onclick={() => loadUsers(page + 1)} class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-surface-container transition-colors cursor-pointer border-none">
        Suivant <ChevronRight size={16} />
      </button>
    </div>
  {/if}
</Card>

<Drawer open={showDrawer} onclose={() => { showDrawer = false; }}>
  {#if detailLoading}
    <div class="flex justify-center py-16"><Spinner text="Chargement du profil…" size="lg" /></div>
  {:else if selectedUser}
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h3 class="text-xl font-bold">{selectedUser.email}</h3>
        <button onclick={() => { showDrawer = false; }} class="p-1.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer border-none text-outline">
          <XCircle size={20} />
        </button>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="p-3 rounded-xl bg-surface-container-low border border-mint-subtle">
          <p class="text-xs text-outline font-medium uppercase tracking-wider">Rôle</p>
          <div class="flex items-center gap-2 mt-1">
            <select
              value={selectedUser.role}
              onchange={(e) => changeRole(selectedUser!.id, (e.target as HTMLSelectElement).value)}
              disabled={updating}
              class="px-2 py-1 rounded-lg border border-mint-subtle bg-surface text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {#each roles as r}
                <option value={r}>{r}</option>
              {/each}
            </select>
            {#if updating}<Loader size={14} class="animate-spin" />{/if}
          </div>
        </div>
        <div class="p-3 rounded-xl bg-surface-container-low border border-mint-subtle">
          <p class="text-xs text-outline font-medium uppercase tracking-wider">Statut</p>
          <div class="flex items-center gap-2 mt-1">
            <select
              value={selectedUser.status}
              onchange={(e) => changeStatus(selectedUser!.id, (e.target as HTMLSelectElement).value)}
              disabled={updating}
              class="px-2 py-1 rounded-lg border border-mint-subtle bg-surface text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {#each statuses as s}
                <option value={s}>{s}</option>
              {/each}
            </select>
            {#if updating}<Loader size={14} class="animate-spin" />{/if}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div class="p-3 rounded-xl bg-surface-container-low border border-mint-subtle text-center">
          <p class="text-2xl font-bold">{selectedUser.loginCount}</p>
          <p class="text-xs text-outline">Connexions</p>
        </div>
        <div class="p-3 rounded-xl bg-surface-container-low border border-mint-subtle text-center">
          <p class="text-2xl font-bold">{selectedUser._count.sessions}</p>
          <p class="text-xs text-outline">Sessions</p>
        </div>
        <div class="p-3 rounded-xl bg-surface-container-low border border-mint-subtle text-center">
          <p class="text-2xl font-bold">{selectedUser._count.notifications}</p>
          <p class="text-xs text-outline">Notifications</p>
        </div>
      </div>

      <div class="space-y-2 text-sm">
        <div class="flex justify-between py-1.5 border-b border-mint-subtle"><span class="text-outline">Email vérifié</span><span>{selectedUser.emailVerifiedAt ? formatDate(selectedUser.emailVerifiedAt) : 'Non'}</span></div>
        <div class="flex justify-between py-1.5 border-b border-mint-subtle"><span class="text-outline">MFA activé</span><span>{selectedUser.mfaEnabled ? 'Oui' : 'Non'}</span></div>
        <div class="flex justify-between py-1.5 border-b border-mint-subtle"><span class="text-outline">Dernière connexion</span><span>{formatDate(selectedUser.lastLoginAt)}</span></div>
        <div class="flex justify-between py-1.5 border-b border-mint-subtle"><span class="text-outline">Inscrit le</span><span>{formatDate(selectedUser.createdAt)}</span></div>
      </div>

      <div>
        <h4 class="font-bold text-sm uppercase tracking-wider text-outline mb-2">Comptes bancaires liés ({selectedUser.bankConnections?.length ?? 0})</h4>
        {#if selectedUser.bankConnections && selectedUser.bankConnections.length > 0}
          <div class="space-y-2">
            {#each selectedUser.bankConnections as conn}
              <div class="p-3 rounded-xl bg-surface-container-low border border-mint-subtle text-xs">
                <div class="flex justify-between"><span class="text-outline">Client</span><span>{conn.bankCustomer.firstName} {conn.bankCustomer.lastName}</span></div>
                <div class="flex justify-between"><span class="text-outline">N° compte</span><span>{conn.bankCustomer.accountNumber}</span></div>
                <div class="flex justify-between"><span class="text-outline">Code client</span><span>{conn.bankCustomer.customerCode}</span></div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-sm text-outline text-center py-3">Aucun compte bancaire lié</p>
        {/if}
      </div>

      {#if userSessions.length > 0}
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-bold text-sm uppercase tracking-wider text-outline">Sessions actives ({userSessions.length})</h4>
            <button onclick={() => handleRevokeSessions(selectedUser!.id)} disabled={revokingSessions} class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer border-none">
              {#if revokingSessions}<Loader size={12} class="animate-spin" />{/if}
              <LogOut size={14} /> Tout révoquer
            </button>
          </div>
          <div class="space-y-2">
            {#each userSessions as s}
              <div class="p-3 rounded-xl bg-surface-container-low border border-mint-subtle text-xs">
                <div class="flex justify-between"><span class="text-outline">IP</span><span>{s.ipAddress ?? '—'}</span></div>
                <div class="flex justify-between"><span class="text-outline">User-Agent</span><span class="truncate max-w-[200px]">{s.userAgent ?? '—'}</span></div>
                <div class="flex justify-between"><span class="text-outline">Créée le</span><span>{formatDate(s.createdAt)}</span></div>
                <div class="flex justify-between"><span class="text-outline">Expire le</span><span>{formatDate(s.expiresAt)}</span></div>
              </div>
            {/each}
          </div>
        </div>
      {:else if !sessionsLoading}
        <p class="text-sm text-outline text-center py-3">Aucune session active</p>
      {/if}

      <div class="pt-4 border-t border-mint-subtle">
        {#if confirmDelete === selectedUser.id}
          <div class="flex flex-col gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
            <div class="flex items-center gap-2">
              <AlertTriangle size={18} class="text-red-600 shrink-0" />
              <p class="text-sm text-red-700 flex-1">Supprimer définitivement ce compte application ?</p>
            </div>
            <p class="text-xs text-red-600">Le compte et ses liens bancaires seront supprimés. Les données du client bancaire (transactions, soldes) sont conservées.</p>
            <div class="flex items-center gap-2">
              <button onclick={() => handleDelete(selectedUser!.id)} disabled={deleting} class="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer border-none">
                {deleting ? 'Suppression…' : 'Confirmer'}
              </button>
              <button onclick={() => confirmDelete = null} class="px-3 py-1.5 rounded-lg bg-surface text-xs font-semibold hover:bg-surface-container cursor-pointer border border-mint-subtle">Annuler</button>
            </div>
          </div>
        {:else}
          <button onclick={() => confirmDelete = selectedUser!.id} class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors cursor-pointer border-none w-full justify-center">
            <Trash2 size={16} /> Supprimer le compte application
          </button>
        {/if}
      </div>
    </div>
  {/if}
</Drawer>
