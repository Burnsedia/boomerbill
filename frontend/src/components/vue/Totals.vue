<script setup>
import { useBoomerBill } from './store/boomerbills'
const store = useBoomerBill()
</script>

<template>
  <div class="stats shadow bg-transparent">

    <div class="stat px-2">
      <div class="stat-title text-base-content/60">Incidents</div>
      <div class="stat-value font-mono">
        {{ store.incidentCount }}
      </div>
    </div>

    <div class="stat px-2">
      <div class="stat-title text-base-content/60">Total Damage</div>
      <div class="stat-value font-mono text-error">
        ${{ store.totals.cost.toFixed(2) }}
      </div>
    </div>

  </div>

  <p class="text-xs text-base-content/50 mt-2">
    {{ store.weeklySummary }}
  </p>
</template>
