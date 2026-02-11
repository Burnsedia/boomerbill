<script setup lang="ts">
const props = defineProps<{
  currentView: string
}>()

const emit = defineEmits<{
  (e: 'navigate', view: string): void
}>()

const tabs = [
  { id: 'session', label: 'Session', icon: '⏱️' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' }
]
</script>

<template>
  <div class="btm-nav bg-base-200 border-t border-base-300">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="text-primary"
      :class="{ 'active bg-primary text-primary-content': currentView === tab.id }"
      @click="emit('navigate', tab.id)"
    >
      <span class="text-xl">{{ tab.icon }}</span>
      <span class="btm-nav-label text-xs">{{ tab.label }}</span>
    </button>
  </div>
</template>
