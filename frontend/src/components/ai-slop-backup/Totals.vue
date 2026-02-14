<script setup>
import { useBoomerBill } from './store/boomerbills'
const store = useBoomerBill()
</script>

<template>
  <div class="stats shadow">

    <div class="stat">
      <div class="stat-title">Incidents</div>
      <div class="stat-value font-mono">
        {{ store.incidentCount }}
      </div>
    </div>

    <div class="stat">
      <div class="stat-title">Total Damage</div>
      <div class="stat-value font-mono text-error">
        ${{ store.totals.cost.toFixed(2) }}
      </div>
    </div>

  </div>

  <p class="text-xs opacity-60 mt-2">
    {{ store.weeklySummary }}
  </p>
</template>
