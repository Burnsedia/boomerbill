import { resolveApiBaseUrl, normalizeUrl } from './apiConfig'

/**
 * Get the resolved API base URL.
 * Uses the precedence chain: user override → runtime config → build-time env → hard default.
 * The URL is normalized (trailing slashes removed).
 */
export function getApiBaseUrl(): string {
  return normalizeUrl(resolveApiBaseUrl())
}
