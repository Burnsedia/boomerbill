<script setup lang="ts">
import { computed } from 'vue'
import { useBoomerBill } from './store/boomerbills'
import Totals from './Totals.vue'
import TimeStatCard from './TimeStatCard.vue'
import InsightsCard from './InsightsCard.vue'
import LeaderboardTabs from './LeaderboardTabs.vue'

const store = useBoomerBill()

const filteredSessions = computed(() => store.filteredSessions)

const filteredSessionDetails = computed(() => {
  return filteredSessions.value
    .map(session => {
      const boomer = store.boomers.find(b => b.id === session.boomerId)
      const category = store.categories.find(c => c.id === session.categoryId)
      return {
        ...session,
        boomerName: boomer?.name || 'Unknown',
        categoryName: category?.name || 'Unknown'
      }
    })
    .sort((a, b) => b.endedAt - a.endedAt)
})

const lastSession = computed(() => filteredSessionDetails.value[0])
const recentSessions = computed(() => filteredSessionDetails.value.slice(0, 3))

const topBoomer = computed(() => store.boomerLeaderboard[0])
const topCategory = computed(() => store.categoryLeaderboard[0])
const mostFrequentCategory = computed(() => {
  if (store.categoryLeaderboard.length === 0) return null
  return store.categoryLeaderboard.reduce((max, current) =>
    current.count > max.count ? current : max
  )
})

const peakDayMinutes = computed(() => {
  if (!store.peakDayThisMonth.day) return 0
  return store.sessions
    .filter(session => new Date(session.startedAt).toDateString() === store.peakDayThisMonth.day)
    .reduce((total, session) => total + session.minutes, 0)
})

const avgCostPerSession = computed(() => {
  if (filteredSessions.value.length === 0) return 0
  const totalCost = filteredSessions.value.reduce((sum, session) => sum + session.cost, 0)
  return totalCost / filteredSessions.value.length
})

const filteredTotals = computed(() => {
  return filteredSessions.value.reduce(
    (acc, session) => {
      acc.minutes += session.minutes
      acc.cost += session.cost
      return acc
    },
    { minutes: 0, cost: 0 }
  )
})

const filteredAvgSessionTime = computed(() => {
  if (filteredSessions.value.length === 0) return 0
  return filteredTotals.value.minutes / filteredSessions.value.length
})

const filterCount = computed(() => {
  return store.filteredBoomers.length + store.filteredCategories.length
})

function toggleBoomer(id: string) {
  if (store.filteredBoomers.includes(id)) {
    store.filteredBoomers = store.filteredBoomers.filter(item => item !== id)
    return
  }
  store.filteredBoomers = [...store.filteredBoomers, id]
}

function toggleCategory(id: string) {
  if (store.filteredCategories.includes(id)) {
    store.filteredCategories = store.filteredCategories.filter(item => item !== id)
    return
  }
  store.filteredCategories = [...store.filteredCategories, id]
}

function clearDashboardFilters() {
  store.filteredBoomers = []
  store.filteredCategories = []
}

const lastSessionSummary = computed(() => {
  if (!lastSession.value) return 'No sessions yet.'
  const when = new Date(lastSession.value.endedAt).toLocaleString()
  return `${lastSession.value.boomerName} - ${lastSession.value.categoryName} - $${lastSession.value.cost.toFixed(2)} - ${when}`
})
</script>

