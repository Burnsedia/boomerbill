<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBoomerBill } from './store/boomerbills'
import Totals from './Totals.vue'
import TimeStatCard from './TimeStatCard.vue'
import InsightsCard from './InsightsCard.vue'
import LeaderboardTabs from './LeaderboardTabs.vue'

const store = useBoomerBill()

const currentPeriodBoomerId = ref<string | null>(null)
const historicalBoomerId = ref<string | null>(null)
const averagesBoomerId = ref<string | null>(null)

function filterByBoomer(sessions: typeof store.sessions, boomerId: string | null) {
  if (!boomerId) return sessions
  return sessions.filter(session => session.boomerId === boomerId)
}

function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function getStartOfWeek(timestamp: number): number {
  const date = new Date(timestamp)
  const day = date.getDay()
  const diff = date.getDate() - day
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function getStartOfMonth(timestamp: number): number {
  const date = new Date(timestamp)
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function getStartOfYear(timestamp: number): number {
  const date = new Date(timestamp)
  date.setMonth(0, 1)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const averagesSessions = computed(() => filterByBoomer(store.sessions, averagesBoomerId.value))

const filteredSessionDetails = computed(() => {
  return averagesSessions.value
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
  if (averagesSessions.value.length === 0) return 0
  const totalCost = averagesSessions.value.reduce((sum, session) => sum + session.cost, 0)
  return totalCost / averagesSessions.value.length
})

const filteredTotals = computed(() => {
  return averagesSessions.value.reduce(
    (acc, session) => {
      acc.minutes += session.minutes
      acc.cost += session.cost
      return acc
    },
    { minutes: 0, cost: 0 }
  )
})

const filteredAvgSessionTime = computed(() => {
  if (averagesSessions.value.length === 0) return 0
  return filteredTotals.value.minutes / averagesSessions.value.length
})

const filteredAvgSessionTimeRounded = computed(() => {
  return Math.round(filteredAvgSessionTime.value)
})

const currentPeriodSessions = computed(() => filterByBoomer(store.sessions, currentPeriodBoomerId.value))
const historicalSessions = computed(() => filterByBoomer(store.sessions, historicalBoomerId.value))

const currentTodayStats = computed(() => {
  const startOfDay = getStartOfDay(Date.now())
  const today = currentPeriodSessions.value.filter(s => s.endedAt >= startOfDay)
  return today.reduce(
    (acc, session) => {
      acc.minutes += session.minutes
      acc.cost += session.cost
      return acc
    },
    { minutes: 0, cost: 0, count: today.length }
  )
})

const currentWeekStats = computed(() => {
  const startOfWeek = getStartOfWeek(Date.now())
  const week = currentPeriodSessions.value.filter(s => s.endedAt >= startOfWeek)
  return week.reduce(
    (acc, session) => {
      acc.minutes += session.minutes
      acc.cost += session.cost
      return acc
    },
    { minutes: 0, cost: 0, count: week.length }
  )
})

const currentMonthStats = computed(() => {
  const startOfMonth = getStartOfMonth(Date.now())
  const month = currentPeriodSessions.value.filter(s => s.endedAt >= startOfMonth)
  return month.reduce(
    (acc, session) => {
      acc.minutes += session.minutes
      acc.cost += session.cost
      return acc
    },
    { minutes: 0, cost: 0, count: month.length }
  )
})

const historicalYearStats = computed(() => {
  const startOfYear = getStartOfYear(Date.now())
  const year = historicalSessions.value.filter(s => s.endedAt >= startOfYear)
  return year.reduce(
    (acc, session) => {
      acc.minutes += session.minutes
      acc.cost += session.cost
      return acc
    },
    { minutes: 0, cost: 0, count: year.length }
  )
})

const historicalTotals = computed(() => {
  return historicalSessions.value.reduce(
    (acc, session) => {
      acc.minutes += session.minutes
      acc.cost += session.cost
      return acc
    },
    { minutes: 0, cost: 0 }
  )
})

const historicalIncidentCount = computed(() => historicalSessions.value.length)

const lastSessionSummary = computed(() => {
  if (!lastSession.value) return 'No sessions yet.'
  const when = new Date(lastSession.value.endedAt).toLocaleString()
  return `${lastSession.value.boomerName} - ${lastSession.value.categoryName} - $${lastSession.value.cost.toFixed(2)} - ${when}`
})
</script>

<template>
  <div class="space-y-6">
    <InsightsCard />

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="card-title">Lifetime Damage</h2>
          <div class="text-xs opacity-60">Last session: {{ lastSessionSummary }}</div>
        </div>
        <Totals />
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

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <h3 class="card-title font-mono">Averages</h3>
        <div class="mt-2">
          <div class="label">
            <span class="label-text">Filter by Boomer</span>
          </div>
          <div class="filter flex flex-wrap gap-2 overflow-x-auto whitespace-nowrap">
            <input
              class="btn btn-sm filter-reset"
              type="radio"
              name="avg-boomer"
              aria-label="All"
              :checked="averagesBoomerId === null"
              @change="averagesBoomerId = null"
            />
            <input
              v-for="boomer in store.boomers"
              :key="boomer.id"
              class="btn btn-sm"
              type="radio"
              name="avg-boomer"
              :aria-label="boomer.name"
              :checked="averagesBoomerId === boomer.id"
              @change="averagesBoomerId = boomer.id"
            />
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TimeStatCard
            title="Avg Session Time"
            :minutes="filteredAvgSessionTimeRounded"
            :cost="store.costPerMinute * filteredAvgSessionTime"
            :count="0"
            :costPrecision="2"
          />
          <TimeStatCard
            title="Avg Cost / Session"
            :minutes="filteredAvgSessionTimeRounded"
            :cost="avgCostPerSession"
            :count="0"
            :costPrecision="2"
          />
        </div>
      </div>
    </div>

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <h3 class="card-title font-mono">Current Period Damage</h3>
        <div class="mt-2">
          <div class="label">
            <span class="label-text">Filter by Boomer</span>
          </div>
          <div class="filter flex flex-wrap gap-2 overflow-x-auto whitespace-nowrap">
            <input
              class="btn btn-sm filter-reset"
              type="radio"
              name="current-boomer"
              aria-label="All"
              :checked="currentPeriodBoomerId === null"
              @change="currentPeriodBoomerId = null"
            />
            <input
              v-for="boomer in store.boomers"
              :key="boomer.id"
              class="btn btn-sm"
              type="radio"
              name="current-boomer"
              :aria-label="boomer.name"
              :checked="currentPeriodBoomerId === boomer.id"
              @change="currentPeriodBoomerId = boomer.id"
            />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <TimeStatCard
            title="Today's Damage"
            :minutes="currentTodayStats.minutes"
            :cost="currentTodayStats.cost"
            :count="currentTodayStats.count"
          />
          <TimeStatCard
            title="This Week's Damage"
            :minutes="currentWeekStats.minutes"
            :cost="currentWeekStats.cost"
            :count="currentWeekStats.count"
          />
          <TimeStatCard
            title="This Month's Damage"
            :minutes="currentMonthStats.minutes"
            :cost="currentMonthStats.cost"
            :count="currentMonthStats.count"
          />
        </div>
      </div>
    </div>

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <details class="collapse collapse-arrow md:collapse-open">
          <summary class="collapse-title font-mono text-lg">Historical Damage</summary>
          <div class="collapse-content">
            <div class="mb-4">
              <div class="label">
                <span class="label-text">Filter by Boomer</span>
              </div>
              <div class="filter flex flex-wrap gap-2 overflow-x-auto whitespace-nowrap">
                <input
                  class="btn btn-sm filter-reset"
                  type="radio"
                  name="historical-boomer"
                  aria-label="All"
                  :checked="historicalBoomerId === null"
                  @change="historicalBoomerId = null"
                />
                <input
                  v-for="boomer in store.boomers"
                  :key="boomer.id"
                  class="btn btn-sm"
                  type="radio"
                  name="historical-boomer"
                  :aria-label="boomer.name"
                  :checked="historicalBoomerId === boomer.id"
                  @change="historicalBoomerId = boomer.id"
                />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <TimeStatCard
                title="This Year's Damage"
                :minutes="historicalYearStats.minutes"
                :cost="historicalYearStats.cost"
                :count="historicalYearStats.count"
              />
              <TimeStatCard
                title="All-Time Totals"
                :minutes="historicalTotals.minutes"
                :cost="historicalTotals.cost"
                :count="historicalIncidentCount"
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
