<script setup lang="ts">
import { useBoomerBill } from './store/boomerbills'

const store = useBoomerBill()

function onChange(event: Event) {
  const target = event.target as HTMLSelectElement
  store.selectBoomer(target.value || null)
}
</script>

<template>
  <div class="form-control w-full">
    <label class="label">
      <span class="label-text">Select Boomer</span>
    </label>

    <select
      :value="store.selectedBoomerId ?? ''"
      class="select select-bordered w-full"
      :disabled="store.isRunning"
      @change="onChange"
    >
      <option value="">-- Choose a boomer --</option>
      <option v-for="boomer in store.boomers" :key="boomer.id" :value="boomer.id">
        {{ boomer.name }}
      </option>
    </select>

    <label v-if="store.boomers.length === 0" class="label">
      <span class="label-text-alt text-warning">
        No boomers added yet. Add them in Settings.
      </span>
    </label>
  </div>
</template>
