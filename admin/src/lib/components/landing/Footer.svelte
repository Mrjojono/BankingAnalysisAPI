<script lang="ts">
  let { onlogin }: { onlogin: () => void } = $props();
</script>

<footer class="bg-on-surface border-t border-white/10">
  <div class="max-w-6xl mx-auto px-6 py-14">
    <div class="flex flex-col md:flex-row md:items-start justify-between gap-10">
      <div class="max-w-sm">
        <span class="text-lg font-extrabold text-primary tracking-tight">ORABANK</span>
        <p class="mt-3 text-sm text-white/60 leading-relaxed">
          L'application vous accompagne pour comprendre vos finances, améliorer votre score
          et accéder aux produits qui vous correspondent.
        </p>
      </div>

      <div class="flex flex-col gap-8 md:flex-row md:gap-20">
        <div>
          <p class="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Découvrir</p>
          <ul class="space-y-2.5">
            <li><a href="#fonctionnalites" class="text-sm text-white/70 hover:text-white transition-colors">Fonctionnalités</a></li>
            <li><a href="#pourquoi" class="text-sm text-white/70 hover:text-white transition-colors">Nos engagements</a></li>
            <li><a href="#telecharger" class="text-sm text-white/70 hover:text-white transition-colors">Télécharger</a></li>
          </ul>
        </div>
        <div>
          <p class="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Orabank</p>
          <ul class="space-y-2.5">
            <li><a href="#telecharger" class="text-sm text-white/70 hover:text-white transition-colors">Nos produits</a></li>
            <li><a href="#telecharger" class="text-sm text-white/70 hover:text-white transition-colors">Nous contacter</a></li>
          </ul>
        </div>
      </div>
    </div>

    <div class="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p class="text-xs text-white/40">Orabank Togo. Tous droits réservés.</p>
      <button
        onclick={onlogin}
        class="text-[10px] tracking-wide text-white/25 hover:text-white/50 transition-colors cursor-pointer bg-transparent border-none p-0"
      >
        Administration
      </button>
    </div>
  </div>
</footer>
