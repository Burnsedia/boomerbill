<script setup lang="ts">
import { createPinia } from 'pinia'
import { onMounted, getCurrentInstance, ref } from 'vue'
import { useBoomerBill } from './store/boomerbills'

import Navigation from './layout/Navigation.vue'
import MobileTabs from './layout/MobileTabs.vue'
import SessionTracker from './session/SessionTracker.vue'
import Dashboard from './dashboard/Dashboard.vue'
import ChartsPage from './charts/ChartsPage.vue'
import SettingsPage from './settings/SettingsPage.vue'

// Create ONE pinia instance
const pinia = createPinia()
const app = getCurrentInstance()?.appContext.app
app?.use(pinia)

const store = useBoomerBill()
const currentView = ref<'session' | 'dashboard' | 'charts' | 'settings'>('session')
const drawerOpen = ref(false)

onMounted(() => {
  store.load()
})

function navigate(view: 'session' | 'dashboard' | 'charts' | 'settings') {
  currentView.value = view
  drawerOpen.value = false
}
</script>

<template>
  <div class="drawer lg:drawer-open min-h-screen bg-base-100">
    <input 
      id="main-drawer" 
      type="checkbox" 
      class="drawer-toggle" 
      v-model="drawerOpen"
    />
    
    <div class="drawer-content flex flex-col">
      <!-- Mobile Header -->
      <div class="lg:hidden navbar bg-base-200 border-b border-base-300">
        <div class="flex-none">
          <label for="main-drawer" class="btn btn-square btn-ghost drawer-button">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-6 h-6 stroke-current">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </label>
        </div>
        <div class="flex-1 px-4">
          <span class="text-lg font-bold">BoomerBill</span>
        </div>
      </div>
      
      <!-- Main Content -->
      <main class="flex-1 p-4 overflow-y-auto">
        <SessionTracker v-if="currentView === 'session'" />
        <Dashboard v-else-if="currentView === 'dashboard'" />
        <ChartsPage v-else-if="currentView === 'charts'" />
        <SettingsPage v-else />
      </main>
      
      <!-- Mobile Bottom Tabs -->
      <MobileTabs 
        v-if="currentView === 'session' || currentView === 'dashboard'"
        :current-view="currentView"
        @navigate="navigate"
      />
    </div>
    
    <!-- Sidebar / Drawer -->
    <div class="drawer-side z-50 is-drawer-close:overflow-visible">
      <label for="main-drawer" class="drawer-overlay"></label>
      <Navigation 
        :current-view="currentView"
        @navigate="navigate"
      />
    </div>
  </div>
</template>
