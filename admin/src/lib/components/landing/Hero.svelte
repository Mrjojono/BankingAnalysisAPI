<script lang="ts">
  const navLinks = [
    { href: '#fonctionnalites', label: 'Fonctionnalités' },
    { href: '#pourquoi', label: 'Nos engagements' },
    { href: '#telecharger', label: 'Télécharger' },
  ];

  let scrolled = $state(false);

  $effect(() => {
    const onScroll = () => { scrolled = window.scrollY > 8 };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });
</script>

<nav
  class="fixed top-0 left-0 right-0 z-50 transition-colors duration-300 border-b
    {scrolled ? 'bg-white/95 backdrop-blur-md border-mint-subtle' : 'bg-transparent border-transparent'}"
>
  <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
    <span class="text-lg font-extrabold text-primary tracking-tight">ORABANK</span>
    <div class="hidden sm:flex items-center gap-8">
      {#each navLinks as link}
        <a href={link.href} class="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors duration-200">
          {link.label}
        </a>
      {/each}
    </div>
  </div>
</nav>

<section class="pt-40 pb-16 bg-white">
  <div class="max-w-6xl mx-auto px-6">
    <div class="grid lg:grid-cols-2 gap-16 items-center">
      <div>
        <p class="text-xs font-semibold text-primary uppercase tracking-[0.3em] mb-6">Orabank · Application mobile</p>
        <h1
          class="text-[2.75rem] md:text-[3.5rem] font-medium text-on-surface leading-[1.08] tracking-tight mb-6"
          style="font-family: 'Playfair Display', serif"
        >
          Votre santé financière,<br />lisible en un coup d'œil.
        </h1>
        <p class="text-lg text-on-surface-variant leading-relaxed mb-10 max-w-xl">
          L'application analyse vos transactions pour calculer votre score de crédit,
          révéler votre éligibilité aux produits bancaires et vous conseiller au quotidien.
          Téléchargez-la et pilotez vos finances simplement.
        </p>
        <div class="flex flex-wrap items-center gap-4">
          <a
            href="#telecharger"
            class="px-8 py-3.5 rounded-full text-base font-semibold bg-primary text-on-primary hover:bg-[#2e5500] transition-colors duration-300 cursor-pointer"
          >
            Télécharger l'application
          </a>
          <a
            href="#fonctionnalites"
            class="px-8 py-3.5 rounded-full text-base font-semibold border border-mint-subtle text-on-surface-variant hover:bg-surface-container transition-colors duration-300 cursor-pointer"
          >
            En savoir plus
          </a>
        </div>
      </div>

      <div class="relative mx-auto w-[290px] lg:w-[300px]">
        <div class="absolute -inset-10 bg-primary/10 rounded-full blur-3xl"></div>
        <div class="relative rounded-[2.75rem] bg-on-surface p-2.5 shadow-[0_30px_60px_-20px_rgba(24,29,22,0.45)]">
          <div class="relative rounded-[2.25rem] bg-[#f6fbef] overflow-hidden">
            <div class="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-on-surface rounded-full z-10"></div>
            <div class="pt-11 px-5 pb-5">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-[10px] text-on-surface-variant">Bonjour</p>
                  <p class="text-sm font-bold text-on-surface">Awa K.</p>
                </div>
                <div class="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs">A</div>
              </div>

              <div class="mt-4 bg-white rounded-2xl border border-mint-subtle p-4">
                <div class="flex items-end justify-between">
                  <div>
                    <p class="text-[10px] text-on-surface-variant uppercase tracking-wider">Score financier</p>
                    <p class="text-3xl font-bold text-on-surface leading-none mt-1">72<span class="text-sm font-medium text-outline">/100</span></p>
                  </div>
                  <span class="text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">En progrès</span>
                </div>
              </div>

              <div class="mt-3 bg-white rounded-2xl border border-mint-subtle p-4">
                <p class="text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">Éligibilité</p>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-primary"></span>
                  <p class="text-xs font-semibold text-on-surface">Prêt logement</p>
                  <span class="ml-auto text-[10px] font-bold text-primary">Éligible</span>
                </div>
                <div class="mt-2.5 h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div class="h-full w-[78%] bg-primary rounded-full"></div>
                </div>
              </div>

              <div class="mt-3 bg-on-surface rounded-2xl p-4">
                <p class="text-[10px] text-white/50 uppercase tracking-wider mb-1.5">Conseil du jour</p>
                <p class="text-xs text-white leading-snug">
                  Épargnez 15 000 FCFA chaque mois pour renforcer votre fonds d'urgence.
                </p>
              </div>

              <div class="mt-4 flex justify-center gap-6">
                <div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <div class="w-1.5 h-1.5 rounded-full bg-mint-subtle"></div>
                <div class="w-1.5 h-1.5 rounded-full bg-mint-subtle"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-20 max-w-4xl mx-auto">
      <div class="grid grid-cols-1 sm:grid-cols-3 border-t border-mint-subtle">
        <div class="py-8 text-center">
          <div class="font-medium text-4xl text-primary" style="font-family: 'Playfair Display', serif">742</div>
          <p class="mt-2 text-sm text-on-surface-variant">Score moyen / 1000</p>
        </div>
        <div class="py-8 text-center sm:border-l sm:border-mint-subtle">
          <div class="font-medium text-4xl text-primary" style="font-family: 'Playfair Display', serif">1 clic</div>
          <p class="mt-2 text-sm text-on-surface-variant">Pour tester votre éligibilité</p>
        </div>
        <div class="py-8 text-center sm:border-l sm:border-mint-subtle">
          <div class="font-medium text-4xl text-primary" style="font-family: 'Playfair Display', serif">24/7</div>
          <p class="mt-2 text-sm text-on-surface-variant">Suivi de vos finances</p>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  :global(html) { scroll-behavior: smooth; }
</style>
