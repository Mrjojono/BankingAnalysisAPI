<script lang="ts">
  import { onMount } from 'svelte';
  import ScrollReveal from './ScrollReveal.svelte';

  let ref = $state<HTMLElement | null>(null);
  let scorePct = $state(0);
  let eligPct = $state(0);
  let intRef = $state<HTMLElement | null>(null);
  let intVisible = $state(false);

  onMount(() => {
    if (!ref) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        const duration = 1500;
        const start = performance.now();
        function tick(now: number) {
          const t = Math.min((now - start) / duration, 1);
          scorePct = Math.round(78 * (1 - Math.pow(1 - t, 3)));
          eligPct = Math.round(92 * (1 - Math.pow(1 - t, 3)));
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    observer.observe(ref);
    return () => observer.disconnect();
  });
</script>

<section class="py-24 bg-[#f9fafb]">
  <div class="max-w-6xl mx-auto px-6">
    <ScrollReveal>
      <div class="text-center mb-16">
        <p class="text-sm font-medium text-primary uppercase tracking-widest mb-3">Fonctionnalités</p>
        <h2 class="text-3xl md:text-4xl font-bold text-[#181d16]">
          Tout ce qu'il vous faut
        </h2>
      </div>
    </ScrollReveal>

    <div bind:this={ref} class="grid md:grid-cols-3 gap-5">
      <ScrollReveal>
        <div class="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-md transition-shadow">
          <div class="flex justify-center mb-6 relative">
            <svg class="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#E2EBD6" stroke-width="6"/>
              <circle cx="50" cy="50" r="42" fill="none" stroke="#3a6a00" stroke-width="6"
                stroke-linecap="round" stroke-dasharray={`${2 * Math.PI * 42}`}
                stroke-dashoffset={`${2 * Math.PI * 42 * (1 - scorePct / 100)}`}
                class="transition-all duration-300"/>
            </svg>
            <span class="absolute mt-6 text-2xl font-bold text-[#181d16]">{scorePct}%</span>
          </div>
          <h3 class="text-lg font-bold text-[#181d16] text-center">Score de crédit</h3>
          <p class="text-sm text-[#6b7280] text-center mt-2 leading-relaxed">
            Évaluation objective basée sur vos transactions et comportements.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div class="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-md transition-shadow md:mt-8">
          <div class="mb-6">
            <div class="flex items-end justify-between mb-2">
              <span class="text-sm text-[#6b7280]">Éligibilité</span>
              <span class="text-2xl font-bold text-primary">{eligPct}%</span>
            </div>
            <div class="h-2.5 bg-[#E2EBD6] rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full transition-all duration-500" style="width: {eligPct}%"></div>
            </div>
          </div>
          <h3 class="text-lg font-bold text-[#181d16]">Éligibilité instantanée</h3>
          <p class="text-sm text-[#6b7280] mt-2 leading-relaxed">
            Découvrez votre éligibilité aux produits financiers en un clic.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div class="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-md transition-shadow">
          <div class="space-y-3 mb-6">
            {#each ['Analyse de vos dépenses', 'Recommandations personnalisées', 'Alertes intelligentes'] as item, i}
              <div class="flex items-center gap-3">
                <div class="w-2 h-2 rounded-full" class:bg-primary={scorePct > i * 33} class:bg-[#E2EBD6]={scorePct <= i * 33}></div>
                <span class="text-sm text-[#6b7280]">{item}</span>
              </div>
            {/each}
          </div>
          <h3 class="text-lg font-bold text-[#181d16]">Conseils IA</h3>
          <p class="text-sm text-[#6b7280] mt-2 leading-relaxed">
            Recommandations personnalisées pour optimiser votre santé financière.
          </p>
        </div>
      </ScrollReveal>
    </div>
  </div>
</section>
