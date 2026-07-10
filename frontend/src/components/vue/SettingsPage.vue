<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import RateInput from './RateInput.vue'
import BoomerManager from './BoomerManager.vue'
import CategoryManager from './CategoryManager.vue'
import { useAuthStore } from './store/auth'
import { useBoomerBill } from './store/boomerbills'
import {
  getUserOverride,
  setUserOverride,
  clearUserOverride,
  validateEndpoint,
  testApiConnection,
  resolveApiBaseUrl,
  getApiSource,
  normalizeUrl,
  isProductionContext,
  HARD_DEFAULT
} from './lib/apiConfig'

const auth = useAuthStore()
const store = useBoomerBill()

const isSyncing = ref(false)
const syncMessage = ref('')
const syncError = ref('')
const isSendingRecovery = ref(false)
const recoveryMessage = ref('')
const recoveryError = ref('')

// API endpoint state
const apiEndpointInput = ref('')
const apiEndpointError = ref('')
const apiEndpointMessage = ref('')
const apiTestResult = ref<'idle' | 'testing' | 'success' | 'failure'>('idle')
const apiTestMessage = ref('')
const isEditingEndpoint = ref(false)
const pendingEndpoint = ref('')

const isProd = isProductionContext()

const activeEndpoint = computed(() => resolveApiBaseUrl())
const currentApiSource = computed(() => getApiSource())
const sourceLabel = computed(() => {
  const labels: Record<string, string> = {
    user: 'User override',
    runtime: 'Runtime config',
    build: 'Build-time config',
    default: 'Default'
  }
  return labels[currentApiSource.value] || 'Default'
})
const isUserOverride = computed(() => currentApiSource.value === 'user')

onMounted(() => {
  const override = getUserOverride()
  apiEndpointInput.value = override || ''
})

function startEditing() {
  const override = getUserOverride()
  pendingEndpoint.value = override || ''
  isEditingEndpoint.value = true
  apiEndpointError.value = ''
  apiEndpointMessage.value = ''
  apiTestResult.value = 'idle'
  apiTestMessage.value = ''
}

function cancelEditing() {
  isEditingEndpoint.value = false
  pendingEndpoint.value = ''
  apiEndpointError.value = ''
  apiEndpointMessage.value = ''
  apiTestResult.value = 'idle'
  apiTestMessage.value = ''
}

function validateInput(url: string): string | null {
  const result = validateEndpoint(url)
  if (!result.valid) {
    return result.error
  }
  return null
}

async function testConnection() {
  const url = normalizeUrl(pendingEndpoint.value || activeEndpoint.value)
  apiTestResult.value = 'testing'
  apiTestMessage.value = ''

  const result = await testApiConnection(url)
  if (result.success) {
    apiTestResult.value = 'success'
    apiTestMessage.value = 'Connection successful!'
  } else {
    apiTestResult.value = 'failure'
    apiTestMessage.value = result.error
  }
}

function saveEndpoint() {
  const url = normalizeUrl(pendingEndpoint.value)
  const error = validateInput(url)
  if (error) {
    apiEndpointError.value = error
    return
  }

  setUserOverride(url)
  apiEndpointInput.value = url
  isEditingEndpoint.value = false
  apiEndpointError.value = ''
  apiEndpointMessage.value = 'API endpoint updated successfully.'
  apiTestResult.value = 'idle'
  apiTestMessage.value = ''

  setTimeout(() => {
    apiEndpointMessage.value = ''
  }, 5000)
}

