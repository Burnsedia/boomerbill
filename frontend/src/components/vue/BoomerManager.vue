<script setup lang="ts">
import { ref } from 'vue'
import { useBoomerBill } from './store/boomerbills'

const store = useBoomerBill()
const newBoomerName = ref('')

function addBoomer() {
  if (!newBoomerName.value.trim()) return
  store.addBoomer(newBoomerName.value)
  newBoomerName.value = ''
}

function removeBoomer(id: string) {
  if (confirm('Remove this boomer?')) {
    store.removeBoomer(id)
  }
}
</script>

<template>
  <div class="card bg-base-200 border border-primary shadow-lg">
    <div class="card-body">
      <h3 class="card-title">Boomers</h3>
      <p class="text-sm opacity-60">People you help with tech support</p>

      <div class="flex gap-2 mt-4">
        <input
          v-model="newBoomerName"
          type="text"
          class="input input-bordered flex-1"
          placeholder="Enter boomer name..."
          @keyup.enter="addBoomer"
        />
        <button class="btn btn-primary" @click="addBoomer">
          Add
        </button>
      </div>

      <div class="mt-4 space-y-2">
        <div
          v-for="boomer in store.boomers"
          :key="boomer.id"
          class="flex items-center justify-between p-3 bg-base-100 rounded-lg"
        >
          <div>
            <div class="font-semibold">{{ boomer.name }}</div>
            <div class="text-xs opacity-60">
              Added {{ new Date(boomer.createdAt).toLocaleDateString() }}
            </div>
          </div>
          <button
            class="btn btn-ghost btn-sm btn-circle text-error"
            @click="removeBoomer(boomer.id)"
          >
            ✕
          </button>
        </div>

        <div v-if="store.boomers.length === 0" class="text-center py-6 text-opacity-60">
          No boomers added yet. Add some people you frequently help.
        </div>
      </div>
    </div>
  </div>
</template>
