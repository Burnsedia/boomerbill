import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBoomerBill } from '../store/boomerbills'
// @ts-expect-error - Vue files not typed in tests
import Leaderboard from '../Leaderboard.vue'

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
})

describe('Leaderboard.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('shows empty state when no sessions', () => {
    const wrapper = mount(Leaderboard)
    
    expect(wrapper.text()).toContain('No damage recorded yet')
  })

  it('renders session list when sessions exist', () => {
    const store = useBoomerBill()
    store.addSession(30, 'Test', Date.now())
    
    const wrapper = mount(Leaderboard)
    
    expect(wrapper.find('ul').exists()).toBe(true)
    expect(wrapper.findAll('li').length).toBe(1)
  })

  it('displays session number', () => {
    const store = useBoomerBill()
    store.addSession(30, 'Test', Date.now())
    
    const wrapper = mount(Leaderboard)
    
    expect(wrapper.text()).toContain('#1')
  })

  it('displays session cost', () => {
    const store = useBoomerBill()
    store.rate = 100
    store.addSession(60, 'Test', Date.now())
    
    const wrapper = mount(Leaderboard)
    
    expect(wrapper.text()).toContain('$100.00')
  })

  it('displays severity label', () => {
    const store = useBoomerBill()
    store.addSession(20, 'Test', Date.now())
    
    const wrapper = mount(Leaderboard)
    
    expect(wrapper.text()).toContain('Painful')
  })

  it('displays note when present', () => {
    const store = useBoomerBill()
    store.addSession(15, 'Printer jam', Date.now())
    
    const wrapper = mount(Leaderboard)
    
    expect(wrapper.text()).toContain('Printer jam')
  })

  it('sorts sessions by cost descending', () => {
    const store = useBoomerBill()
    store.rate = 100
    
    // Add sessions out of order
    store.addSession(30, '30 min', 1000)
    store.addSession(120, '2 hours', 1001)
    store.addSession(60, '1 hour', 1002)
    
    const wrapper = mount(Leaderboard)
    
    const items = wrapper.findAll('li')
    
    // Should be sorted: 2 hours, 1 hour, 30 min
    expect(items[0].text()).toContain('#1')
    expect(items[0].text()).toContain('200.00')
    expect(items[1].text()).toContain('#2')
    expect(items[1].text()).toContain('100.00')
    expect(items[2].text()).toContain('#3')
    expect(items[2].text()).toContain('50.00')
  })

  // BUG EXPOSURE: Running timer doesn't appear in leaderboard
  it('BUG: running timer does not appear in leaderboard', () => {
    const store = useBoomerBill()
    store.start(Date.now() - 3600000) // Started 1 hour ago
    
    const wrapper = mount(Leaderboard)
    
    // Shows empty state even though timer is running
    expect(wrapper.text()).toContain('No damage recorded yet')
  })
})
