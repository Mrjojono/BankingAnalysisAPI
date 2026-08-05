<script lang="ts">
  import { onMount } from 'svelte';

  let { onlogin }: { onlogin: () => void } = $props();

  let score = $state(0);
  let navScrolled = $state(false);
  const target = 742;

  onMount(() => {
    const duration = 2000;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      score = Math.round(target * (1 - Math.pow(1 - progress, 4)));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    const onScroll = () => { navScrolled = window.scrollY > 80; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });
</script>

  <nav class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-8 py-4 {navScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'}">
  <div class="max-w-5xl mx-auto flex items-center justify-between">
    <span class="text-xl font-extrabold text-primary tracking-tight">ORABANK</span>
    <button onclick={onlogin}
      class="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:bg-[#2e5500] transition-all duration-300 cursor-pointer shadow-sm">
      Se connecter
    </button>
  </div>
</nav>

<section class="pt-28 pb-24 md:pt-36 md:pb-32 bg-white overflow-hidden">
  <div class="max-w-5xl mx-auto px-8">
    <div class="flex flex-col md:flex-row items-center gap-8 md:gap-10">
      <div class="flex-1 max-w-xl">
        <div class="text-[80px] md:text-[100px] font-extrabold text-primary leading-none mb-2 tabular-nums tracking-tight">
          {score}
        </div>
        <p class="text-sm font-medium text-primary/60 uppercase tracking-widest mb-4">Score de crédit</p>
        <h1 class="text-4xl md:text-5xl font-bold text-[#181d16] leading-tight mb-4">
          Votre santé financière<br>en temps réel
        </h1>
        <p class="text-lg text-[#6b7280] leading-relaxed mb-8 max-w-md">
          Score crédit, éligibilité, conseils IA — tout ce qu'il vous faut pour maîtriser votre avenir financier.
        </p>
        <button onclick={onlogin}
          class="px-8 py-3.5 rounded-xl text-base font-semibold bg-primary text-on-primary hover:bg-[#2e5500] transition-all duration-300 cursor-pointer shadow-sm">
          Commencer
        </button>
      </div>

      <div class="flex-1 flex justify-center md:justify-end">
        <div class="w-[280px] h-[560px] bg-[#1a1a1a] rounded-[2.5rem] p-3 shadow-xl" style="border: 2px solid #333">
          <div class="w-full h-full bg-[#0D0D0D] rounded-[2rem] overflow-hidden relative">
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#1a1a1a] rounded-b-2xl z-10"></div>
            <div class="h-full flex flex-col p-5">
              <div class="bg-[#1A1A1A] rounded-xl border border-[#2C2C2E] p-3.5 mb-3">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[10px] text-[#8E8E93] uppercase tracking-widest font-medium">Solde disponible</span>
                  <span class="text-[10px] text-[#30D158] font-medium">+12%</span>
                </div>
                <span class="text-base font-bold text-white" style="font-family: 'Playfair Display', serif">1 250 000 F</span>
              </div>
              <div class="flex-1 flex flex-col justify-center">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-[10px] text-[#8E8E93] uppercase tracking-widest font-medium">OraScore</span>
                  <span class="text-[9px] font-semibold text-[#FF5A5F] bg-[#FF5A5F20] px-2 py-0.5 rounded-md">Très bien</span>
                </div>
                <div class="flex items-baseline gap-2 mb-0.5">
                  <span class="text-[44px] font-bold text-white leading-none" style="font-family: 'Playfair Display', serif">{score}</span>
                  <span class="text-[10px] text-[#30D158] font-medium">+21 pts</span>
                </div>
                <span class="text-[10px] text-[#8E8E93] mb-4">{score}/1000</span>
                <div class="h-1.5 bg-[#2C2C2E] rounded-full overflow-hidden">
                  <div class="h-full bg-[#FF5A5F] rounded-full transition-all duration-1000" style="width: {Math.round(score / 10)}%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
