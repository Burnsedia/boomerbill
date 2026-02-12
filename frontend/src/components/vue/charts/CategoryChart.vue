<script setup lang="ts">
import { computed } from 'vue'
import { Bar, Pie, Doughnut } from 'vue-chartjs'
import { useBoomerBill } from '../store/boomerbills'

const store = useBoomerBill()

const props = defineProps<{
  type: 'bar' | 'pie' | 'doughnut'
}>()

const chartData = computed(() => store.categoryChartData)

const totalMinutes = computed(() => {
  const data = chartData.value.datasets[0]?.data || []
  return data.reduce((sum, val) => sum + val, 0)
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: props.type !== 'bar',
      position: 'bottom' as const
    },
    title: {
      display: true,
      text: 'Time by Category'
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const value = context.parsed.y
          const percent = totalMinutes.value > 0 ? ((value / totalMinutes.value) * 100).toFixed(1) : '0'
          return `${context.label}: ${value} mins (${percent}%)`
        }
      }
    }
  }
}

const chartComponent = computed(() => {
  switch (props.type) {
    case 'pie': return Pie
    case 'doughnut': return Doughnut
    default: return Bar
  }
})
</script>

<template>
  <div class="h-64 sm:h-80">
    <component
      :is="chartComponent"
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>
