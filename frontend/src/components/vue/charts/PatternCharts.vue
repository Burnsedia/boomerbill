<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { useBoomerBill } from '../store/boomerbills'

const store = useBoomerBill()

const hourlyChartData = computed(() => {
  const data = store.hourlyPatterns

  return {
    labels: data.map(d => `${d.hour}:00`),
    datasets: [{
      label: 'Avg Cost ($)',
      data: data.map(d => d.avgCost),
      backgroundColor: 'rgba(255, 99, 132, 0.6)',
      borderColor: 'rgba(255, 99, 132, 1)',
      borderWidth: 1
    }, {
      label: 'Avg Minutes',
      data: data.map(d => d.avgMinutes),
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  }
})

const dayOfWeekChartData = computed(() => {
  const data = store.dayOfWeekPatterns

  return {
    labels: data.map(d => d.dayName),
    datasets: [{
      label: 'Avg Cost ($)',
      data: data.map(d => d.avgCost),
      backgroundColor: 'rgba(255, 206, 86, 0.6)',
      borderColor: 'rgba(255, 206, 86, 1)',
      borderWidth: 1
    }, {
      label: 'Avg Minutes',
      data: data.map(d => d.avgMinutes),
      backgroundColor: 'rgba(75, 192, 192, 0.6)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div>
      <h3 class="text-lg font-semibold mb-4">Hourly Patterns</h3>
      <div class="h-64">
        <Bar :data="hourlyChartData" :options="{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { display: true, text: 'Average by Hour of Day' } } }" />
      </div>
    </div>
    <div>
      <h3 class="text-lg font-semibold mb-4">Weekly Patterns</h3>
      <div class="h-64">
        <Bar :data="dayOfWeekChartData" :options="{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { display: true, text: 'Average by Day of Week' } } }" />
      </div>
    </div>
  </div>
</template>