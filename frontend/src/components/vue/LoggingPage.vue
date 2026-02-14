<script setup lang="ts">
import { computed } from 'vue'
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

const startDate = computed({
  get() {
    return store.dateRange.start ? new Date(store.dateRange.start).toISOString().slice(0, 10) : ''
  },
  set(value: string) {
    store.dateRange.start = value ? new Date(`${value}T00:00:00`).getTime() : null
  }
})

const endDate = computed({
  get() {
    return store.dateRange.end ? new Date(store.dateRange.end).toISOString().slice(0, 10) : ''
  },
  set(value: string) {
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
}

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
            <select v-model="store.filteredBoomers" multiple class="select select-bordered w-full min-h-[3.5rem]">
              <option v-for="boomer in store.boomers" :key="boomer.id" :value="boomer.id">
                {{ boomer.name }}
              </option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="label">
              <span class="label-text">Categories</span>
            </label>
            <select v-model="store.filteredCategories" multiple class="select select-bordered w-full min-h-[3.5rem]">
              <option v-for="category in store.categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <div v-if="rows.length === 0" class="text-sm opacity-60">
          No sessions logged yet. Start a timer on the dashboard to record one.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
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
</template>
