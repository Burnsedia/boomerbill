<script setup>
import { computed } from 'vue'

const totals = computed(() => {
  const sessions =
    JSON.parse(localStorage.getItem('boomerbill_sessions') || '[]')

  return sessions.reduce(
    (acc, s) => {
      acc.minutes += s.minutes
      acc.cost += s.cost
      return acc
    },
    { minutes: 0, cost: 0 }
  )
})
</script>

<template>
  <p>Total Time: {{ totals.minutes }} minutes</p>
  <p>Total Cost: ${{ totals.cost.toFixed(2) }}</p>
</template>
