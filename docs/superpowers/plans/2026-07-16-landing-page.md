# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a SaaS landing page for Orabank served by the Svelte admin when no user is logged in

**Architecture:** 6-section landing page composed of reusable Svelte 5 components in `admin/src/lib/components/landing/`. App.svelte gains a `showLogin` state to toggle between Landing and Login.

**Tech Stack:** Svelte 5 (runes) + Tailwind CSS v4 + Intersection Observer for scroll animations

## Global Constraints

- Colors strictly from the admin theme: `primary: #3a6a00`, `background: #f6fbef`, `surface: #ffffff`, `primary-container: #9fe35d`, `on-surface: #181d16`, `mint-subtle: #E2EBD6`
- Glassmorphism via `backdrop-blur-xl` + semi-transparent bg
- Organic shapes as inline SVG blobs (no external assets)
- All components use Svelte 5 runes (`$state`, `$derived`, `$effect`)
- No external animation libraries — pure CSS + Intersection Observer

---

### Task 1: App.svelte + Landing shell + ScrollReveal

**Files:**
- Modify: `admin/src/App.svelte:21,36,51-52`
- Create: `admin/src/pages/Landing.svelte`
- Create: `admin/src/lib/components/landing/ScrollReveal.svelte`

**Interfaces:**
- Consumes: existing `auth` store, `Login` component
- Produces: `Landing` component (page), `ScrollReveal` (wrapper with `onVisible` callback)

- [ ] **Step 1: Create ScrollReveal component**

```svelte
<script lang="ts">
  let ref = $state<HTMLElement | null>(null);
  let visible = $state(false);

  $effect(() => {
    if (!ref) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { visible = true; observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(ref);
    return () => observer.disconnect();
  });
</script>

<div bind:this={ref} class="transition-all duration-700 ease-out"
  class:opacity-100={visible} class:translate-y-0={visible}
  class:opacity-0={!visible} class:translate-y-8={!visible}>
  {@render children()}
</div>
```

- [ ] **Step 2: Create Landing.svelte shell**

```svelte
<script lang="ts">
  import Hero from '$lib/components/landing/Hero.svelte';
  import Features from '$lib/components/landing/Features.svelte';
  import AppPreview from '$lib/components/landing/AppPreview.svelte';
  import WhySection from '$lib/components/landing/WhySection.svelte';
  import CTASection from '$lib/components/landing/CTASection.svelte';

  let { onlogin }: { onlogin: () => void } = $props();
</script>

<div class="min-h-screen bg-background overflow-x-hidden">
  <Hero {onlogin} />
  <Features />
  <AppPreview />
  <WhySection />
  <CTASection {onlogin} />
</div>
```

- [ ] **Step 3: Update App.svelte**

Add `showLogin` state. Modify the `!auth.user` branch to show Landing → Login:

```svelte
  let showLogin = $state(false);

  function handleLogin() {
    if (!auth.user) {
      showLogin = false;
      page = 'products';
    }
  }
```

Change the rendering:

```svelte
{:else if !auth.user && !showLogin}
  <Landing onlogin={() => showLogin = true} />
{:else if !auth.user && showLogin}
  <Login onlogin={handleLogin} />
```

- [ ] **Step 4: Build check**

Run: `cd admin && npx vite build 2>&1 | tail -20`

Expected: Build succeeds with no errors

- [ ] **Step 5: Commit**

```bash
git add admin/src/App.svelte admin/src/pages/Landing.svelte admin/src/lib/components/landing/ScrollReveal.svelte
git commit -m "feat: add Landing page shell and App routing"
```

---

### Task 2: Hero section + Score Counter

**Files:**
- Create: `admin/src/lib/components/landing/Hero.svelte`

