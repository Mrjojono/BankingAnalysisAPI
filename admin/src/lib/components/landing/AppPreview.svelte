<script lang="ts">
  import { onMount } from 'svelte';
  import ScrollReveal from './ScrollReveal.svelte';

  let mockupRef = $state<HTMLElement | null>(null);
  let offset = $state(0);

  onMount(() => {
    const onScroll = () => {
      if (!mockupRef) return;
      const rect = mockupRef.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
      offset = (progress - 0.5) * 30;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });
</script>

<section class="py-24 bg-white">
  <div class="max-w-6xl mx-auto px-6">
    <ScrollReveal>
      <div class="flex flex-col md:flex-row items-center gap-16">
        <div class="flex-1 max-w-md">
          <p class="text-sm font-medium text-primary uppercase tracking-widest mb-3">Aperçu</p>
          <h2 class="text-3xl md:text-4xl font-bold text-[#181d16] leading-tight mb-4">
            Suivez votre crédit,<br>apprenez, évoluez
          </h2>
          <p class="text-[#6b7280] leading-relaxed">
            Une interface claire et intuitive pour visualiser votre score, suivre vos progrès
            et découvrir les opportunités qui s'offrent à vous.
          </p>
        </div>

        <div bind:this={mockupRef} class="flex-1 flex justify-center md:justify-end"
          style="transform: translateY({offset}px); transition: transform 0.1s ease-out">
          <div class="w-[260px] h-[540px] bg-[#1a1a1a] rounded-[2.5rem] p-3 shadow-xl" style="border: 2px solid #333">
            <div class="w-full h-full bg-[#0D0D0D] rounded-[2rem] overflow-hidden relative">
              <div class="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#1a1a1a] rounded-b-2xl z-10"></div>
              <div class="h-full flex flex-col p-4 gap-4">
                <div class="bg-[#1A1A1A] rounded-xl border border-[#2C2C2E] p-3">
                  <p class="text-[9px] text-[#8E8E93] uppercase tracking-widest font-medium mb-1">Solde disponible</p>
                  <div class="flex items-baseline justify-between">
                    <span class="text-base font-bold text-white" style="font-family: 'Playfair Display', serif">1 250 000 F</span>
                    <span class="text-[9px] text-[#30D158] font-medium">+12%</span>
                  </div>
                </div>
                <div class="bg-[#1A1A1A] rounded-xl border border-[#2C2C2E] p-3">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-[9px] text-[#8E8E93] font-medium">OraScore</span>
                    <span class="text-[8px] font-semibold text-[#FF5A5F] bg-[#FF5A5F20] px-1.5 py-0.5 rounded-md">Très bien</span>
                  </div>
                  <div class="flex items-baseline gap-2 mb-2">
                    <span class="text-xl font-bold text-white leading-none" style="font-family: 'Playfair Display', serif">742</span>
                    <span class="text-[8px] text-[#30D158] font-medium">+21 pts</span>
                  </div>
                  <div class="h-1 bg-[#2C2C2E] rounded-full overflow-hidden">
                    <div class="h-full bg-[#FF5A5F] rounded-full w-[75%]"></div>
                  </div>
                </div>
                <div class="bg-[#3A2A1A] rounded-xl p-2.5 flex items-center gap-2">
                  <span class="text-amber-400 text-sm">⚠</span>
                  <div>
                    <p class="text-[9px] font-semibold text-white">Risque de découvert</p>
                    <p class="text-[8px] text-[#D0D0D0]">3 transactions cette semaine</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollReveal>
  </div>
</section>
