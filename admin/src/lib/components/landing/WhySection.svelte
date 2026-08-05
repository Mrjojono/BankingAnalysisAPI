<script lang="ts">
  import ScrollReveal from './ScrollReveal.svelte';
</script>

<section class="py-24 bg-[#f9fafb]">
  <div class="max-w-5xl mx-auto px-6">
    <ScrollReveal>
      <div class="text-center mb-16">
        <p class="text-sm font-medium text-primary uppercase tracking-widest mb-3">Pourquoi Orabank</p>
        <h2 class="text-3xl md:text-4xl font-bold text-[#181d16]">
          Construit pour vous
        </h2>
      </div>
    </ScrollReveal>

    <div class="grid md:grid-cols-3 gap-6">
      <ScrollReveal>
        <div class="text-center p-8">
          <div class="w-12 h-12 bg-[#3a6a00]/10 rounded-xl flex items-center justify-center mx-auto mb-5">
            <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-[#181d16] mb-2">Sécurité</h3>
          <p class="text-sm text-[#6b7280] leading-relaxed">
            Données chiffrées et protégées selon les standards bancaires les plus stricts.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div class="text-center p-8">
          <div class="w-12 h-12 bg-[#3a6a00]/10 rounded-xl flex items-center justify-center mx-auto mb-5">
            <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-[#181d16] mb-2">Simplicité</h3>
          <p class="text-sm text-[#6b7280] leading-relaxed">
            Une interface conçue pour comprendre votre situation en un coup d'œil.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div class="text-center p-8">
          <div class="w-12 h-12 bg-[#3a6a00]/10 rounded-xl flex items-center justify-center mx-auto mb-5">
            <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-[#181d16] mb-2">Transparence</h3>
          <p class="text-sm text-[#6b7280] leading-relaxed">
            Un scoring objectif basé sur vos données. Pas de frais cachés.
          </p>
        </div>
      </ScrollReveal>
    </div>
  </div>
</section>
