<script setup>
import { ref, onMounted } from 'vue'

const entries = ref([])

onMounted(async () => {
  const res = await fetch(import.meta.env.VITE_API_URL + '/leaderboard')
  entries.value = await res.json()
})
</script>

<template>
  <ul>
    <li v-for="e in entries" :key="e.nickname">
      {{ e.nickname }} — ${{ e.cost.toFixed(2) }}
    </li>
  </ul>
</template>
