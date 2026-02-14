<script setup lang="ts">
import { ref } from 'vue'
import { useBoomerBill } from './store/boomerbills'

const store = useBoomerBill()

const boomerNames = ref<string[]>([...store.DEFAULT_BOOMERS])
const newName = ref('')

function addName() {
  const trimmed = newName.value.trim()
  if (!trimmed) return
  boomerNames.value.push(trimmed)
  newName.value = ''
}

function removeName(index: number) {
  boomerNames.value.splice(index, 1)
}

function finish() {
  const names = boomerNames.value.map(name => name.trim()).filter(Boolean)
  if (names.length === 0) {
    store.DEFAULT_BOOMERS.forEach(name => store.addBoomer(name))
  } else {
    names.forEach(name => store.addBoomer(name))
  }
  if (!store.selectedBoomerId && store.boomers.length > 0) {
    store.selectBoomer(store.boomers[0].id)
  }
  store.setOnboarded(true)
}

function skip() {
  store.DEFAULT_BOOMERS.forEach(name => store.addBoomer(name))
  if (!store.selectedBoomerId && store.boomers.length > 0) {
    store.selectBoomer(store.boomers[0].id)
  }
  store.setOnboarded(true)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div class="card bg-base-200 border border-primary shadow-lg w-full max-w-2xl">
      <div class="card-body gap-4">
        <div>
          <h2 class="card-title">Welcome to BoomerBill</h2>
          <p class="text-sm opacity-70">
            Add the boomers you help most so you can start billing immediately.
          </p>
        </div>

        <div class="space-y-3">
          <label class="label">
            <span class="label-text">Your Boomers</span>
          </label>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(name, index) in boomerNames"
              :key="`${name}-${index}`"
              class="flex items-center gap-2 bg-base-300 border border-base-100 rounded-lg px-3 py-2"
            >
              <span class="text-sm font-semibold">{{ name }}</span>
              <button class="btn btn-ghost btn-xs" @click="removeName(index)">Remove</button>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <input
              v-model="newName"
              type="text"
              class="input input-bordered flex-1 min-w-[12rem]"
              placeholder="Add another boomer"
              @keyup.enter="addName"
            />
            <button class="btn btn-primary" @click="addName">Add</button>
          </div>
        </div>

        <div class="flex flex-wrap justify-end gap-2">
          <button class="btn btn-ghost" @click="skip">Skip for now</button>
          <button class="btn btn-primary" @click="finish">Finish setup</button>
        </div>
      </div>
    </div>
  </div>
</template>
