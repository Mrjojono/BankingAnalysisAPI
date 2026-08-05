<script lang="ts">
  import ScrollReveal from './ScrollReveal.svelte';

  let { onlogin }: { onlogin: () => void } = $props();
</script>

<section class="py-24 bg-[#181d16]">
  <div class="max-w-3xl mx-auto px-6 text-center">
    <ScrollReveal>
      <h2 class="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
        Prêt à prendre le contrôle<br>de votre crédit ?
      </h2>
      <p class="text-white/60 mb-8 max-w-md mx-auto">
        Rejoignez Orabank et découvrez une nouvelle façon de gérer votre santé financière.
      </p>
      <button onclick={onlogin}
        class="px-8 py-3.5 rounded-xl text-base font-semibold bg-primary text-on-primary hover:bg-[#2e5500] transition-all duration-300 cursor-pointer shadow-lg">
        Se connecter
      </button>
    </ScrollReveal>
  </div>
</section>
