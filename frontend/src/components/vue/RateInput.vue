<script setup>
import { ref, watch } from 'vue'

const rate = ref(localStorage.getItem('boomerbill_rate') || 75)

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
