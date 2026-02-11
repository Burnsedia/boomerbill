<script setup lang="ts">
interface Props {
  title: string
  minutes: number
  cost: number
  count: number
  comparison?: { change: number; percentChange: number; direction: 'up' | 'down' | 'same' }
}

const props = withDefaults(defineProps<Props>(), {
  comparison: undefined
})
</script>

<template>
  <div class="card bg-base-200 shadow-lg border border-primary">
    <div class="card-body p-4">
      <h3 class="card-title text-sm opacity-70">{{ title }}</h3>
      
      <div class="grid grid-cols-2 gap-4 mt-2">
        <div>
          <div class="text-2xl font-mono font-bold">{{ formatMinutes(minutes) }}</div>
          <div class="text-xs opacity-60">Time Wasted</div>
        </div>
        
        <div>
          <div class="text-2xl font-mono font-bold text-error">${{ formatCost(cost) }}</div>
          <div class="text-xs opacity-60">Damages</div>
        </div>
      </div>
      
      <div class="text-xs opacity-60 mt-2">
        {{ count }} incident{{ count !== 1 ? 's' : '' }}
      </div>
    </div>
  </div>
</template>
