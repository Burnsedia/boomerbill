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
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders rate input label', () => {
    const wrapper = mount(RateInput)
    
    expect(wrapper.find('.label-text').text()).toBe('Hourly Rate')
  })

  it('displays default rate value', () => {
    const store = useBoomerBill()
    const wrapper = mount(RateInput)
    
    const input = wrapper.find('input[type="number"]')
    expect((input.element as HTMLInputElement).value).toBe(String(store.rate))
  })

  it('updates store rate when input changes', async () => {
    const store = useBoomerBill()
    const wrapper = mount(RateInput)
    
    const input = wrapper.find('input[type="number"]')
    await input.setValue(100)
    
    expect(store.rate).toBe(100)
  })

  it('enforces minimum rate of 1', async () => {
    const wrapper = mount(RateInput)
    
    const input = wrapper.find('input[type="number"]')
    
    expect(input.attributes('min')).toBe('1')
  })

  it('displays helper text', () => {
    const wrapper = mount(RateInput)
    
    expect(wrapper.text()).toContain('Default is average US developer rate')
  })

  it('uses number type for input', () => {
    const wrapper = mount(RateInput)
    
    const input = wrapper.find('input')
    expect(input.attributes('type')).toBe('number')
  })
})
