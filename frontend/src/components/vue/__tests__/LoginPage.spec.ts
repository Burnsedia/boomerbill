import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
// @ts-expect-error - Vue files not typed in tests
import LoginPage from '../LoginPage.vue'

describe('LoginPage.vue', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('renders login form fields', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(LoginPage, { global: { plugins: [pinia] } })

    expect(wrapper.text()).toContain('Sign in')
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
  })

  it('shows error on failed login', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ non_field_errors: ['Invalid credentials'] })
    }) as unknown as typeof fetch

    const wrapper = mount(LoginPage, { global: { plugins: [pinia] } })
    await wrapper.find('input[type="text"]').setValue('tester')
    await wrapper.find('input[type="password"]').setValue('bad-password')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Invalid credentials')
  })

  it('registers and then logs in', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1, username: 'newuser' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ auth_token: 'abc123' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'newuser' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ boomers: [], categories: [], sessions: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ created: 0, skipped: 0, total: 0 }) })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const wrapper = mount(LoginPage, { global: { plugins: [pinia] } })
    await wrapper.findAll('button.tab')[1].trigger('click')
    await wrapper.find('input[type="text"]').setValue('newuser')
    await wrapper.find('input[type="password"]').setValue('strong-password')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/api/auth/users/')
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/api/auth/token/login/')
    expect(fetchMock.mock.calls[3]?.[0]).toContain('/api/sync/pull/')
    expect(fetchMock.mock.calls[4]?.[0]).toContain('/api/sync/push/')
  })
})
