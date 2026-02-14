<script setup lang="ts">
import RateInput from './RateInput.vue'
import BoomerManager from './BoomerManager.vue'
import CategoryManager from './CategoryManager.vue'
</script>

<template>
  <div class="space-y-6 max-w-2xl mx-auto">
    <div class="text-center mb-8">
      <h2 class="text-2xl font-bold">⚙️ Settings</h2>
      <p class="text-sm opacity-60">Configure your BoomerBill experience</p>
    </div>
    
    <RateInput />
    <BoomerManager />
    <CategoryManager />
    
    <!-- Footer -->
    <div class="text-center text-xs opacity-40 pt-8">
      <p>BoomerBill v1.0</p>
      <p>This app does not send invoices. Yet.</p>
    </div>
  </div>
</template>
