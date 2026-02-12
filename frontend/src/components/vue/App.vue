<script setup lang="ts">
import { createPinia } from 'pinia'
import { onMounted, getCurrentInstance, ref } from 'vue'
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, BarElement, ArcElement, CategoryScale, LinearScale } from 'chart.js'
import { useBoomerBill } from './store/boomerbills'

import Navigation from './layout/Navigation.vue'
import SessionTracker from './session/SessionTracker.vue'
import Dashboard from './dashboard/Dashboard.vue'
import ChartsPage from './charts/ChartsPage.vue'
import SettingsPage from './settings/SettingsPage.vue'

// Register Chart.js components immediately (before Vue mounts)
// This ensures Chart.js is ready when chart components render
ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, BarElement, ArcElement, CategoryScale, LinearScale)

// Create ONE pinia instance
const pinia = createPinia()
const app = getCurrentInstance()?.appContext.app
app?.use(pinia)

const store = useBoomerBill()
const currentView = ref<'session' | 'dashboard' | 'charts' | 'settings'>('session')

onMounted(() => {
  store.load()
})

function navigate(view: 'session' | 'dashboard' | 'charts' | 'settings') {
  currentView.value = view
  // Close drawer by unchecking the checkbox
  const drawerToggle = document.getElementById('main-drawer') as HTMLInputElement
  if (drawerToggle) {
    drawerToggle.checked = false
  }
}
</script>

<template>
  <!-- Navigation Sidebar - Teleported to Layout.astro sidebar div -->
  <Teleport to="#navigation-sidebar">
    <Navigation 
      :current-view="currentView"
      @navigate="navigate"
    />
  </Teleport>
  
  <!-- Main Content Area -->
  <div class="h-full">
    <SessionTracker v-if="currentView === 'session'" />
    <Dashboard v-else-if="currentView === 'dashboard'" />
    <ChartsPage v-else-if="currentView === 'charts'" />
    <SettingsPage v-else />
  </div>
</template>
