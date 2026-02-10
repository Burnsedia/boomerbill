<script setup>
import { useBoomerBill } from './store/boomerbills'
const store = useBoomerBill()

function copySummary() {
  navigator.clipboard.writeText(
    `BoomerBill\nLifetime Damage: $${store.totals.cost.toFixed(2)}`
  )
}

function copyCSV() {
  navigator.clipboard.writeText(store.exportCSV)
}
</script>

<template>
  <div class="flex gap-2 mt-4">
    <button class="btn btn-outline btn-sm" @click="copySummary">
      Copy Summary
    </button>

    <button class="btn btn-outline btn-sm" @click="copyCSV">
      Export CSV
    </button>
  </div>
</template>
