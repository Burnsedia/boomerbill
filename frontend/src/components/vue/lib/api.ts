export function getApiBaseUrl(): string {
  const configuredBase = import.meta.env.PUBLIC_API_BASE_URL || import.meta.env.VITE_API_BASE_URL
  if (configuredBase) {
    return String(configuredBase).replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, origin } = window.location
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
    if (isLocal) {
      return `${protocol}//${hostname}:8000`
    }

    return origin.replace(/\/$/, '')
  }

  return 'http://localhost:8000'
}

export function getBackendUnavailableMessage(apiBaseUrl = getApiBaseUrl()): string {
  return `Cannot reach backend API at ${apiBaseUrl}. Verify the backend is running and CORS allows this frontend origin.`
}

export function getPasswordResetDeliveryMessage(apiBaseUrl = getApiBaseUrl()): string {
  let hostname = ''
  try {
    hostname = new URL(apiBaseUrl).hostname.toLowerCase()
  } catch {
    // Ignore URL parsing issues and keep default messaging.
  }

  const isLocalBackend = hostname === 'localhost' || hostname === '127.0.0.1'
  if (isLocalBackend) {
    return 'If you are running local backend email in console mode, check backend logs for the reset link.'
  }

  return 'Check your inbox (and spam folder) for the reset link.'
}

export async function fetchPasswordResetDeliveryMessage(apiBaseUrl = getApiBaseUrl()): Promise<string> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/password-reset-meta/`)
    if (response.ok) {
      const payload = await response.json() as { email_provider?: string }
      if (payload.email_provider === 'console') {
        return 'Local mode detected: check backend console logs for the reset link.'
      }
      if (payload.email_provider === 'smtp') {
        return 'Check your inbox (and spam folder) for the reset link.'
      }
    }
  } catch {
    // Fall back to hostname-based messaging when API metadata is unavailable.
  }

  return getPasswordResetDeliveryMessage(apiBaseUrl)
}
