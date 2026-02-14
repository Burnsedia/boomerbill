<script setup lang="ts">
import { computed } from 'vue'
import { useBoomerBill } from '../store/boomerbills'

const store = useBoomerBill()

const insights = computed(() => {
  const insights: string[] = []
  
  if (store.boomerLeaderboard.value.length > 0) {
    const top = store.boomerLeaderboard.value[0]
    insights.push(`Top boomer: ${top.boomer.name} with $${top.cost.toFixed(0)}`)
  }
  
  if (store.categoryLeaderboard.value.length > 0) {
    const top = store.categoryLeaderboard.value[0]
    insights.push(`Top category: ${top.category.name} with ${top.minutes} mins`)
  }
  
  if (store.todayStats.value.cost > 0) {
    insights.push(`Today's cost: $${store.todayStats.value.cost.toFixed(0)}`)
  }
  
  if (store.incidentCount.value > 0) {
    const avgTime = (store.totals.value.minutes / store.incidentCount.value).toFixed(1)
    insights.push(`Average session: ${avgTime} mins`)
  }
  
  return insights
})
</script>

<template>
  <div class="card bg-base-200 shadow-lg">
    <div class="card-body">
      <h3 class="card-title text-lg">Key Insights</h3>
      <ul class="list-disc list-inside space-y-1">
        <li v-for="insight in insights" :key="insight" class="text-sm">{{ insight }}</li>
      </ul>
    </div>
  </div>
</template>