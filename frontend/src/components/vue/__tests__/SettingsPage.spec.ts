import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
// @ts-expect-error - Vue files not typed in tests
import SettingsPage from '../SettingsPage.vue'

describe('SettingsPage.vue', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
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
})
