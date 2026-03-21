export function getApiBaseUrl(): string {
  const base = import.meta.env.PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'
  return String(base).replace(/\/$/, '')
}
