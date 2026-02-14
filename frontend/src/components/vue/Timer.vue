<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useBoomerBill } from './store/boomerbills'

const store = useBoomerBill()
const note = ref('')

const presets = [
  { label: 'Just one quick thing', min: 5 },
  { label: 'Wi-Fi stopped working', min: 15 },
  { label: 'Printer issue', min: 30 },
  { label: 'I broke something', min: 60 }
]

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

const canStart = computed(() => !!store.selectedBoomerId && !!store.selectedCategoryId)

const elapsedMs = computed(() => {
  if (!store.startTime) return 0
  return now.value - store.startTime
})

const minutes = computed(() => Math.floor(elapsedMs.value / 60000))

const seconds = computed(() => Math.floor((elapsedMs.value % 60000) / 1000))

const liveCost = computed(() =>
  ((elapsedMs.value / 3600000) * store.rate).toFixed(2)
)

function handleStart() {
  if (!canStart.value) {
    alert('Select a boomer and category first.')
    return
  }
  store.start()
}

function handleStop() {
  store.stop(note.value.trim() || undefined)
  note.value = ''
}

function addQuickSession(minutes: number, label: string) {
  if (!canStart.value) {
    alert('Select a boomer and category first.')
    return
  }
  store.addSession({ minutes, note: label })
}
</script>

<template>
  <!-- Controls -->
  <div class="flex gap-2 items-center">
    <button class="btn btn-success" :disabled="store.startTime || !canStart" @click="handleStart">
      Start
    </button>

    <button class="btn btn-error" :disabled="!store.startTime" @click="handleStop">
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
  <div v-if="store.startTime" class="mt-3">
    <label class="label">
      <span class="label-text">Session Note (optional)</span>
    </label>
    <input
      v-model="note"
      type="text"
      class="input input-bordered w-full"
      placeholder="What did you fix?"
    />
  </div>

  <p v-if="store.startTime" class="text-xs text-warning mt-2">
    You are currently losing money.
  </p>

  <!-- Quick Adds (unchanged layout) -->
  <div class="flex flex-wrap gap-2 mt-3">
    <button
      v-for="p in presets"
      :key="p.label"
      class="btn btn-xs btn-outline"
      :disabled="!canStart || store.startTime"
      @click="addQuickSession(p.min, p.label)"
    >
      {{ p.label }} ({{ p.min }}m)
    </button>
  </div>
</template>
