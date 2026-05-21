<script setup>
import { useBoomerBill } from './store/boomerbills'
const store = useBoomerBill()
</script>

<template>
  <div v-if="store.sortedSessions.length === 0" class="text-sm italic text-base-content/70">
    No damage recorded yet.<br />
    (That'll change soon enough.)
  </div>

  <ul v-else class="divide-y divide-base-300/40">
    <li v-for="(s, i) in store.sortedSessions" :key="s.id" class="py-2 space-y-1">

      <div class="flex justify-between">
        <span class="text-base-content/75">
          #{{ i + 1 }}
        </span>

        <span class="font-mono text-error">
          ${{ s.cost.toFixed(2) }}
        </span>
      </div>

      <div class="text-xs text-base-content/70">
        {{ store.severity(s.minutes) }}
        <span v-if="s.note">— {{ s.note }}</span>
      </div>
    </li>
  </ul>
</template>
