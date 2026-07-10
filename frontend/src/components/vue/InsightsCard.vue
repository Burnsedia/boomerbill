<script setup lang="ts">
import { computed } from 'vue'
import { useBoomerBill } from './store/boomerbills'

const store = useBoomerBill()

const topBoomer = computed(() => store.boomerLeaderboard[0])
const topCategory = computed(() => store.categoryLeaderboard[0])

const avgSessionMinutes = computed(() => {
  if (store.incidentCount === 0) return 0
  return store.totals.minutes / store.incidentCount
})

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}
</script>

<template>
  <div class="card-standard rounded-lg shadow-none border-0">
    <div class="card-body p-0">
      <div class="stats stats-vertical lg:stats-horizontal bg-transparent">
        <div class="stat px-2">
          <div class="stat-title text-base-content/60">Most Expensive Boomer</div>
          <div class="stat-value text-primary text-xl">
            {{ topBoomer?.boomer.name || 'No victims yet' }}
          </div>
          <div class="stat-desc text-base-content/50">
            {{ topBoomer ? `$${topBoomer.cost.toFixed(2)} drained` : 'Add a session to unlock' }}
          </div>
        </div>
        <div class="stat px-2">
          <div class="stat-title text-base-content/60">Most Time-Wasting Category</div>
          <div class="stat-value text-secondary text-xl">
            {{ topCategory?.category.name || 'No chaos yet' }}
          </div>
          <div class="stat-desc text-base-content/50">
            {{ topCategory ? `${topCategory.minutes}m lost` : 'Log something to begin' }}
          </div>
        </div>
        <div class="stat px-2">
          <div class="stat-title text-base-content/60">Today's Damage</div>
          <div class="stat-value text-error text-xl">${{ store.todayStats.cost.toFixed(2) }}</div>
          <div class="stat-desc text-base-content/50">{{ store.todayStats.count }} incident{{ store.todayStats.count !== 1 ? 's' : '' }}</div>
        </div>
        <div class="stat px-2">
          <div class="stat-title text-base-content/60">Average Session Time</div>
          <div class="stat-value text-xl">{{ formatMinutes(avgSessionMinutes) }}</div>
          <div class="stat-desc text-base-content/50">{{ store.incidentCount }} session{{ store.incidentCount !== 1 ? 's' : '' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
