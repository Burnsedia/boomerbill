<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useBoomerBill } from './store/boomerbills'
import ActiveSession from './ActiveSession.vue'
import BoomerSelect from './BoomerSelect.vue'
import CategoryGrid from './CategoryGrid.vue'
import RateInput from './RateInput.vue'
import Timer from './Timer.vue'

const store = useBoomerBill()
const showSetup = ref(false)
const isMobile = ref(false)

const hasSelection = computed(() => !!store.selectedBoomer && !!store.selectedCategory)

const statusLabel = computed(() => {
  if (store.isRunning) return 'Running'
  if (!hasSelection.value) return 'Needs selection'
  return 'Ready'
})

const statusClass = computed(() => {
  if (store.isRunning) return 'badge-success'
  if (!hasSelection.value) return 'badge-warning'
  return 'badge-ghost'
})

const selectionSummary = computed(() => {
  const boomer = store.selectedBoomer?.name ?? 'Select boomer'
  const category = store.selectedCategory?.name ?? 'Select category'
  const rate = `$${store.rate}/hr`
  return `${boomer} - ${category} - ${rate}`
})

const lastSession = computed(() => store.sessionDetails[0])

const lastSessionSummary = computed(() => {
  if (!lastSession.value) return ''
  const minutes = `${lastSession.value.minutes}m`
  const cost = `$${lastSession.value.cost.toFixed(2)}`
  const note = lastSession.value.note ? `- ${lastSession.value.note}` : ''
  return `${minutes} - ${cost} ${note}`.trim()
})

function updateIsMobile() {
  isMobile.value = window.innerWidth < 768
  if (isMobile.value && !store.isRunning) {
    showSetup.value = true
  }
}

onMounted(() => {
  updateIsMobile()
  if (isMobile.value) {
    showSetup.value = true
  }
  window.addEventListener('resize', updateIsMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
})

watch(
  () => store.isRunning,
  (isRunning) => {
    if (!isMobile.value) return
    showSetup.value = !isRunning
  }
)
</script>

<template>
  <div class="grid gap-4">
    <div class="card bg-base-200 border border-primary shadow-lg w-full">
      <div class="card-body gap-4">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-3">
            <h2 class="card-title">Session</h2>
            <span class="badge badge-sm" :class="statusClass">
              {{ statusLabel }}
            </span>
          </div>
          <p class="text-xs opacity-70 break-words">
            {{ selectionSummary }}
          </p>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold">Setup</div>
              <button v-if="isMobile" class="btn btn-xs btn-ghost" @click="showSetup = !showSetup">
                {{ showSetup ? 'Hide' : 'Show' }} Setup
              </button>
            </div>

            <div v-show="!isMobile || showSetup" class="space-y-4">
              <BoomerSelect />
              <CategoryGrid />
              <p v-if="!hasSelection" class="text-xs text-warning">
                Pick a boomer and category to enable Start.
              </p>
            </div>
          </div>

          <div class="space-y-4 md:border-l md:border-base-300 md:pl-6">
            <div class="text-sm font-semibold">Live Session</div>
            <div class="md:hidden text-xs opacity-70 bg-base-300 rounded-lg px-3 py-2">
              {{ selectionSummary }}
            </div>
            <ActiveSession />
            <Timer @request-setup="showSetup = true" />
            <div v-if="lastSession" class="text-xs opacity-70">
              Last session: {{ lastSessionSummary }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
