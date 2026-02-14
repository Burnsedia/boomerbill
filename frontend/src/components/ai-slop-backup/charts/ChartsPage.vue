<script setup lang="ts">
import { ref, watch } from 'vue'
import { useBoomerBill } from '../store/boomerbills'
import ChartTypeToggle from './ChartTypeToggle.vue'
import BoomerChart from './BoomerChart.vue'
import CategoryChart from './CategoryChart.vue'
import TrendChart from './TrendChart.vue'
import TimeSeriesChart from './TimeSeriesChart.vue'
import PatternCharts from './PatternCharts.vue'
import EfficiencyChart from './EfficiencyChart.vue'
import DurationDistributionChart from './DurationDistributionChart.vue'
import ComparisonCharts from './ComparisonCharts.vue'

const store = useBoomerBill()

// Filter refs
const startDate = ref('')
const endDate = ref('')

// Watch date changes to update store
watch(startDate, (val) => {
  store.dateRange.start = val ? new Date(val + 'T00:00:00').getTime() : null
})

watch(endDate, (val) => {
  store.dateRange.end = val ? new Date(val + 'T23:59:59').getTime() : null
})
</script>

<template>
  <div class="space-y-6 max-w-6xl mx-auto">
    <div class="card bg-base-200 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-2xl">📊 Comprehensive Analytics</h2>
        <p class="text-sm opacity-60">Multi-dimensional insights into your unpaid tech support</p>
        
        <!-- Filters -->
        <div class="flex flex-wrap gap-4 mt-4">
          <div>
            <label class="label">
              <span class="label-text">Start Date</span>
            </label>
            <input type="date" v-model="startDate" class="input input-bordered input-sm" />
          </div>
          <div>
            <label class="label">
              <span class="label-text">End Date</span>
            </label>
            <input type="date" v-model="endDate" class="input input-bordered input-sm" />
          </div>
          <div>
            <label class="label">
              <span class="label-text">Boomers</span>
            </label>
            <select multiple v-model="store.filteredBoomers" class="select select-bordered select-sm">
              <option v-for="boomer in store.boomers" :value="boomer.id" :key="boomer.id">{{ boomer.name }}</option>
            </select>
          </div>
          <div>
            <label class="label">
              <span class="label-text">Categories</span>
            </label>
            <select multiple v-model="store.filteredCategories" class="select select-bordered select-sm">
              <option v-for="category in store.categories" :value="category.id" :key="category.id">{{ category.name }}</option>
            </select>
          </div>
        </div>
        
        <!-- Summary Stats (Retro Terminal Style) -->
        <div class="card bg-base-200 shadow-lg border border-primary">
          <div class="card-body gap-4">
            <h2 class="card-title font-mono">Analytics Terminal</h2>

            <div class="stats stats-vertical md:stats-horizontal shadow font-mono">

              <!-- Total Sessions -->
              <div class="stat">
                <div class="stat-title">Total Sessions</div>
                <div class="stat-value text-accent">
                  {{ store.filteredSessions.length }}
                </div>
              </div>

              <!-- Total Cost -->
              <div class="stat">
                <div class="stat-title">Total Cost</div>
                <div class="stat-value text-error">
                  $ {{ store.totals.cost.toFixed(0) }}
                </div>
              </div>

              <!-- Total Time -->
              <div class="stat">
                <div class="stat-title">Total Time</div>
                <div class="stat-value text-info">
                  {{ store.totals.minutes }}m
                </div>
              </div>

              <!-- Avg Session -->
              <div class="stat">
                <div class="stat-title">Avg Session</div>
                <div class="stat-value text-secondary">
                  {{ store.avgSessionTime.toFixed(0) }}m
                </div>
              </div>

            </div>

            <p class="text-xs opacity-60 font-mono">
              Based on filtered data. Total recorded: {{ store.sessions.length }} sessions.
            </p>
          </div>
        </div>
        
        <!-- Charts Grid -->
        <div v-if="store.sessions.length === 0" class="text-center py-12 text-opacity-60 mt-6">
          No data to display yet.<br>
          Start tracking sessions to see comprehensive analytics!
        </div>
        <div v-else class="mt-6 space-y-6">
          <!-- Time Series Analysis -->
          <div class="card bg-base-200 shadow-lg border border-primary">
            <div class="card-body">
              <h3 class="card-title font-mono">📈 Time Series Analysis</h3>
              <TimeSeriesChart />
            </div>
          </div>
          
          <!-- Pattern Analysis -->
          <div class="card bg-base-200 shadow-lg border border-primary">
            <div class="card-body">
              <h3 class="card-title font-mono">🔄 Usage Patterns</h3>
              <PatternCharts />
            </div>
          </div>
          
          <!-- Efficiency Analysis -->
          <div class="card bg-base-200 shadow-lg border border-primary">
            <div class="card-body">
              <h3 class="card-title font-mono">💰 Cost Efficiency</h3>
              <EfficiencyChart />
            </div>
          </div>
          
          <!-- Session Distribution -->
          <div class="card bg-base-200 shadow-lg border border-primary">
            <div class="card-body">
              <h3 class="card-title font-mono">⏱️ Session Duration Distribution</h3>
              <DurationDistributionChart />
            </div>
          </div>
          
          <!-- Comparisons -->
          <div class="card bg-base-200 shadow-lg border border-primary">
            <div class="card-body">
              <h3 class="card-title font-mono">🏆 Performance Comparisons</h3>
              <ComparisonCharts />
            </div>
          </div>
          
          <!-- Legacy Charts -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="card bg-base-200 shadow-lg border border-primary">
              <div class="card-body">
                <h3 class="card-title font-mono">💸 By Boomer</h3>
                <BoomerChart type="bar" />
              </div>
            </div>
            <div class="card bg-base-200 shadow-lg border border-primary">
              <div class="card-body">
                <h3 class="card-title">⏱️ By Category</h3>
                <CategoryChart type="bar" />
              </div>
            </div>
           </div>
         </div>
      </div>
    </div>
  </div>
</template>
