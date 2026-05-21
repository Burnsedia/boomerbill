import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getApiBaseUrl, getBackendUnavailableMessage } from '../lib/api'
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

type JwtLoginResponse = {
  access: string
  refresh: string
}

type MeResponse = {
  username?: string
  email?: string
}

type AuthScheme = 'Token' | 'Bearer'

type AuthSession = {
  scheme: AuthScheme
  accessToken: string
  refreshToken?: string | null
}

const LEGACY_TOKEN_STORAGE_KEY = 'bb_auth_token'
const AUTH_SESSION_STORAGE_KEY = 'bb_auth_session'
const AUTH_MODE = String(import.meta.env.PUBLIC_AUTH_MODE || 'dual').trim().toLowerCase()

function getAuthAttemptOrder(): Array<'legacy' | 'jwt'> {
  if (AUTH_MODE === 'jwt') return ['jwt', 'legacy']
  if (AUTH_MODE === 'legacy' || AUTH_MODE === 'legacy_token' || AUTH_MODE === 'token') return ['legacy', 'jwt']
  return ['legacy', 'jwt']
}

export const useAuthStore = defineStore('auth', () => {
  const boomerStore = useBoomerBill()
  const authSession = ref<AuthSession | null>(null)
  const token = computed(() => authSession.value?.accessToken || null)
  const username = ref<string | null>(null)
  const email = ref<string | null>(null)
  const hasPaidAccess = ref(false)
  const apiBaseUrl = getApiBaseUrl()

  const isAuthenticated = computed(() => Boolean(token.value))
  const canUseRemote = computed(() => isAuthenticated.value)

  async function safeFetch(input: string, init?: RequestInit, unavailableMessage?: string) {
    try {
      return await fetch(input, init)
    } catch {
      throw new Error(unavailableMessage || getBackendUnavailableMessage(apiBaseUrl))
    }
  }

  function authHeaderValue(): string | null {
    if (!authSession.value) return null
    return `${authSession.value.scheme} ${authSession.value.accessToken}`
  }

  function authHeaders(): Record<string, string> {
    const value = authHeaderValue()
    if (!value) return {}
    return { Authorization: value }
  }

  function persistAuthSession(value: AuthSession | null) {
    if (typeof window === 'undefined') return
    const storage = window.sessionStorage
    const fallbackStorage = window.localStorage

    if (value) {
      storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(value))
      fallbackStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY)
      return
    }
    storage.removeItem(AUTH_SESSION_STORAGE_KEY)
    fallbackStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY)
  }

  function applyAuthSession(value: AuthSession | null) {
    authSession.value = value
    persistAuthSession(value)
  }

  async function fetchMe() {
    if (!token.value) return
    const response = await safeFetch(`${apiBaseUrl}/api/auth/users/me/`, {
      headers: {
        ...authHeaders()
      }
    }, getBackendUnavailableMessage(apiBaseUrl))

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
    const attempts = getAuthAttemptOrder()
    let lastErrorMessage = 'Login failed. Check your credentials.'

    for (const mode of attempts) {
      const endpoint = mode === 'legacy' ? '/api/auth/token/login/' : '/api/auth/jwt/create/'
      const response = await safeFetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      }, getBackendUnavailableMessage(apiBaseUrl))

      if (!response.ok) {
        try {
          const payload = await response.json() as { non_field_errors?: string[]; detail?: string }
          if (payload.non_field_errors?.[0]) {
            lastErrorMessage = payload.non_field_errors[0]
          } else if (payload.detail) {
            lastErrorMessage = payload.detail
          }
        } catch {
          // Ignore payload parsing issues and keep default message.
        }

        if (response.status === 404 && mode === 'legacy' && attempts.includes('jwt')) {
          continue
        }
        throw new Error(lastErrorMessage)
      }

      if (mode === 'legacy') {
        const data = await response.json() as TokenLoginResponse
        applyAuthSession({ scheme: 'Token', accessToken: data.auth_token })
      } else {
        const data = await response.json() as JwtLoginResponse
        applyAuthSession({ scheme: 'Bearer', accessToken: data.access, refreshToken: data.refresh })
      }
      break
    }

    if (!token.value) {
      throw new Error(lastErrorMessage)
    }

    try {
      await fetchMe()
    } catch {
      username.value = null
      email.value = null
    }

    const header = authHeaderValue()
    if (header) {
      try {
        await boomerStore.syncFromCloud(header)
        await boomerStore.syncToCloud(header)
      } catch {
        // Keep login successful even if sync is temporarily unavailable.
      }
      boomerStore.setSyncToken(header)
    }
  }

  async function register(params: RegisterParams) {
    const response = await safeFetch(`${apiBaseUrl}/api/auth/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }, getBackendUnavailableMessage(apiBaseUrl))

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
    const response = await safeFetch(`${apiBaseUrl}/api/auth/users/reset_password/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    }, getBackendUnavailableMessage(apiBaseUrl))

    if (!response.ok) {
      throw new Error('Could not send password reset email')
    }
  }

  async function resetPasswordConfirm(uid: string, tokenValue: string, newPassword: string) {
    const response = await safeFetch(`${apiBaseUrl}/api/auth/users/reset_password_confirm/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uid, token: tokenValue, new_password: newPassword })
    }, getBackendUnavailableMessage(apiBaseUrl))

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
      const isLegacyToken = authSession.value?.scheme === 'Token'
      const hasRefresh = Boolean(authSession.value?.refreshToken)
      const logoutUrl = isLegacyToken
        ? `${apiBaseUrl}/api/auth/token/logout/`
        : `${apiBaseUrl}/api/auth/jwt/blacklist/`

      const body = !isLegacyToken && hasRefresh
        ? JSON.stringify({ refresh: authSession.value?.refreshToken })
        : undefined

      await fetch(logoutUrl, {
        method: 'POST',
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...authHeaders()
        },
        body
      }).catch(() => {
        // Ignore network errors during logout and clear local session.
      })
    }

    authSession.value = null
    username.value = null
    email.value = null
    persistAuthSession(null)
    boomerStore.setSyncToken(null)
  }

  async function hydrate() {
    if (typeof window === 'undefined') return
    const storedSession = window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as AuthSession
        if (parsed?.scheme && parsed?.accessToken) {
          authSession.value = parsed
        }
      } catch {
        persistAuthSession(null)
      }
    } else {
      const legacyToken = window.localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY)
      if (legacyToken) {
        authSession.value = { scheme: 'Token', accessToken: legacyToken }
        persistAuthSession(authSession.value)
      }
    }

    if (!authSession.value) return

    try {
      await fetchMe()
      const header = authHeaderValue()
      if (header) {
        await boomerStore.syncFromCloud(header)
        await boomerStore.syncToCloud(header)
        boomerStore.setSyncToken(header)
      }
    } catch {
      authSession.value = null
      username.value = null
      email.value = null
      persistAuthSession(null)
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
