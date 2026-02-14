<script setup lang="ts">
import { createPinia } from 'pinia'
import { getCurrentInstance, onMounted, ref } from 'vue'
import { useBoomerBill } from './store/boomerbills'

import DashboardPage from './DashboardPage.vue'
import SessionPage from './SessionPage.vue'
import LoggingPage from './LoggingPage.vue'
import SettingsPage from './SettingsPage.vue'

const pinia = createPinia()
const app = getCurrentInstance()?.appContext.app
app?.use(pinia)

const store = useBoomerBill()
const currentView = ref<'session' | 'dashboard' | 'logging' | 'settings'>('session')

onMounted(() => {
  store.load()
})
</script>

<template>
  <div class="space-y-4 w-full">
    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <div class="flex flex-wrap gap-2">
          <button
            class="btn btn-sm"
            :class="currentView === 'session' ? 'btn-primary' : 'btn-ghost'"
            @click="currentView = 'session'"
          >
            Session
          </button>
          <button
            class="btn btn-sm"
            :class="currentView === 'dashboard' ? 'btn-primary' : 'btn-ghost'"
            @click="currentView = 'dashboard'"
          >
            Dashboard
          </button>
          <button
            class="btn btn-sm"
            :class="currentView === 'logging' ? 'btn-primary' : 'btn-ghost'"
            @click="currentView = 'logging'"
          >
            Log
          </button>
          <button
            class="btn btn-sm"
            :class="currentView === 'settings' ? 'btn-primary' : 'btn-ghost'"
            @click="currentView = 'settings'"
          >
            Settings
          </button>
        </div>
      </div>
    </div>

    <SessionPage v-if="currentView === 'session'" />
    <DashboardPage v-else-if="currentView === 'dashboard'" />
    <LoggingPage v-else-if="currentView === 'logging'" />
    <SettingsPage v-else />
  </div>
</template>
