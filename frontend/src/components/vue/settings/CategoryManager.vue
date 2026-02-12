<script setup lang="ts">
import { ref } from 'vue'
import { useBoomerBill } from '../store/boomerbills'

const store = useBoomerBill()
const newCategoryName = ref('')

function addCategory() {
  if (!newCategoryName.value.trim()) return
  store.addCategory(newCategoryName.value)
  newCategoryName.value = ''
}

function removeCategory(id: string) {
  if (confirm('Remove this category?')) {
    try {
      store.removeCategory(id)
    } catch (err) {
      alert(err)
    }
  }
}

const iconMap: Record<string, string> = {
  'wifi': '📶',
  'printer': '🖨️',
  'lock': '🔐',
  'mail': '📧',
  'download': '💾',
  'wrench': '🔧'
}

function getIcon(category: typeof store.categories[0]) {
  return iconMap[category.icon || ''] || '📋'
}
</script>

<template>
  <div class="card bg-base-200 shadow-lg">
    <div class="card-body">
      <h3 class="card-title">🏷️ Categories</h3>
      <p class="text-sm opacity-60">Types of tech support issues</p>
      
      <!-- Add New -->
      <div class="flex gap-2 mt-4">
        <input
          v-model="newCategoryName"
          type="text"
          class="input input-bordered flex-1"
          placeholder="Enter category name..."
          @keyup.enter="addCategory"
        />
        <button class="btn btn-primary" @click="addCategory">
          Add
        </button>
      </div>
      
      <!-- List -->
      <div class="mt-4 space-y-2">
        <div
          v-for="category in store.categories"
          :key="category.id"
          class="flex items-center justify-between p-3 bg-base-100 rounded-lg"
          :class="{ 'bg-base-300': category.isDefault }"
        >
          <div class="flex items-center gap-3">
            <span class="text-xl">{{ getIcon(category) }}</span>
            <div>
              <div class="font-semibold">{{ category.name }}</div>
              <div class="text-xs opacity-60">
                {{ category.isDefault ? 'Default category' : 'Custom category' }}
              </div>
            </div>
          </div>
          <button
            v-if="!category.isDefault"
            class="btn btn-ghost btn-sm btn-circle text-error"
            @click="removeCategory(category.id)"
          >
            ✕
          </button>
          <span v-else class="text-xs opacity-40 px-2">Default</span>
        </div>
      </div>
    </div>
  </div>
</template>
