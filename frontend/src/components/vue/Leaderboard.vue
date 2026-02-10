<script setup>
import { useBoomerBill } from './store/boomerbills'
const store = useBoomerBill()
</script>

<template>
  <div v-if="store.sortedSessions.length === 0" class="text-sm italic opacity-60">
    No damage recorded yet.<br />
    (That will change.)
  </div>

  <ul v-else class="divide-y divide-base-300/40">
    <li v-for="(s, i) in store.sortedSessions" :key="s.id" class="py-2 space-y-1">

      <div class="flex justify-between">
        <span class="opacity-70">
          #{{ i + 1 }}
        </span>

        <span class="font-mono text-error">
          ${{ s.cost.toFixed(2) }}
        </span>
      </div>

      <div class="text-xs opacity-60">
        {{ store.severity(s.minutes) }}
        <span v-if="s.note">— {{ s.note }}</span>
      </div>
    </li>
  </ul>
</template>
