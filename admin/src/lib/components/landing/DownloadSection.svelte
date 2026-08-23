<script lang="ts">
  import { Apple, Play } from '@lucide/svelte';
</script>

<section id="telecharger" class="py-28 bg-on-surface scroll-mt-20">
  <div class="max-w-2xl mx-auto px-6 text-center">
    <p class="text-xs font-semibold text-primary uppercase tracking-[0.3em] mb-5">Téléchargement</p>
    <h2 class="text-3xl md:text-4xl font-medium text-white leading-tight mb-5 tracking-tight" style="font-family: 'Playfair Display', serif">
      L'application arrive bientôt sur votre téléphone
    </h2>
    <p class="text-white/60 mb-10 leading-relaxed">
      L'application sera disponible sur Android et iOS. Suivez l'actualité Orabank pour être informé de sa sortie.
    </p>

    <div class="flex flex-wrap justify-center gap-4 mb-6">
      <button
        type="button"
        disabled
        aria-disabled="true"
        class="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 border border-white/15 text-white opacity-60 cursor-not-allowed"
      >
        <Apple size={26} />
        <span class="text-left leading-tight">
          <span class="block text-[10px] text-white/60">Télécharger sur</span>
          <span class="block text-base font-semibold">App Store</span>
        </span>
      </button>
      <button
        type="button"
        disabled
        aria-disabled="true"
        class="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 border border-white/15 text-white opacity-60 cursor-not-allowed"
      >
        <Play size={24} class="fill-current" />
        <span class="text-left leading-tight">
          <span class="block text-[10px] text-white/60">Disponible sur</span>
          <span class="block text-base font-semibold">Google Play</span>
        </span>
      </button>
    </div>

    <p class="text-xs text-white/40">Bientôt disponible</p>
  </div>
</section>