function resetEndpoint() {
  clearUserOverride()
  apiEndpointInput.value = ''
  pendingEndpoint.value = ''
  isEditingEndpoint.value = false
  apiEndpointError.value = ''
  apiEndpointMessage.value = `API endpoint reset to default: ${HARD_DEFAULT}`
  apiTestResult.value = 'idle'
  apiTestMessage.value = ''

  setTimeout(() => {
    apiEndpointMessage.value = ''
  }, 5000)
}

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
        <p class="text-sm text-base-content/70">Set your rate, manage your boomers, and tweak categories.</p>
      </div>
    </div>

    <!-- API Endpoint Configuration -->
    <!-- <div class="card bg-base-200 border border-primary shadow-lg"> -->
    <!--   <div class="card-body gap-3"> -->
    <!--     <h3 class="card-title text-base">API Endpoint</h3> -->
    <!--     <p class="text-sm text-base-content/75"> -->
    <!--       Configure the API server URL. All data and authentication traffic is sent to this endpoint. -->
    <!--     </p> -->
    <!---->
    <!--     <div class="flex flex-col gap-2"> -->
    <!--       <div class="flex items-center gap-2"> -->
    <!--         <span class="text-xs font-semibold text-base-content/70">Active:</span> -->
    <!--         <code class="text-xs bg-base-300 px-2 py-1 rounded flex-1 truncate">{{ activeEndpoint }}</code> -->
    <!--         <span class="text-xs badge badge-outline badge-sm">{{ sourceLabel }}</span> -->
    <!--       </div> -->
    <!---->
    <!--       <div v-if="isProd" class="alert alert-warning py-2 px-3 text-xs"> -->
    <!--         <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> -->
    <!--         <span>Authentication traffic is sent to the configured endpoint. Only use trusted URLs.</span> -->
    <!--       </div> -->
    <!---->
    <!--       <div v-if="!isEditingEndpoint" class="flex gap-2 flex-wrap"> -->
    <!--         <button class="btn btn-sm btn-outline" @click="startEditing"> -->
    <!--           Change endpoint -->
    <!--         </button> -->
    <!--         <button -->
    <!--           v-if="isUserOverride" -->
    <!--           class="btn btn-sm btn-ghost" -->
    <!--           @click="resetEndpoint" -->
    <!--         > -->
    <!--           Reset to default -->
    <!--         </button> -->
    <!--       </div> -->
    <!---->
    <!--       <div v-if="isEditingEndpoint" class="flex flex-col gap-2"> -->
    <!--         <label class="form-control w-full"> -->
    <!--           <div class="label"> -->
    <!--             <span class="label-text text-xs">API Endpoint URL</span> -->
    <!--           </div> -->
    <!--           <input -->
    <!--             v-model="pendingEndpoint" -->
    <!--             type="url" -->
    <!--             class="input input-bordered input-sm w-full" -->
    <!--             placeholder="https://api.boomerbill.net" -->
    <!--             @input="apiEndpointError = ''" -->
    <!--           /> -->
    <!--         </label> -->
    <!---->
    <!--         <p v-if="apiEndpointError" class="text-xs text-error">{{ apiEndpointError }}</p> -->
    <!---->
    <!--         <div class="flex gap-2 flex-wrap"> -->
    <!--           <button -->
    <!--             class="btn btn-sm" -->
    <!--             :class="apiTestResult === 'testing' ? 'btn-disabled' : 'btn-outline'" -->
    <!--             :disabled="apiTestResult === 'testing'" -->
    <!--             @click="testConnection" -->
    <!--           > -->
    <!--             {{ apiTestResult === 'testing' ? 'Testing...' : 'Test Connection' }} -->
    <!--           </button> -->
    <!--           <button -->
    <!--             class="btn btn-sm btn-primary" -->
    <!--             @click="saveEndpoint" -->
    <!--           > -->
    <!--             Save -->
    <!--           </button> -->
    <!--           <button -->
    <!--             class="btn btn-sm btn-ghost" -->
    <!--             @click="cancelEditing" -->
    <!--           > -->
    <!--             Cancel -->
    <!--           </button> -->
    <!--         </div> -->
    <!---->
    <!--         <p v-if="apiTestResult === 'success'" class="text-xs text-success">{{ apiTestMessage }}</p> -->
    <!--         <p v-if="apiTestResult === 'failure'" class="text-xs text-error">{{ apiTestMessage }}</p> -->
    <!--       </div> -->
    <!--     </div> -->
    <!---->
    <!--     <p v-if="apiEndpointMessage" class="text-xs text-success">{{ apiEndpointMessage }}</p> -->
    <!--   </div> -->
    <!-- </div> -->

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-4">
        <h3 class="card-title text-base">Billing Rate</h3>
        <RateInput />
      </div>
    </div>

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-3">
        <h3 class="card-title text-base">Cloud Sync</h3>
        <p class="text-sm text-base-content/75">Sync sessions across devices once you sign in.</p>
        <button
          class="btn btn-sm w-fit"
          :class="auth.canUseRemote ? 'btn-primary' : 'btn-disabled'"
          :disabled="!auth.canUseRemote || isSyncing"
          @click="syncNow"
        >
          {{ isSyncing ? 'Syncing...' : 'Sync now' }}
        </button>
        <p v-if="!auth.canUseRemote" class="text-xs text-base-content/70">Create an account to unlock sync.</p>
        <p v-if="syncMessage" class="text-xs text-success">{{ syncMessage }}</p>
        <p v-if="syncError" class="text-xs text-error">{{ syncError }}</p>
      </div>
    </div>

    <div v-if="auth.isAuthenticated" class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-3">
        <h3 class="card-title text-base">Account Recovery</h3>
        <p class="text-sm text-base-content/75">
          Use password recovery anytime if you lose access to your account.
        </p>
        <p class="text-xs text-base-content/70">Signed in as @{{ auth.username || 'user' }}</p>
        <p class="text-xs text-base-content/70">Recovery email: {{ auth.email || 'Not set' }}</p>
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
