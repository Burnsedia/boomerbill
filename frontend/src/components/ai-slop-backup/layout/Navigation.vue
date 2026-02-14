<script setup lang="ts">
import { useBoomerBill } from '../store/boomerbills'

const store = useBoomerBill()

const navItems = [
  { id: 'session', label: 'Session', icon: 'timer' },
  { id: 'dashboard', label: 'Dashboard', icon: 'chart' },
  { id: 'charts', label: 'Analytics', icon: 'analytics' },
  { id: 'settings', label: 'Settings', icon: 'settings' }
]

const props = defineProps<{
  currentView: string
}>()

const emit = defineEmits<{
  (e: 'navigate', view: string): void
}>()
</script>

<template>
  <div class="flex min-h-full flex-col items-start bg-base-200 is-drawer-close:w-14 is-drawer-open:w-64">
    <!-- App Title -->
    <div class="p-4 border-b border-base-300 w-full is-drawer-close:hidden">
      <h1 class="text-xl font-bold">BoomerBill</h1>
      <p class="text-xs opacity-60">Tech Support Tracker</p>
    </div>
    
    <!-- Navigation -->
    <ul class="menu w-full grow p-2">
      <li v-for="item in navItems" :key="item.id">
        <button 
          class="is-drawer-close:tooltip is-drawer-close:tooltip-right"
          :data-tip="item.label"
          :class="currentView === item.id ? 'active' : ''"
          @click="emit('navigate', item.id)"
        >
          <!-- Timer Icon -->
          <svg v-if="item.icon === 'timer'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor" class="my-1.5 inline-block size-5">
            <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path>
            <path d="M12 12l3 -3"></path>
            <path d="M12 7v5"></path>
          </svg>
          
          <!-- Chart Icon -->
          <svg v-else-if="item.icon === 'chart'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor" class="my-1.5 inline-block size-5">
            <path d="M3 3v18h18"></path>
            <path d="M18 17v-6"></path>
            <path d="M13 17v-10"></path>
            <path d="M8 17v-4"></path>
          </svg>
          
          <!-- Analytics Icon -->
          <svg v-else-if="item.icon === 'analytics'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor" class="my-1.5 inline-block size-5">
            <path d="M3 3v18h18"></path>
            <path d="M7 16l4 -8l4 4l4 -4"></path>
          </svg>
          
          <!-- Settings Icon -->
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor" class="my-1.5 inline-block size-5">
            <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"></path>
            <path d="M12 4l0 2"></path>
            <path d="M12 18l0 2"></path>
            <path d="M4 12l2 0"></path>
            <path d="M18 12l2 0"></path>
            <path d="M5.6 5.6l1.4 1.4"></path>
            <path d="M17 17l1.4 1.4"></path>
            <path d="M5.6 18.4l1.4 -1.4"></path>
            <path d="M17 7l1.4 -1.4"></path>
          </svg>
          
          <span class="is-drawer-close:hidden font-medium">{{ item.label }}</span>
        </button>
      </li>
    </ul>
    
    <!-- Current Rate Display -->
    <div class="p-4 border-t border-base-300 w-full is-drawer-close:hidden">
      <div class="text-xs opacity-60 mb-1">Hourly Rate</div>
      <div class="text-lg font-mono font-bold">${{ store.rate }}</div>
    </div>
  </div>
</template>
