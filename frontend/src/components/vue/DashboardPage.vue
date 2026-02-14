<script setup lang="ts">
import BoomerSelect from './BoomerSelect.vue'
import CategoryGrid from './CategoryGrid.vue'
import RateInput from './RateInput.vue'
import Timer from './Timer.vue'
import Totals from './Totals.vue'
import Dashboard from './Dashboard.vue'
import Leaderboard from './Leaderboard.vue'
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2">
    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-4">
        <h2 class="card-title">Session Setup</h2>
        <RateInput />
        <BoomerSelect />
        <CategoryGrid />
      </div>
    </div>

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-4">
        <h2 class="card-title">Session Timer</h2>
        <Timer />
      </div>
    </div>

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
