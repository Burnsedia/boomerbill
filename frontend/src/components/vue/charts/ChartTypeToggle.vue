<script setup lang="ts">
defineProps<{
  modelValue: 'bar' | 'pie' | 'doughnut'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: 'bar' | 'pie' | 'doughnut'): void
}>()

const types = [
  { id: 'bar' as const, label: '📊 Bar', icon: '📊' },
  { id: 'pie' as const, label: '🥧 Pie', icon: '🥧' },
  { id: 'doughnut' as const, label: '🍩 Donut', icon: '🍩' }
]
</script>

<template>
  <div class="join">
    <button
      v-for="type in types"
      :key="type.id"
      class="btn join-item"
      :class="{ 'btn-primary': modelValue === type.id }"
      @click="emit('update:modelValue', type.id)"
    >
      {{ type.icon }} {{ type.label }}
    </button>
  </div>
</template>
