<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from './store/auth'
import { getApiBaseUrl } from './lib/api'

type PublicUserRank = {
  rank: number
  username: string
  total_sessions: number
  total_minutes: number
  total_cost: number
  is_following: boolean
}

const auth = useAuthStore()
const rows = ref<PublicUserRank[]>([])
const isLoading = ref(false)
const error = ref('')

const apiBaseUrl = getApiBaseUrl()

function authHeaders() {
  if (!auth.token) return {}
  return { Authorization: `Token ${auth.token}` }
}

async function loadLeaderboard() {
  isLoading.value = true
  error.value = ''
  try {
    const response = await fetch(`${apiBaseUrl}/api/public/leaderboard/users/`, {
      headers: {
        ...authHeaders()
      }
    })
    if (!response.ok) {
      throw new Error('Could not load leaderboard')
    }
    rows.value = await response.json() as PublicUserRank[]
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load leaderboard'
  } finally {
    isLoading.value = false
  }
}

async function toggleFollow(row: PublicUserRank) {
  if (!auth.isAuthenticated || row.username === auth.username) return
  const method = row.is_following ? 'DELETE' : 'POST'
  const response = await fetch(`${apiBaseUrl}/api/follows/${encodeURIComponent(row.username)}/`, {
    method,
    headers: {
      ...authHeaders()
    }
  })
  if (response.ok) {
    row.is_following = !row.is_following
  }
}

onMounted(() => {
  loadLeaderboard()
})
</script>

<template>
  <div class="space-y-2">
    <div v-if="isLoading" class="text-sm opacity-70">Loading public leaderboard...</div>
    <div v-else-if="error" class="text-sm text-error">{{ error }}</div>
    <div v-else-if="rows.length === 0" class="text-center py-8 text-opacity-60">
      No public stats yet.
    </div>

    <div
      v-for="item in rows.slice(0, 20)"
      :key="item.username"
      class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
      :class="{ 'bg-primary bg-opacity-20 border border-primary': item.rank === 1 }"
    >
      <div class="flex items-center gap-3">
        <span class="text-lg font-bold w-8">#{{ item.rank }}</span>
        <div>
          <div class="font-semibold">{{ item.username }}</div>
          <div class="text-xs opacity-60">{{ item.total_sessions }} sessions</div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="text-right">
          <div class="font-mono font-bold text-error">${{ (item.total_cost / 100).toFixed(2) }}</div>
          <div class="text-xs opacity-60">{{ Math.floor(item.total_minutes / 60) }}h {{ item.total_minutes % 60 }}m</div>
        </div>
        <button
          v-if="auth.isAuthenticated && item.username !== auth.username"
          class="btn btn-xs"
          :class="item.is_following ? 'btn-outline' : 'btn-primary'"
          @click="toggleFollow(item)"
        >
          {{ item.is_following ? 'Following' : 'Follow' }}
        </button>
      </div>
    </div>
  </div>
</template>
