<script setup lang="ts">
import { ref } from 'vue'
import RateInput from './RateInput.vue'
import BoomerManager from './BoomerManager.vue'
import CategoryManager from './CategoryManager.vue'
import { useAuthStore } from './store/auth'
import { useBoomerBill } from './store/boomerbills'

const auth = useAuthStore()
const store = useBoomerBill()

const isSyncing = ref(false)
const syncMessage = ref('')
const syncError = ref('')
const isSendingRecovery = ref(false)
const recoveryMessage = ref('')
const recoveryError = ref('')

async function syncNow() {
  if (!auth.canUseRemote || isSyncing.value || !auth.token) return

  isSyncing.value = true
  syncError.value = ''
  syncMessage.value = ''

  try {
    await store.syncFromCloud(auth.token)
    const payload = await store.syncToCloud(auth.token)
    const created = payload.created || 0
    const skipped = payload.skipped || 0
    syncMessage.value = `Sync complete. Uploaded ${created} new sessions, skipped ${skipped}.`
  } catch (error) {
    syncError.value = error instanceof Error ? error.message : 'Sync failed'
  } finally {
    isSyncing.value = false
  }
}

async function sendRecoveryEmail() {
  if (!auth.isAuthenticated || isSendingRecovery.value) return

  isSendingRecovery.value = true
  recoveryMessage.value = ''
  recoveryError.value = ''

  try {
    if (!auth.email) {
      await auth.refreshProfile()
    }

    if (!auth.email) {
      throw new Error('No recovery email found on your account yet.')
    }

    await auth.requestPasswordReset(auth.email)
    recoveryMessage.value = `Recovery email sent to ${auth.email}. Check your inbox.`
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send recovery email.'
    recoveryError.value = message
  } finally {
    isSendingRecovery.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <h2 class="card-title">Settings</h2>
        <p class="text-sm opacity-60">Manage your rate, people, and categories.</p>
      </div>
    </div>

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-4">
        <h3 class="card-title text-base">Billing Rate</h3>
        <RateInput />
      </div>
    </div>

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-3">
        <h3 class="card-title text-base">Cloud Sync</h3>
        <p class="text-sm opacity-70">Sync sessions across devices once you sign in.</p>
        <button
          class="btn btn-sm w-fit"
          :class="auth.canUseRemote ? 'btn-primary' : 'btn-disabled'"
          :disabled="!auth.canUseRemote || isSyncing"
          @click="syncNow"
        >
          {{ isSyncing ? 'Syncing...' : 'Sync now' }}
        </button>
        <p v-if="!auth.canUseRemote" class="text-xs opacity-60">Create an account to unlock sync.</p>
        <p v-if="syncMessage" class="text-xs text-success">{{ syncMessage }}</p>
        <p v-if="syncError" class="text-xs text-error">{{ syncError }}</p>
      </div>
    </div>

    <div v-if="auth.isAuthenticated" class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-3">
        <h3 class="card-title text-base">Account Recovery</h3>
        <p class="text-sm opacity-70">
          Use password recovery anytime if you lose access to your account.
        </p>
        <p class="text-xs opacity-60">Signed in as @{{ auth.username || 'user' }}</p>
        <p class="text-xs opacity-60">Recovery email: {{ auth.email || 'Not set' }}</p>
        <button class="btn btn-sm btn-secondary w-fit" :disabled="isSendingRecovery" @click="sendRecoveryEmail">
          {{ isSendingRecovery ? 'Sending recovery email...' : 'Send password recovery email' }}
        </button>
        <p v-if="recoveryMessage" class="text-xs text-success">{{ recoveryMessage }}</p>
        <p v-if="recoveryError" class="text-xs text-error">{{ recoveryError }}</p>
      </div>
    </div>

    <BoomerManager />
    <CategoryManager />
  </div>
</template>
