/**
 * API Endpoint Configuration Module
 *
 * Resolution precedence:
 *   1. User override (persisted in localStorage)
 *   2. Runtime config (window.__BOOMERBILL_API_URL__)
 *   3. Build-time env (import.meta.env.PUBLIC_API_BASE_URL)
 *   4. Hard default (https://api.boomerbill.net)
 */

export const HARD_DEFAULT = 'https://api.boomerbill.net'
const USER_OVERRIDE_KEY = 'bb_api_endpoint_override'
const TEST_ENDPOINT = '/api/health/'

/**
 * Normalize a URL by trimming whitespace and removing trailing slashes.
 */
export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

/**
 * Check whether a URL uses HTTPS.
 */
export function isHttps(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Check whether a URL is a localhost/loopback address.
 */
export function isLocalhost(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1'
  } catch {
    return false
  }
}

/**
 * Check whether the current context is production.
 * Uses VITE/ Astro's import.meta.env.PROD or falls back to hostname check.
 */
export function isProductionContext(): boolean {
  if (typeof import.meta.env !== 'undefined' && import.meta.env.PROD !== undefined) {
    return import.meta.env.PROD === true
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    return hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '::1' && hostname !== ''
  }
  return false
}

/**
 * Validate an API endpoint URL.
 * Returns { valid: true } or { valid: false, error: string }.
 *
 * Rules:
 *   - Must be a valid URL
 *   - Must use HTTPS in production contexts
 *   - HTTP is allowed for localhost/development only
 */
export function validateEndpoint(url: string): { valid: true } | { valid: false; error: string } {
  const normalized = normalizeUrl(url)

  if (!normalized) {
    return { valid: false, error: 'Endpoint URL cannot be empty.' }
  }

  try {
    const parsed = new URL(normalized)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed.' }
    }
  } catch {
    return { valid: false, error: 'Invalid URL format. Example: https://api.example.com' }
  }

  if (isProductionContext() && !isHttps(normalized) && !isLocalhost(normalized)) {
    return { valid: false, error: 'HTTPS is required for the API endpoint in production.' }
  }

  return { valid: true }
}

/**
 * Get the user-saved API endpoint override from localStorage.
 * Returns null if no override is set.
 */
export function getUserOverride(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = localStorage.getItem(USER_OVERRIDE_KEY)
    if (value && value.trim()) {
      return normalizeUrl(value)
    }
  } catch {
    // localStorage may be unavailable
  }
  return null
}

/**
 * Save a user API endpoint override to localStorage.
 */
export function setUserOverride(url: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(USER_OVERRIDE_KEY, normalizeUrl(url))
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Clear the user API endpoint override from localStorage.
 */
export function clearUserOverride(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(USER_OVERRIDE_KEY)
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Get the runtime-configured API URL from window.__BOOMERBILL_API_URL__.
 * Returns null if not set.
 */
function getRuntimeConfig(): string | null {
  if (typeof window === 'undefined') return null
  const win = window as Record<string, unknown>
  const value = win.__BOOMERBILL_API_URL__
  if (typeof value === 'string' && value.trim()) {
    return normalizeUrl(value)
  }
  return null
}

/**
 * Get the build-time environment variable.
 * Returns null if not set.
 */
function getBuildTimeEnv(): string | null {
  if (typeof import.meta.env !== 'undefined') {
    const value = import.meta.env.PUBLIC_API_BASE_URL
    if (typeof value === 'string' && value.trim()) {
      return normalizeUrl(value)
    }
  }
  return null
}

/**
 * Resolve the API base URL using the precedence chain:
 *   1. User override
 *   2. Runtime config
 *   3. Build-time env
 *   4. Hard default
 */
export function resolveApiBaseUrl(): string {
  const userOverride = getUserOverride()
  if (userOverride) return userOverride

  const runtimeConfig = getRuntimeConfig()
  if (runtimeConfig) return runtimeConfig

  const buildTimeEnv = getBuildTimeEnv()
  if (buildTimeEnv) return buildTimeEnv

  return HARD_DEFAULT
}

/**
 * Test the current API endpoint by hitting a safe public health endpoint.
 * Returns { success: true } or { success: false, error: string }.
 */
export async function testApiConnection(baseUrl: string): Promise<{ success: true } | { success: false; error: string }> {
  const normalized = normalizeUrl(baseUrl)
  const testUrl = `${normalized}${TEST_ENDPOINT}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(testUrl, {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors'
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return { success: true }
    }

    // Even non-200 responses mean the server is reachable
    // Many health endpoints return 200, but some might return other codes
    if (response.status < 500) {
      return { success: true }
    }

    return { success: false, error: `Server returned HTTP ${response.status}.` }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, error: 'Connection timed out after 10 seconds.' }
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { success: false, error: 'Could not reach the endpoint. Check the URL and your network.' }
    }
    return { success: false, error: 'Connection failed. Check the URL and your network.' }
  }
}

/**
 * The source of the current API base URL.
 * Useful for displaying to the user which configuration is active.
 */
export function getApiSource(): 'user' | 'runtime' | 'build' | 'default' {
  if (getUserOverride()) return 'user'
  if (getRuntimeConfig()) return 'runtime'
  if (getBuildTimeEnv()) return 'build'
  return 'default'
}
