import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getApiBaseUrl } from '../lib/api'
import { useBoomerBill } from './boomerbills'

type LoginParams = {
  username: string
  password: string
}

type RegisterParams = {
  username: string
  email: string
  password: string
}

type TokenLoginResponse = {
  auth_token: string
}

type MeResponse = {
  username?: string
  email?: string
}

const TOKEN_STORAGE_KEY = 'bb_auth_token'

export const useAuthStore = defineStore('auth', () => {
  const boomerStore = useBoomerBill()
  const token = ref<string | null>(null)
  const username = ref<string | null>(null)
  const email = ref<string | null>(null)
  const hasPaidAccess = ref(false)
  const apiBaseUrl = getApiBaseUrl()

  const isAuthenticated = computed(() => Boolean(token.value))
  const canUseRemote = computed(() => isAuthenticated.value)

  function authHeaders(): Record<string, string> {
    if (!token.value) return {}
    return { Authorization: `Token ${token.value}` }
  }

  function persistToken(value: string | null) {
    if (typeof window === 'undefined') return
    if (value) {
      localStorage.setItem(TOKEN_STORAGE_KEY, value)
      return
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }

  async function fetchMe() {
    if (!token.value) return
    const response = await fetch(`${apiBaseUrl}/api/auth/users/me/`, {
      headers: {
        ...authHeaders()
      }
    })

    if (!response.ok) {
      throw new Error('Could not load profile')
    }

    const payload = await response.json() as MeResponse
    username.value = payload.username || payload.email || null
    email.value = payload.email || null
  }

  async function refreshProfile() {
    await fetchMe()
  }

  async function login(params: LoginParams) {
    const response = await fetch(`${apiBaseUrl}/api/auth/token/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      let message = 'Login failed. Check your credentials.'
      try {
        const payload = await response.json() as { non_field_errors?: string[]; detail?: string }
        if (payload.non_field_errors?.[0]) {
          message = payload.non_field_errors[0]
        } else if (payload.detail) {
          message = payload.detail
        }
      } catch {
        // Ignore payload parsing issues and keep default message.
      }
      throw new Error(message)
    }

    const data = await response.json() as TokenLoginResponse
    token.value = data.auth_token
    persistToken(token.value)

    try {
      await fetchMe()
    } catch {
      username.value = null
      email.value = null
    }

    if (token.value) {
      try {
        await boomerStore.syncFromCloud(token.value)
        await boomerStore.syncToCloud(token.value)
      } catch {
        // Keep login successful even if sync is temporarily unavailable.
      }
      boomerStore.setSyncToken(token.value)
    }
  }

  async function register(params: RegisterParams) {
    const response = await fetch(`${apiBaseUrl}/api/auth/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      let message = 'Could not create account.'
      try {
        const payload = await response.json() as {
          username?: string[]
          email?: string[]
          password?: string[]
          detail?: string
        }
        if (payload.username?.[0]) {
          message = payload.username[0]
        } else if (payload.email?.[0]) {
          message = payload.email[0]
        } else if (payload.password?.[0]) {
          message = payload.password[0]
        } else if (payload.detail) {
          message = payload.detail
        }
      } catch {
        // Ignore payload parsing issues and keep default message.
      }
      throw new Error(message)
    }

    await login(params)
  }

  async function requestPasswordReset(email: string) {
    const response = await fetch(`${apiBaseUrl}/api/auth/users/reset_password/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    })

    if (!response.ok) {
      throw new Error('Could not send password reset email')
    }
  }

  async function resetPasswordConfirm(uid: string, tokenValue: string, newPassword: string) {
    const response = await fetch(`${apiBaseUrl}/api/auth/users/reset_password_confirm/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uid, token: tokenValue, new_password: newPassword })
    })

    if (!response.ok) {
      let message = 'Could not reset password.'
      try {
        const payload = await response.json() as { new_password?: string[]; token?: string[]; uid?: string[]; detail?: string }
        if (payload.new_password?.[0]) {
          message = payload.new_password[0]
        } else if (payload.token?.[0]) {
          message = payload.token[0]
        } else if (payload.uid?.[0]) {
          message = payload.uid[0]
        } else if (payload.detail) {
          message = payload.detail
        }
      } catch {
        // Keep default error message if response is not JSON.
      }
      throw new Error(message)
    }
  }

  async function logout() {
    if (token.value) {
      await fetch(`${apiBaseUrl}/api/auth/token/logout/`, {
        method: 'POST',
        headers: {
          ...authHeaders()
        }
      }).catch(() => {
        // Ignore network errors during logout and clear local session.
      })
    }

    token.value = null
    username.value = null
    email.value = null
    persistToken(null)
    boomerStore.setSyncToken(null)
  }

  async function hydrate() {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!stored) return

    token.value = stored
    try {
      await fetchMe()
      if (token.value) {
        await boomerStore.syncFromCloud(token.value)
        await boomerStore.syncToCloud(token.value)
        boomerStore.setSyncToken(token.value)
      }
    } catch {
      token.value = null
      username.value = null
      email.value = null
      persistToken(null)
      boomerStore.setSyncToken(null)
    }
  }

  return {
    token,
    username,
    email,
    hasPaidAccess,
    isAuthenticated,
    canUseRemote,
    login,
    register,
    requestPasswordReset,
    refreshProfile,
    resetPasswordConfirm,
    logout,
    hydrate
  }
})
