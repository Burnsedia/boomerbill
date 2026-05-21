<script setup lang="ts">
import { useBoomerBill } from './store/boomerbills'
import ActiveSession from './ActiveSession.vue'
import BoomerSelect from './BoomerSelect.vue'
import CategoryGrid from './CategoryGrid.vue'
import Timer from './Timer.vue'

const store = useBoomerBill()
</script>

<template>
  <div class="grid gap-6">
    <!-- Primary: Session start card - main action area -->
    <div class="card-elevated rounded-xl w-full">
      <div class="card-body gap-4">
        <h2 class="card-title text-lg font-semibold">Start a Session</h2>
        <div class="space-y-4">
          <div class="space-y-2">
            <BoomerSelect />
            <div class="flex flex-wrap gap-2">
              <button
                v-for="boomer in store.boomers"
                :key="boomer.id"
                class="btn btn-sm"
                :class="store.selectedBoomerId === boomer.id ? 'btn-primary' : 'btn-outline'"
                @click="store.selectBoomer(boomer.id)"
              >
                {{ boomer.name }}
              </button>
            </div>
          </div>
          <CategoryGrid />
          <Timer />
          <!-- Critical: Active session gets prominent display -->
          <ActiveSession v-if="store.isRunning" />
        </div>
      </div>
    </div>
  </div>
</template>
