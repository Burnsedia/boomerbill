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
