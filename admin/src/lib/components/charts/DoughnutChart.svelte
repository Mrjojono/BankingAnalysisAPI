<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';

  Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

  let {
    labels = [],
    values = [],
    colors = [],
    class: className = '',
  }: {
    labels: string[];
    values: number[];
    colors: string[];
    class?: string;
  } = $props();

  let canvasEl: HTMLCanvasElement;
  let chart: Chart<'doughnut', number[], string> | null = null;

  function buildChart() {
    if (!canvasEl) return;
    if (chart) chart.destroy();
    chart = new Chart(canvasEl, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '75%',
        plugins: { legend: { display: false } },
      },
    });
  }

  onMount(buildChart);

  $effect(() => {
    labels; values; colors;
    if (chart) buildChart();
  });

  onDestroy(() => {
    chart?.destroy();
    chart = null;
  });
</script>

<canvas
  bind:this={canvasEl}
  class={className}
  style="width: 100%; height: 100%; display: block"
></canvas>
