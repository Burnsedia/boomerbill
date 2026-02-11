<script setup lang="ts">
import { useBoomerBill } from '../store/boomerbills'

const store = useBoomerBill()

const iconMap: Record<string, string> = {
  'wifi': '📶',
  'printer': '🖨️',
  'lock': '🔐',
  'mail': '📧',
  'download': '💾',
  'wrench': '🔧'
}

function getIcon(category: typeof store.categories[0]) {
  return iconMap[category.icon || ''] || '📋'
}
</script>

<template>
  <div class="space-y-2">
    <div v-if="store.categoryLeaderboard.length === 0" class="text-center py-8 text-opacity-60">
      No categories with sessions yet.
    </div>
    
    <div
      v-for="(item, index) in store.categoryLeaderboard.slice(0, 10)"
      :key="item.category.id"
      class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
      :class="{ 'bg-error bg-opacity-20 border border-error': index === 0 }"
    >
      <div class="flex items-center gap-3">
        <span class="text-lg font-bold w-8">#{{ index + 1 }}</span>
        <span class="text-2xl">{{ getIcon(item.category) }}</span>
        <div>
          <div class="font-semibold">{{ item.category.name }}</div>
          <div class="text-xs opacity-60">{{ item.count }} sessions</div>
        </div>
      </div>
      
      <div class="text-right">
        <div class="font-mono font-bold">{{ Math.floor(item.minutes / 60) }}h {{ item.minutes % 60 }}m</div>
        <div class="text-xs opacity-60">${{ item.cost.toFixed(2) }}</div>
      </div>
    </div>
    
    <div v-if="store.categoryLeaderboard.length > 0" class="text-center text-xs opacity-60 mt-4">
      ⏱️ {{ store.categoryLeaderboard[0].category.name }} wastes the most time!
    </div>
  </div>
</template>
