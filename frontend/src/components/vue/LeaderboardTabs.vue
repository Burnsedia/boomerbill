<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import SessionLeaderboard from './SessionLeaderboard.vue'
import BoomerLeaderboard from './BoomerLeaderboard.vue'
import CategoryLeaderboard from './CategoryLeaderboard.vue'
import PublicUserLeaderboard from './PublicUserLeaderboard.vue'

const activeTab = ref<'sessions' | 'boomers' | 'categories' | 'public'>('boomers')

const tabs = [
  { id: 'boomers' as const, label: 'By Boomer' },
  { id: 'categories' as const, label: 'By Category' },
  { id: 'sessions' as const, label: 'All Sessions' },
  { id: 'public' as const, label: 'Public Users' }
]

// Scroll indicator state
const tabsScrollRef = ref<HTMLElement | null>(null)
const hasOverflowLeft = ref(false)
const hasOverflowRight = ref(false)

function updateOverflow() {
  const el = tabsScrollRef.value
  if (!el) return
  const isOverflowing = el.scrollWidth > el.clientWidth
  hasOverflowLeft.value = isOverflowing && el.scrollLeft > 2
  hasOverflowRight.value = isOverflowing && el.scrollLeft < el.scrollWidth - el.clientWidth - 2
}

function onScroll() {
  updateOverflow()
}

onMounted(() => {
  setTimeout(updateOverflow, 100)
  window.addEventListener('resize', updateOverflow)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateOverflow)
})
</script>

<template>
  <div class="card bg-base-200 shadow-lg border border-primary">
    <div class="card-body">
      <h3 class="card-title text-lg">Leaderboards</h3>

      <div
        ref="tabsScrollRef"
        class="tabs tabs-boxed mt-2 nav-scroll-container flex gap-2 sm:gap-0 overflow-x-auto sm:overflow-visible sm:flex-wrap whitespace-nowrap"
        :class="{
          'has-overflow-left': hasOverflowLeft,
          'has-overflow-right': hasOverflowRight,
          'has-overflow-both': hasOverflowLeft && hasOverflowRight
        }"
        @scroll="onScroll"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab tap-target-min flex-shrink-0"
          :class="{ 'tab-active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="mt-4">
        <SessionLeaderboard v-if="activeTab === 'sessions'" />
        <BoomerLeaderboard v-else-if="activeTab === 'boomers'" />
        <CategoryLeaderboard v-else-if="activeTab === 'categories'" />
        <PublicUserLeaderboard v-else />
      </div>
    </div>
  </div>
</template>
