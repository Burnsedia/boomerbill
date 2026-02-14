<script setup lang="ts">
import RateInput from './RateInput.vue'
import BoomerManager from './BoomerManager.vue'
import CategoryManager from './CategoryManager.vue'
</script>

<template>
  <div class="space-y-4">
    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body">
        <h2 class="card-title">Settings</h2>
        <p class="text-sm opacity-60">Manage your rate, people, and categories.</p>
      </div>
    </div>

    <div class="card bg-base-200 border border-primary shadow-lg">
      <div class="card-body gap-4">
        <h3 class="card-title text-base">Billing Rate</h3>
        <RateInput />
      </div>
    </div>

    <BoomerManager />
    <CategoryManager />
  </div>
</template>
