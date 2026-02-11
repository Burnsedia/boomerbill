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
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders incident count', () => {
    const store = useBoomerBill()
    store.addSession(15, 'Test', Date.now())
    
    const wrapper = mount(Totals)
    
    const incidentStat = wrapper.findAll('.stat')[0]
    expect(incidentStat.find('.stat-title').text()).toBe('Incidents')
    expect(incidentStat.find('.stat-value').text()).toBe('1')
  })

  it('renders total damage', () => {
    const store = useBoomerBill()
    store.rate = 100
    store.addSession(60, 'Test', Date.now())
    
    const wrapper = mount(Totals)
    
    const damageStat = wrapper.findAll('.stat')[1]
    expect(damageStat.find('.stat-title').text()).toBe('Total Damage')
    expect(damageStat.find('.stat-value').text()).toContain('100.00')
  })

  it('displays weekly summary', () => {
    const store = useBoomerBill()
    store.addSession(60, 'Recent', Date.now())
    
    const wrapper = mount(Totals)
    
    const summary = wrapper.find('.text-xs')
    expect(summary.text()).toContain('You lost')
  })

  it('formats cost with 2 decimal places', () => {
    const store = useBoomerBill()
    store.rate = 75
    store.addSession(30, 'Test', Date.now())
    
    const wrapper = mount(Totals)
    
    const damageStat = wrapper.findAll('.stat')[1]
    expect(damageStat.find('.stat-value').text()).toContain('37.50')
  })

  // BUG EXPOSURE: Weekly summary ignores running timer
  it('BUG: weekly summary excludes running timer', () => {
    const store = useBoomerBill()
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
    
    // Start timer 2 hours ago
    store.start(twoHoursAgo)
    
    const wrapper = mount(Totals)
    
    const summary = wrapper.find('.text-xs')
    
    // Shows $0.00 even though timer has been running for 2 hours
    // At $75/hr, should be ~$150
    expect(summary.text()).toBe('You lost $0.00 this week.')
  })
})
