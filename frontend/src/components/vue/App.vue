<template>
  <div class="grid gap-4 md:grid-cols-2">

    <!-- Left: Controls -->
    <div class="card bg-base-200 shadow">
      <div class="card-body gap-4">
        <h2 class="card-title">Session</h2>

        <RateInput />
        <Timer />
      </div>
    </div>

    <!-- Right: Totals -->
    <div class="card bg-base-200 shadow">
      <div class="card-body gap-2">
        <h2 class="card-title">Lifetime Damage</h2>
        <Totals />
      </div>
    </div>

    <!-- Full Width Leaderboard -->
    <div class="md:col-span-2 card bg-base-200 shadow">
      <div class="card-body">
        <h2 class="card-title">Leaderboard</h2>
        <Leaderboard />
      </div>
    </div>

  </div>
</template>

<script setup>
import RateInput from './RateInput.vue'
import Timer from './Timer.vue'
import Totals from './Totals.vue'
import Leaderboard from './Leaderboard.vue'
</script>
