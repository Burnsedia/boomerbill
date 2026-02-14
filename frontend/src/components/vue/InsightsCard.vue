<script setup lang="ts">
import { computed } from 'vue'
import { useBoomerBill } from './store/boomerbills'

const store = useBoomerBill()

const insights = computed(() => {
  const items: string[] = []

  if (store.boomerLeaderboard.length > 0) {
    const top = store.boomerLeaderboard[0]
    items.push(`Top boomer: ${top.boomer.name} with $${top.cost.toFixed(0)}`)
  }

  if (store.categoryLeaderboard.length > 0) {
    const top = store.categoryLeaderboard[0]
    items.push(`Top category: ${top.category.name} with ${top.minutes} mins`)
  }

  if (store.todayStats.cost > 0) {
    items.push(`Today's cost: $${store.todayStats.cost.toFixed(0)}`)
  }

  if (store.incidentCount > 0) {
    const avgTime = (store.totals.minutes / store.incidentCount).toFixed(1)
    items.push(`Average session: ${avgTime} mins`)
  }

  if (store.peakDayThisMonth.day) {
    items.push(`Peak day this month: ${store.peakDayThisMonth.day}`)
  }

  return items
})
</script>

<template>
  <div class="card bg-base-200 shadow-lg border border-primary">
    <div class="card-body">
      <h3 class="card-title text-lg">Key Insights</h3>
      <ul class="list-disc list-inside space-y-1">
        <li v-for="insight in insights" :key="insight" class="text-sm">
          {{ insight }}
        </li>
      </ul>
      <p v-if="insights.length === 0" class="text-sm opacity-60">
        No insights yet. Log a session to unlock them.
      </p>
    </div>
  </div>
</template>
