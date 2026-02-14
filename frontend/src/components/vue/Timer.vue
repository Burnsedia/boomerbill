<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useBoomerBill } from './store/boomerbills'

const store = useBoomerBill()
const note = ref('')

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

</script>

<template>
  <!-- Controls -->
  <div class="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
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

</template>
