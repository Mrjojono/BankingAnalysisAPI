<script lang="ts">
  let { onlogin }: { onlogin: () => void } = $props();

  let username = $state('');
  let password = $state('');
  let error = $state('');

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!username || !password) {
      error = 'Veuillez remplir tous les champs';
      return;
    }
    error = '';
    onlogin();
  }
</script>

<div class="min-h-screen bg-background flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <div class="bg-surface rounded-lg border border-mint-subtle shadow-xl p-8">
      <div class="text-center mb-8">
        <h1 class="text-[28px] font-extrabold text-primary tracking-tight">
          ORABANK
        </h1>
        <p class="text-sm text-on-surface-variant mt-2">Interface d'administration</p>
      </div>

      <form onsubmit={handleSubmit} class="flex flex-col gap-5">
        {#if error}
          <div class="bg-red-50 text-error px-4 py-3 rounded-xl text-sm font-medium text-center">{error}</div>
        {/if}

        <label class="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
          Identifiant
          <input
            bind:value={username}
            type="text"
            placeholder="Votre nom d'utilisateur"
            class="w-full px-4 py-3 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all"
          />
        </label>

        <label class="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
          Mot de passe
          <input
            bind:value={password}
            type="password"
            placeholder="Votre mot de passe"
            class="w-full px-4 py-3 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all"
          />
        </label>

        <button
          type="submit"
          class="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-[#2d5200] transition-all cursor-pointer border-none mt-2"
        >
          Se connecter
        </button>
      </form>
    </div>

    <p class="text-xs text-center text-outline mt-6">
      Orabank Administration sécurisée
    </p>
  </div>
</div>
