<script setup lang="ts">
import { useBoomerBill } from '../store/boomerbills'

const store = useBoomerBill()
</script>

<template>
  <div class="space-y-2">
    <div v-if="store.boomerLeaderboard.length === 0" class="text-center py-8 text-opacity-60">
      No boomers with sessions yet.
    </div>
    
    <div
      v-for="(item, index) in store.boomerLeaderboard.slice(0, 10)"
      :key="item.boomer.id"
      class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
      :class="{ 'bg-primary bg-opacity-20 border border-primary': index === 0 }"
    >
      <div class="flex items-center gap-3">
        <span class="text-lg font-bold w-8">#{{ index + 1 }}</span>
        <div>
          <div class="font-semibold">{{ item.boomer.name }}</div>
          <div class="text-xs opacity-60">{{ item.count }} sessions</div>
        </div>
      </div>
      
      <div class="text-right">
        <div class="font-mono font-bold text-error">${{ item.cost.toFixed(2) }}</div>
        <div class="text-xs opacity-60">{{ Math.floor(item.minutes / 60) }}h {{ item.minutes % 60 }}m</div>
      </div>
    </div>
    
    <div v-if="store.boomerLeaderboard.length > 0" class="text-center text-xs opacity-60 mt-4">
      🏆 {{ store.boomerLeaderboard[0].boomer.name }} is your most expensive boomer!
    </div>
  </div>
</template>
