<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from './store/auth'
import PublicUserLeaderboard from './PublicUserLeaderboard.vue'
import StatusIndicator from './StatusIndicator.vue'
import { getApiBaseUrl } from './lib/api'

type MessagePost = {
  id: number
  author_username: string
  body: string
  created_at: string
  reply_count?: number
  hot_score?: number
}

type MessageReply = {
  id: number
  author_username: string
  body: string
  created_at: string
}

type BoomerWallItem = {
  rank: number
  boomer_id: string
  name: string
  lifetime_damage: number
  top_category: string
}

const auth = useAuthStore()
const apiBaseUrl = getApiBaseUrl()

const posts = ref<MessagePost[]>([])
const wallItems = ref<BoomerWallItem[]>([])
const postBody = ref('')
const isLoading = ref(false)
const isWallLoading = ref(false)
const isSubmitting = ref(false)
const error = ref('')
const wallError = ref('')
const activeTab = ref<'leaderboard' | 'messages' | 'wall'>('leaderboard')
const wallSort = ref<'top' | 'new'>('top')
const messageSort = ref<'top' | 'new'>('top')
const messageScope = ref<'all' | 'following'>('all')

const expandedPosts = ref<Record<number, boolean>>({})
const replyBodies = ref<Record<number, string>>({})
const replyLists = ref<Record<number, MessageReply[]>>({})
const loadingReplies = ref<Record<number, boolean>>({})
const submittingReplies = ref<Record<number, boolean>>({})
const replyErrors = ref<Record<number, string>>({})

let postsRequestToken = 0
let wallRequestToken = 0
let replyControllers = new Map<number, AbortController>()

function authHeaders() {
  if (!auth.token) return {}
  return { Authorization: `Token ${auth.token}` }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

async function loadPosts() {
  const token = ++postsRequestToken
  isLoading.value = true
  error.value = ''
  try {
    const response = await fetch(
      `${apiBaseUrl}/api/public/messages/?sort=${messageSort.value}&scope=${messageScope.value}`,
      {
        headers: {
          ...authHeaders()
        }
      }
    )
    if (token !== postsRequestToken) return
    if (!response.ok) {
      if (response.status === 401 && messageScope.value === 'following') {
        throw new Error('Sign in to view your following feed.')
      }
      throw new Error('Could not load message board')
    }
    posts.value = await response.json() as MessagePost[]
  } catch (err) {
    if (token !== postsRequestToken) return
    error.value = err instanceof Error ? err.message : 'Failed to load messages'
  } finally {
    if (token === postsRequestToken) {
      isLoading.value = false
    }
  }
}

async function setMessageSort(nextSort: 'top' | 'new') {
  if (messageSort.value === nextSort) return
  messageSort.value = nextSort
  await loadPosts()
}

async function setMessageScope(nextScope: 'all' | 'following') {
  if (nextScope === 'following' && !auth.isAuthenticated) {
    error.value = 'Sign in to view posts from people you follow.'
    messageScope.value = 'all'
    return
  }
  if (messageScope.value === nextScope) return
  messageScope.value = nextScope
  await loadPosts()
}

async function loadReplies(postId: number) {
  const existingController = replyControllers.get(postId)
  if (existingController) {
    existingController.abort()
  }

  const controller = new AbortController()
  replyControllers.set(postId, controller)

  loadingReplies.value[postId] = true
  replyErrors.value[postId] = ''
  try {
    const response = await fetch(`${apiBaseUrl}/api/public/messages/${postId}/replies/`, {
      signal: controller.signal
    })
    if (!response.ok) {
      throw new Error('Could not load replies')
    }
    replyLists.value[postId] = await response.json() as MessageReply[]
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    replyErrors.value[postId] = err instanceof Error ? err.message : 'Failed to load replies'
  } finally {
    if (replyControllers.get(postId) === controller) {
      replyControllers.delete(postId)
    }
    loadingReplies.value[postId] = false
  }
}

async function toggleReplies(postId: number) {
  const isOpen = Boolean(expandedPosts.value[postId])
  expandedPosts.value[postId] = !isOpen
  if (!isOpen && !replyLists.value[postId]) {
    await loadReplies(postId)
  }
}

async function submitReply(postId: number) {
  if (!auth.isAuthenticated) return
  const body = (replyBodies.value[postId] || '').trim()
  if (!body || submittingReplies.value[postId]) return

  submittingReplies.value[postId] = true
  replyErrors.value[postId] = ''
  try {
    const response = await fetch(`${apiBaseUrl}/api/messages/${postId}/replies/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ body })
    })

    if (!response.ok) {
      throw new Error('Could not publish reply')
    }

    const payload = await response.json() as { reply: MessageReply; post: MessagePost }
    if (!replyLists.value[postId]) {
      replyLists.value[postId] = []
    }
    replyLists.value[postId].push(payload.reply)
    replyBodies.value[postId] = ''

    posts.value = posts.value.map(post => {
      if (post.id !== postId) return post
      return {
        ...post,
        reply_count: payload.post.reply_count ?? ((post.reply_count || 0) + 1)
      }
    })
  } catch (err) {
    replyErrors.value[postId] = err instanceof Error ? err.message : 'Could not publish reply'
  } finally {
    submittingReplies.value[postId] = false
  }
}

async function submitPost() {
  if (!auth.isAuthenticated || !postBody.value.trim()) return
  isSubmitting.value = true
  error.value = ''

  try {
    const response = await fetch(`${apiBaseUrl}/api/messages/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ body: postBody.value.trim() })
    })

    if (!response.ok) {
      throw new Error('Could not publish post')
    }

    const created = await response.json() as MessagePost
    posts.value.unshift(created)
    postBody.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not publish post'
  } finally {
    isSubmitting.value = false
  }
}

