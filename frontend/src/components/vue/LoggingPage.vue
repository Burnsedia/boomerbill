<script setup lang="ts">
import { computed } from 'vue'
import { useBoomerBill } from './store/boomerbills'

const store = useBoomerBill()

const rows = computed(() => store.sessionDetails)

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
          <div class="flex gap-2">
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
