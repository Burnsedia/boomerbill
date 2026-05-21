import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../auth'

describe('auth store dual-mode login', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it('falls back to JWT login when legacy endpoint is unavailable', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ detail: 'Not found' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access: 'jwt-access', refresh: 'jwt-refresh' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'tester' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ boomers: [], categories: [], sessions: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ created: 0, skipped: 0, total: 0 }) })

    vi.stubGlobal('fetch', fetchMock)
    const store = useAuthStore()

    await store.login({ username: 'tester', password: 'secret' })

    expect(fetchMock.mock.calls[0]?.[0]).toContain('/api/auth/token/login/')
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/api/auth/jwt/create/')
    expect(fetchMock.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-access' })
      })
    )
  })
})
