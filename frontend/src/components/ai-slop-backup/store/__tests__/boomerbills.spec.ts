import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useBoomerBill } from '../boomerbills'
import { createPinia, setActivePinia } from 'pinia'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('useBoomerBill Store - Enhanced', () => {
  // Fixed date: January 15, 2024 at noon
  const MOCK_NOW = new Date('2024-01-15T12:00:00').getTime()
  
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.getItem.mockReset()
    localStorageMock.setItem.mockReset()
    localStorageMock.removeItem.mockReset()
    localStorageMock.clear.mockReset()
    vi.spyOn(Date, 'now').mockReturnValue(MOCK_NOW)
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial values', () => {
      const store = useBoomerBill()
      
      expect(store.rate).toBe(75)
      expect(store.sessions).toEqual([])
      expect(store.boomers).toEqual([])
      expect(store.categories).toHaveLength(6) // 6 default categories
      expect(store.startTime).toBeNull()
      expect(store.selectedBoomerId).toBeNull()
      expect(store.selectedCategoryId).toBeNull()
      expect(store.isRunning).toBe(false)
    })

    it('should have default categories', () => {
      const store = useBoomerBill()
      
      const categoryNames = store.categories.map(c => c.name)
      expect(categoryNames).toContain('WiFi Issues')
      expect(categoryNames).toContain('Printer Problems')
      expect(categoryNames).toContain('Password Reset')
      expect(categoryNames).toContain('Email Setup')
      expect(categoryNames).toContain('Software Install')
      expect(categoryNames).toContain('General Tech Support')
    })
  })

  describe('Boomer Management', () => {
    it('should add a boomer', () => {
      const store = useBoomerBill()
      
      const id = store.addBoomer('Uncle Bob')
      
      expect(store.boomers).toHaveLength(1)
      expect(store.boomers[0].name).toBe('Uncle Bob')
      expect(store.boomers[0].id).toBe(id)
      expect(store.boomers[0].createdAt).toBe(MOCK_NOW)
    })

    it('should remove a boomer', () => {
      const store = useBoomerBill()
      const id = store.addBoomer('Uncle Bob')
      
      store.removeBoomer(id)
      
      expect(store.boomers).toHaveLength(0)
    })

    it('should clear selected boomer when removed', () => {
      const store = useBoomerBill()
      const id = store.addBoomer('Uncle Bob')
      store.selectBoomer(id)
      
      store.removeBoomer(id)
      
      expect(store.selectedBoomerId).toBeNull()
    })

    it('should select a boomer', () => {
      const store = useBoomerBill()
      const id = store.addBoomer('Uncle Bob')
      
      store.selectBoomer(id)
      
      expect(store.selectedBoomerId).toBe(id)
      expect(store.selectedBoomer?.name).toBe('Uncle Bob')
    })

    it('should trim boomer name', () => {
      const store = useBoomerBill()
      
      store.addBoomer('  Uncle Bob  ')
      
      expect(store.boomers[0].name).toBe('Uncle Bob')
    })
  })

  describe('Category Management', () => {
    it('should add a custom category', () => {
      const store = useBoomerBill()
      
      const id = store.addCategory('Virus Removal')
      
      expect(store.categories).toHaveLength(7) // 6 defaults + 1 custom
      const customCat = store.categories.find(c => c.id === id)
      expect(customCat?.name).toBe('Virus Removal')
      expect(customCat?.isDefault).toBe(false)
    })

    it('should not remove default categories', () => {
      const store = useBoomerBill()
      const defaultCat = store.categories.find(c => c.isDefault)
      
      expect(() => store.removeCategory(defaultCat!.id)).toThrow('Cannot remove default categories')
    })

    it('should remove custom categories', () => {
      const store = useBoomerBill()
      const id = store.addCategory('Virus Removal')
      
      store.removeCategory(id)
      
      expect(store.categories).toHaveLength(6)
    })

    it('should clear selected category when removed', () => {
      const store = useBoomerBill()
      const id = store.addCategory('Virus Removal')
      store.selectCategory(id)
      
      store.removeCategory(id)
      
      expect(store.selectedCategoryId).toBeNull()
    })

    it('should select a category', () => {
      const store = useBoomerBill()
      const category = store.categories[0]
      
      store.selectCategory(category.id)
      
      expect(store.selectedCategoryId).toBe(category.id)
      expect(store.selectedCategory?.name).toBe(category.name)
    })

    it('should trim category name', () => {
      const store = useBoomerBill()
      
      store.addCategory('  Virus Removal  ')
      
      const customCat = store.categories.find(c => !c.isDefault)
      expect(customCat?.name).toBe('Virus Removal')
    })
  })

  describe('Session Management', () => {
    beforeEach(() => {
      const store = useBoomerBill()
      store.addBoomer('Uncle Bob')
      store.selectBoomer(store.boomers[0].id)
      store.selectCategory(store.categories[0].id)
    })

    it('should require boomer and category to start', () => {
      const store = useBoomerBill()
      store.selectedBoomerId = null
      
      expect(() => store.start()).toThrow('Must select a boomer and category before starting')
    })

    it('should start timer with boomer and category', () => {
      const store = useBoomerBill()
      
      store.start(1000000)
      
      expect(store.isRunning).toBe(true)
      expect(store.startTime).toBe(1000000)
      expect(store.currentSessionInfo?.boomer?.name).toBe('Uncle Bob')
    })

    it('should stop timer and create session', () => {
      const store = useBoomerBill()
      const boomerId = store.boomers[0].id
      const categoryId = store.categories[0].id
      
      store.start(1000000)
      store.stop('WiFi fixed', 1000000 + 60000 * 30) // 30 minutes
      
      expect(store.isRunning).toBe(false)
      expect(store.sessions).toHaveLength(1)
      expect(store.sessions[0].minutes).toBe(30)
      expect(store.sessions[0].boomerId).toBe(boomerId)
      expect(store.sessions[0].categoryId).toBe(categoryId)
      expect(store.sessions[0].note).toBe('WiFi fixed')
    })

    it('should add session manually', () => {
      const store = useBoomerBill()
      const boomerId = store.boomers[0].id
      const categoryId = store.categories[0].id
      
      store.addSession({
        minutes: 45,
        note: 'Manual entry',
        startedAt: 1000000,
        endedAt: 1000000 + 60000 * 45
      })
      
      expect(store.sessions).toHaveLength(1)
      expect(store.sessions[0].minutes).toBe(45)
      expect(store.sessions[0].cost).toBe((45 / 60) * 75)
    })

    it('should require boomer and category to add session', () => {
      const store = useBoomerBill()
      store.selectedBoomerId = null
      
      expect(() => store.addSession({ minutes: 30 })).toThrow('Must select boomer and category')
    })
  })

  describe('Time Stats by Period', () => {
    beforeEach(() => {
      const store = useBoomerBill()
      store.addBoomer('Uncle Bob')
      store.addBoomer('Aunt Sally')
      store.selectBoomer(store.boomers[0].id)
      store.selectCategory(store.categories[0].id)
      
      // Today (Jan 15, 2024)
      store.addSession({
        minutes: 60,
        endedAt: new Date('2024-01-15T10:00:00').getTime()
      })
      
      // Yesterday (Jan 14, 2024)
      store.addSession({
        minutes: 45,
        endedAt: new Date('2024-01-14T10:00:00').getTime()
      })
      
      // Last week (Jan 8, 2024)
      store.addSession({
        minutes: 30,
        endedAt: new Date('2024-01-08T10:00:00').getTime()
      })
      
      // Last month (Dec 20, 2023)
      store.addSession({
        minutes: 90,
        endedAt: new Date('2023-12-20T10:00:00').getTime()
      })
      
      // Last year (Jul 15, 2023)
      store.addSession({
        minutes: 120,
        endedAt: new Date('2023-07-15T10:00:00').getTime()
      })
    })

    it('should calculate today stats', () => {
      const store = useBoomerBill()
      
      expect(store.todayStats.minutes).toBe(60)
      expect(store.todayStats.cost).toBe((60 / 60) * 75)
      expect(store.todayStats.count).toBe(1)
    })

    it('should calculate week stats', () => {
      const store = useBoomerBill()
      
      // Should include today (Jan 15) and yesterday (Jan 14), but not Jan 8
      // Week starts on Sunday, Jan 14, 2024
      expect(store.weekStats.count).toBe(2) // Jan 15 and Jan 14
    })

    it('should calculate month stats', () => {
      const store = useBoomerBill()
      
      // Should include Jan 15, Jan 14, and Jan 8
      expect(store.monthStats.count).toBe(3)
    })

    it('should calculate year stats', () => {
      const store = useBoomerBill()
      
      // Should include all sessions from 2024
      expect(store.yearStats.count).toBe(3) // Jan 15, Jan 14, Jan 8
    })
  })

  describe('Leaderboards', () => {
    beforeEach(() => {
      const store = useBoomerBill()
      
      // Add boomers
      store.addBoomer('Uncle Bob')
      store.addBoomer('Aunt Sally')
      store.addBoomer('Grandma')
      
      const bobId = store.boomers.find(b => b.name === 'Uncle Bob')!.id
      const sallyId = store.boomers.find(b => b.name === 'Aunt Sally')!.id
      const grandmaId = store.boomers.find(b => b.name === 'Grandma')!.id
      
      // Add sessions for Uncle Bob (expensive)
      store.selectBoomer(bobId)
      store.selectCategory(store.categories[0].id)
      store.addSession({ minutes: 120, endedAt: 1000000 })
      store.addSession({ minutes: 60, endedAt: 1000001 })
      
      // Add sessions for Aunt Sally (medium)
      store.selectBoomer(sallyId)
      store.addSession({ minutes: 90, endedAt: 1000002 })
      
      // Add sessions for Grandma (cheap)
      store.selectBoomer(grandmaId)
      store.addSession({ minutes: 30, endedAt: 1000003 })
    })

    it('should rank boomers by total cost', () => {
      const store = useBoomerBill()
      
      expect(store.boomerLeaderboard).toHaveLength(3)
      expect(store.boomerLeaderboard[0].boomer.name).toBe('Uncle Bob')
      expect(store.boomerLeaderboard[1].boomer.name).toBe('Aunt Sally')
      expect(store.boomerLeaderboard[2].boomer.name).toBe('Grandma')
    })

    it('should calculate boomer totals correctly', () => {
      const store = useBoomerBill()
      
      const bobStats = store.boomerLeaderboard.find(b => b.boomer.name === 'Uncle Bob')
      expect(bobStats?.minutes).toBe(180) // 120 + 60
      expect(bobStats?.count).toBe(2)
    })

    it('should rank categories by time', () => {
      const store = useBoomerBill()
      
      // All sessions used the same category
      expect(store.categoryLeaderboard).toHaveLength(1)
      expect(store.categoryLeaderboard[0].count).toBe(4)
    })
  })

  describe('Chart Data', () => {
    beforeEach(() => {
      const store = useBoomerBill()
      
      // Add multiple boomers
      for (let i = 1; i <= 6; i++) {
        store.addBoomer(`Boomer ${i}`)
        store.selectBoomer(store.boomers[i - 1].id)
        store.selectCategory(store.categories[0].id)
        store.addSession({ minutes: i * 30, endedAt: 1000000 + i })
      }
    })

    it('should generate boomer chart data', () => {
      const store = useBoomerBill()
      
      expect(store.boomerChartData.labels).toHaveLength(5) // Top 5
      expect(store.boomerChartData.datasets[0].data).toHaveLength(5)
      expect(store.boomerChartData.datasets[0].label).toBe('Total Cost ($)')
    })

    it('should generate category chart data', () => {
      const store = useBoomerBill()
      
      expect(store.categoryChartData.datasets[0].label).toBe('Time (minutes)')
    })
  })

  describe('Export', () => {
    it('should export CSV with boomer and category names', () => {
      const store = useBoomerBill()
      store.addBoomer('Uncle Bob')
      store.selectBoomer(store.boomers[0].id)
      store.selectCategory(store.categories[0].id)
      store.addSession({ minutes: 60, note: 'Test', endedAt: 1000000 })
      
      const csv = store.exportCSV
      
      expect(csv).toContain('id,boomer,category,minutes,cost,startedAt,endedAt,note')
      expect(csv).toContain('Uncle Bob')
      expect(csv).toContain('WiFi Issues')
    })
  })

  describe('Persistence', () => {
    it('should save all entities to localStorage', () => {
      const store = useBoomerBill()
      store.addBoomer('Uncle Bob')
      store.addCategory('Custom Cat')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('bb_boomers', expect.any(String))
      expect(localStorageMock.setItem).toHaveBeenCalledWith('bb_categories', expect.any(String))
    })

    it('should load boomers from localStorage', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'bb_boomers') {
          return JSON.stringify([{ id: '1', name: 'Loaded Boomer', createdAt: 1000000 }])
        }
        return null
      })
      
      const store = useBoomerBill()
      store.load()
      
      expect(store.boomers).toHaveLength(1)
      expect(store.boomers[0].name).toBe('Loaded Boomer')
    })

    it('should merge custom categories with defaults on load', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'bb_categories') {
          return JSON.stringify([
            { id: 'wifi', name: 'WiFi Issues', isDefault: true },
            { id: 'custom', name: 'Custom Cat', isDefault: false }
          ])
        }
        return null
      })
      
      const store = useBoomerBill()
      store.load()
      
      expect(store.categories).toHaveLength(7) // 6 defaults + 1 custom
      expect(store.categories.some(c => c.name === 'Custom Cat')).toBe(true)
    })
  })
})
