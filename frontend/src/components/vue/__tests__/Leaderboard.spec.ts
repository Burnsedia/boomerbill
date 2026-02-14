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

  it('shows empty state when no sessions', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(Leaderboard, { global: { plugins: [pinia] } })
    
    expect(wrapper.text()).toContain('No damage recorded yet')
  })

  it('renders session list when sessions exist', () => {
    const { store, pinia } = setupSelections()
    store.addSession({ minutes: 30, note: 'Test', endedAt: Date.now() })
    
    const wrapper = mount(Leaderboard, { global: { plugins: [pinia] } })
    
    expect(wrapper.find('ul').exists()).toBe(true)
    expect(wrapper.findAll('li').length).toBe(1)
  })

  it('displays session number', () => {
    const { store, pinia } = setupSelections()
    store.addSession({ minutes: 30, note: 'Test', endedAt: Date.now() })
    
    const wrapper = mount(Leaderboard, { global: { plugins: [pinia] } })
    
    expect(wrapper.text()).toContain('#1')
  })

  it('displays session cost', () => {
    const { store, pinia } = setupSelections()
    store.rate = 100
    store.addSession({ minutes: 60, note: 'Test', endedAt: Date.now() })
    
    const wrapper = mount(Leaderboard, { global: { plugins: [pinia] } })
    
    expect(wrapper.text()).toContain('$100.00')
  })

  it('displays severity label', () => {
    const { store, pinia } = setupSelections()
    store.addSession({ minutes: 20, note: 'Test', endedAt: Date.now() })
    
    const wrapper = mount(Leaderboard, { global: { plugins: [pinia] } })
    
    expect(wrapper.text()).toContain('Painful')
  })

  it('displays note when present', () => {
    const { store, pinia } = setupSelections()
    store.addSession({ minutes: 15, note: 'Printer jam', endedAt: Date.now() })
    
    const wrapper = mount(Leaderboard, { global: { plugins: [pinia] } })
    
    expect(wrapper.text()).toContain('Printer jam')
  })

  it('sorts sessions by cost descending', () => {
    const { store, pinia } = setupSelections()
    store.rate = 100
    
    // Add sessions out of order
    store.addSession({ minutes: 30, note: '30 min', endedAt: 1000 })
    store.addSession({ minutes: 120, note: '2 hours', endedAt: 1001 })
    store.addSession({ minutes: 60, note: '1 hour', endedAt: 1002 })
    
    const wrapper = mount(Leaderboard, { global: { plugins: [pinia] } })
    
    const items = wrapper.findAll('li')
    
    // Should be sorted: 2 hours, 1 hour, 30 min
    expect(items[0].text()).toContain('#1')
    expect(items[0].text()).toContain('200.00')
    expect(items[1].text()).toContain('#2')
    expect(items[1].text()).toContain('100.00')
    expect(items[2].text()).toContain('#3')
    expect(items[2].text()).toContain('50.00')
  })

})
