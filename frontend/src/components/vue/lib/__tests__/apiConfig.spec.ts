import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  normalizeUrl,
  isHttps,
  isLocalhost,
  validateEndpoint,
  getUserOverride,
  setUserOverride,
  clearUserOverride,
  resolveApiBaseUrl,
  testApiConnection,
  getApiSource
} from '../apiConfig'

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true
})

describe('apiConfig.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear any runtime config
    delete (window as Record<string, unknown>).__BOOMERBILL_API_URL__
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('normalizeUrl', () => {
    it('removes trailing slashes', () => {
      expect(normalizeUrl('https://api.example.com/')).toBe('https://api.example.com')
      expect(normalizeUrl('https://api.example.com///')).toBe('https://api.example.com')
    })

    it('trims whitespace', () => {
      expect(normalizeUrl('  https://api.example.com  ')).toBe('https://api.example.com')
    })

    it('handles URLs without trailing slashes', () => {
      expect(normalizeUrl('https://api.example.com')).toBe('https://api.example.com')
    })
  })

  describe('isHttps', () => {
    it('returns true for HTTPS URLs', () => {
      expect(isHttps('https://api.example.com')).toBe(true)
    })

    it('returns false for HTTP URLs', () => {
      expect(isHttps('http://api.example.com')).toBe(false)
    })

    it('returns false for invalid URLs', () => {
      expect(isHttps('not-a-url')).toBe(false)
    })
  })

  describe('isLocalhost', () => {
    it('returns true for localhost', () => {
      expect(isLocalhost('http://localhost:8000')).toBe(true)
    })

    it('returns true for 127.0.0.1', () => {
      expect(isLocalhost('http://127.0.0.1:8000')).toBe(true)
    })

    it('returns false for non-localhost URLs', () => {
      expect(isLocalhost('https://api.example.com')).toBe(false)
    })
  })

  describe('validateEndpoint', () => {
    it('accepts valid HTTPS URLs', () => {
      const result = validateEndpoint('https://api.example.com')
      expect(result.valid).toBe(true)
    })

    it('accepts valid HTTP URLs for localhost', () => {
      // In non-production context, HTTP should be allowed
      const result = validateEndpoint('http://localhost:8000')
      expect(result.valid).toBe(true)
    })

    it('rejects empty URLs', () => {
      const result = validateEndpoint('')
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('cannot be empty')
      }
    })

    it('rejects invalid URL formats', () => {
      const result = validateEndpoint('not-a-valid-url')
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('Invalid URL')
      }
    })

    it('rejects non-HTTP protocols', () => {
      const result = validateEndpoint('ftp://files.example.com')
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('HTTP and HTTPS')
      }
    })
  })

  describe('getUserOverride / setUserOverride / clearUserOverride', () => {
    it('returns null when no override is set', () => {
      localStorageMock.getItem.mockReturnValue(null)
      expect(getUserOverride()).toBeNull()
    })

    it('returns the stored override', () => {
      localStorageMock.getItem.mockReturnValue('https://custom.api.com')
      expect(getUserOverride()).toBe('https://custom.api.com')
    })

    it('normalizes stored URLs (removes trailing slashes)', () => {
      localStorageMock.getItem.mockReturnValue('https://custom.api.com/')
      expect(getUserOverride()).toBe('https://custom.api.com')
    })

    it('saves the override to localStorage', () => {
      setUserOverride('https://custom.api.com')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('bb_api_endpoint_override', 'https://custom.api.com')
    })

    it('normalizes URL when saving', () => {
      setUserOverride('https://custom.api.com/')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('bb_api_endpoint_override', 'https://custom.api.com')
    })

    it('clears the override from localStorage', () => {
      clearUserOverride()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bb_api_endpoint_override')
    })
  })

  describe('resolveApiBaseUrl', () => {
    it('uses user override when set', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'bb_api_endpoint_override') return 'https://user.override.com'
        return null
      })
      expect(resolveApiBaseUrl()).toBe('https://user.override.com')
    })

    it('uses runtime config when no user override', () => {
      localStorageMock.getItem.mockReturnValue(null)
      ;(window as Record<string, unknown>).__BOOMERBILL_API_URL__ = 'https://runtime.config.com'
      expect(resolveApiBaseUrl()).toBe('https://runtime.config.com')
    })

    it('falls back to hard default when nothing is configured', () => {
      localStorageMock.getItem.mockReturnValue(null)
      expect(resolveApiBaseUrl()).toBe('https://api.boomerbill.net')
    })
  })

  describe('getApiSource', () => {
    it('returns "user" when override is set', () => {
      localStorageMock.getItem.mockReturnValue('https://user.override.com')
      expect(getApiSource()).toBe('user')
    })

    it('returns "default" when nothing is configured', () => {
      localStorageMock.getItem.mockReturnValue(null)
      expect(getApiSource()).toBe('default')
    })
  })

  describe('testApiConnection', () => {
    it('returns success on 200 response', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
      vi.stubGlobal('fetch', fetchMock)

      const result = await testApiConnection('https://api.example.com')
      expect(result.success).toBe(true)
    })

    it('returns success on non-500 response (server reachable)', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 })
      vi.stubGlobal('fetch', fetchMock)

      const result = await testApiConnection('https://api.example.com')
      expect(result.success).toBe(true)
    })

    it('returns failure on 500+ response', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 })
      vi.stubGlobal('fetch', fetchMock)

      const result = await testApiConnection('https://api.example.com')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('503')
      }
    })

    it('returns failure on network error', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      vi.stubGlobal('fetch', fetchMock)

      const result = await testApiConnection('https://api.example.com')
      expect(result.success).toBe(false)
    })
  })
})
