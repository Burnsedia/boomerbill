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

// Mock navigator.clipboard
Object.defineProperty(window, 'navigator', {
  value: {
    clipboard: {
      writeText: vi.fn()
    }
  }
})

describe('useBoomerBill Store', () => {
  // Fixed "current" date for tests: January 15, 2024
  const MOCK_NOW = new Date('2024-01-15T12:00:00').getTime()
  
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.getItem.mockReset()
    localStorageMock.setItem.mockReset()
    localStorageMock.removeItem.mockReset()
    localStorageMock.clear.mockReset()
    
    // Mock Date.now() to return our fixed time
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
      expect(store.startTime).toBeNull()
      expect(store.isRunning).toBe(false)
      expect(store.incidentCount).toBe(0)
    })
  })

  describe('Timer Start/Stop', () => {
    it('should start timer and set startTime', () => {
      const store = useBoomerBill()
      const now = 1000000
      
      store.start(now)
      
      expect(store.startTime).toBe(now)
      expect(store.isRunning).toBe(true)
    })

    it('should stop timer and create a session', () => {
      const store = useBoomerBill()
      const startTime = 1000000
      const endTime = 1000000 + 60000 * 5 // 5 minutes later
      
      store.start(startTime)
      store.stop(undefined, endTime)
      
      expect(store.startTime).toBeNull()
      expect(store.isRunning).toBe(false)
      expect(store.sessions).toHaveLength(1)
      expect(store.sessions[0].minutes).toBe(5)
    })

    it('should include note when stopping with note', () => {
      const store = useBoomerBill()
      
      store.start(1000000)
      store.stop('WiFi issue', 1000000 + 60000 * 10)
      
      expect(store.sessions[0].note).toBe('WiFi issue')
    })

    it('should enforce minimum 1 minute session', () => {
      const store = useBoomerBill()
      
      store.start(1000000)
      store.stop(undefined, 1000000 + 500) // Only 500ms
      
      expect(store.sessions[0].minutes).toBe(1)
    })

    // BUG EXPOSURE TEST 1: Timer duration not tracked
    it('BUG: Long-running timer skews daysActive calculation', () => {
      const store = useBoomerBill()
      const day1 = new Date('2024-01-01').getTime()
      const day4 = new Date('2024-01-04').getTime() // 3 days later
      
      // User starts timer on day 1
      store.start(day1)
      
      // Timer runs for 3 days without being stopped
      // During this time, daysActive should reflect the ongoing session
      
      // BUG: Currently daysActive returns 0 because no sessions have ended_at
      // The running timer is completely invisible to the dashboard metrics
      expect(store.daysActive).toBe(0)
      
      // This causes avgPerDay, avgPerWeek, avgPerYear to be 0 or Infinity
      expect(store.avgPerDay).toBe(0)
    })

    // BUG EXPOSURE TEST 2: No started_at timestamp
    it('BUG: Sessions lack started_at timestamp', () => {
      const store = useBoomerBill()
      const startTime = 1000000
      const endTime = 1000000 + 60000 * 10
      
      store.start(startTime)
      store.stop(undefined, endTime)
      
      const session = store.sessions[0]
      
      // Session only has ended_at, not started_at
      expect(session.ended_at).toBe(endTime)
      
      // BUG: We can't determine when the session actually started!
      // This breaks accurate duration tracking and analytics
      expect('started_at' in session).toBe(false)
    })
  })

  describe('Session Management', () => {
    it('should add session manually', () => {
      const store = useBoomerBill()
      
      store.addSession(15, 'Printer jam')
      
      expect(store.sessions).toHaveLength(1)
      expect(store.sessions[0].minutes).toBe(15)
      expect(store.sessions[0].note).toBe('Printer jam')
      expect(store.sessions[0].cost).toBe((15 / 60) * 75)
    })

    it('should calculate cost based on current rate', () => {
      const store = useBoomerBill()
      store.rate = 100
      
      store.addSession(60, 'One hour')
      
      expect(store.sessions[0].cost).toBe(100)
    })

    it('should sort sessions by cost descending', () => {
      const store = useBoomerBill()
      
      store.addSession(10, '10 min', 1000000)
      store.addSession(60, '60 min', 1000001)
      store.addSession(30, '30 min', 1000002)
      
      expect(store.sortedSessions[0].minutes).toBe(60)
      expect(store.sortedSessions[1].minutes).toBe(30)
      expect(store.sortedSessions[2].minutes).toBe(10)
    })
  })

  describe('Dashboard Metrics - BUG EXPOSURE', () => {
    // BUG EXPOSURE TEST 3: Averages exceeding 24 hours
    it('BUG: avgPerDay can exceed 24 hours with short duration', () => {
      const store = useBoomerBill()
      const baseTime = new Date('2024-01-15').getTime()
      
      // Add 10 sessions of 3 hours each = 30 hours total
      // All on the same day (within 24 hours)
      for (let i = 0; i < 10; i++) {
        store.addSession(180, `Session ${i}`, baseTime + i * 1000)
      }
      
      // Total minutes: 10 * 180 = 1800 minutes = 30 hours
      expect(store.totals.minutes).toBe(1800)
      
      // daysActive: 1 (all sessions on Jan 15, current time is Jan 15)
      expect(store.daysActive).toBe(1)
      
      // BUG: avgPerDay = 1800 / 1 = 1800 minutes = 30 hours!
      // This exceeds 24 hours, which is logically impossible for "per day"
      expect(store.avgPerDay).toBe(1800)
      expect(store.avgPerDay / 60).toBeGreaterThan(24)
      
      // This also affects avgPerWeek and avgPerYear
      expect(store.avgPerWeek / 60).toBeGreaterThan(24 * 7)
      expect(store.avgPerYear / 60).toBeGreaterThan(24 * 365)
    })

    // BUG EXPOSURE TEST 4: daysActive counts calendar days, not active days
    it('BUG: daysActive counts calendar days, not active days', () => {
      const store = useBoomerBill()
      const jan1 = new Date('2024-01-01T10:00:00').getTime()
      const jan10 = new Date('2024-01-10T10:00:00').getTime()
      
      // Session on Jan 1
      store.addSession(5, 'Jan 1 session', jan1)
      
      // Session on Jan 10 (9 days gap)
      store.addSession(5, 'Jan 10 session', jan10)
      
      // BUG: daysActive counts ALL calendar days from first session to NOW
      // including days with no activity (Jan 1 to Jan 15 = 15 days)
      expect(store.daysActive).toBe(15)
      
      // But actual "active days" (days with sessions) is only 2
      // This artificially deflates the averages
      const actualActiveDays = 2
      const actualAvgPerDay = store.totals.minutes / actualActiveDays // 5 minutes
      const reportedAvgPerDay = store.avgPerDay // 1 minute (inflated denominator)
      
      expect(reportedAvgPerDay).toBeLessThan(actualAvgPerDay)
    })

    it('should calculate severity correctly', () => {
      const store = useBoomerBill()
      
      expect(store.severity(2)).toBe('Minor annoyance')
      expect(store.severity(10)).toBe('Avoidable')
      expect(store.severity(20)).toBe('Painful')
      expect(store.severity(45)).toBe('Unforgivable')
    })
  })

  describe('Time-based Helpers', () => {
    it('should calculate currentDurationMs correctly', () => {
      const store = useBoomerBill()
      const startTime = 1000000
      const now = 1000000 + 5000 // 5 seconds later
      
      store.start(startTime)
      
      expect(store.currentDurationMs(now)).toBe(5000)
    })

    it('should return 0 when timer not running', () => {
      const store = useBoomerBill()
      
      expect(store.currentDurationMs(1000000)).toBe(0)
    })

    // BUG EXPOSURE TEST 5: Weekly summary ignores running timer
    it('BUG: weeklySummary does not include running timer', () => {
      const store = useBoomerBill()
      const now = Date.now()
      const oneHourAgo = now - 3600000
      
      // Start timer an hour ago
      store.start(oneHourAgo)
      
      // BUG: weeklySummary only looks at completed sessions
      // It ignores the running timer completely
      expect(store.weeklySummary).toBe('You lost $0.00 this week.')
      
      // Even though we've been "losing money" for an hour
      // The running session is invisible
    })
  })

  describe('Persistence', () => {
    it('should load from localStorage', () => {
      const store = useBoomerBill()
      
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'bb_rate') return '100'
        if (key === 'bb_sessions') return JSON.stringify([{id: 1, minutes: 30, cost: 50, ended_at: 1000000}])
        if (key === 'bb_next_id') return '2'
        return null
      })
      
      store.load()
      
      expect(store.rate).toBe(100)
      expect(store.sessions).toHaveLength(1)
      expect(store.sessions[0].minutes).toBe(30)
    })

    it('should persist to localStorage on changes', () => {
      const store = useBoomerBill()
      
      store.addSession(15, 'Test')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'bb_sessions',
        expect.any(String)
      )
    })
  })

  describe('Export', () => {
    it('should export CSV correctly', () => {
      const store = useBoomerBill()
      
      store.addSession(30, 'Test session', 1000000)
      
      const csv = store.exportCSV
      
      expect(csv).toContain('minutes,cost,note')
      expect(csv).toContain('30,37.50,"Test session"')
    })
  })
})
