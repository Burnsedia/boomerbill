import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
// @ts-expect-error - Vue files not typed in tests
import SessionPage from '../SessionPage.vue'

describe('SessionPage.vue', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('renders session header and controls', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(SessionPage, { global: { plugins: [pinia] } })

    expect(wrapper.text()).toContain('Start a Session')
    expect(wrapper.find('button.btn-success').exists()).toBe(true)
    expect(wrapper.find('button.btn-error').exists()).toBe(true)
  })

  it('renders selection inputs', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(SessionPage, { global: { plugins: [pinia] } })
    expect(wrapper.find('select').exists()).toBe(true)
    expect(wrapper.findAll('button.btn-outline').length).toBeGreaterThan(0)
  })

  it('does not show setup/live sections', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(SessionPage, { global: { plugins: [pinia] } })

    expect(wrapper.text()).not.toContain('Setup')
    expect(wrapper.text()).not.toContain('Live Session')
  })
})
