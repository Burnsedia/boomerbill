<script setup lang="ts">
// Ensure Chart.js is registered before vue-chartjs imports
import '../charts/chartInit'

import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { useBoomerBill } from '../store/boomerbills'

const store = useBoomerBill()

const chartData = computed(() => store.costEfficiencyChartData)

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: true,
      text: 'Cost Efficiency Over Time',
    },
    tooltip: {
      callbacks: {
        label: (context: any) => `$${context.parsed.y.toFixed(2)} per minute`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Cost per Minute ($)'
      }
    },
  },
}
</script>

<template>
  <div class="h-64">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>