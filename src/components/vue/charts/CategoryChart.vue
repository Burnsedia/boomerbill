<script setup lang="ts">
import { computed } from 'vue'
import { Bar, Pie, Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement } from 'chart.js'
import { useBoomerBill } from '../store/boomerbills'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement)

const store = useBoomerBill()

const props = defineProps<{
  type: 'bar' | 'pie' | 'doughnut'
}>()

const chartData = computed(() => store.categoryChartData)

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
      text: 'Time Wasted by Category'
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
