import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBoomerBill } from '../store/boomerbills'
// @ts-expect-error - Vue files not typed in tests
import RateInput from '../RateInput.vue'

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
})

describe('RateInput.vue', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('renders rate input label', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(RateInput, { global: { plugins: [pinia] } })
    
    expect(wrapper.find('.label-text').text()).toBe('Hourly Rate')
  })

  it('displays default rate value', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useBoomerBill()
    const wrapper = mount(RateInput, { global: { plugins: [pinia] } })
    
    const input = wrapper.find('input[type="number"]')
    expect((input.element as HTMLInputElement).value).toBe(String(store.rate))
  })

  it('updates store rate when input changes', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useBoomerBill()
    const wrapper = mount(RateInput, { global: { plugins: [pinia] } })
    
    const input = wrapper.find('input[type="number"]')
    await input.setValue(100)
    
    expect(store.rate).toBe(100)
  })

  it('enforces minimum rate of 1', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(RateInput, { global: { plugins: [pinia] } })
    
    const input = wrapper.find('input[type="number"]')
    
    expect(input.attributes('min')).toBe('1')
  })

  it('displays helper text', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(RateInput, { global: { plugins: [pinia] } })
    
    expect(wrapper.text()).toContain('Default is average US developer rate')
  })

  it('uses number type for input', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(RateInput, { global: { plugins: [pinia] } })
  
    const input = wrapper.find('input')
    expect(input.attributes('type')).toBe('number')
  })
})
