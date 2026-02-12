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
    <label class="label-text font-semibold">Select Category</label>
    
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <button
        v-for="category in store.categories"
        :key="category.id"
        class="btn btn-outline h-auto py-3 flex flex-col items-center gap-1"
        :class="{ 'btn-primary': store.selectedCategoryId === category.id }"
        :disabled="store.isRunning"
        @click="store.selectCategory(category.id)"
      >
        <span class="text-2xl">{{ getIcon(category) }}</span>
        <span class="text-xs text-center leading-tight">{{ category.name }}</span>
      </button>
    </div>
  </div>
</template>
