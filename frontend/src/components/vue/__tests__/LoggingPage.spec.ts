import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBoomerBill } from '../store/boomerbills'
// @ts-expect-error - Vue files not typed in tests
import LoggingPage from '../LoggingPage.vue'

function setupSelections(pinia = createPinia()) {
  setActivePinia(pinia)
  const store = useBoomerBill()
  const boomerId = store.addBoomer('Test Boomer') || 'boomer-1'
  store.selectBoomer(boomerId)
  store.selectCategory(store.categories[0].id)
  return { store, pinia }
}

describe('LoggingPage.vue', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('shows empty state when no sessions', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(LoggingPage, { global: { plugins: [pinia] } })
    expect(wrapper.text()).toContain('No sessions logged yet')

    const getButton = (label: string) =>
      wrapper.findAll('button').find(button => button.text().includes(label))

    expect(getButton('Copy Summary')?.attributes('disabled')).toBeDefined()
    expect(getButton('Copy CSV')?.attributes('disabled')).toBeDefined()
    expect(getButton('Export CSV')?.attributes('disabled')).toBeDefined()
    expect(getButton('Clear All')?.attributes('disabled')).toBeDefined()
  })

  it('renders rows when sessions exist', () => {
    const { store, pinia } = setupSelections()
    store.addSession({ minutes: 30, note: 'Test', endedAt: Date.now() })

    const wrapper = mount(LoggingPage, { global: { plugins: [pinia] } })
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.text()).toContain('Test Boomer')
  })
})
