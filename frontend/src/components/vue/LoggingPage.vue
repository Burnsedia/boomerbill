<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useBoomerBill } from './store/boomerbills'

const store = useBoomerBill()

const rows = computed(() => {
  return store.filteredSessions
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

const datePreset = ref<'all' | 'today' | 'week' | 'month' | 'custom'>('all')

const activeFilterCount = computed(() => {
  const dateActive = !!store.dateRange.start || !!store.dateRange.end
  return store.filteredBoomers.length + store.filteredCategories.length + (dateActive ? 1 : 0)
})

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

function applyPreset(preset: 'all' | 'today' | 'week' | 'month') {
  datePreset.value = preset
  const now = Date.now()

  if (preset === 'all') {
    store.dateRange.start = null
    store.dateRange.end = null
    return
  }

  if (preset === 'today') {
    store.dateRange.start = getStartOfDay(now)
    store.dateRange.end = now
    return
  }

  if (preset === 'week') {
    store.dateRange.start = getStartOfWeek(now)
    store.dateRange.end = now
    return
  }

  store.dateRange.start = getStartOfMonth(now)
  store.dateRange.end = now
}

const startDate = computed({
  get() {
    return store.dateRange.start ? new Date(store.dateRange.start).toISOString().slice(0, 10) : ''
  },
  set(value: string) {
    datePreset.value = 'custom'
    store.dateRange.start = value ? new Date(`${value}T00:00:00`).getTime() : null
  }
})

const endDate = computed({
  get() {
    return store.dateRange.end ? new Date(store.dateRange.end).toISOString().slice(0, 10) : ''
  },
  set(value: string) {
    datePreset.value = 'custom'
    store.dateRange.end = value ? new Date(`${value}T23:59:59`).getTime() : null
  }
})

function downloadCsv() {
  const blob = new Blob([store.exportCSV], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'boomerbill-sessions.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function clearAll() {
  if (confirm('Clear all logged sessions? This cannot be undone.')) {
    store.clearAll()
  }
}

function copySummary() {
  navigator.clipboard.writeText(
    `BoomerBill\nLifetime Damage: $${store.totals.cost.toFixed(2)}`
  )
}

function copyCSV() {
  navigator.clipboard.writeText(store.exportCSV)
}

function clearFilters() {
  store.dateRange.start = null
  store.dateRange.end = null
  store.filteredBoomers = []
  store.filteredCategories = []
  datePreset.value = 'all'
}

watch(
  () => [store.dateRange.start, store.dateRange.end],
  ([start, end]) => {
    if (!start && !end) {
      datePreset.value = 'all'
    }
  }
)

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString()
}
</script>

<template>
  <div class="space-y-4">
    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="card-title">Session Log</h2>
            <p class="text-sm opacity-60">All recorded tech support sessions.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn btn-outline btn-sm" :disabled="rows.length === 0" @click="copySummary">
              Copy Summary
            </button>
            <button class="btn btn-outline btn-sm" :disabled="rows.length === 0" @click="copyCSV">
              Copy CSV
            </button>
            <button class="btn btn-outline btn-sm" :disabled="rows.length === 0" @click="downloadCsv">
              Export CSV
            </button>
            <button class="btn btn-error btn-sm" :disabled="rows.length === 0" @click="clearAll">
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="card-title text-base">Filters</h3>
            <p class="text-xs opacity-60">Slice the log by date, boomer, or category.</p>
          </div>
          <button class="btn btn-ghost btn-sm" @click="clearFilters">
            Clear Filters
          </button>
        </div>

        <div class="mt-3 text-xs opacity-60">
          Active filters: {{ activeFilterCount }}
        </div>

        <div class="mt-4 space-y-3">
          <div>
            <div class="label">
              <span class="label-text">Date Presets</span>
            </div>
            <div class="filter flex flex-wrap gap-2">
              <input
                class="btn filter-reset btn-sm"
                type="radio"
                name="date-filter"
                aria-label="All"
                :checked="datePreset === 'all'"
                @change="applyPreset('all')"
              />
              <input
                class="btn btn-sm"
                type="radio"
                name="date-filter"
                aria-label="Today"
                :checked="datePreset === 'today'"
                @change="applyPreset('today')"
              />
              <input
                class="btn btn-sm"
                type="radio"
                name="date-filter"
                aria-label="This Week"
                :checked="datePreset === 'week'"
                @change="applyPreset('week')"
              />
              <input
                class="btn btn-sm"
                type="radio"
                name="date-filter"
                aria-label="This Month"
                :checked="datePreset === 'month'"
                @change="applyPreset('month')"
              />
            </div>
          </div>
        </div>

        <div class="grid gap-4 mt-4 md:grid-cols-2">
          <div class="space-y-2">
            <label class="label">
              <span class="label-text">Start Date</span>
            </label>
            <input v-model="startDate" type="date" class="input input-bordered w-full" />
          </div>
          <div class="space-y-2">
            <label class="label">
              <span class="label-text">End Date</span>
            </label>
            <input v-model="endDate" type="date" class="input input-bordered w-full" />
          </div>
          <div class="space-y-2">
            <label class="label">
              <span class="label-text">Boomers</span>
            </label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="boomer in store.boomers"
                :key="boomer.id"
                class="btn btn-sm"
                :class="store.filteredBoomers.includes(boomer.id) ? 'btn-primary' : 'btn-outline'"
              >
                <input
                  v-model="store.filteredBoomers"
                  type="checkbox"
                  class="hidden"
                  :value="boomer.id"
                  :aria-label="boomer.name"
                />
                {{ boomer.name }}
              </label>
            </div>
          </div>
          <div class="space-y-2">
            <label class="label">
              <span class="label-text">Categories</span>
            </label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="category in store.categories"
                :key="category.id"
                class="btn btn-sm"
                :class="store.filteredCategories.includes(category.id) ? 'btn-primary' : 'btn-outline'"
              >
                <input
                  v-model="store.filteredCategories"
                  type="checkbox"
                  class="hidden"
                  :value="category.id"
                  :aria-label="category.name"
                />
                {{ category.name }}
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <div v-if="rows.length === 0" class="text-sm opacity-60">
          No sessions logged yet. Start a timer on the dashboard to record one.
        </div>

        <div v-else>
          <div class="space-y-3 md:hidden">
            <div
              v-for="session in rows"
              :key="session.id"
              class="card bg-base-300 border border-base-100"
            >
              <div class="card-body gap-2">
                <div class="flex items-center justify-between">
                  <div class="text-sm font-semibold">{{ session.boomerName }}</div>
                  <div class="text-xs opacity-70">{{ formatDate(session.endedAt) }}</div>
                </div>
                <div class="text-xs opacity-70">{{ session.categoryName }}</div>
                <div class="flex items-center justify-between text-sm">
                  <div>{{ session.minutes }} min</div>
                  <div class="font-mono font-semibold">${{ session.cost.toFixed(2) }}</div>
                </div>
                <div v-if="session.note" class="text-xs opacity-70">
                  {{ session.note }}
                </div>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto hidden md:block">
            <table class="table table-zebra min-w-[640px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Boomer</th>
                <th>Category</th>
                <th class="text-right">Minutes</th>
                <th class="text-right">Cost</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="session in rows" :key="session.id">
                <td class="whitespace-nowrap">{{ formatDate(session.endedAt) }}</td>
                <td>{{ session.boomerName }}</td>
                <td>{{ session.categoryName }}</td>
                <td class="text-right">{{ session.minutes }}</td>
                <td class="text-right font-mono">${{ session.cost.toFixed(2) }}</td>
                <td class="max-w-xs truncate" :title="session.note || ''">
                  {{ session.note || '—' }}
                </td>
              </tr>
            </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
