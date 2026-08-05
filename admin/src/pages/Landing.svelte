<script lang="ts">
  import Hero from '../lib/components/landing/Hero.svelte';
  import Features from '../lib/components/landing/Features.svelte';
  import AppPreview from '../lib/components/landing/AppPreview.svelte';
  import WhySection from '../lib/components/landing/WhySection.svelte';
  import CTASection from '../lib/components/landing/CTASection.svelte';

  let { onlogin }: { onlogin: () => void } = $props();
</script>

<div class="min-h-screen bg-white overflow-x-hidden">
  <Hero {onlogin} />
  <Features />
  <AppPreview />
  <WhySection />
  <CTASection {onlogin} />
</div>
