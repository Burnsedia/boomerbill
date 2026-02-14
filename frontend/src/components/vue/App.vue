<script setup lang="ts">
import { createPinia } from 'pinia'
import { onMounted, getCurrentInstance } from 'vue'
import { useBoomerBill } from './store/boomerbills'

import RateInput from './RateInput.vue'
import Timer from './Timer.vue'
import Totals from './Totals.vue'
import Dashboard from './Dashboard.vue'
import Leaderboard from './Leaderboard.vue'

// 🔑 create ONE pinia instance
const pinia = createPinia()

// 🔑 install it on the Vue app (THIS WAS MISSING)
const app = getCurrentInstance()?.appContext.app
app?.use(pinia)

// 🔑 now get the store (NO args)
const store = useBoomerBill()

onMounted(() => {
  store.load()
})
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2">
    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-4">
        <h2 class="card-title">Session</h2>
        <RateInput />
      </div>
    </div>
    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-4">
        <h2 class="card-title">Session</h2>
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
