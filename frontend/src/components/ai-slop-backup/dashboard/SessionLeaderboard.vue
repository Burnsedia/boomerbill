<script setup lang="ts">
import { useBoomerBill } from '../store/boomerbills'

const store = useBoomerBill()
</script>

<template>
  <div class="space-y-2">
    <div v-if="store.sortedSessions.length === 0" class="text-center py-8 text-opacity-60">
      No sessions recorded yet.
    </div>
    
    <div
      v-for="(session, index) in store.sortedSessions.slice(0, 10)"
      :key="session.id"
      class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
    >
      <div class="flex items-center gap-3">
        <span class="text-lg font-bold w-8">#{{ index + 1 }}</span>
        <div>
          <div class="font-semibold">
            {{ store.boomers.find(b => b.id === session.boomerId)?.name || 'Unknown' }}
          </div>
          <div class="text-xs opacity-60">
            {{ store.categories.find(c => c.id === session.categoryId)?.name || 'Unknown' }}
            <span v-if="session.note">• {{ session.note }}</span>
          </div>
        </div>
      </div>
      
      <div class="text-right">
        <div class="font-mono font-bold text-error">${{ session.cost.toFixed(2) }}</div>
        <div class="text-xs opacity-60">{{ session.minutes }} min</div>
      </div>
    </div>
  </div>
</template>
