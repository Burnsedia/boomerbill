import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBoomerBill } from '../store/boomerbills'
// @ts-expect-error - Vue files not typed in tests
import Totals from '../Totals.vue'

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
})

describe('Totals.vue', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  function setupSelections(pinia = createPinia()) {
    setActivePinia(pinia)
    const store = useBoomerBill()
    const boomerId = store.addBoomer('Test Boomer') || 'boomer-1'
    store.selectBoomer(boomerId)
    store.selectCategory(store.categories[0].id)
    return { store, pinia }
  }

  it('renders incident count', () => {
    const { store, pinia } = setupSelections()
    store.addSession({ minutes: 15, note: 'Test', endedAt: Date.now() })

    const wrapper = mount(Totals, { global: { plugins: [pinia] } })
    
    const incidentStat = wrapper.findAll('.stat')[0]
    expect(incidentStat.find('.stat-title').text()).toBe('Incidents')
    expect(incidentStat.find('.stat-value').text()).toBe('1')
  })

  it('renders total damage', () => {
    const { store, pinia } = setupSelections()
    store.rate = 100
    store.addSession({ minutes: 60, note: 'Test', endedAt: Date.now() })

    const wrapper = mount(Totals, { global: { plugins: [pinia] } })
    
    const damageStat = wrapper.findAll('.stat')[1]
    expect(damageStat.find('.stat-title').text()).toBe('Total Damage')
    expect(damageStat.find('.stat-value').text()).toContain('100.00')
  })

  it('displays weekly summary', () => {
    const { store, pinia } = setupSelections()
    store.addSession({ minutes: 60, note: 'Recent', endedAt: Date.now() })

    const wrapper = mount(Totals, { global: { plugins: [pinia] } })
    
    const summary = wrapper.find('.text-xs')
    expect(summary.text()).toContain('You lost')
  })

  it('formats cost with 2 decimal places', () => {
    const { store, pinia } = setupSelections()
    store.rate = 75
    store.addSession({ minutes: 30, note: 'Test', endedAt: Date.now() })

    const wrapper = mount(Totals, { global: { plugins: [pinia] } })
    
    const damageStat = wrapper.findAll('.stat')[1]
    expect(damageStat.find('.stat-value').text()).toContain('37.50')
  })

  it('shows weekly summary text', () => {
    const { store, pinia } = setupSelections()
    store.addSession({ minutes: 30, note: 'Test', endedAt: Date.now() })

    const wrapper = mount(Totals, { global: { plugins: [pinia] } })
    expect(wrapper.find('.text-xs').text()).toContain('You lost')
  })
})