<template>
  <div class="space-y-6">
    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="card-title">Lifetime Damage</h2>
          <div class="text-xs opacity-60">Last session: {{ lastSessionSummary }}</div>
        </div>
        <Totals />
      </div>
    </div>

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="card-title text-base">Dashboard Filters</h3>
          <button class="btn btn-ghost btn-sm" @click="clearDashboardFilters">
            Clear Filters
          </button>
        </div>
        <div class="mt-2 text-xs opacity-60">
          Filters apply to Averages & Efficiency and Recent Sessions.
        </div>

        <div class="grid gap-4 mt-4 md:grid-cols-2">
          <div class="space-y-2">
            <label class="label">
              <span class="label-text">Boomers</span>
            </label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="boomer in store.boomers"
                :key="boomer.id"
                class="btn btn-sm"
                :class="store.filteredBoomers.includes(boomer.id) ? 'btn-primary' : 'btn-outline'"
              >
                <input
                  type="checkbox"
                  class="hidden"
                  :checked="store.filteredBoomers.includes(boomer.id)"
                  @change="toggleBoomer(boomer.id)"
                  :aria-label="boomer.name"
                />
                {{ boomer.name }}
              </label>
            </div>
          </div>
          <div class="space-y-2">
            <label class="label">
              <span class="label-text">Categories</span>
            </label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="category in store.categories"
                :key="category.id"
                class="btn btn-sm"
                :class="store.filteredCategories.includes(category.id) ? 'btn-primary' : 'btn-outline'"
              >
                <input
                  type="checkbox"
                  class="hidden"
                  :checked="store.filteredCategories.includes(category.id)"
                  @change="toggleCategory(category.id)"
                  :aria-label="category.name"
                />
                {{ category.name }}
              </label>
            </div>
          </div>
        </div>

        <div class="mt-3 text-xs opacity-60">Active filters: {{ filterCount }}</div>
      </div>
    </div>

    <div v-if="topBoomer || topCategory || store.peakDayThisMonth.day || mostFrequentCategory" class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <h3 class="card-title text-base">Top Culprits</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <div v-if="topBoomer" class="card bg-base-300 border border-base-100">
            <div class="card-body p-4">
              <div class="text-xs opacity-60">Top Boomer</div>
              <div class="text-sm font-semibold">{{ topBoomer.boomer.name }}</div>
              <div class="text-xs opacity-70">${{ topBoomer.cost.toFixed(2) }} total</div>
            </div>
          </div>
          <div v-if="topCategory" class="card bg-base-300 border border-base-100">
            <div class="card-body p-4">
              <div class="text-xs opacity-60">Top Category</div>
              <div class="text-sm font-semibold">{{ topCategory.category.name }}</div>
              <div class="text-xs opacity-70">{{ topCategory.minutes }}m total</div>
            </div>
          </div>
          <div v-if="store.peakDayThisMonth.day" class="card bg-base-300 border border-base-100">
            <div class="card-body p-4">
              <div class="text-xs opacity-60">Peak Day This Month</div>
              <div class="text-sm font-semibold">{{ store.peakDayThisMonth.day }}</div>
              <div class="text-xs opacity-70">${{ store.peakDayThisMonth.cost.toFixed(2) }} total</div>
            </div>
          </div>
          <div v-if="mostFrequentCategory" class="card bg-base-300 border border-base-100">
            <div class="card-body p-4">
              <div class="text-xs opacity-60">Most Frequent Category</div>
              <div class="text-sm font-semibold">{{ mostFrequentCategory.category.name }}</div>
              <div class="text-xs opacity-70">{{ mostFrequentCategory.count }} sessions</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <InsightsCard />

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <h3 class="card-title font-mono">Averages & Efficiency</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <TimeStatCard
            title="Avg Session Time"
            :minutes="filteredAvgSessionTime"
            :cost="store.costPerMinute * filteredAvgSessionTime"
            :count="0"
            :costPrecision="2"
          />
          <TimeStatCard
            title="Avg Cost / Session"
            :minutes="filteredAvgSessionTime"
            :cost="avgCostPerSession"
            :count="0"
            :costPrecision="2"
          />
          <TimeStatCard
            title="Cost Per Minute"
            :minutes="1"
            :cost="store.costPerMinute"
            :count="0"
            :costPrecision="2"
          />
        </div>
      </div>
    </div>

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <h3 class="card-title font-mono">Current Period Damage</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <TimeStatCard
            title="Today's Damage"
            :minutes="store.todayStats.minutes"
            :cost="store.todayStats.cost"
            :count="store.todayStats.count"
            :comparison="store.todayTrend"
          />
          <TimeStatCard
            title="This Week's Damage"
            :minutes="store.weekStats.minutes"
            :cost="store.weekStats.cost"
            :count="store.weekStats.count"
            :comparison="store.weekTrend"
          />
          <TimeStatCard
            title="This Month's Damage"
            :minutes="store.monthStats.minutes"
            :cost="store.monthStats.cost"
            :count="store.monthStats.count"
            :comparison="store.monthTrend"
          />
        </div>
      </div>
    </div>

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <details class="collapse collapse-arrow md:collapse-open">
          <summary class="collapse-title font-mono text-lg">Historical Damage</summary>
          <div class="collapse-content">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <TimeStatCard
                title="This Year's Damage"
                :minutes="store.yearStats.minutes"
                :cost="store.yearStats.cost"
                :count="store.yearStats.count"
                :comparison="store.yearTrend"
              />
              <TimeStatCard
                title="All-Time Totals"
                :minutes="store.totals.minutes"
                :cost="store.totals.cost"
                :count="store.incidentCount"
              />
              <TimeStatCard
                title="Peak Day Cost"
                :minutes="peakDayMinutes"
                :cost="store.peakDayThisMonth.cost"
                :count="store.peakDayThisMonth.count"
              />
            </div>
          </div>
        </details>
      </div>
    </div>

    <div v-if="recentSessions.length > 0" class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <h3 class="card-title text-base">Recent Sessions</h3>
        <div class="space-y-3">
          <div
            v-for="session in recentSessions"
            :key="session.id"
            class="flex flex-wrap items-center justify-between gap-2 bg-base-300 border border-base-100 rounded-lg p-3"
          >
            <div>
              <div class="text-sm font-semibold">{{ session.boomerName }} - {{ session.categoryName }}</div>
              <div class="text-xs opacity-70">{{ new Date(session.endedAt).toLocaleString() }}</div>
            </div>
            <div class="text-right">
              <div class="font-mono font-semibold">${{ session.cost.toFixed(2) }}</div>
              <div class="text-xs opacity-70">{{ session.minutes }}m</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="sticky top-4">
      <LeaderboardTabs />
    </div>
  </div>
</template>
