<script setup>
import { useBoomerBill } from './store/boomerbills'
const store = useBoomerBill()

function minutesToHours(m) {
  return (m / 60).toFixed(2)
}
</script>

<template>
  <div class="card bg-base-200 shadow-lg border border-primary">
    <div class="card-body gap-4">
      <h2 class="card-title">Damage Dashboard</h2>

      <div class="stats stats-vertical md:stats-horizontal shadow">

        <!-- Per Day -->
        <div class="stat">
          <div class="stat-title">Avg / Day</div>
          <div class="stat-value font-mono">
            {{ minutesToHours(store.avgPerDay) }}h
          </div>
          <div class="stat-desc opacity-60">
            ~$ {{ ((store.avgPerDay / 60) * store.rate).toFixed(2) }}
          </div>
        </div>

        <!-- Per Week -->
        <div class="stat">
          <div class="stat-title">Avg / Week</div>
          <div class="stat-value font-mono">
            {{ minutesToHours(store.avgPerWeek) }}h
          </div>
          <div class="stat-desc opacity-60">
            ~$ {{ ((store.avgPerWeek / 60) * store.rate).toFixed(2) }}
          </div>
        </div>

        <!-- Per Year -->
        <div class="stat">
          <div class="stat-title">Avg / Year</div>
          <div class="stat-value font-mono text-error">
            {{ minutesToHours(store.avgPerYear) }}h
          </div>
          <div class="stat-desc opacity-60">
            ~$ {{ ((store.avgPerYear / 60) * store.rate).toFixed(0) }}
          </div>
        </div>

      </div>

      <p class="text-xs opacity-60">
        Based on {{ store.daysActive }} days of recorded damage.
      </p>
    </div>
  </div>
</template>
