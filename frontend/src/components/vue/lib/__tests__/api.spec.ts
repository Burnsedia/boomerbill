import { describe, expect, it } from 'vitest'
import { getApiBaseUrl, getBackendUnavailableMessage } from '../api'

describe('api helpers', () => {
  it('uses localhost backend by default for local development', () => {
    expect(getApiBaseUrl()).toBe('http://localhost:8000')
  })

  it('returns user-friendly backend unavailable message', () => {
    expect(getBackendUnavailableMessage('http://localhost:8000')).toContain('Cannot reach backend API')
  })
})
