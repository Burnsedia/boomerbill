import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchPasswordResetDeliveryMessage,
  getApiBaseUrl,
  getBackendUnavailableMessage,
  getPasswordResetDeliveryMessage
} from '../api'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('api helpers', () => {
  it('uses localhost backend by default for local development', () => {
    expect(getApiBaseUrl()).toBe('http://localhost:8000')
  })

  it('returns user-friendly backend unavailable message', () => {
    expect(getBackendUnavailableMessage('http://localhost:8000')).toContain('Cannot reach backend API')
  })

  it('returns local console delivery guidance for localhost API', () => {
    expect(getPasswordResetDeliveryMessage('http://localhost:8000')).toContain('check backend logs')
  })

  it('returns inbox guidance for non-local API hosts', () => {
    expect(getPasswordResetDeliveryMessage('https://api.boomerbill.net')).toContain('Check your inbox')
  })

  it('uses password reset meta endpoint when backend reports console mode', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ email_provider: 'console' })
    } as Response)

    await expect(fetchPasswordResetDeliveryMessage('http://localhost:8000')).resolves.toContain(
      'check backend console logs'
    )
  })

  it('falls back to hostname guidance when meta endpoint is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))

    await expect(fetchPasswordResetDeliveryMessage('http://localhost:8000')).resolves.toContain('check backend logs')
  })
})
