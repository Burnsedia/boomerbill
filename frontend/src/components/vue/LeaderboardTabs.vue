<script setup lang="ts">
import { ref } from 'vue'
import SessionLeaderboard from './SessionLeaderboard.vue'
import BoomerLeaderboard from './BoomerLeaderboard.vue'
import CategoryLeaderboard from './CategoryLeaderboard.vue'

const activeTab = ref<'sessions' | 'boomers' | 'categories'>('boomers')

const tabs = [
  { id: 'boomers' as const, label: 'By Boomer' },
  { id: 'categories' as const, label: 'By Category' },
  { id: 'sessions' as const, label: 'All Sessions' }
]
</script>

<template>
  <div class="card bg-base-200 shadow-lg border border-primary">
    <div class="card-body">
      <h3 class="card-title text-lg">Leaderboards</h3>

      <div class="tabs tabs-boxed mt-2 flex flex-wrap gap-2 md:gap-0">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab w-full md:w-auto"
          :class="{ 'tab-active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="mt-4">
        <SessionLeaderboard v-if="activeTab === 'sessions'" />
        <BoomerLeaderboard v-else-if="activeTab === 'boomers'" />
        <CategoryLeaderboard v-else />
      </div>
    </div>
  </div>
</template>
