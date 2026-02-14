<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useBoomerBill } from './store/boomerbills'

const store = useBoomerBill()

const now = ref(Date.now())
let interval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  interval = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})

const elapsedMs = computed(() => {
  if (!store.startTime) return 0
  return now.value - store.startTime
})

const minutes = computed(() => Math.floor(elapsedMs.value / 60000))
const seconds = computed(() => Math.floor((elapsedMs.value % 60000) / 1000))
const liveCost = computed(() => ((elapsedMs.value / 3600000) * store.rate).toFixed(2))
</script>

<template>
  <div v-if="store.isRunning && store.currentSessionInfo" class="card bg-primary text-primary-content">
    <div class="card-body">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 class="card-title text-lg">Session Running</h3>
          <p class="text-sm opacity-90 mt-1">
            Helping {{ store.currentSessionInfo.boomer?.name || 'Unknown' }}
          </p>
          <p class="text-xs opacity-75">
            Category: {{ store.currentSessionInfo.category?.name || 'Unknown' }}
          </p>
        </div>
        <div class="text-right">
          <div class="text-3xl font-mono font-bold">
            {{ minutes }}:{{ String(seconds).padStart(2, '0') }}
          </div>
          <div class="text-lg font-mono">${{ liveCost }}</div>
        </div>
      </div>
      <div class="mt-4 text-xs opacity-75">
        Started at {{ new Date(store.currentSessionInfo.startTime || 0).toLocaleTimeString() }}
      </div>
    </div>
  </div>
</template>
