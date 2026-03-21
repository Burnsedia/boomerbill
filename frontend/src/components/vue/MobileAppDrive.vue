<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const isVisible = ref(true)
const isInstalling = ref(false)
const isInstalled = ref(false)
const deferredPrompt = ref<InstallPromptEvent | null>(null)
const isIos = ref(false)

const canInstall = computed(() => !isInstalled.value && Boolean(deferredPrompt.value))

function dismiss() {
  isVisible.value = false
  if (typeof window !== 'undefined') {
    localStorage.setItem('bb_mobile_drive_dismissed', 'true')
  }
}

async function installApp() {
  if (!deferredPrompt.value) return
  isInstalling.value = true
  try {
    await deferredPrompt.value.prompt()
    const choice = await deferredPrompt.value.userChoice
    if (choice.outcome === 'accepted') {
      isInstalled.value = true
    }
  } finally {
    deferredPrompt.value = null
    isInstalling.value = false
  }
}

onMounted(() => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  isIos.value = /iPhone|iPad|iPod/i.test(ua)

  const standalone = typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - iOS Safari standalone flag
      window.navigator.standalone === true)
  isInstalled.value = Boolean(standalone)

  if (typeof window !== 'undefined' && localStorage.getItem('bb_mobile_drive_dismissed') === 'true') {
    isVisible.value = false
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt.value = event as InstallPromptEvent
  })
})
</script>

<template>
  <div v-if="isVisible" class="card border border-secondary/50 bg-base-200 shadow-lg">
    <div class="card-body gap-3">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 class="card-title text-base">Get the Mobile App</h3>
          <p class="text-sm opacity-70">Install BoomerBill as a PWA on Android or iOS. No app store wait.</p>
        </div>
        <button class="btn btn-ghost btn-xs" @click="dismiss">Hide</button>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          v-if="canInstall"
          class="btn btn-primary btn-sm"
          :disabled="isInstalling"
          @click="installApp"
        >
          {{ isInstalling ? 'Installing...' : 'Install on this device' }}
        </button>
        <span v-else-if="isInstalled" class="badge badge-success">App installed</span>
        <p v-else-if="isIos" class="text-xs opacity-70">
          On iPhone: tap Share, then Add to Home Screen.
        </p>
        <p v-else class="text-xs opacity-70">
          Open in Chrome/Edge on mobile to install from the browser menu.
        </p>
      </div>

      <form
        name="mobile-app-signup"
        method="POST"
        action="/thanks"
        data-netlify="true"
        netlify-honeypot="bot-field"
        class="grid gap-2 md:grid-cols-4"
      >
        <input type="hidden" name="form-name" value="mobile-app-signup" />
        <input type="hidden" name="bot-field" />
        <input
          type="email"
          name="email"
          required
          placeholder="Email for mobile updates"
          class="input input-bordered input-sm md:col-span-2"
        />
        <select name="platform" class="select select-bordered select-sm">
          <option value="both">iOS + Android</option>
          <option value="ios">iOS</option>
          <option value="android">Android</option>
        </select>
        <button type="submit" class="btn btn-secondary btn-sm">Join mobile waitlist</button>
      </form>
    </div>
  </div>
</template>
