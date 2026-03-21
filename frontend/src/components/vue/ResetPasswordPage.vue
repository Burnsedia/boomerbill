<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from './store/auth'

const auth = useAuthStore()

const uid = ref('')
const token = ref('')
const password = ref('')
const confirmPassword = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  uid.value = params.get('uid') || ''
  token.value = params.get('token') || ''
})

async function submit() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!uid.value || !token.value) {
    errorMessage.value = 'Reset link is invalid or missing required tokens.'
    return
  }

  if (!password.value) {
    errorMessage.value = 'Password is required.'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  isSubmitting.value = true
  try {
    await auth.resetPasswordConfirm(uid.value, token.value, password.value)
    successMessage.value = 'Password reset complete. You can now sign in.'
    password.value = ''
    confirmPassword.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not reset password.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <div class="card bg-base-200 border border-primary shadow-xl">
      <div class="card-body gap-3">
        <h1 class="card-title">Reset Password</h1>
        <p class="text-sm opacity-70">Set a new password for your BoomerBill account.</p>

        <form class="space-y-3" @submit.prevent="submit">
          <label class="form-control w-full gap-1">
            <span class="label-text">New password</span>
            <input
              v-model="password"
              type="password"
              autocomplete="new-password"
              class="input input-bordered w-full"
              required
            />
          </label>

          <label class="form-control w-full gap-1">
            <span class="label-text">Confirm password</span>
            <input
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              class="input input-bordered w-full"
              required
            />
          </label>

          <p v-if="successMessage" class="text-sm text-success">{{ successMessage }}</p>
          <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>

          <button class="btn btn-primary w-full" type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Resetting...' : 'Reset password' }}
          </button>
        </form>

        <a href="/app" class="btn btn-ghost btn-sm">Back to app</a>
      </div>
    </div>
  </div>
</template>
