<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

  Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

  let {
    labels = [],
    values = [],
    color = '#3b82f6',
    colors,
    class: className = '',
  }: {
    labels: string[];
    values: number[];
    color?: string;
    colors?: string[];
    class?: string;
  } = $props();

  let canvasEl: HTMLCanvasElement;
  let chart: Chart<'bar', number[], string> | null = null;

  const bgColors = $derived(colors ?? values.map(() => color));

  function buildChart() {
    if (!canvasEl) return;
    if (chart) chart.destroy();
    chart = new Chart(canvasEl, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: bgColors,
          borderRadius: 4,
          maxBarThickness: 36,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { size: 11 } },
            grid: { color: 'rgba(0,0,0,0.06)' },
          },
          x: {
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              autoSkipPadding: 10,
              font: { size: 11 },
            },
            grid: { display: false },
          },
        },
      },
    });
  }

  onMount(buildChart);

  $effect(() => {
    labels; values; bgColors;
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
  style="display: block"
></canvas>
