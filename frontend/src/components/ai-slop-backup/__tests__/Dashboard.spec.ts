import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBoomerBill } from '../store/boomerbills'
// @ts-expect-error - Vue files not typed in tests
import Dashboard from '../Dashboard.vue'

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
})

describe('Dashboard.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders dashboard title', () => {
    const wrapper = mount(Dashboard)
    
    expect(wrapper.find('.card-title').text()).toBe('Damage Dashboard')
  })

  it('displays avg per day', () => {
    const store = useBoomerBill()
    store.addSession(60, '1 hour', Date.now())
    
    const wrapper = mount(Dashboard)
    
    const avgPerDay = wrapper.findAll('.stat')[0]
    expect(avgPerDay.find('.stat-title').text()).toBe('Avg / Day')
  })

  it('displays avg per week', () => {
    const store = useBoomerBill()
    store.addSession(60, '1 hour', Date.now())
    
    const wrapper = mount(Dashboard)
    
    const avgPerWeek = wrapper.findAll('.stat')[1]
    expect(avgPerWeek.find('.stat-title').text()).toBe('Avg / Week')
  })

  it('displays avg per year', () => {
    const store = useBoomerBill()
    store.addSession(60, '1 hour', Date.now())
    
    const wrapper = mount(Dashboard)
    
    const avgPerYear = wrapper.findAll('.stat')[2]
    expect(avgPerYear.find('.stat-title').text()).toBe('Avg / Year')
  })

  // BUG EXPOSURE: Dashboard shows impossible >24hr averages
  it('BUG: displays averages exceeding 24 hours', () => {
    const store = useBoomerBill()
    const baseTime = new Date('2024-01-01').getTime()
    
    // Create multiple long sessions in one day
    for (let i = 0; i < 15; i++) {
      store.addSession(120, `Session ${i}`, baseTime + i * 1000) // 2 hours each
    }
    // Total: 30 hours in one day
    
    const wrapper = mount(Dashboard)
    
    // The avg per day should show 30.00 hours - which is >24!
    const avgPerDay = wrapper.findAll('.stat')[0]
    const hoursText = avgPerDay.find('.stat-value').text()
    
    // This will show 30.00h which is logically impossible
    expect(hoursText).toContain('30.00')
  })

  // BUG EXPOSURE: Running timer doesn't affect dashboard
  it('BUG: running timer does not appear in dashboard stats', () => {
    const store = useBoomerBill()
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000
    
    // Start timer 3 hours ago
    store.start(threeHoursAgo)
    
    const wrapper = mount(Dashboard)
    
    // Dashboard should show something about the running session
    // But it doesn't - all stats are based on completed sessions only
    const avgPerDay = wrapper.findAll('.stat')[0]
    const hoursText = avgPerDay.find('.stat-value').text()
    
    // Shows 0.00h because timer is not yet a "session"
    expect(hoursText).toContain('0.00')
  })

  // BUG EXPOSURE: daysActive includes inactive days
  it('BUG: daysActive count includes days with no activity', () => {
    const store = useBoomerBill()
    const jan1 = new Date('2024-01-01').getTime()
    const jan10 = new Date('2024-01-10').getTime()
    
    // Only 2 sessions, 9 days apart
    store.addSession(30, 'Jan 1', jan1)
    store.addSession(30, 'Jan 10', jan10)
    
    const wrapper = mount(Dashboard)
    
    // Footer shows "Based on X days of recorded damage"
    const footer = wrapper.find('.text-xs')
    expect(footer.text()).toContain('10 days') // Not 2!
  })
})
