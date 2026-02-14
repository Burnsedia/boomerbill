<script setup lang="ts">
import Totals from './Totals.vue'
import Dashboard from './Dashboard.vue'
import Leaderboard from './Leaderboard.vue'
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2">
    <div class="md:col-span-2 card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-2">
        <h2 class="card-title">Lifetime Damage</h2>
        <Totals />
      </div>
    </div>

    <div class="md:col-span-2">
      <Dashboard />
    </div>

    <div class="md:col-span-2 card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <h2 class="card-title">Leaderboard</h2>
        <Leaderboard />
      </div>
    </div>
  </div>
</template>
