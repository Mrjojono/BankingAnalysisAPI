<script lang="ts">
  import Hero from '../lib/components/landing/Hero.svelte';
  import Features from '../lib/components/landing/Features.svelte';
  import WhySection from '../lib/components/landing/WhySection.svelte';
  import DownloadSection from '../lib/components/landing/DownloadSection.svelte';
  import Footer from '../lib/components/landing/Footer.svelte';

  let { onlogin }: { onlogin: () => void } = $props();
</script>

<div class="min-h-screen bg-white">
  <Hero />
  <Features />
  <WhySection />
  <DownloadSection />
  <Footer {onlogin} />
</div>
