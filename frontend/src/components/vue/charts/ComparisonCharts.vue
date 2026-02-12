<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { useBoomerBill } from '../store/boomerbills'

const store = useBoomerBill()

const boomerComparisonData = computed(() => {
  const topBoomers = store.boomerLeaderboard.slice(0, 5)

  return {
    labels: topBoomers.map(b => b.boomer.name),
    datasets: [{
      label: 'Total Cost ($)',
      data: topBoomers.map(b => b.cost),
      backgroundColor: 'rgba(255, 99, 132, 0.6)',
      borderColor: 'rgba(255, 99, 132, 1)',
      borderWidth: 1
    }, {
      label: 'Total Minutes',
      data: topBoomers.map(b => b.minutes),
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  }
})

const categoryComparisonData = computed(() => {
  const topCategories = store.categoryLeaderboard.slice(0, 5)

  return {
    labels: topCategories.map(c => c.category.name),
    datasets: [{
      label: 'Total Cost ($)',
      data: topCategories.map(c => c.cost),
      backgroundColor: 'rgba(255, 206, 86, 0.6)',
      borderColor: 'rgba(255, 206, 86, 1)',
      borderWidth: 1
    }, {
      label: 'Total Minutes',
      data: topCategories.map(c => c.minutes),
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
      <h3 class="text-lg font-semibold mb-4">Top Boomers Comparison</h3>
      <div class="h-64">
        <Bar :data="boomerComparisonData" :options="{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { display: true, text: 'Boomer Performance' } } }" />
      </div>
    </div>
    <div>
      <h3 class="text-lg font-semibold mb-4">Top Categories Comparison</h3>
      <div class="h-64">
        <Bar :data="categoryComparisonData" :options="{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { display: true, text: 'Category Performance' } } }" />
      </div>
    </div>
  </div>
</template>