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
  <div class="card bg-base-200 shadow-lg border border-primary">
    <div class="card-body">
      <h3 class="card-title text-lg">Key Insights</h3>
      <div class="stats stats-vertical lg:stats-horizontal bg-base-200">
        <div class="stat">
          <div class="stat-title">Most Expensive Boomer</div>
          <div class="stat-value text-primary">
            {{ topBoomer?.boomer.name || 'No victims yet' }}
          </div>
          <div class="stat-desc">
            {{ topBoomer ? `$${topBoomer.cost.toFixed(2)} drained` : 'Add a session to unlock' }}
          </div>
        </div>
        <div class="stat">
          <div class="stat-title">Most Time-Wasting Category</div>
          <div class="stat-value text-secondary">
            {{ topCategory?.category.name || 'No chaos yet' }}
          </div>
          <div class="stat-desc">
            {{ topCategory ? `${topCategory.minutes}m lost` : 'Log something to begin' }}
          </div>
        </div>
        <div class="stat">
          <div class="stat-title">Today's Damage</div>
          <div class="stat-value text-error">${{ store.todayStats.cost.toFixed(2) }}</div>
          <div class="stat-desc">{{ store.todayStats.count }} incident{{ store.todayStats.count !== 1 ? 's' : '' }}</div>
        </div>
        <div class="stat">
          <div class="stat-title">Average Session Time</div>
          <div class="stat-value">{{ formatMinutes(avgSessionMinutes) }}</div>
          <div class="stat-desc">{{ store.incidentCount }} session{{ store.incidentCount !== 1 ? 's' : '' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
