import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
// @ts-expect-error - Vue files not typed in tests
import SettingsPage from '../SettingsPage.vue'

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

describe('SettingsPage.vue', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
    localStorageMock.getItem.mockReset()
    localStorageMock.setItem.mockReset()
    localStorageMock.removeItem.mockReset()
  })

  it('renders settings header and sections', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })
    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.text()).toContain('Billing Rate')
    expect(wrapper.text()).toContain('Boomers')
    expect(wrapper.text()).toContain('Categories')
  })

  it('renders inputs for managing boomers and categories', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })
    const inputs = wrapper.findAll('input[type="text"]')
    expect(inputs.length).toBeGreaterThan(1)
  })

  it('renders API Endpoint section', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })
    expect(wrapper.text()).toContain('API Endpoint')
  })

  it('shows the active API endpoint', () => {
    localStorageMock.getItem.mockReturnValue(null)
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })
    expect(wrapper.text()).toContain('api.boomerbill.net')
  })

  it('shows the source label for the active endpoint', () => {
    localStorageMock.getItem.mockReturnValue(null)
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })
    expect(wrapper.text()).toContain('Default')
  })

  it('shows user override source when override is set', () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'bb_api_endpoint_override') return 'https://custom.api.com'
      return null
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })
    expect(wrapper.text()).toContain('User override')
  })

  it('shows Change endpoint button', () => {
    localStorageMock.getItem.mockReturnValue(null)
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })
    expect(wrapper.text()).toContain('Change endpoint')
  })

  it('shows Reset to default button when user override is active', () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'bb_api_endpoint_override') return 'https://custom.api.com'
      return null
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })
    expect(wrapper.text()).toContain('Reset to default')
  })

  it('does not show Reset to default when using default endpoint', () => {
    localStorageMock.getItem.mockReturnValue(null)
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })
    expect(wrapper.text()).not.toContain('Reset to default')
  })

  it('shows Test Connection button when editing', async () => {
    localStorageMock.getItem.mockReturnValue(null)
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })

    await wrapper.find('button', { text: 'Change endpoint' }).trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Test Connection')
  })

  it('shows Save and Cancel buttons when editing', async () => {
    localStorageMock.getItem.mockReturnValue(null)
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })

    await wrapper.find('button', { text: 'Change endpoint' }).trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Save')
    expect(wrapper.text()).toContain('Cancel')
  })

  it('shows auth traffic warning in production context', () => {
    // Mock production context
    vi.stubGlobal('import', { meta: { env: { PROD: true } } })
    localStorageMock.getItem.mockReturnValue(null)
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })
    expect(wrapper.text()).toContain('Authentication traffic')
  })
})
