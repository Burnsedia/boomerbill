import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBoomerBill } from '../store/boomerbills'
// @ts-expect-error - Vue files not typed in tests
import Timer from '../Timer.vue'

function setupSelections(pinia = createPinia()) {
  setActivePinia(pinia)
  const store = useBoomerBill()
  const boomerId = store.addBoomer('Test Boomer') || 'boomer-1'
  store.selectBoomer(boomerId)
  store.selectCategory(store.categories[0].id)
  return { store, pinia }
}

describe('Timer.vue', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders start and stop buttons', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(Timer, { global: { plugins: [pinia] } })

    expect(wrapper.find('button.btn-success').exists()).toBe(true)
    expect(wrapper.find('button.btn-error').exists()).toBe(true)
  })

  it('disables start until selections are made', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(Timer, { global: { plugins: [pinia] } })

    const startBtn = wrapper.find('button.btn-success')
    expect(startBtn.attributes('disabled')).toBeDefined()
  })

  it('enables start when boomer and category are selected', () => {
    const { pinia } = setupSelections()
    const wrapper = mount(Timer, { global: { plugins: [pinia] } })

    const startBtn = wrapper.find('button.btn-success')
    expect(startBtn.attributes('disabled')).toBeUndefined()
  })

  it('starts and stops a session', async () => {
    const { store, pinia } = setupSelections()
    const wrapper = mount(Timer, { global: { plugins: [pinia] } })

    await wrapper.find('button.btn-success').trigger('click')
    expect(store.isRunning).toBe(true)

    await wrapper.find('button.btn-error').trigger('click')
    expect(store.isRunning).toBe(false)
    expect(store.sessions.length).toBe(1)
  })

  it('shows note input while running', async () => {
    const { pinia } = setupSelections()
    const wrapper = mount(Timer, { global: { plugins: [pinia] } })

    await wrapper.find('button.btn-success').trigger('click')
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
  })

  it('adds a quick session when preset clicked', async () => {
    const { store, pinia } = setupSelections()
    const wrapper = mount(Timer, { global: { plugins: [pinia] } })

    const presetButtons = wrapper.findAll('button.btn-outline')
    await presetButtons[0].trigger('click')

    expect(store.sessions).toHaveLength(1)
    expect(store.sessions[0].minutes).toBe(5)
    expect(store.sessions[0].note).toBe('Just one quick thing')
  })
})
