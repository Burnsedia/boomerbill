<script setup>
import { useBoomerBill } from './store/boomerbills'
const store = useBoomerBill()

const presets = [
  { label: 'Just one quick thing', min: 5 },
  { label: 'Wi-Fi stopped working', min: 15 },
  { label: 'Printer issue', min: 30 },
  { label: 'I broke something', min: 60 }
]
</script>

<template>
  <div class="flex gap-2">
    <button class="btn btn-success" :disabled="store.startTime" @click="store.start">
      Start
    </button>

    <button class="btn btn-error" :disabled="!store.startTime" @click="store.stop()">
      Stop
    </button>
  </div>

  <p v-if="store.startTime" class="text-xs text-warning mt-2">
    You are currently losing money.
  </p>

  <div class="flex flex-wrap gap-2 mt-3">
    <button v-for="p in presets" :key="p.label" class="btn btn-xs btn-outline"
      @click="store.addSession(p.min, p.label)">
      {{ p.label }} ({{ p.min }}m)
    </button>
  </div>
</template>
