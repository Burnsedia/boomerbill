<script setup lang="ts">
import { ref } from 'vue'
import { useBoomerBill } from '../store/boomerbills'
import ChartTypeToggle from './ChartTypeToggle.vue'
import BoomerChart from './BoomerChart.vue'
import CategoryChart from './CategoryChart.vue'
import TrendChart from './TrendChart.vue'

const store = useBoomerBill()
const chartType = ref<'bar' | 'pie' | 'doughnut'>('bar')
const activeChart = ref<'boomers' | 'categories' | 'trends'>('boomers')
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <div class="card bg-base-200 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-2xl">📊 Analytics</h2>
        <p class="text-sm opacity-60">Visualize your tech support pain</p>
        
        <!-- Chart Type Selector -->
        <div class="flex flex-wrap items-center gap-4 mt-4">
          <span class="text-sm font-semibold">Chart Type:</span>
          <ChartTypeToggle v-model="chartType" />
        </div>
        
        <!-- Chart Tabs -->
        <div class="tabs tabs-boxed mt-6">
          <button
            class="tab"
            :class="{ 'tab-active': activeChart === 'boomers' }"
            @click="activeChart = 'boomers'"
          >
            💸 By Boomer
          </button>
          <button
            class="tab"
            :class="{ 'tab-active': activeChart === 'categories' }"
            @click="activeChart = 'categories'"
          >
            ⏱️ By Category
          </button>
          <button
            class="tab"
            :class="{ 'tab-active': activeChart === 'trends' }"
            @click="activeChart = 'trends'"
          >
            📈 Trends Over Time
          </button>
        </div>
        
        <!-- Chart Display -->
        <div class="mt-6 p-4 bg-base-100 rounded-lg">
          <div v-if="store.sessions.length === 0" class="text-center py-12 text-opacity-60">
            No data to display yet.<br>
            Start tracking sessions to see charts!
          </div>
          
          <BoomerChart v-else-if="activeChart === 'boomers'" :type="chartType" />
          <CategoryChart v-else-if="activeChart === 'categories'" :type="chartType" />
          <TrendChart v-else />
        </div>
      </div>
    </div>
  </div>
</template>
