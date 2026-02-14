<script setup>
import { useBoomerBill } from './store/boomerbills'
const store = useBoomerBill()
</script>

<template>
  <div class="form-control">
    <label class="label">
      <span class="label-text">Hourly Rate</span>
    </label>

    <input type="number" class="input input-bordered" v-model.number="store.rate" min="1" />

    <p class="text-xs opacity-60 mt-1">
      Default is average US developer rate.
    </p>
  </div>
</template>
