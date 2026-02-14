import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBoomerBill } from '../boomerbills'

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('useBoomerBill Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.getItem.mockReset()
    localStorageMock.setItem.mockReset()
    localStorageMock.removeItem.mockReset()
    localStorageMock.clear.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function setupSelections(store = useBoomerBill()) {
    const boomerId = store.addBoomer('Test Boomer') || 'boomer-1'
    store.selectBoomer(boomerId)
    store.selectCategory(store.categories[0].id)
    return store
  }

  it('initializes with defaults', () => {
    const store = useBoomerBill()
    expect(store.rate).toBe(75)
    expect(store.sessions).toEqual([])
    expect(store.categories.length).toBeGreaterThan(0)
    expect(store.isRunning).toBe(false)
  })

  it('requires selection before starting', () => {
    const store = useBoomerBill()
    expect(() => store.start()).toThrow('Must select a boomer and category before starting')
  })

  it('creates a session on stop', () => {
    const store = setupSelections()
    const start = 1000000
    const end = start + 60000 * 5

    store.start(start)
    store.stop('Test', end)

    expect(store.sessions.length).toBe(1)
    expect(store.sessions[0].minutes).toBe(5)
    expect(store.sessions[0].note).toBe('Test')
    expect(store.sessions[0].boomerId).toBe(store.selectedBoomerId)
    expect(store.sessions[0].categoryId).toBe(store.selectedCategoryId)
  })

  it('requires selection before adding a session', () => {
    const store = useBoomerBill()
    expect(() => store.addSession({ minutes: 5 })).toThrow('Must select boomer and category')
  })

  it('adds sessions with cost based on rate', () => {
    const store = setupSelections()
    store.rate = 100
    store.addSession({ minutes: 30, note: 'Test', endedAt: 123 })
    expect(store.sessions[0].cost).toBe(50)
  })

  it('exports CSV with boomer and category names', () => {
    const store = setupSelections()
    store.addSession({ minutes: 30, note: 'Test', endedAt: 123 })

    const csv = store.exportCSV
    expect(csv).toContain('id,boomer,category,minutes,cost,startedAt,endedAt,note')
    expect(csv).toContain('Test Boomer')
    expect(csv).toContain('WiFi Issues')
  })

  it('loads legacy sessions with ended_at', () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'bb_sessions') {
        return JSON.stringify([{ id: 1, minutes: 30, cost: 50, ended_at: 1000000 }])
      }
      return null
    })

    const store = useBoomerBill()
    store.load()

    expect(store.sessions.length).toBe(1)
    expect(store.sessions[0].endedAt).toBe(1000000)
    expect(store.sessions[0].startedAt).toBe(1000000)
    expect(store.boomers.some(b => b.id === 'legacy')).toBe(true)
  })

  it('persists sessions on add', () => {
    const store = setupSelections()
    store.addSession({ minutes: 10, note: 'Test', endedAt: 1 })

    expect(localStorageMock.setItem).toHaveBeenCalledWith('bb_sessions', expect.any(String))
  })
})
