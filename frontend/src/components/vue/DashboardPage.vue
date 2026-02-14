<script setup lang="ts">
import { useBoomerBill } from './store/boomerbills'
import Totals from './Totals.vue'
import Dashboard from './Dashboard.vue'
import TimeStatCard from './TimeStatCard.vue'
import InsightsCard from './InsightsCard.vue'
import LeaderboardTabs from './LeaderboardTabs.vue'

const store = useBoomerBill()
</script>

<template>
  <div class="space-y-6">
    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-2">
        <h2 class="card-title">Lifetime Damage</h2>
        <Totals />
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
        <h3 class="card-title font-mono">Historical Damage</h3>
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
            title="Avg Session Time"
            :minutes="store.avgSessionTime"
            :cost="store.costPerMinute * store.avgSessionTime"
            :count="0"
          />
        </div>
      </div>
    </div>

    <InsightsCard />

    <Dashboard />

    <LeaderboardTabs />
  </div>
</template>
