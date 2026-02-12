<script setup lang="ts">
// Ensure Chart.js is registered before vue-chartjs imports
import '../charts/chartInit'

import { computed } from 'vue'
import { Pie } from 'vue-chartjs'
import { useBoomerBill } from '../store/boomerbills'

const store = useBoomerBill()

const chartData = computed(() => {
  const data = store.sessionDurationDistribution

  return {
    labels: data.map(d => `${d.label} (${d.percentage.toFixed(1)}%)`),
    datasets: [{
      label: 'Sessions',
      data: data.map(d => d.count),
      backgroundColor: [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)'
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)'
      ],
      borderWidth: 1
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
    },
    title: {
      display: true,
      text: 'Session Duration Distribution',
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const data = store.sessionDurationDistribution[context.dataIndex]
          return [
            `Count: ${data.count}`,
            `Avg Cost: $${(data.totalCost / data.count || 0).toFixed(2)}`,
            `Total Cost: $${data.totalCost.toFixed(2)}`
          ]
        }
      }
    }
  },
}
</script>

<template>
  <div class="h-64">
    <Pie :data="chartData" :options="chartOptions" />
  </div>
</template>