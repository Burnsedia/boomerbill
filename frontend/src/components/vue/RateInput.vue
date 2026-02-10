<script setup>
import { ref, onMounted, watch } from 'vue'

const rate = ref(75)

// ✅ browser-only
onMounted(() => {
  const saved = localStorage.getItem('boomerbill_rate')
  if (saved) rate.value = Number(saved)
})

watch(rate, (val) => {
  localStorage.setItem('boomerbill_rate', val)
})
</script>

<template>
  <label>
    Hourly Rate ($)
    <small>(default: avg US developer)</small>
  </label>
  <input type="number" v-model="rate" />
</template>
