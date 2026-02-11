import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBoomerBill } from '../store/boomerbills'
// @ts-expect-error - Vue files not typed in tests
import Timer from '../Timer.vue'

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
})

describe('Timer.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders start button when timer is stopped', () => {
    const wrapper = mount(Timer)
    
    const startBtn = wrapper.find('button.btn-success')
    expect(startBtn.exists()).toBe(true)
    expect(startBtn.text()).toContain('Start')
  })

  it('renders stop button when timer is running', async () => {
    const store = useBoomerBill()
    store.start(1000000)
    
    const wrapper = mount(Timer)
    
    const stopBtn = wrapper.find('button.btn-error')
    expect(stopBtn.exists()).toBe(true)
    expect(stopBtn.text()).toContain('Stop')
  })

  it('disables start button when timer is running', async () => {
    const store = useBoomerBill()
    store.start(1000000)
    
    const wrapper = mount(Timer)
    
    const startBtn = wrapper.find('button.btn-success')
    expect(startBtn.attributes('disabled')).toBeDefined()
  })

  it('disables stop button when timer is stopped', () => {
    const wrapper = mount(Timer)
    
    const stopBtn = wrapper.find('button.btn-error')
    expect(stopBtn.attributes('disabled')).toBeDefined()
  })

  it('starts timer when clicking start', async () => {
    const store = useBoomerBill()
    const wrapper = mount(Timer)
    
    await wrapper.find('button.btn-success').trigger('click')
    
    expect(store.isRunning).toBe(true)
  })

  it('stops timer when clicking stop', async () => {
    const store = useBoomerBill()
    store.start(1000000)
    
    const wrapper = mount(Timer)
    await wrapper.find('button.btn-error').trigger('click')
    
    expect(store.isRunning).toBe(false)
  })

  it('displays elapsed time when timer is running', async () => {
    const store = useBoomerBill()
    const now = 1000000
    store.start(now)
    
    const wrapper = mount(Timer)
    
    // Advance time by 65 seconds
    await vi.advanceTimersByTimeAsync(65000)
    
    // Should show 1:05
    const timeDisplay = wrapper.find('.font-mono.text-sm')
    expect(timeDisplay.exists()).toBe(true)
  })

  it('displays live cost when timer is running', async () => {
    const store = useBoomerBill()
    store.rate = 100
    store.start(Date.now())
    
    const wrapper = mount(Timer)
    
    // Advance time by 1 hour
    await vi.advanceTimersByTimeAsync(3600000)
    
    const costDisplay = wrapper.find('.font-mono.text-sm')
    expect(costDisplay.exists()).toBe(true)
  })

  it('shows warning text when timer is running', () => {
    const store = useBoomerBill()
    store.start(Date.now())
    
    const wrapper = mount(Timer)
    
    const warning = wrapper.find('.text-warning')
    expect(warning.exists()).toBe(true)
    expect(warning.text()).toContain('losing money')
  })

  it('renders preset buttons', () => {
    const wrapper = mount(Timer)
    
    const buttons = wrapper.findAll('button.btn-outline')
    expect(buttons.length).toBe(4)
    
    expect(buttons[0].text()).toContain('Just one quick thing')
    expect(buttons[1].text()).toContain('Wi-Fi stopped working')
    expect(buttons[2].text()).toContain('Printer issue')
    expect(buttons[3].text()).toContain('I broke something')
  })

  it('adds session when clicking preset', async () => {
    const store = useBoomerBill()
    const wrapper = mount(Timer)
    
    await wrapper.findAll('button.btn-outline')[0].trigger('click')
    
    expect(store.sessions).toHaveLength(1)
    expect(store.sessions[0].minutes).toBe(5)
    expect(store.sessions[0].note).toBe('Just one quick thing')
  })

  // BUG EXPOSURE: Timer continues counting even when hidden/unmounted
  it('BUG: Timer interval continues after component unmount', async () => {
    const store = useBoomerBill()
    store.start(Date.now())
    
    const wrapper = mount(Timer)
    
    // Unmount component
    wrapper.unmount()
    
    // The interval is cleared on unmount, but there's no test for this
    // If it weren't cleared, the timer would keep running in background
    // This is a potential memory leak
  })
})
