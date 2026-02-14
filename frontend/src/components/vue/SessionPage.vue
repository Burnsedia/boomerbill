<script setup lang="ts">
import { useBoomerBill } from './store/boomerbills'
import ActiveSession from './ActiveSession.vue'
import BoomerSelect from './BoomerSelect.vue'
import CategoryGrid from './CategoryGrid.vue'
import Timer from './Timer.vue'

const store = useBoomerBill()
</script>

<template>
  <div class="grid gap-3">
    <div class="card bg-base-200 border border-primary shadow-lg w-full">
      <div class="card-body gap-3">
        <h2 class="card-title">Start a Session</h2>
        <div class="space-y-3">
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
          <ActiveSession v-if="store.isRunning" />
        </div>
      </div>
    </div>
  </div>
</template>
