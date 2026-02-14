<script setup lang="ts">
import { ref } from 'vue'
import { useBoomerBill } from '../store/boomerbills'
import BoomerSelect from './BoomerSelect.vue'
import CategoryGrid from './CategoryGrid.vue'
import ActiveSession from './ActiveSession.vue'

const store = useBoomerBill()
const note = ref('')

function handleStart() {
  if (!store.selectedBoomerId || !store.selectedCategoryId) {
    alert('Please select a boomer and category first!')
    return
  }
  store.start()
}

function handleStop() {
  store.stop(note.value)
  note.value = ''
}

const quickPresets = [
  { label: 'Just one quick thing', min: 5 },
  { label: 'Wi-Fi stopped working', min: 15 },
  { label: 'Printer issue', min: 30 },
  { label: 'I broke something', min: 60 }
]

function addQuickSession(minutes: number, label: string) {
  if (!store.selectedBoomerId || !store.selectedCategoryId) {
    alert('Please select a boomer and category first!')
    return
  }
  store.addSession({ minutes, note: label })
}
</script>

<template>
  <div class="space-y-6 max-w-2xl mx-auto">
    <!-- Selection Area -->
    <div v-if="!store.isRunning" class="card bg-base-200 shadow-lg">
      <div class="card-body gap-4">
        <BoomerSelect />
        <CategoryGrid />
      </div>
    </div>
    
    <!-- Active Session Display -->
    <ActiveSession v-else />
    
    <!-- Controls -->
    <div class="card bg-base-200 shadow-lg">
      <div class="card-body gap-4">
        <div class="flex gap-4">
          <button
            class="btn btn-success flex-1"
            :disabled="store.isRunning || !store.selectedBoomerId || !store.selectedCategoryId"
            @click="handleStart"
          >
            ▶️ Start Timer
          </button>
          
          <button
            class="btn btn-error flex-1"
            :disabled="!store.isRunning"
            @click="handleStop"
          >
            ⏹️ Stop & Save
          </button>
        </div>
        
        <!-- Note Input (only shown when running) -->
        <div v-if="store.isRunning" class="form-control">
          <label class="label">
            <span class="label-text">Session Note (optional)</span>
          </label>
          <input
            v-model="note"
            type="text"
            class="input input-bordered"
            placeholder="What did you fix?"
          />
        </div>
        
        <p v-if="store.isRunning" class="text-xs text-warning text-center">
          ⚠️ You are currently losing money. Every second counts!
        </p>
      </div>
    </div>
    
    <!-- Quick Add Presets -->
    <div v-if="!store.isRunning" class="card bg-base-200 shadow-lg">
      <div class="card-body">
        <h3 class="card-title text-sm">Quick Add</h3>
        <div class="flex flex-wrap gap-2 mt-2">
          <button
            v-for="preset in quickPresets"
            :key="preset.label"
            class="btn btn-sm btn-outline"
            :disabled="!store.selectedBoomerId || !store.selectedCategoryId"
            @click="addQuickSession(preset.min, preset.label)"
          >
            {{ preset.label }} ({{ preset.min }}m)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
