<script lang="ts">
  import { login as authLogin } from '../lib/stores/auth.svelte';
  import { getAuth } from '../lib/stores/auth.svelte';
  import Button from '../lib/components/Button.svelte';
  import Spinner from '../lib/components/Spinner.svelte';

  let { onlogin }: { onlogin: () => void } = $props();

  const auth = getAuth();
  let email = $state('');
  let password = $state('');
  let error = $state('');

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!email || !password) {
      error = 'Veuillez remplir tous les champs';
      return;
    }
    error = '';
    try {
      await authLogin(email, password);
      onlogin();
    } catch (e: any) {
      error = e.message;
    }
  }
</script>

<div class="min-h-screen bg-background flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <div class="bg-surface rounded-2xl border border-mint-subtle shadow-xl p-8">
      <div class="text-center mb-8">

        <h1 class="text-[28px] font-extrabold text-primary tracking-tight">
          ORABANK
        </h1>
        <p class="text-sm text-on-surface-variant mt-2">Interface d'administration</p>
      </div>

      <form onsubmit={handleSubmit} class="flex flex-col gap-5">
        {#if error}
          <div class="bg-red-50 border border-red-200 text-error px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-error text-white text-xs font-bold flex items-center justify-center shrink-0">!</span>
            {error}
          </div>
        {/if}

        <label class="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
          Email
          <input
            bind:value={email}
            type="email"
            placeholder="admin@orabank.tg"
            onkeydown={(e) => e.key === 'Enter' && handleSubmit(e)}
            class="w-full px-4 py-3 border border-mint-subtle rounded-xl text-sm bg-surface text-on-surface placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
            disabled={auth.loading}
          />
        </label>

        <label class="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
          Mot de passe
          <input
            bind:value={password}
            type="password"
            placeholder="Votre mot de passe"
            onkeydown={(e) => e.key === 'Enter' && handleSubmit(e)}
            class="w-full px-4 py-3 border border-mint-subtle rounded-xl text-sm bg-surface text-on-surface placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
            disabled={auth.loading}
          />
        </label>

        {#if auth.loading}
          <Spinner text="Connexion en cours..." />
        {:else}
          <Button onclick={handleSubmit} variant="primary" size="lg" class="w-full mt-2">
            Se connecter
          </Button>
        {/if}
      </form>
    </div>

    <p class="text-xs text-center text-outline mt-6">
      Orabank Administration sécurisée
    </p>
  </div>
</div>
