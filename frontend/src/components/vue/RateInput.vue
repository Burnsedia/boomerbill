<script setup lang="ts">
import { computed } from 'vue'
import { useBoomerBill } from './store/boomerbills'

const store = useBoomerBill()

const rateInput = computed({
  get: () => store.rate,
  set: (value: number) => store.setRate(value)
})
</script>

<template>
  <div class="form-control">
    <label class="label">
      <span class="label-text">Hourly Rate</span>
    </label>

    <input type="number" class="input input-bordered" v-model.number="rateInput" min="1" />

    <p class="text-xs opacity-60 mt-1">
      Default is average US developer rate.
    </p>
  </div>
</template>