- [ ] **Step 1: Create Hero.svelte**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let { onlogin }: { onlogin: () => void } = $props();

  let score = $state(0);
  const target = 742;
  let navScrolled = $state(false);

  onMount(() => {
    const duration = 2000;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      score = Math.round(target * (1 - Math.pow(1 - progress, 4)));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    const onScroll = () => { navScrolled = window.scrollY > 100; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });
</script>

<nav class="fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 py-4"
  class="backdrop-blur-xl bg-primary/80 shadow-lg":navScrolled
  class="bg-transparent":!navScrolled>
  <div class="max-w-7xl mx-auto flex items-center justify-between">
    <span class="text-2xl font-extrabold text-on-primary tracking-tight">ORABANK</span>
    <button onclick={onlogin} class="px-5 py-2 rounded-xl text-sm font-semibold
      backdrop-blur-xl bg-white/15 text-on-primary border border-white/30
      hover:bg-white/25 transition-all duration-300 cursor-pointer">
      Se connecter
    </button>
  </div>
</nav>

<section class="relative min-h-screen bg-primary flex items-center justify-center overflow-hidden">
  <!-- Organic blob -->
  <svg class="absolute -top-40 -right-40 w-[600px] h-[600px] opacity-20" viewBox="0 0 200 200">
    <path fill="#9fe35d" d="M44.2,-70.1C57.3,-63.3,67.9,-49.5,75.1,-34.2C82.3,-18.9,86.1,-2,83.3,13.9C80.5,29.9,71.2,44.9,58.7,56.1C46.3,67.3,30.7,74.7,14.1,79.1C-2.5,83.5,-20,84.9,-35.6,78.7C-51.2,72.5,-64.9,58.8,-73.8,42.2C-82.7,25.6,-86.8,6.1,-83.1,-11.5C-79.4,-29.1,-67.9,-44.7,-53.7,-55.3C-39.5,-65.9,-22.6,-71.5,-5.7,-65.1C11.2,-58.7,31.1,-76.9,44.2,-70.1Z" transform="translate(100 100)" />
  </svg>
  <!-- Second blob bottom-left -->
  <svg class="absolute -bottom-20 -left-20 w-[400px] h-[400px] opacity-10" viewBox="0 0 200 200">
    <path fill="#9fe35d" d="M34.4,-47.8C48.5,-42.6,66,-38.9,73.2,-28.3C80.4,-17.7,77.4,-0.2,71.4,15.5C65.4,31.2,56.4,45.1,43.8,54.8C31.2,64.5,15,70,0.8,68.8C-13.5,67.6,-26.9,59.8,-40.2,49.8C-53.5,39.8,-66.7,27.7,-71.1,12.7C-75.5,-2.3,-71.2,-20.2,-60.5,-32.8C-49.8,-45.5,-32.7,-53,-18.2,-56.3C-3.7,-59.5,20.3,-53,34.4,-47.8Z" transform="translate(100 100)" />
  </svg>

  <div class="relative z-10 text-center px-6">
    <div class="text-[140px] md:text-[180px] font-extrabold text-on-primary/90 leading-none mb-4 tabular-nums tracking-tighter">
      {score}
    </div>
    <h1 class="text-4xl md:text-6xl font-bold text-on-primary mb-4 max-w-3xl mx-auto leading-tight">
      Votre santé financière en temps réel
    </h1>
    <p class="text-lg md:text-xl text-on-primary/70 max-w-xl mx-auto mb-10">
      Score crédit, éligibilité, conseils IA — tout en un.
    </p>
    <button onclick={onlogin} class="px-8 py-3.5 rounded-xl text-base font-semibold
      backdrop-blur-xl bg-white/15 text-on-primary border border-white/30
      hover:bg-white/25 transition-all duration-300 cursor-pointer">
      Commencer
    </button>
  </div>

  <!-- Scroll indicator -->
  <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
    <svg class="w-6 h-6 text-on-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
    </svg>
  </div>
</section>
```

- [ ] **Step 2: Build check**

Run: `cd admin && npx vite build 2>&1 | tail -20`

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add admin/src/lib/components/landing/Hero.svelte
git commit -m "feat: add Hero section with animated score counter"
```

---

### Task 3: Features section

**Files:**
- Create: `admin/src/lib/components/landing/Features.svelte`

- [ ] **Step 1: Create Features.svelte**

```svelte
<script lang="ts">
  import ScrollReveal from './ScrollReveal.svelte';

  let scorePct = $state(0);
  let eligPct = $state(0);

  function onScoreVisible() {
    const duration = 1500;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      scorePct = Math.round(78 * (1 - Math.pow(1 - t, 3)));
      eligPct = Math.round(92 * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
</script>

<section class="py-28 px-6 bg-background">
  <div class="max-w-6xl mx-auto">
    <ScrollReveal>
      <h2 class="text-3xl md:text-4xl font-bold text-on-surface text-center mb-4">
        Tout ce qu'il vous faut
      </h2>
      <p class="text-on-surface-variant text-center max-w-xl mx-auto mb-16 text-lg">
        Un tableau de bord complet pour comprendre et améliorer votre santé financière.
      </p>
    </ScrollReveal>

    <div class="grid md:grid-cols-3 gap-6">
      <!-- Card 1: Score -->
      <ScrollReveal>
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl border border-mint-subtle p-8
          hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
          <div class="flex items-center justify-center mb-6">
            <svg class="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#E2EBD6" stroke-width="6"/>
              <circle cx="50" cy="50" r="42" fill="none" stroke="#3a6a00" stroke-width="6"
                stroke-linecap="round" stroke-dasharray={`${2 * Math.PI * 42}`}
                stroke-dashoffset={`${2 * Math.PI * 42 * (1 - scorePct / 100)}`}
                class="transition-all duration-300"/>
            </svg>
            <span class="absolute text-3xl font-bold text-on-surface">{scorePct}%</span>
          </div>
          <h3 class="text-lg font-bold text-on-surface text-center">Score de crédit</h3>
          <p class="text-sm text-on-surface-variant text-center mt-2">
            Évaluation objective basée sur vos transactions et comportements financiers.
          </p>
        </div>
      </ScrollReveal>

      <!-- Card 2: Éligibilité -->
      <ScrollReveal>
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl border border-mint-subtle p-8
          hover:-translate-y-1 hover:shadow-lg transition-all duration-300 md:mt-8">
          <div class="mb-6">
            <div class="flex items-end justify-between mb-2">
              <span class="text-sm text-on-surface-variant">Éligibilité</span>
              <span class="text-2xl font-bold text-primary">{eligPct}%</span>
            </div>
            <div class="h-3 bg-mint-subtle rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full transition-all duration-500"
                style="width: {eligPct}%"/>
            </div>
          </div>
          <h3 class="text-lg font-bold text-on-surface">Éligibilité instantanée</h3>
          <p class="text-sm text-on-surface-variant mt-2">
            Découvrez votre éligibilité aux produits financiers en quelques secondes.
          </p>
        </div>
      </ScrollReveal>

      <!-- Card 3: Conseils IA -->
      <ScrollReveal>
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl border border-mint-subtle p-8
          hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
          <div class="space-y-4 mb-6">
            {#each ['Analyse de vos dépenses', 'Recommandations personnalisées', 'Alertes intelligentes'] as item, i}
              <div class="flex items-center gap-3">
                <div class="w-2 h-2 rounded-full bg-primary"
                  class:opacity-100={scorePct > i * 33}
                  class:opacity-30={scorePct <= i * 33}/>
                <span class="text-sm text-on-surface-variant">{item}</span>
              </div>
            {/each}
          </div>
          <h3 class="text-lg font-bold text-on-surface">Conseils IA</h3>
          <p class="text-sm text-on-surface-variant mt-2">
            Des recommandations personnalisées pour optimiser votre santé financière.
          </p>
        </div>
      </ScrollReveal>
    </div>

    {#if scorePct === 0}
      {@render onScoreVisible()}
    {/if}
  </div>
</section>
```

Wait, the ScrollReveal approach needs refinement. Let me use a different pattern - use `bind:this` on a section ref and detect visibility there instead.

Actually, the simpler approach: use IntersectionObserver on the section itself, not on each card independently for the counters. Let me put the observer on the section wrapper.

Let me rewrite Features.svelte more simply:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import ScrollReveal from './ScrollReveal.svelte';

  let sectionRef = $state<HTMLElement | null>(null);
  let scorePct = $state(0);
  let eligPct = $state(0);
  let countersStarted = $state(false);

  onMount(() => {
    if (!sectionRef) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !countersStarted) {
          countersStarted = true;
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
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(sectionRef);
    return () => observer.disconnect();
  });
</script>
```

- [ ] **Step 2: Build check**

Run: `cd admin && npx vite build 2>&1 | tail -20`

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add admin/src/lib/components/landing/Features.svelte
git commit -m "feat: add Features section with animated gauges"
```

---

### Task 4: AppPreview section (phone mockup + parallax)

**Files:**
- Create: `admin/src/lib/components/landing/AppPreview.svelte`

- [ ] **Step 1: Create AppPreview.svelte**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import ScrollReveal from './ScrollReveal.svelte';

  let mockupRef = $state<HTMLElement | null>(null);
  let offset = $state(0);
  let currentSlide = $state(0);
  
  const slides = [
    { title: 'Vue d\'ensemble', desc: 'Votre tableau de bord financier personnalisé' },
    { title: 'Score détaillé', desc: 'Analyse complète de votre score de crédit' },
    { title: 'Conseils', desc: 'Recommandations IA pour améliorer votre profil' },
    { title: 'Éligibilité', desc: 'Découvrez vos opportunités financières' },
  ];

  onMount(() => {
    const onScroll = () => {
      if (!mockupRef) return;
      const rect = mockupRef.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
      offset = (progress - 0.5) * 60;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    
    const slideInterval = setInterval(() => {
      currentSlide = (currentSlide + 1) % slides.length;
    }, 3000);

    return () => {
      window.removeEventListener('scroll', onScroll);
      clearInterval(slideInterval);
    };
  });
</script>

<section class="py-28 px-6 bg-[#ebf0e4] relative overflow-hidden">
  <!-- Organic blob -->
  <svg class="absolute top-10 right-10 w-[500px] h-[500px] opacity-15" viewBox="0 0 200 200">
    <path fill="#3a6a00" d="M38.5,-55.2C52.3,-48.8,68.2,-39.2,74.8,-25.3C81.4,-11.5,78.7,6.6,71.5,21.8C64.3,37,52.6,49.3,38.4,58.7C24.2,68.1,7.5,74.6,-8.9,73.5C-25.3,72.4,-41.4,63.7,-53.8,51.3C-66.2,38.9,-74.9,22.8,-75.6,6.5C-76.3,-9.8,-69,-26.2,-57.2,-37.6C-45.4,-49,-29.1,-55.5,-14.1,-59.8C0.9,-64.1,24.7,-61.6,38.5,-55.2Z" transform="translate(100 100)" />
  </svg>

  <div class="max-w-6xl mx-auto relative z-10">
    <ScrollReveal>
      <div class="flex flex-col md:flex-row items-center gap-16">
        <!-- Phone mockup -->
        <div bind:this={mockupRef} class="relative"
          style="transform: translateY({offset}px); transition: transform 0.1s ease-out">
          <!-- Phone frame -->
          <div class="w-[280px] h-[580px] bg-on-surface rounded-[3rem] p-3 shadow-2xl">
            <div class="w-full h-full bg-surface rounded-[2.5rem] overflow-hidden relative">
              <!-- Notch -->
              <div class="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-on-surface rounded-b-2xl z-10"/>
              <!-- Screen content -->
              <div class="h-full flex flex-col items-center justify-center p-6 text-center">
                <div class="text-4xl font-extrabold text-primary mb-2">
                  {slides[currentSlide].title.split(' ')[0]}
                </div>
                <p class="text-sm text-on-surface-variant mb-6">
                  {slides[currentSlide].desc}
                </p>
                <!-- Mini UI mockup -->
                <div class="w-full space-y-3">
                  <div class="h-3 bg-primary-container rounded-full w-3/4"/>
                  <div class="h-3 bg-mint-subtle rounded-full w-full"/>
                  <div class="h-3 bg-mint-subtle rounded-full w-5/6"/>
                </div>
                <!-- Dots -->
                <div class="flex gap-2 mt-8">
                  {#each slides as _, i}
                    <div class="w-2 h-2 rounded-full transition-all duration-300"
                      class:bg-primary={i === currentSlide}
                      class:bg-mint-subtle={i !== currentSlide}/>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Text -->
        <div class="flex-1 max-w-md">
          <h2 class="text-3xl md:text-4xl font-bold text-on-surface mb-4 leading-tight">
            Suivez votre crédit,<br>apprenez, évoluez.
          </h2>
          <p class="text-on-surface-variant text-lg leading-relaxed">
            Une interface claire et intuitive pour visualiser votre score, suivre vos progrès
            et découvrir les opportunités qui s'offrent à vous.
          </p>
        </div>
      </div>
    </ScrollReveal>
  </div>
</section>
```

- [ ] **Step 2: Build check**

Run: `cd admin && npx vite build 2>&1 | tail -20`

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add admin/src/lib/components/landing/AppPreview.svelte
git commit -m "feat: add AppPreview section with phone mockup and parallax"
```

---

### Task 5: WhySection + CTASection

**Files:**
- Create: `admin/src/lib/components/landing/WhySection.svelte`
- Create: `admin/src/lib/components/landing/CTASection.svelte`

- [ ] **Step 1: Create WhySection.svelte**

```svelte
<script lang="ts">
  import ScrollReveal from './ScrollReveal.svelte';

  const values = [
    { icon: '🔒', title: 'Sécurité', desc: 'Vos données financières sont chiffrées et protégées selon les plus hauts standards bancaires.' },
    { icon: '✨', title: 'Simplicité', desc: 'Une interface conçue pour vous permettre de comprendre votre situation financière en un coup d\'œil.' },
    { icon: '📊', title: 'Transparence', desc: 'Un scoring objectif basé sur vos données réelles. Pas de frais cachés, pas de surprises.' },
  ];
</script>

<section class="py-28 px-6 bg-white">
  <div class="max-w-5xl mx-auto">
    <ScrollReveal>
      <h2 class="text-3xl md:text-4xl font-bold text-on-surface text-center mb-4">
        Pourquoi Orabank ?
      </h2>
      <p class="text-on-surface-variant text-center max-w-lg mx-auto mb-16 text-lg">
        Construit pour vous aider à prendre le contrôle de votre avenir financier.
      </p>
    </ScrollReveal>

    <div class="grid md:grid-cols-3 gap-6">
      {#each values as value, i}
        <ScrollReveal>
          <div class="text-center p-8 rounded-2xl bg-[#f0f5e9] border border-mint-subtle
            hover:-translate-y-1 hover:shadow-md transition-all duration-300"
            style="transition-delay: {i * 150}ms">
            <div class="text-4xl mb-4">{value.icon}</div>
            <h3 class="text-xl font-bold text-on-surface mb-3">{value.title}</h3>
            <p class="text-on-surface-variant leading-relaxed">{value.desc}</p>
          </div>
        </ScrollReveal>
      {/each}
    </div>
  </div>
</section>
```

- [ ] **Step 2: Create CTASection.svelte**

```svelte
<script lang="ts">
  let { onlogin }: { onlogin: () => void } = $props();
</script>

<section class="relative py-32 px-6 bg-primary overflow-hidden">
  <!-- Organic blobs -->
  <svg class="absolute -top-32 -right-32 w-[700px] h-[700px] opacity-10" viewBox="0 0 200 200">
    <path fill="#ffffff" d="M39.3,-60.8C51.5,-55.4,62.5,-43.4,70.1,-29.1C77.7,-14.8,81.9,1.9,77.6,16.2C73.3,30.5,60.5,42.5,46.2,52.1C31.9,61.7,16,68.9,-0.8,70.1C-17.6,71.3,-35.2,66.5,-49.7,57.1C-64.2,47.7,-75.6,33.7,-79.3,18C-83,2.3,-79.1,-15.1,-69.8,-28.8C-60.5,-42.5,-45.8,-52.5,-30.7,-57.2C-15.6,-61.9,-5.8,-66.2,8.3,-67.5C22.4,-68.8,39.3,-61.3,39.3,-60.8Z" transform="translate(100 100)" />
  </svg>
  <svg class="absolute -bottom-32 -left-32 w-[500px] h-[500px] opacity-10" viewBox="0 0 200 200">
    <path fill="#ffffff" d="M44.5,-64.8C56.7,-57.1,64.8,-41.4,70.1,-25.6C75.4,-9.8,77.9,6.2,72.6,19.5C67.3,32.8,54.2,43.4,39.7,51.6C25.2,59.8,9.3,65.6,-6.1,67.2C-21.5,68.8,-36.4,66.2,-49.5,58.6C-62.6,51,-73.9,38.4,-78.3,23.5C-82.7,8.6,-80.2,-8.6,-72.8,-22.6C-65.4,-36.6,-53.1,-47.4,-39.2,-54.6C-25.3,-61.8,-9.8,-65.4,5.5,-67.8C20.8,-70.2,32.3,-72.5,44.5,-64.8Z" transform="translate(100 100)" />
  </svg>

  <div class="relative z-10 text-center max-w-3xl mx-auto">
    <h2 class="text-3xl md:text-5xl font-bold text-on-primary mb-6 leading-tight">
      Prêt à prendre le contrôle<br>de votre crédit ?
    </h2>
    <p class="text-on-primary/70 text-lg mb-10 max-w-lg mx-auto">
      Rejoignez Orabank et découvrez une nouvelle façon de gérer votre santé financière.
    </p>
    <button onclick={onlogin} class="px-8 py-3.5 rounded-xl text-base font-semibold
      bg-white text-primary hover:bg-white/90 transition-all duration-300 cursor-pointer shadow-lg">
      Se connecter
    </button>
  </div>
</section>
```

- [ ] **Step 3: Organic divider wave (inline SVG in Landing.svelte)**

Add this between Hero and Features sections in Landing.svelte:

```svelte
<!-- Organic wave divider -->
<div class="relative h-24 bg-background -mt-1">
  <svg class="absolute bottom-0 w-full h-24 text-primary fill-current" viewBox="0 0 1440 96" preserveAspectRatio="none">
    <path d="M0,64 C360,96 720,32 1440,64 L1440,96 L0,96 Z" opacity="0.08"/>
    <path d="M0,48 C240,80 600,16 1440,48 L1440,96 L0,96 Z" opacity="0.05"/>
  </svg>
</div>
```

And another wave between Features and AppPreview:

```svelte
<div class="relative h-16 bg-background -mt-1">
  <svg class="absolute bottom-0 w-full h-16 text-[#ebf0e4] fill-current" viewBox="0 0 1440 64" preserveAspectRatio="none">
    <path d="M0,32 C360,64 720,0 1440,32 L1440,64 L0,64 Z"/>
  </svg>
</div>
```

- [ ] **Step 4: Build check**

Run: `cd admin && npx vite build 2>&1 | tail -20`

Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add admin/src/lib/components/landing/WhySection.svelte admin/src/lib/components/landing/CTASection.svelte admin/src/pages/Landing.svelte
git commit -m "feat: add WhySection, CTASection, and organic wave dividers"
```

---

### Task 6: Final integration + polish

**Files:**
- Modify: `admin/src/pages/Landing.svelte` (wire everything together with dividers)
- Verify: all components compile and render properly

- [ ] **Step 1: Final Landing.svelte integration**

```svelte
<script lang="ts">
  import Hero from '$lib/components/landing/Hero.svelte';
  import Features from '$lib/components/landing/Features.svelte';
  import AppPreview from '$lib/components/landing/AppPreview.svelte';
  import WhySection from '$lib/components/landing/WhySection.svelte';
  import CTASection from '$lib/components/landing/CTASection.svelte';

  let { onlogin }: { onlogin: () => void } = $props();
</script>

<div class="min-h-screen bg-background overflow-x-hidden">
  <Hero {onlogin} />

  <!-- Wave divider -->
  <div class="relative h-24 bg-background -mt-1">
    <svg class="absolute bottom-0 w-full h-24 text-primary fill-current" viewBox="0 0 1440 96" preserveAspectRatio="none">
      <path d="M0,64 C360,96 720,32 1440,64 L1440,96 L0,96 Z" opacity="0.08"/>
      <path d="M0,48 C240,80 600,16 1440,48 L1440,96 L0,96 Z" opacity="0.05"/>
    </svg>
  </div>

  <Features />

  <!-- Wave divider -->
  <div class="relative h-16 bg-background -mt-1">
    <svg class="absolute bottom-0 w-full h-16 text-[#ebf0e4] fill-current" viewBox="0 0 1440 64" preserveAspectRatio="none">
      <path d="M0,32 C360,64 720,0 1440,32 L1440,64 L0,64 Z"/>
    </svg>
  </div>

  <AppPreview />
  <WhySection />
  <CTASection {onlogin} />
</div>
```

- [ ] **Step 2: Build check**

Run: `cd admin && npx vite build 2>&1 | tail -20`

Expected: Build passes

- [ ] **Step 3: Final commit**

```bash
git add admin/src/pages/Landing.svelte
git commit -m "feat: finalize Landing page with all sections and dividers"
```