async function loadWall() {
  const token = ++wallRequestToken
  isWallLoading.value = true
  wallError.value = ''
  try {
    const response = await fetch(`${apiBaseUrl}/api/public/wall/boomers/?sort=${wallSort.value}`)
    if (token !== wallRequestToken) return
    if (!response.ok) {
      throw new Error('Could not load wall of shame')
    }
    wallItems.value = await response.json() as BoomerWallItem[]
  } catch (err) {
    if (token !== wallRequestToken) return
    wallError.value = err instanceof Error ? err.message : 'Failed to load wall of shame'
  } finally {
    if (token === wallRequestToken) {
      isWallLoading.value = false
    }
  }
}

async function setWallSort(nextSort: 'top' | 'new') {
  if (wallSort.value === nextSort && wallItems.value.length > 0) return
  wallSort.value = nextSort
  await loadWall()
}

onMounted(() => {
  loadPosts()
  loadWall()
})

onUnmounted(() => {
  for (const controller of replyControllers.values()) {
    controller.abort()
  }
  replyControllers.clear()
})
</script>

<template>
  <div class="space-y-4">
    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <h2 class="card-title">Community</h2>
        <p class="text-sm opacity-70">Read public rankings and posts. Sign in to post, reply, and follow users.</p>
      </div>
    </div>

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-4">
        <div class="tabs tabs-boxed w-fit">
          <button class="tab" :class="{ 'tab-active': activeTab === 'leaderboard' }" @click="activeTab = 'leaderboard'">
            Leaderboard
          </button>
          <button class="tab" :class="{ 'tab-active': activeTab === 'messages' }" @click="activeTab = 'messages'">
            Message Board
          </button>
          <button class="tab" :class="{ 'tab-active': activeTab === 'wall' }" @click="activeTab = 'wall'">
            Wall of Shame
          </button>
        </div>

        <div v-if="activeTab === 'leaderboard'" class="space-y-3 min-h-[65vh]">
          <div class="alert border border-secondary/40 bg-base-300 text-sm">
            Climb the board, build your rep, and unlock future dev tools built for nerds who ship.
          </div>
          <PublicUserLeaderboard />
        </div>

        <div v-else-if="activeTab === 'messages'" class="space-y-3 min-h-[65vh]">
          <div class="alert border border-secondary/40 bg-base-300 text-sm">
            Public wall for tips and war stories. Read free, post and reply with a free account.
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <div class="tabs tabs-boxed w-fit">
              <button class="tab" :class="{ 'tab-active': messageSort === 'top' }" @click="setMessageSort('top')">Top</button>
              <button class="tab" :class="{ 'tab-active': messageSort === 'new' }" @click="setMessageSort('new')">New</button>
            </div>
            <div class="tabs tabs-boxed w-fit">
              <button class="tab" :class="{ 'tab-active': messageScope === 'all' }" @click="setMessageScope('all')">All</button>
              <button class="tab" :class="{ 'tab-active': messageScope === 'following' }" @click="setMessageScope('following')">Following</button>
            </div>
          </div>

          <div v-if="auth.isAuthenticated" class="space-y-2">
            <textarea
              v-model="postBody"
              class="textarea textarea-bordered w-full"
              maxlength="500"
              rows="3"
              placeholder="Share a tip, vent, or post your leaderboard strategy..."
            />
            <div class="flex justify-end">
              <button class="btn btn-primary btn-sm" :disabled="isSubmitting || !postBody.trim()" @click="submitPost">
                {{ isSubmitting ? 'Posting...' : 'Post' }}
              </button>
            </div>
          </div>

          <div v-else class="alert border border-primary/40 bg-base-300 text-sm">
            Create a free account to post, reply, and follow users.
          </div>

          <StatusIndicator
            v-if="isLoading"
            state="loading"
            message="Loading posts..."
          />
          <StatusIndicator
            v-else-if="error"
            state="error"
            :message="error"
            action-label="Retry"
            @action="loadPosts"
          />
          <StatusIndicator
            v-else-if="posts.length === 0"
            state="empty"
            message="No posts yet. Be the first."
          />

          <div v-else class="space-y-2">
            <div v-for="post in posts" :key="post.id" class="rounded-lg border border-base-300 bg-base-300 p-3">
              <div class="flex items-center justify-between gap-2 text-xs opacity-70">
                <span>@{{ post.author_username }}</span>
                <span>{{ formatDate(post.created_at) }}</span>
              </div>
              <p class="mt-1 whitespace-pre-wrap">{{ post.body }}</p>
              <div class="mt-2 flex items-center justify-between">
                <button class="btn btn-xs btn-outline" @click="toggleReplies(post.id)">
                  {{ expandedPosts[post.id] ? 'Hide replies' : 'Replies' }} ({{ post.reply_count || 0 }})
                </button>
              </div>

              <div v-if="expandedPosts[post.id]" class="mt-3 space-y-2 border-t border-base-100 pt-2">
                <StatusIndicator
                  v-if="loadingReplies[post.id]"
                  state="loading"
                  message="Loading replies..."
                />
                <StatusIndicator
                  v-else-if="replyErrors[post.id]"
                  state="error"
                  :message="replyErrors[post.id]"
                  action-label="Retry"
                  @action="loadReplies(post.id)"
                />
                <StatusIndicator
                  v-else-if="!replyLists[post.id] || replyLists[post.id].length === 0"
                  state="empty"
                  message="No replies yet."
                />

                <div v-else class="space-y-1">
                  <div v-for="reply in replyLists[post.id]" :key="reply.id" class="rounded bg-base-100 p-2">
                    <div class="flex items-center justify-between text-[11px] opacity-70">
                      <span>@{{ reply.author_username }}</span>
                      <span>{{ formatDate(reply.created_at) }}</span>
                    </div>
                    <p class="text-sm mt-1 whitespace-pre-wrap">{{ reply.body }}</p>
                  </div>
                </div>

                <div v-if="auth.isAuthenticated" class="space-y-2">
                  <textarea
                    v-model="replyBodies[post.id]"
                    class="textarea textarea-bordered w-full textarea-sm"
                    maxlength="500"
                    rows="2"
                    placeholder="Write a reply..."
                  />
                  <div class="flex justify-end">
                    <button
                      class="btn btn-xs btn-primary"
                      :disabled="submittingReplies[post.id] || !(replyBodies[post.id] || '').trim()"
                      @click="submitReply(post.id)"
                    >
                      {{ submittingReplies[post.id] ? 'Replying...' : 'Reply' }}
                    </button>
                  </div>
                </div>
                <div v-else class="text-xs opacity-70">Sign in to reply.</div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="space-y-3 min-h-[65vh]">
          <div class="alert border border-error/40 bg-base-300 text-sm">
            Public Wall of Shame: expensive boomers, top pain points, and the notes that caused the damage.
          </div>

          <div class="tabs tabs-boxed w-fit">
            <button class="tab" :class="{ 'tab-active': wallSort === 'top' }" @click="setWallSort('top')">
              Top Damage
            </button>
            <button class="tab" :class="{ 'tab-active': wallSort === 'new' }" @click="setWallSort('new')">
              Most Recent
            </button>
          </div>

          <StatusIndicator
            v-if="isWallLoading"
            state="loading"
            message="Loading wall..."
          />
          <StatusIndicator
            v-else-if="wallError"
            state="error"
            :message="wallError"
            action-label="Retry"
            @action="loadWall"
          />
          <StatusIndicator
            v-else-if="wallItems.length === 0"
            state="empty"
            message="No boomer shame data yet."
          />

          <div v-else class="space-y-2">
            <div
              v-for="item in wallItems"
              :key="item.boomer_id"
              class="rounded-lg border border-base-300 bg-base-300 p-3"
              :class="{ 'border-error': item.rank === 1 }"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div class="font-semibold">#{{ item.rank }} {{ item.name }}</div>
                  <div class="text-xs opacity-70">Top category: {{ item.top_category }}</div>
                </div>
                <div class="text-right">
                  <div class="font-mono font-bold text-error">${{ (item.lifetime_damage / 100).toFixed(2) }}</div>
                  <div class="text-xs opacity-60">Lifetime damage</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
