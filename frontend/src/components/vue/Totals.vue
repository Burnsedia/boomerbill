<script setup>
import { ref, onMounted, computed } from 'vue'

const sessions = ref([])

// ✅ browser-only
onMounted(() => {
  sessions.value = JSON.parse(
    localStorage.getItem('boomerbill_sessions') || '[]'
  )
})

const totals = computed(() => {
  return sessions.value.reduce(
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
