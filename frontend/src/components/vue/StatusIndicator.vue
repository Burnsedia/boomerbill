<script setup lang="ts">
interface Props {
  /** Current state of the component */
  state: 'loading' | 'error' | 'empty' | 'syncing' | 'synced' | 'sync-error'
  /** Message to display alongside the state */
  message?: string
  /** Optional action label for retry buttons */
  actionLabel?: string
}

defineProps<Props>()

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <!-- Loading state -->
  <div v-if="state === 'loading'" class="flex items-center gap-2 py-4 text-sm opacity-70" role="status" aria-live="polite">
    <span class="loading loading-dots loading-xs" />
    <span>{{ message || 'Loading...' }}</span>
  </div>

  <!-- Error state -->
  <div v-else-if="state === 'error'" class="alert alert-error alert-sm py-2" role="alert">
    <span class="text-sm">{{ message || 'An error occurred' }}</span>
    <button v-if="actionLabel" class="btn btn-xs btn-outline" @click="emit('action')">
      {{ actionLabel }}
    </button>
  </div>

  <!-- Empty state -->
  <div v-else-if="state === 'empty'" class="py-8 text-center text-sm opacity-60" role="status">
    {{ message || 'Nothing to show yet.' }}
  </div>

  <!-- Syncing state (compact badge style) -->
  <div v-else-if="state === 'syncing'" class="badge badge-outline badge-sm gap-1" role="status" aria-live="polite">
    <span class="loading loading-spinner loading-xs" />
    {{ message || 'Syncing...' }}
  </div>

  <!-- Synced state (compact badge style) -->
  <div v-else-if="state === 'synced'" class="badge badge-outline badge-sm badge-success" role="status">
    {{ message || 'Synced' }}
  </div>

  <!-- Sync error state (compact badge style) -->
  <div v-else-if="state === 'sync-error'" class="badge badge-outline badge-sm badge-error gap-1" role="alert">
    <span>{{ message || 'Sync error' }}</span>
    <button v-if="actionLabel" class="btn btn-xs btn-ghost" @click="emit('action')">
      {{ actionLabel }}
    </button>
  </div>
</template>
