<script setup lang="ts">
import { createPinia } from 'pinia'
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import { useBoomerBill } from './store/boomerbills'
import { useAuthStore } from './store/auth'

import DashboardPage from './DashboardPage.vue'
import SessionPage from './SessionPage.vue'
import LoggingPage from './LoggingPage.vue'
import SettingsPage from './SettingsPage.vue'
import CommunityPage from './CommunityPage.vue'
import OnboardingModal from './OnboardingModal.vue'
import LoginPage from './LoginPage.vue'
import MobileAppDrive from './MobileAppDrive.vue'

const pinia = createPinia()
const app = getCurrentInstance()?.appContext.app
app?.use(pinia)

const store = useBoomerBill()
const auth = useAuthStore()
const currentView = ref<'session' | 'dashboard' | 'logging' | 'settings' | 'community'>('session')
const showOnboarding = computed(() => !store.hasOnboarded)
const isBooting = ref(true)
const showAuthPanel = ref(false)
const syncLabel = computed(() => {
  if (!auth.isAuthenticated) return ''
  if (store.syncStatus === 'syncing') return 'Syncing...'
  if (store.syncStatus === 'error') return 'Sync error'
  if (store.syncStatus === 'synced') {
    if (!store.lastSyncedAt) return 'Synced'
    return `Synced ${new Date(store.lastSyncedAt).toLocaleTimeString()}`
  }
  return 'Waiting to sync'
})

onMounted(() => {
  store.load()
  auth.hydrate().finally(() => {
    isBooting.value = false
  })
})
</script>

<template>
  <div class="space-y-4 w-full">
    <div v-if="isBooting" class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <span class="loading loading-dots loading-md" />
      </div>
    </div>

    <template v-else>
      <OnboardingModal v-if="showOnboarding" />
      <div class="card bg-base-200 border border-primary shadow-lg">
        <div class="card-body">
          <div class="flex flex-wrap items-center justify-between gap-2">
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
              <button
                class="btn btn-sm"
                :class="currentView === 'community' ? 'btn-primary' : 'btn-ghost'"
                @click="currentView = 'community'"
              >
                Community
              </button>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="auth.isAuthenticated" class="badge badge-outline badge-sm">{{ syncLabel }}</span>
              <span v-if="auth.isAuthenticated" class="text-xs opacity-70">@{{ auth.username || 'user' }}</span>
              <button
                v-if="auth.isAuthenticated"
                class="btn btn-sm btn-outline"
                @click="auth.logout"
              >
                Logout
              </button>
              <button
                v-else
                class="btn btn-sm btn-primary"
                @click="showAuthPanel = true"
              >
                Sign in / Create account
              </button>
            </div>
          </div>
        </div>
      </div>

      <LoginPage
        v-if="showAuthPanel && !auth.isAuthenticated"
        @close="showAuthPanel = false"
        @authenticated="showAuthPanel = false"
      />

      <div v-if="!auth.isAuthenticated" class="alert border border-primary/40 bg-base-200">
        <span class="text-sm">
          You're in local-only mode. Create an account to unlock sync and future online features.
        </span>
      </div>

      <MobileAppDrive />

      <SessionPage v-if="currentView === 'session'" />
      <DashboardPage v-else-if="currentView === 'dashboard'" />
      <LoggingPage v-else-if="currentView === 'logging'" />
      <SettingsPage v-else-if="currentView === 'settings'" />
      <CommunityPage v-else />
    </template>
  </div>
</template>
