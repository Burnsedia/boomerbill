<script setup lang="ts">
import { useBoomerBill } from '../store/boomerbills'
const store = useBoomerBill()
</script>

<template>
  <div class="card bg-base-200 shadow-lg">
    <div class="card-body">
      <h3 class="card-title">💰 Hourly Rate</h3>
      <p class="text-sm opacity-60">What your time is worth</p>
      
      <div class="form-control mt-4">
        <label class="label">
          <span class="label-text">Rate per hour ($)</span>
        </label>
        <div class="flex items-center gap-2">
          <span class="text-lg">$</span>
          <input 
            type="number" 
            class="input input-bordered flex-1" 
            v-model.number="store.rate" 
            min="1"
            step="1"
          />
          <span class="text-sm opacity-60">/hour</span>
        </div>
        <label class="label">
          <span class="label-text-alt opacity-60">
            Default is average US developer rate ($75/hr)
          </span>
        </label>
      </div>
    </div>
  </div>
</template>
