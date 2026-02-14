import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBoomerBill } from '../store/boomerbills'
// @ts-expect-error - Vue files not typed in tests
import Dashboard from '../Dashboard.vue'

function setupSelections(pinia = createPinia()) {
  setActivePinia(pinia)
  const store = useBoomerBill()
  const boomerId = store.addBoomer('Test Boomer') || 'boomer-1'
  store.selectBoomer(boomerId)
  store.selectCategory(store.categories[0].id)
  return { store, pinia }
}

describe('Dashboard.vue', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('renders dashboard title', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(Dashboard, { global: { plugins: [pinia] } })
    expect(wrapper.find('.card-title').text()).toBe('Damage Dashboard')
  })

  it('renders averages for day/week/year', () => {
    const { store, pinia } = setupSelections()
    store.addSession({ minutes: 60, note: 'Test', endedAt: Date.now() })

    const wrapper = mount(Dashboard, { global: { plugins: [pinia] } })
    const stats = wrapper.findAll('.stat')
    expect(stats[0].find('.stat-title').text()).toBe('Avg / Day')
    expect(stats[1].find('.stat-title').text()).toBe('Avg / Week')
    expect(stats[2].find('.stat-title').text()).toBe('Avg / Year')
  })

  it('shows days active footer', () => {
    const { store, pinia } = setupSelections()
    store.addSession({ minutes: 30, note: 'Test', endedAt: Date.now() })

    const wrapper = mount(Dashboard, { global: { plugins: [pinia] } })
    expect(wrapper.find('.text-xs').text()).toContain('Based on')
  })
})
