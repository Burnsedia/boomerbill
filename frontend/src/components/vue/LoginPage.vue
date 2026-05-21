<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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

const modalRef = ref<HTMLDivElement | null>(null)
const firstInputRef = ref<HTMLInputElement | null>(null)
const previouslyFocused = ref<HTMLElement | null>(null)

const modeTitle = computed(() => {
  switch (mode.value) {
    case 'register': return 'Create account'
    case 'forgot': return 'Reset password'
    default: return 'Sign in'
  }
})

const modeDescription = computed(() => {
  switch (mode.value) {
    case 'register':
      return 'Create your account — username, email, and password.'
    case 'forgot':
      return 'Enter your email and we'll send a reset link.'
    default:
      return 'Sign in to sync your BoomerBill data.'
  }
})

const submitLabel = computed(() => {
  if (isSubmitting.value) {
    switch (mode.value) {
      case 'register': return 'Creating account...'
      case 'forgot': return 'Sending reset...'
      default: return 'Signing in...'
    }
  }
  switch (mode.value) {
    case 'register': return 'Create account'
    case 'forgot': return 'Send reset link'
    default: return 'Sign in'
  }
})

function setMode(nextMode: 'login' | 'register' | 'forgot') {
  mode.value = nextMode
  errorMessage.value = ''
  successMessage.value = ''
  nextTick(() => {
    focusFirstInput()
  })
}

function focusFirstInput() {
  nextTick(() => {
    const inputs = modalRef.value?.querySelectorAll<HTMLInputElement>('input:not([disabled])')
    if (inputs && inputs.length > 0) {
      inputs[0].focus()
    }
  })
}

function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab') return

  const modal = modalRef.value
  if (!modal) return

  const focusable = modal.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href], select:not([disabled]), textarea:not([disabled])'
  )
  const elements = Array.from(focusable)
  if (elements.length === 0) return

  const firstEl = elements[0]
  const lastEl = elements[elements.length - 1]

  if (event.shiftKey) {
    if (document.activeElement === firstEl) {
      event.preventDefault()
      lastEl.focus()
    }
  } else {
    if (document.activeElement === lastEl) {
      event.preventDefault()
      firstEl.focus()
    }
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  trapFocus(event)
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('close')
  }
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

onMounted(() => {
  previouslyFocused.value = document.activeElement as HTMLElement
  document.addEventListener('keydown', handleKeydown)
  focusFirstInput()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (previouslyFocused.value && typeof previouslyFocused.value.focus === 'function') {
    previouslyFocused.value.focus()
  }
})

watch(mode, () => {
  focusFirstInput()
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 auth-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      @click="handleBackdropClick"
    >
      <div
        ref="modalRef"
        class="card bg-base-200 border border-primary shadow-xl w-full max-w-md animate-fade-in"
      >
        <div class="card-body">
          <div class="flex items-center justify-between">
            <h2 id="auth-modal-title" class="card-title text-lg">{{ modeTitle }}</h2>
            <button
              class="btn btn-ghost btn-sm btn-circle"
              aria-label="Close"
              @click="emit('close')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="tabs tabs-boxed w-fit">
            <button
              class="tab"
              :class="{ 'tab-active': mode === 'login' }"
              @click="setMode('login')"
            >
              Sign in
            </button>
            <button
              class="tab"
              :class="{ 'tab-active': mode === 'register' }"
              @click="setMode('register')"
            >
              Create account
            </button>
            <button
              class="tab"
              :class="{ 'tab-active': mode === 'forgot' }"
              @click="setMode('forgot')"
            >
              Reset password
            </button>
          </div>

          <p class="text-sm opacity-70">{{ modeDescription }}</p>
          <p class="text-xs opacity-60">Accounts are optional — you only need one for sync and community features.</p>

          <form class="mt-2 space-y-3" @submit.prevent="submit">
            <label v-if="mode !== 'forgot'" class="form-control w-full gap-1">
              <span class="label-text">Username</span>
              <input
                ref="firstInputRef"
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

            <p v-if="successMessage" class="text-sm text-success" role="status">{{ successMessage }}</p>
            <p v-if="errorMessage" class="text-sm text-error" role="alert">{{ errorMessage }}</p>

            <button class="btn btn-primary w-full" type="submit" :disabled="isSubmitting">
              {{ submitLabel }}
            </button>
          <button class="btn btn-ghost w-full" type="button" @click="emit('close')">
            Continue as guest
          </button>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes auth-fade-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-fade-in {
  animation: auth-fade-in 0.2s ease-out;
}
</style>
