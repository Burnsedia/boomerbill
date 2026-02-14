<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useBoomerBill } from './store/boomerbills'

const store = useBoomerBill()
const note = ref('')
const emit = defineEmits<{
  (e: 'request-setup'): void
}>()

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
    emit('request-setup')
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
  <div class="hidden md:flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
    <button class="btn btn-success w-full sm:w-auto" :disabled="store.startTime || !canStart" @click="handleStart">
      Start
    </button>

    <button class="btn btn-error w-full sm:w-auto" :disabled="!store.startTime" @click="handleStop">
      Stop
    </button>

    <span v-if="store.startTime" class="font-mono text-sm opacity-70 ml-2">
      {{ minutes }}:{{ String(seconds).padStart(2, '0') }}
      ·
      ${{ liveCost }}
    </span>
  </div>

  <div class="fixed bottom-6 right-6 z-50 md:hidden">
    <button
      class="btn shadow-lg"
      :class="store.startTime ? 'btn-error' : 'btn-primary'"
      :disabled="!store.startTime && !canStart"
      @click="store.startTime ? handleStop() : handleStart()"
    >
      {{ store.startTime ? 'Stop & Save' : 'Start Session' }}
    </button>
    <p v-if="!store.startTime && !canStart" class="mt-2 text-xs text-warning text-right">
      Choose boomer + category
    </p>
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
  <details class="md:hidden mt-3">
    <summary class="btn btn-xs btn-outline w-full">Quick Log</summary>
    <div class="grid grid-cols-2 gap-2 mt-2">
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
  </details>

  <div class="hidden md:grid grid-cols-2 gap-2 mt-3 sm:flex sm:flex-wrap">
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
