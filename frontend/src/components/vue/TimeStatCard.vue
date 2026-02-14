<script setup lang="ts">
interface Props {
  title: string
  minutes: number
  cost: number
  count: number
  comparison?: { change: number; percentChange: number; direction: 'up' | 'down' | 'same' }
  costPrecision?: number
}

const props = withDefaults(defineProps<Props>(), {
  comparison: undefined,
  costPrecision: 0
})

const formatMinutes = (mins: number) => {
  const hours = Math.floor(mins / 60)
  const minutes = mins % 60
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

const formatCost = (cost: number) => cost.toFixed(props.costPrecision)
</script>

<template>
  <div class="card bg-base-200 shadow-lg border border-primary">
    <div class="card-body p-4">
      <h3 class="card-title text-sm opacity-70">{{ title }}</h3>

      <div class="grid grid-cols-2 gap-4 mt-2">
        <div>
          <div class="text-2xl font-mono font-bold">{{ formatMinutes(props.minutes) }}</div>
          <div class="text-xs opacity-60">Time Wasted</div>
        </div>

        <div>
          <div class="text-2xl font-mono font-bold text-error">${{ formatCost(props.cost) }}</div>
          <div class="text-xs opacity-60">Damages</div>
          <div v-if="props.comparison" class="text-xs mt-1 flex items-center">
            <span v-if="props.comparison.direction === 'up'" class="text-red-500">▲</span>
            <span v-else-if="props.comparison.direction === 'down'" class="text-green-500">▼</span>
            <span v-else class="text-gray-500">—</span>
            <span class="ml-1">
              {{ props.comparison.percentChange > 0 ? '+' : '' }}{{ props.comparison.percentChange.toFixed(1) }}%
            </span>
          </div>
        </div>
      </div>

      <div class="text-xs opacity-60 mt-2">
        {{ props.count }} incident{{ props.count !== 1 ? 's' : '' }}
      </div>
    </div>
  </div>
</template>
