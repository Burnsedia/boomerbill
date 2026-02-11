<script setup lang="ts">
import { useBoomerBill } from '../store/boomerbills'

const store = useBoomerBill()

const navItems = [
  { id: 'session', label: 'Session', icon: '⏱️' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' }
]

const sidebarItems = [
  { id: 'charts', label: 'Charts & Analytics', icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
]

const props = defineProps<{
  currentView: string
}>()

const emit = defineEmits<{
  (e: 'navigate', view: string): void
}>()
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- App Title -->
    <div class="p-4 border-b border-base-300">
      <h1 class="text-xl font-bold">BoomerBill</h1>
      <p class="text-xs opacity-60">Tech Support Tracker</p>
    </div>
    
    <!-- Main Navigation -->
    <nav class="flex-1 p-2 space-y-1">
      <button
        v-for="item in navItems"
        :key="item.id"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
        :class="currentView === item.id ? 'bg-primary text-primary-content' : 'hover:bg-base-300'"
        @click="emit('navigate', item.id)"
      >
        <span class="text-lg">{{ item.icon }}</span>
        <span class="font-medium">{{ item.label }}</span>
      </button>
      
      <div class="divider my-2"></div>
      
      <!-- Sidebar Items -->
      <button
        v-for="item in sidebarItems"
        :key="item.id"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
        :class="currentView === item.id ? 'bg-primary text-primary-content' : 'hover:bg-base-300'"
        @click="emit('navigate', item.id)"
      >
        <span class="text-lg">{{ item.icon }}</span>
        <span class="font-medium">{{ item.label }}</span>
      </button>
    </nav>
    
    <!-- Current Rate Display -->
    <div class="p-4 border-t border-base-300 bg-base-200">
      <div class="text-xs opacity-60 mb-1">Hourly Rate</div>
      <div class="text-lg font-mono font-bold">${{ store.rate }}</div>
    </div>
  </div>
</template>
