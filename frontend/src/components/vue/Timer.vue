<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useBoomerBill } from './store/boomerbills'

const store = useBoomerBill()

// Presets (unchanged)
const presets = [
  { label: 'Just one quick thing', min: 5 },
  { label: 'Wi-Fi stopped working', min: 15 },
  { label: 'Printer issue', min: 30 },
  { label: 'I broke something', min: 60 }
]

// ─────────────────────────────────────────────
// TICKING CLOCK (UI ONLY)
// ─────────────────────────────────────────────
const now = ref(Date.now())
let interval = null

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

const minutes = computed(() =>
  Math.floor(elapsedMs.value / 60000)
)

const seconds = computed(() =>
  Math.floor((elapsedMs.value % 60000) / 1000)
)

const liveCost = computed(() =>
  ((elapsedMs.value / 3600000) * store.rate).toFixed(2)
)
</script>

<template>
  <!-- Controls -->
  <div class="flex gap-2 items-center">
    <button class="btn btn-success" :disabled="store.startTime" @click="store.start()">
      Start
    </button>

    <button class="btn btn-error" :disabled="!store.startTime" @click="store.stop()">
      Stop
    </button>

    <!-- NEW: ticking timer + cost -->
    <span v-if="store.startTime" class="font-mono text-sm opacity-70 ml-2">
      {{ minutes }}:{{ String(seconds).padStart(2, '0') }}
      ·
      ${{ liveCost }}
    </span>
  </div>

  <!-- Warning text (unchanged) -->
  <p v-if="store.startTime" class="text-xs text-warning mt-2">
    You are currently losing money.
  </p>

  <!-- Quick Adds (unchanged layout) -->
  <div class="flex flex-wrap gap-2 mt-3">
    <button v-for="p in presets" :key="p.label" class="btn btn-xs btn-outline"
      @click="store.addSession(p.min, p.label)">
      {{ p.label }} ({{ p.min }}m)
    </button>
  </div>
</template>
