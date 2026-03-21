<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from './store/auth'

const auth = useAuthStore()
const emit = defineEmits<{
  close: []
  authenticated: []
}>()

const username = ref('')
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isSubmitting = ref(false)
const mode = ref<'login' | 'register' | 'forgot'>('login')

function setMode(nextMode: 'login' | 'register' | 'forgot') {
  mode.value = nextMode
  errorMessage.value = ''
  successMessage.value = ''
}

async function submit() {
  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true
  try {
    const credentials = {
      username: username.value.trim(),
      email: email.value.trim().toLowerCase(),
      password: password.value
    }
    if (mode.value === 'register') {
      await auth.register(credentials)
    } else if (mode.value === 'forgot') {
      await auth.requestPasswordReset(email.value)
      successMessage.value = 'Password reset sent. Check your email inbox.'
      return
    } else {
      await auth.login(credentials)
    }
    password.value = ''
    emit('authenticated')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Auth failed'
    errorMessage.value = message
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <div class="card bg-base-200 border border-primary shadow-xl">
      <div class="card-body">
        <div class="tabs tabs-boxed w-fit">
          <button class="tab" :class="{ 'tab-active': mode === 'login' }" @click="setMode('login')">
            Sign in
          </button>
          <button class="tab" :class="{ 'tab-active': mode === 'register' }" @click="setMode('register')">
            Create account
          </button>
          <button class="tab" :class="{ 'tab-active': mode === 'forgot' }" @click="setMode('forgot')">
            Reset password
          </button>
        </div>
        <p class="text-sm opacity-70">
          {{
            mode === 'register'
              ? 'Create your account with username, email, and password.'
              : mode === 'forgot'
                ? 'Enter your account email and we will send a password reset link.'
                : 'Sign in to sync your BoomerBill data with the backend.'
          }}
        </p>
        <p class="text-xs opacity-60">Account is optional. You only need one for sync and future online features.</p>

        <form class="mt-2 space-y-3" @submit.prevent="submit">
          <label v-if="mode !== 'forgot'" class="form-control w-full gap-1">
            <span class="label-text">Username</span>
            <input
              v-model="username"
              type="text"
              autocomplete="username"
              class="input input-bordered w-full"
              placeholder="your username"
              required
            />
          </label>

          <label v-if="mode !== 'login'" class="form-control w-full gap-1">
            <span class="label-text">Email</span>
            <input
              v-model="email"
              type="email"
              autocomplete="email"
              class="input input-bordered w-full"
              placeholder="you@example.com"
              required
            />
          </label>

          <label v-if="mode !== 'forgot'" class="form-control w-full gap-1">
            <span class="label-text">Password</span>
            <input
              v-model="password"
              type="password"
              :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
              class="input input-bordered w-full"
              placeholder="your password"
              required
            />
          </label>

          <p v-if="successMessage" class="text-sm text-success">{{ successMessage }}</p>
          <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>

          <button class="btn btn-primary w-full" type="submit" :disabled="isSubmitting">
            {{
              isSubmitting
                ? mode === 'register'
                  ? 'Creating account...'
                  : mode === 'forgot'
                    ? 'Sending reset...'
                    : 'Signing in...'
                : mode === 'register'
                  ? 'Create account'
                  : mode === 'forgot'
                    ? 'Send reset link'
                    : 'Sign in'
            }}
          </button>
          <button class="btn btn-ghost w-full" type="button" @click="emit('close')">
            Continue with local-only mode
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
