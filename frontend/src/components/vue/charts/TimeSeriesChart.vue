<script setup lang="ts">
// Ensure Chart.js is registered before vue-chartjs imports
import '../charts/chartInit'

import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import { useBoomerBill } from '../store/boomerbills'

const store = useBoomerBill()

const granularity = ref<'daily' | 'weekly' | 'monthly'>('daily')
const metric = ref<'cost' | 'minutes' | 'sessions'>('cost')

const dataSource = computed(() => {
  switch (granularity.value) {
    case 'weekly': return store.weeklyTimeSeries
    case 'monthly': return store.monthlyTimeSeries
    default: return store.timeSeriesData
  }
})

const chartData = computed(() => {
  const data = dataSource.value

  let labels: string[]
  let datasetLabel: string
  let dataPoints: number[]

  switch (granularity.value) {
    case 'weekly':
      labels = data.map(d => `Week of ${new Date(d.week).toLocaleDateString()}`)
      break
    case 'monthly':
      labels = data.map(d => {
        const [year, month] = d.month.split('-')
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      })
      break
    default:
      labels = data.map(d => new Date(d.date).toLocaleDateString())
  }

  switch (metric.value) {
    case 'minutes':
      datasetLabel = 'Time (minutes)'
      dataPoints = data.map(d => d.minutes)
      break
    case 'sessions':
      datasetLabel = 'Sessions'
      dataPoints = data.map(d => d.sessions)
      break
    default:
      datasetLabel = 'Total Cost ($)'
      dataPoints = data.map(d => d.cost)
  }

  return {
    labels,
    datasets: [{
      label: datasetLabel,
      data: dataPoints,
      borderColor: '#4bc0c0',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1
    }]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: true,
      text: `Time Series - ${granularity.value.charAt(0).toUpperCase() + granularity.value.slice(1)} ${metric.value.charAt(0).toUpperCase() + metric.value.slice(1)}`,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
}))
</script>

<template>
  <div class="space-y-4">
    <div class="flex gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Granularity</label>
        <select v-model="granularity" class="select select-bordered select-sm">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Metric</label>
        <select v-model="metric" class="select select-bordered select-sm">
          <option value="cost">Cost</option>
          <option value="minutes">Minutes</option>
          <option value="sessions">Sessions</option>
        </select>
      </div>
    </div>
    <div class="h-64">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>