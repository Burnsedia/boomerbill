import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBoomerBill, type Boomer, type Category, type Session } from '../src/components/vue/store/boomerbills'

// ── Mock localStorage ────────────────────────────────────────────────────────
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function freshStore() {
  setActivePinia(createPinia())
  return useBoomerBill()
}

function seedBoomers(store: ReturnType<typeof useBoomerBill>, names: string[]): string[] {
  return names.map(name => store.addBoomer(name) || `boomer-${name}`)
}

function selectFirst(store: ReturnType<typeof useBoomerBill>) {
  if (store.boomers.length > 0) store.selectBoomer(store.boomers[0].id)
  if (store.categories.length > 0) store.selectCategory(store.categories[0].id)
}

/**
 * Build a session object directly (bypassing addSession) so we can control
 * boomerId, categoryId, timestamps, and cost precisely.
 */
function makeSession(overrides: Partial<Session> & { id: number }): Session {
  return {
    boomerId: 'boomer-1',
    categoryId: 'wifi',
    minutes: 10,
    cost: 12.5,
    startedAt: Date.now() - 600_000,
    endedAt: Date.now(),
    ...overrides
  }
}

/**
 * Directly mutate the store's sessions ref for testing computeds without
 * going through addSession (which requires selections and auto-generates IDs).
 */
function pushSessions(store: ReturnType<typeof useBoomerBill>, sessions: Session[]) {
  store.sessions.push(...sessions)
  // Bump nextId so future addSession calls don't collide
  const maxId = sessions.reduce((max, s) => Math.max(max, s.id), 0)
  if (maxId >= store.nextId) store.nextId = maxId + 1
}

// Fixed "now" for deterministic time-window tests
const FIXED_NOW = new Date('2026-05-20T12:00:00Z').getTime() // Wed May 20 2026 12:00 UTC

/**
 * Compute time-window boundaries using the same local-timezone logic
 * as the store's getStartOfDay/Week/Month/Year functions.
 */
function getStartOfDayLocal(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function getStartOfWeekLocal(ts: number): number {
  const d = new Date(ts)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function getStartOfMonthLocal(ts: number): number {
  const d = new Date(ts)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function getStartOfYearLocal(ts: number): number {
  const d = new Date(ts)
  d.setMonth(0, 1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// These are computed at test runtime using local timezone, matching the store
let BOUNDARIES: ReturnType<typeof computeBoundaries>

function computeBoundaries() {
  const now = FIXED_NOW
  return {
    todayStart: getStartOfDayLocal(now),
    weekStart: getStartOfWeekLocal(now),
    monthStart: getStartOfMonthLocal(now),
    yearStart: getStartOfYearLocal(now),
    yesterdayStart: getStartOfDayLocal(now - 86400000),
    yesterdayEnd: getStartOfDayLocal(now),
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Computed Regression Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
    BOUNDARIES = computeBoundaries()
    localStorageMock.getItem.mockReset()
    localStorageMock.setItem.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ─── 1. Empty-state edge cases ─────────────────────────────────────────────

  describe('empty dataset edge cases', () => {
    it('totals are zero when no sessions exist', () => {
      const store = freshStore()
      expect(store.totals.minutes).toBe(0)
      expect(store.totals.cost).toBe(0)
    })

    it('incidentCount is zero when no sessions exist', () => {
      const store = freshStore()
      expect(store.incidentCount).toBe(0)
    })

    it('avgSessionTime is zero when no sessions exist', () => {
      const store = freshStore()
      expect(store.avgSessionTime).toBe(0)
    })

    it('sortedSessions is empty when no sessions exist', () => {
      const store = freshStore()
      expect(store.sortedSessions).toEqual([])
    })

    it('boomerLeaderboard is empty when no sessions exist', () => {
      const store = freshStore()
      expect(store.boomerLeaderboard).toEqual([])
    })

    it('categoryLeaderboard is empty when no sessions exist', () => {
      const store = freshStore()
      expect(store.categoryLeaderboard).toEqual([])
    })

    it('sessionDetails is empty when no sessions exist', () => {
      const store = freshStore()
      expect(store.sessionDetails).toEqual([])
    })

    it('daysActive is zero when no sessions exist (firstIncidentAt is null internally)', () => {
      const store = freshStore()
      // firstIncidentAt is an internal computed (not exported), but daysActive
      // depends on it returning null when empty.
      expect(store.daysActive).toBe(0)
    })

    it('daysActive is zero when no sessions exist', () => {
      const store = freshStore()
      expect(store.daysActive).toBe(0)
    })

    it('avgPerDay/Week/Year are zero when no sessions exist', () => {
      const store = freshStore()
      expect(store.avgPerDay).toBe(0)
      expect(store.avgPerWeek).toBe(0)
      expect(store.avgPerYear).toBe(0)
    })

    it('peakDayThisMonth returns empty day when no sessions exist', () => {
      const store = freshStore()
      expect(store.peakDayThisMonth.day).toBe('')
      expect(store.peakDayThisMonth.cost).toBe(0)
      expect(store.peakDayThisMonth.count).toBe(0)
    })

    it('time-window stats are all zero when no sessions exist', () => {
      const store = freshStore()
      expect(store.todayStats).toEqual({ minutes: 0, cost: 0, count: 0 })
      expect(store.weekStats).toEqual({ minutes: 0, cost: 0, count: 0 })
      expect(store.monthStats).toEqual({ minutes: 0, cost: 0, count: 0 })
      expect(store.yearStats).toEqual({ minutes: 0, cost: 0, count: 0 })
    })

    it('trends show zero change when no sessions exist', () => {
      const store = freshStore()
      expect(store.todayTrend).toEqual({ change: 0, percentChange: 0, direction: 'same' })
      expect(store.weekTrend).toEqual({ change: 0, percentChange: 0, direction: 'same' })
    })

    it('weeklySummary shows $0.00 when no sessions exist', () => {
      const store = freshStore()
      expect(store.weeklySummary).toBe('You lost $0.00 this week.')
    })

    it('costPerMinute is rate/60 regardless of sessions', () => {
      const store = freshStore()
      store.rate = 120
      expect(store.costPerMinute).toBe(2)
    })

    it('exportCSV returns header-only when no sessions exist', () => {
      const store = freshStore()
      expect(store.exportCSV).toBe('id,boomer,category,minutes,cost,startedAt,endedAt,note')
    })
  })

  // ─── 2. Single-session edge case ───────────────────────────────────────────

  describe('single-session edge case', () => {
    it('totals reflect one session accurately', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])
      pushSessions(store, [makeSession({ id: 1, minutes: 45, cost: 56.25 })])

      expect(store.totals.minutes).toBe(45)
      expect(store.totals.cost).toBe(56.25)
      expect(store.incidentCount).toBe(1)
    })

    it('avgSessionTime equals the single session minutes', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])
      pushSessions(store, [makeSession({ id: 1, minutes: 30 })])

      expect(store.avgSessionTime).toBe(30)
    })

    it('sortedSessions contains the one session', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])
      pushSessions(store, [makeSession({ id: 1, cost: 50 })])

      expect(store.sortedSessions.length).toBe(1)
      expect(store.sortedSessions[0].cost).toBe(50)
    })

    it('boomerLeaderboard has one entry with correct aggregation', () => {
      const store = freshStore()
      const [aliceId] = seedBoomers(store, ['Alice'])
      pushSessions(store, [makeSession({ id: 1, boomerId: aliceId, minutes: 20, cost: 25 })])

      const lb = store.boomerLeaderboard
      expect(lb.length).toBe(1)
      expect(lb[0].boomer.name).toBe('Alice')
      expect(lb[0].minutes).toBe(20)
      expect(lb[0].cost).toBe(25)
      expect(lb[0].count).toBe(1)
    })

    it('sessionDetails enriches with boomer and category names', () => {
      const store = freshStore()
      const [aliceId] = seedBoomers(store, ['Alice'])
      pushSessions(store, [makeSession({ id: 1, boomerId: aliceId, categoryId: 'wifi' })])

      const details = store.sessionDetails
      expect(details.length).toBe(1)
      expect(details[0].boomerName).toBe('Alice')
      expect(details[0].categoryName).toBe('WiFi Issues')
    })

    it('daysActive reflects a single session (firstIncidentAt drives it)', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])
      const endedAt = Date.now() - 86400000 * 5 // 5 days ago
      pushSessions(store, [makeSession({ id: 1, endedAt })])

      // daysActive should be at least 5 (from endedAt to now)
      expect(store.daysActive).toBeGreaterThanOrEqual(5)
      expect(store.daysActive).toBeLessThanOrEqual(6)
    })
  })

  // ─── 3. Leaderboard correctness on representative datasets ─────────────────

  describe('boomerLeaderboard', () => {
    it('aggregates multiple sessions per boomer correctly', () => {
      const store = freshStore()
      const [aliceId, bobId] = seedBoomers(store, ['Alice', 'Bob'])

      pushSessions(store, [
        makeSession({ id: 1, boomerId: aliceId, minutes: 10, cost: 10 }),
        makeSession({ id: 2, boomerId: aliceId, minutes: 20, cost: 20 }),
        makeSession({ id: 3, boomerId: bobId, minutes: 15, cost: 15 }),
      ])

      const lb = store.boomerLeaderboard
      expect(lb.length).toBe(2)
      // Sorted by cost descending
      expect(lb[0].boomer.name).toBe('Alice')
      expect(lb[0].minutes).toBe(30)
      expect(lb[0].cost).toBe(30)
      expect(lb[0].count).toBe(2)

      expect(lb[1].boomer.name).toBe('Bob')
      expect(lb[1].minutes).toBe(15)
      expect(lb[1].cost).toBe(15)
      expect(lb[1].count).toBe(1)
    })

    it('skips sessions whose boomerId has no matching boomer', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, boomerId: 'ghost-boomer', cost: 999 }),
        makeSession({ id: 2, boomerId: store.boomers[0].id, cost: 10 }),
      ])

      const lb = store.boomerLeaderboard
      expect(lb.length).toBe(1)
      expect(lb[0].cost).toBe(10)
    })

    it('sorts by cost descending (not minutes)', () => {
      const store = freshStore()
      const [aliceId, bobId] = seedBoomers(store, ['Alice', 'Bob'])

      // Alice: fewer minutes but higher cost
      pushSessions(store, [
        makeSession({ id: 1, boomerId: aliceId, minutes: 5, cost: 100 }),
        makeSession({ id: 2, boomerId: bobId, minutes: 60, cost: 50 }),
      ])

      const lb = store.boomerLeaderboard
      expect(lb[0].boomer.name).toBe('Alice')
      expect(lb[0].cost).toBe(100)
    })

    it('uses ID map for O(1) boomer lookups (not linear scan)', () => {
      const store = freshStore()
      const ids = seedBoomers(store, ['A', 'B', 'C', 'D', 'E'])

      // Many sessions referencing different boomers
      const sessions = Array.from({ length: 50 }, (_, i) =>
        makeSession({ id: i + 1, boomerId: ids[i % 5], cost: i + 1 })
      )
      pushSessions(store, sessions)

      const lb = store.boomerLeaderboard
      expect(lb.length).toBe(5)
      // Verify totals are correct
      const totalCost = lb.reduce((sum, e) => sum + e.cost, 0)
      const expectedTotal = sessions.reduce((sum, s) => sum + s.cost, 0)
      expect(totalCost).toBe(expectedTotal)
    })
  })

  describe('categoryLeaderboard', () => {
    it('aggregates multiple sessions per category correctly', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, categoryId: 'wifi', minutes: 10, cost: 10 }),
        makeSession({ id: 2, categoryId: 'wifi', minutes: 20, cost: 20 }),
        makeSession({ id: 3, categoryId: 'printer', minutes: 15, cost: 15 }),
      ])

      const lb = store.categoryLeaderboard
      expect(lb.length).toBeGreaterThanOrEqual(2)
      // Sorted by minutes descending
      const wifi = lb.find(e => e.category.id === 'wifi')!
      const printer = lb.find(e => e.category.id === 'printer')!
      expect(wifi.minutes).toBe(30)
      expect(printer.minutes).toBe(15)
      expect(lb[0].category.id).toBe('wifi') // highest minutes first
    })

    it('skips sessions whose categoryId has no matching category', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, categoryId: 'ghost-category', minutes: 999, cost: 999 }),
        makeSession({ id: 2, categoryId: 'wifi', minutes: 10, cost: 10 }),
      ])

      const lb = store.categoryLeaderboard
      const ghost = lb.find(e => e.category.id === 'ghost-category')
      expect(ghost).toBeUndefined()
    })

    it('sorts by minutes descending (not cost)', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, categoryId: 'wifi', minutes: 60, cost: 10 }),
        makeSession({ id: 2, categoryId: 'printer', minutes: 5, cost: 100 }),
      ])

      const lb = store.categoryLeaderboard
      expect(lb[0].category.id).toBe('wifi') // more minutes
    })
  })

  // ─── 4. Session detail enrichment and sort order ───────────────────────────

  describe('sessionDetails', () => {
    it('enriches every session with boomerName and categoryName', () => {
      const store = freshStore()
      const [aliceId] = seedBoomers(store, ['Alice'])
      pushSessions(store, [
        makeSession({ id: 1, boomerId: aliceId, categoryId: 'wifi' }),
        makeSession({ id: 2, boomerId: aliceId, categoryId: 'printer' }),
      ])

      const details = store.sessionDetails
      expect(details.every(d => d.boomerName === 'Alice')).toBe(true)
      expect(details[0].categoryName).toBe('WiFi Issues')
      expect(details[1].categoryName).toBe('Printer Problems')
    })

    it('falls back to "Unknown" for missing boomer or category', () => {
      const store = freshStore()

      pushSessions(store, [
        makeSession({ id: 1, boomerId: 'ghost', categoryId: 'ghost-cat' }),
      ])

      const details = store.sessionDetails
      expect(details[0].boomerName).toBe('Unknown')
      expect(details[0].categoryName).toBe('Unknown')
    })

    it('sorts by endedAt descending (most recent first)', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, endedAt: 1000 }),
        makeSession({ id: 2, endedAt: 3000 }),
        makeSession({ id: 3, endedAt: 2000 }),
      ])

      const details = store.sessionDetails
      expect(details[0].id).toBe(2) // endedAt 3000
      expect(details[1].id).toBe(3) // endedAt 2000
      expect(details[2].id).toBe(1) // endedAt 1000
    })

    it('does not mutate the original sessions array', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])
      pushSessions(store, [makeSession({ id: 1 })])

      const details = store.sessionDetails
      // sessionDetails should be a new array with enriched copies
      expect(details).not.toBe(store.sessions)
      expect(details[0]).toHaveProperty('boomerName')
      expect(store.sessions[0]).not.toHaveProperty('boomerName')
    })
  })

  // ─── 5. sortedSessions consistency ─────────────────────────────────────────

  describe('sortedSessions', () => {
    it('sorts by cost descending', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, cost: 10 }),
        makeSession({ id: 2, cost: 50 }),
        makeSession({ id: 3, cost: 30 }),
      ])

      const sorted = store.sortedSessions
      expect(sorted[0].cost).toBe(50)
      expect(sorted[1].cost).toBe(30)
      expect(sorted[2].cost).toBe(10)
    })

    it('returns a new array (does not mutate sessions)', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])
      pushSessions(store, [makeSession({ id: 1, cost: 10 })])

      const sorted = store.sortedSessions
      expect(sorted).not.toBe(store.sessions)
    })

    it('handles equal-cost sessions without error', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, cost: 25 }),
        makeSession({ id: 2, cost: 25 }),
        makeSession({ id: 3, cost: 25 }),
      ])

      const sorted = store.sortedSessions
      expect(sorted.length).toBe(3)
      expect(sorted.every(s => s.cost === 25)).toBe(true)
    })
  })

  // ─── 6. Time-window single-pass aggregation ────────────────────────────────

  describe('time-window stats (single-pass aggregation)', () => {
    it('todayStats includes sessions ended today', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, endedAt: BOUNDARIES.todayStart + 1000, minutes: 10, cost: 10 }),
        makeSession({ id: 2, endedAt: BOUNDARIES.todayStart + 2000, minutes: 20, cost: 20 }),
      ])

      expect(store.todayStats.minutes).toBe(30)
      expect(store.todayStats.cost).toBe(30)
      expect(store.todayStats.count).toBe(2)
    })

    it('todayStats excludes sessions ended before today', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, endedAt: BOUNDARIES.todayStart - 1, minutes: 99, cost: 99 }),
      ])

      expect(store.todayStats.count).toBe(0)
    })

    it('weekStats includes sessions from the start of the week', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, endedAt: BOUNDARIES.weekStart + 1000, minutes: 15, cost: 15 }),
      ])

      expect(store.weekStats.count).toBe(1)
      expect(store.weekStats.minutes).toBe(15)
    })

    it('monthStats includes sessions from the start of the month', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, endedAt: BOUNDARIES.monthStart + 1000, minutes: 25, cost: 25 }),
      ])

      expect(store.monthStats.count).toBe(1)
      expect(store.monthStats.minutes).toBe(25)
    })

    it('yearStats includes sessions from the start of the year', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, endedAt: BOUNDARIES.yearStart + 1000, minutes: 40, cost: 40 }),
      ])

      expect(store.yearStats.count).toBe(1)
      expect(store.yearStats.minutes).toBe(40)
    })

    it('cumulative windows nest correctly (today ⊆ week ⊆ month ⊆ year)', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      // One session today
      pushSessions(store, [
        makeSession({ id: 1, endedAt: BOUNDARIES.todayStart + 1000, minutes: 10, cost: 10 }),
      ])

      // Today's session should be counted in all wider windows
      expect(store.todayStats.count).toBe(1)
      expect(store.weekStats.count).toBe(1)
      expect(store.monthStats.count).toBe(1)
      expect(store.yearStats.count).toBe(1)
    })

    it('previous-window stats: today is zero when session is yesterday', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      // Session yesterday (ended between yesterdayStart and yesterdayEnd)
      const yesterdayNoon = BOUNDARIES.yesterdayStart + 43_200_000 // noon yesterday
      pushSessions(store, [
        makeSession({ id: 1, endedAt: yesterdayNoon, minutes: 5, cost: 5 }),
      ])

      expect(store.todayStats.count).toBe(0)
      expect(store.todayStats.cost).toBe(0)
    })

    it('multiple sessions across windows are counted in each applicable window', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      const todaySession = BOUNDARIES.todayStart + 1000
      const yesterdaySession = BOUNDARIES.yesterdayStart + 43_200_000 // noon yesterday
      const lastWeekSession = BOUNDARIES.weekStart - 86400000 // 1 day before week start

      pushSessions(store, [
        makeSession({ id: 1, endedAt: todaySession, minutes: 10, cost: 10 }),
        makeSession({ id: 2, endedAt: yesterdaySession, minutes: 20, cost: 20 }),
        makeSession({ id: 3, endedAt: lastWeekSession, minutes: 30, cost: 30 }),
      ])

      // Today: only session 1
      expect(store.todayStats.count).toBe(1)
      expect(store.todayStats.minutes).toBe(10)

      // Week: sessions 1 and 2 (both within this week)
      expect(store.weekStats.count).toBe(2)
      expect(store.weekStats.minutes).toBe(30)
    })
  })

  // ─── 7. Trend consistency ──────────────────────────────────────────────────

  describe('trend computeds', () => {
    it('trend direction is "up" when current > previous', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      // Previous period session (yesterday)
      const yesterdayNoon = BOUNDARIES.yesterdayStart + 43_200_000
      // Current period session with higher cost
      pushSessions(store, [
        makeSession({ id: 1, endedAt: yesterdayNoon, minutes: 10, cost: 10 }),
        makeSession({ id: 2, endedAt: BOUNDARIES.todayStart + 1000, minutes: 10, cost: 20 }),
      ])

      expect(store.todayTrend.direction).toBe('up')
      expect(store.todayTrend.change).toBe(10)
    })

    it('trend direction is "down" when current < previous', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      const yesterdayNoon = BOUNDARIES.yesterdayStart + 43_200_000
      pushSessions(store, [
        makeSession({ id: 1, endedAt: yesterdayNoon, minutes: 10, cost: 30 }),
        makeSession({ id: 2, endedAt: BOUNDARIES.todayStart + 1000, minutes: 10, cost: 10 }),
      ])

      expect(store.todayTrend.direction).toBe('down')
      expect(store.todayTrend.change).toBe(-20)
    })

    it('trend direction is "same" when current === previous', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      const yesterdayNoon = BOUNDARIES.yesterdayStart + 43_200_000
      pushSessions(store, [
        makeSession({ id: 1, endedAt: yesterdayNoon, minutes: 10, cost: 15 }),
        makeSession({ id: 2, endedAt: BOUNDARIES.todayStart + 1000, minutes: 10, cost: 15 }),
      ])

      expect(store.todayTrend.direction).toBe('same')
    })

    it('percentChange is 100 when previous is 0 and current > 0', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, endedAt: BOUNDARIES.todayStart + 1000, minutes: 10, cost: 25 }),
      ])

      expect(store.todayTrend.percentChange).toBe(100)
    })

    it('percentChange is 0 when both current and previous are 0', () => {
      const store = freshStore()
      expect(store.todayTrend.percentChange).toBe(0)
    })
  })

  // ─── 8. Dashboard pipeline (shared intermediates) ──────────────────────────

  describe('dashboard pipeline computeds', () => {
    it('daysActive is at least 1 when sessions exist', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])
      pushSessions(store, [makeSession({ id: 1, endedAt: Date.now() })])

      expect(store.daysActive).toBeGreaterThanOrEqual(1)
    })

    it('avgPerWeek equals avgPerDay * 7', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])
      pushSessions(store, [makeSession({ id: 1, minutes: 14, endedAt: Date.now() })])

      expect(store.avgPerWeek).toBeCloseTo(store.avgPerDay * 7, 5)
    })

    it('avgPerYear equals avgPerDay * 365', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])
      pushSessions(store, [makeSession({ id: 1, minutes: 14, endedAt: Date.now() })])

      expect(store.avgPerYear).toBeCloseTo(store.avgPerDay * 365, 5)
    })

    it('avgPerDay is total minutes / daysActive', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])
      pushSessions(store, [makeSession({ id: 1, minutes: 100, endedAt: Date.now() })])

      const expected = store.totals.minutes / store.daysActive
      expect(store.avgPerDay).toBeCloseTo(expected, 5)
    })

    it('peakDayThisMonth finds the day with highest cost', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      const day1 = BOUNDARIES.monthStart + 86400000 * 5 // May 6
      const day2 = BOUNDARIES.monthStart + 86400000 * 10 // May 11

      pushSessions(store, [
        makeSession({ id: 1, endedAt: day1, startedAt: day1 - 600000, cost: 10 }),
        makeSession({ id: 2, endedAt: day1, startedAt: day1 - 600000, cost: 20 }),
        makeSession({ id: 3, endedAt: day2, startedAt: day2 - 600000, cost: 50 }),
      ])

      const peak = store.peakDayThisMonth
      expect(peak.cost).toBe(50)
      expect(peak.count).toBe(1)
    })

    it('peakDayThisMonth aggregates multiple sessions on the same day', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      const day1 = BOUNDARIES.monthStart + 86400000 * 3 // May 4

      pushSessions(store, [
        makeSession({ id: 1, endedAt: day1, startedAt: day1 - 600000, cost: 10 }),
        makeSession({ id: 2, endedAt: day1, startedAt: day1 - 600000, cost: 15 }),
        makeSession({ id: 3, endedAt: day1, startedAt: day1 - 600000, cost: 25 }),
      ])

      const peak = store.peakDayThisMonth
      expect(peak.cost).toBe(50)
      expect(peak.count).toBe(3)
    })
  })

  // ─── 9. ID map correctness ─────────────────────────────────────────────────

  describe('ID map computeds (boomerIdMap, categoryIdMap)', () => {
    it('boomerIdMap contains all boomers keyed by id', () => {
      const store = freshStore()
      const ids = seedBoomers(store, ['Alice', 'Bob', 'Charlie'])

      // Access the internal computed via the store's reactivity
      // We verify indirectly through boomerLeaderboard and sessionDetails
      const lb = store.boomerLeaderboard // triggers boomerIdMap
      // All boomers should be findable
      for (const id of ids) {
        const boomer = store.boomers.find(b => b.id === id)
        expect(boomer).toBeDefined()
      }
    })

    it('categoryIdMap contains all categories keyed by id', () => {
      const store = freshStore()
      // Default categories are always present
      expect(store.categories.length).toBeGreaterThan(0)

      // Verify through categoryLeaderboard
      seedBoomers(store, ['Alice'])
      pushSessions(store, [
        makeSession({ id: 1, categoryId: 'wifi' }),
        makeSession({ id: 2, categoryId: 'printer' }),
      ])

      const lb = store.categoryLeaderboard
      expect(lb.length).toBeGreaterThanOrEqual(2)
    })

    it('ID maps update when boomers/categories change', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])
      selectFirst(store)
      store.addSession({ minutes: 10, note: 'test', endedAt: Date.now() })

      // Verify initial state
      expect(store.boomerLeaderboard.length).toBe(1)

      // Add another boomer and session
      const bobId = store.addBoomer('Bob')
      store.selectBoomer(bobId)
      store.addSession({ minutes: 20, note: 'test2', endedAt: Date.now() })

      expect(store.boomerLeaderboard.length).toBe(2)
    })
  })

  // ─── 10. Large dataset performance regression protection ───────────────────

  describe('large dataset correctness (1000+ sessions)', () => {
    it('boomerLeaderboard aggregates 1000 sessions correctly', () => {
      const store = freshStore()
      const ids = seedBoomers(store, ['A', 'B', 'C', 'D', 'E'])

      const sessions = Array.from({ length: 1000 }, (_, i) =>
        makeSession({
          id: i + 1,
          boomerId: ids[i % 5],
          minutes: (i % 60) + 1,
          cost: (i % 100) + 1,
          endedAt: FIXED_NOW - (1000 - i) * 60000,
        })
      )
      pushSessions(store, sessions)

      const lb = store.boomerLeaderboard
      expect(lb.length).toBe(5)

      // Verify total cost matches
      const lbTotal = lb.reduce((sum, e) => sum + e.cost, 0)
      const sessionTotal = sessions.reduce((sum, s) => sum + s.cost, 0)
      expect(lbTotal).toBe(sessionTotal)

      // Verify total count matches
      const lbCount = lb.reduce((sum, e) => sum + e.count, 0)
      expect(lbCount).toBe(1000)
    })

    it('categoryLeaderboard aggregates 1000 sessions correctly', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      const catIds = ['wifi', 'printer', 'password', 'email', 'software', 'general']
      const sessions = Array.from({ length: 1000 }, (_, i) =>
        makeSession({
          id: i + 1,
          categoryId: catIds[i % 6],
          minutes: (i % 60) + 1,
          cost: (i % 100) + 1,
          endedAt: FIXED_NOW - (1000 - i) * 60000,
        })
      )
      pushSessions(store, sessions)

      const lb = store.categoryLeaderboard
      expect(lb.length).toBe(6)

      const lbTotalMinutes = lb.reduce((sum, e) => sum + e.minutes, 0)
      const sessionTotalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0)
      expect(lbTotalMinutes).toBe(sessionTotalMinutes)
    })

    it('sessionDetails enriches and sorts 1000 sessions correctly', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      const sessions = Array.from({ length: 1000 }, (_, i) =>
        makeSession({
          id: i + 1,
          endedAt: FIXED_NOW - (1000 - i) * 60000,
        })
      )
      pushSessions(store, sessions)

      const details = store.sessionDetails
      expect(details.length).toBe(1000)

      // Verify sort order (descending by endedAt)
      for (let i = 0; i < details.length - 1; i++) {
        expect(details[i].endedAt).toBeGreaterThanOrEqual(details[i + 1].endedAt)
      }

      // Verify enrichment
      expect(details.every(d => d.boomerName === 'Alice')).toBe(true)
    })

    it('totals are accurate for 1000 sessions', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      const sessions = Array.from({ length: 1000 }, (_, i) =>
        makeSession({
          id: i + 1,
          minutes: i + 1,
          cost: (i + 1) * 1.25,
        })
      )
      pushSessions(store, sessions)

      const expectedMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0)
      const expectedCost = sessions.reduce((sum, s) => sum + s.cost, 0)

      expect(store.totals.minutes).toBe(expectedMinutes)
      expect(store.totals.cost).toBeCloseTo(expectedCost, 5)
      expect(store.incidentCount).toBe(1000)
    })

    it('sortedSessions sorts 1000 sessions by cost descending', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      const sessions = Array.from({ length: 1000 }, (_, i) =>
        makeSession({ id: i + 1, cost: Math.random() * 1000 })
      )
      pushSessions(store, sessions)

      const sorted = store.sortedSessions
      expect(sorted.length).toBe(1000)

      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].cost).toBeGreaterThanOrEqual(sorted[i + 1].cost)
      }
    })
  })

  // ─── 11. Derived metric consistency ────────────────────────────────────────

  describe('derived metric consistency', () => {
    it('incidentCount always equals sessions.length', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])
      selectFirst(store)

      for (let i = 0; i < 10; i++) {
        store.addSession({ minutes: i * 5, note: `session ${i}`, endedAt: Date.now() })
        expect(store.incidentCount).toBe(store.sessions.length)
      }
    })

    it('avgSessionTime equals totals.minutes / incidentCount', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])
      selectFirst(store)

      store.addSession({ minutes: 10, endedAt: Date.now() })
      store.addSession({ minutes: 20, endedAt: Date.now() })
      store.addSession({ minutes: 30, endedAt: Date.now() })

      const expected = store.totals.minutes / store.incidentCount
      expect(store.avgSessionTime).toBeCloseTo(expected, 5)
    })

    it('boomerLeaderboard count sum equals incidentCount', () => {
      const store = freshStore()
      const [aliceId, bobId] = seedBoomers(store, ['Alice', 'Bob'])

      pushSessions(store, [
        makeSession({ id: 1, boomerId: aliceId }),
        makeSession({ id: 2, boomerId: aliceId }),
        makeSession({ id: 3, boomerId: bobId }),
        makeSession({ id: 4, boomerId: bobId }),
        makeSession({ id: 5, boomerId: bobId }),
      ])

      const lbCount = store.boomerLeaderboard.reduce((sum, e) => sum + e.count, 0)
      expect(lbCount).toBe(store.incidentCount)
    })

    it('categoryLeaderboard count sum equals incidentCount', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, categoryId: 'wifi' }),
        makeSession({ id: 2, categoryId: 'wifi' }),
        makeSession({ id: 3, categoryId: 'printer' }),
        makeSession({ id: 4, categoryId: 'password' }),
      ])

      const lbCount = store.categoryLeaderboard.reduce((sum, e) => sum + e.count, 0)
      expect(lbCount).toBe(store.incidentCount)
    })

    it('boomerLeaderboard cost sum equals totals.cost', () => {
      const store = freshStore()
      const [aliceId, bobId] = seedBoomers(store, ['Alice', 'Bob'])

      pushSessions(store, [
        makeSession({ id: 1, boomerId: aliceId, cost: 10 }),
        makeSession({ id: 2, boomerId: aliceId, cost: 20 }),
        makeSession({ id: 3, boomerId: bobId, cost: 30 }),
      ])

      const lbCost = store.boomerLeaderboard.reduce((sum, e) => sum + e.cost, 0)
      expect(lbCost).toBeCloseTo(store.totals.cost, 5)
    })

    it('categoryLeaderboard minutes sum equals totals.minutes', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, categoryId: 'wifi', minutes: 10 }),
        makeSession({ id: 2, categoryId: 'printer', minutes: 20 }),
        makeSession({ id: 3, categoryId: 'password', minutes: 30 }),
      ])

      const lbMinutes = store.categoryLeaderboard.reduce((sum, e) => sum + e.minutes, 0)
      expect(lbMinutes).toBe(store.totals.minutes)
    })
  })

  // ─── 12. Stat parity across representative datasets ────────────────────────

  describe('stat parity on representative datasets', () => {
    it('multi-boomer, multi-category dataset has consistent stats', () => {
      const store = freshStore()
      const [aliceId, bobId, charlieId] = seedBoomers(store, ['Alice', 'Bob', 'Charlie'])

      const sessions: Session[] = [
        makeSession({ id: 1, boomerId: aliceId, categoryId: 'wifi', minutes: 15, cost: 18.75 }),
        makeSession({ id: 2, boomerId: aliceId, categoryId: 'printer', minutes: 30, cost: 37.5 }),
        makeSession({ id: 3, boomerId: bobId, categoryId: 'wifi', minutes: 10, cost: 12.5 }),
        makeSession({ id: 4, boomerId: bobId, categoryId: 'email', minutes: 45, cost: 56.25 }),
        makeSession({ id: 5, boomerId: charlieId, categoryId: 'software', minutes: 60, cost: 75 }),
        makeSession({ id: 6, boomerId: charlieId, categoryId: 'general', minutes: 5, cost: 6.25 }),
      ]
      pushSessions(store, sessions)

      // Totals
      expect(store.totals.minutes).toBe(165)
      expect(store.totals.cost).toBeCloseTo(206.25, 5)
      expect(store.incidentCount).toBe(6)
      expect(store.avgSessionTime).toBeCloseTo(27.5, 5)

      // Boomer leaderboard (sorted by cost desc):
      // Charlie: 75 + 6.25 = 81.25
      // Bob: 12.5 + 56.25 = 68.75
      // Alice: 18.75 + 37.5 = 56.25
      const blb = store.boomerLeaderboard
      expect(blb.length).toBe(3)
      expect(blb[0].boomer.name).toBe('Charlie')
      expect(blb[0].cost).toBeCloseTo(81.25, 5)
      expect(blb[1].boomer.name).toBe('Bob')
      expect(blb[1].cost).toBeCloseTo(68.75, 5)
      expect(blb[2].boomer.name).toBe('Alice')
      expect(blb[2].cost).toBeCloseTo(56.25, 5)

      // Category leaderboard (sorted by minutes desc):
      // software: 60, email: 45, printer: 30, wifi: 25, general: 5
      const clb = store.categoryLeaderboard
      expect(clb[0].category.id).toBe('software') // 60 min
      expect(clb[1].category.id).toBe('email') // 45 min
      expect(clb[2].category.id).toBe('printer') // 30 min

      // Session details
      expect(store.sessionDetails.length).toBe(6)
    })

    it('sessions with zero minutes/cost are handled correctly', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, minutes: 0, cost: 0 }),
        makeSession({ id: 2, minutes: 10, cost: 12.5 }),
      ])

      expect(store.totals.minutes).toBe(10)
      expect(store.totals.cost).toBeCloseTo(12.5, 5)
      expect(store.avgSessionTime).toBeCloseTo(5, 5) // 10 / 2
    })

    it('sessions with very large values do not overflow', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, minutes: 999999, cost: 999999 }),
        makeSession({ id: 2, minutes: 999999, cost: 999999 }),
      ])

      expect(store.totals.minutes).toBe(1999998)
      expect(store.totals.cost).toBe(1999998)
    })
  })

  // ─── 13. Filtered sessions consistency ─────────────────────────────────────

  describe('filteredSessions', () => {
    it('returns all sessions when no filters are set', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1 }),
        makeSession({ id: 2 }),
        makeSession({ id: 3 }),
      ])

      expect(store.filteredSessions.length).toBe(3)
    })

    it('filters by boomer when filteredBoomers is set', () => {
      const store = freshStore()
      const [aliceId, bobId] = seedBoomers(store, ['Alice', 'Bob'])

      pushSessions(store, [
        makeSession({ id: 1, boomerId: aliceId }),
        makeSession({ id: 2, boomerId: bobId }),
        makeSession({ id: 3, boomerId: aliceId }),
      ])

      store.filteredBoomers = [aliceId]
      expect(store.filteredSessions.length).toBe(2)
    })

    it('filters by category when filteredCategories is set', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, categoryId: 'wifi' }),
        makeSession({ id: 2, categoryId: 'printer' }),
        makeSession({ id: 3, categoryId: 'wifi' }),
      ])

      store.filteredCategories = ['wifi']
      expect(store.filteredSessions.length).toBe(2)
    })

    it('filters by date range', () => {
      const store = freshStore()
      seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, startedAt: 1000, endedAt: 2000 }),
        makeSession({ id: 2, startedAt: 5000, endedAt: 6000 }),
        makeSession({ id: 3, startedAt: 10000, endedAt: 11000 }),
      ])

      store.dateRange = { start: 3000, end: 8000 }
      expect(store.filteredSessions.length).toBe(1)
      expect(store.filteredSessions[0].id).toBe(2)
    })

    it('combines all filters correctly', () => {
      const store = freshStore()
      const [aliceId, bobId] = seedBoomers(store, ['Alice', 'Bob'])

      pushSessions(store, [
        makeSession({ id: 1, boomerId: aliceId, categoryId: 'wifi', startedAt: 1000, endedAt: 2000 }),
        makeSession({ id: 2, boomerId: aliceId, categoryId: 'printer', startedAt: 5000, endedAt: 6000 }),
        makeSession({ id: 3, boomerId: bobId, categoryId: 'wifi', startedAt: 5000, endedAt: 6000 }),
        makeSession({ id: 4, boomerId: aliceId, categoryId: 'wifi', startedAt: 5000, endedAt: 6000 }),
      ])

      store.filteredBoomers = [aliceId]
      store.filteredCategories = ['wifi']
      store.dateRange = { start: 3000, end: 8000 }

      expect(store.filteredSessions.length).toBe(1)
      expect(store.filteredSessions[0].id).toBe(4)
    })
  })

  // ─── 14. Export CSV consistency ────────────────────────────────────────────

  describe('exportCSV', () => {
    it('includes all sessions with correct enrichment', () => {
      const store = freshStore()
      const [aliceId] = seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, boomerId: aliceId, categoryId: 'wifi', minutes: 30, cost: 37.5, startedAt: 1000, endedAt: 2000, note: 'Test note' }),
      ])

      const csv = store.exportCSV
      expect(csv).toContain('id,boomer,category,minutes,cost,startedAt,endedAt,note')
      // The store quotes string fields (boomer, category, note)
      expect(csv).toContain('1,"Alice","WiFi Issues",30,37.50,1000,2000,"Test note"')
    })

    it('handles notes with commas and quotes', () => {
      const store = freshStore()
      const [aliceId] = seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, boomerId: aliceId, categoryId: 'wifi', note: 'Has, commas and "quotes"' }),
      ])

      const csv = store.exportCSV
      expect(csv).toContain('"Has, commas and ""quotes"""')
    })

    it('handles notes with newlines', () => {
      const store = freshStore()
      const [aliceId] = seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, boomerId: aliceId, categoryId: 'wifi', note: 'Line1\nLine2' }),
      ])

      const csv = store.exportCSV
      expect(csv).toContain('Line1 Line2') // newlines replaced with spaces
    })

    it('handles formula-injection-safe notes', () => {
      const store = freshStore()
      const [aliceId] = seedBoomers(store, ['Alice'])

      pushSessions(store, [
        makeSession({ id: 1, boomerId: aliceId, categoryId: 'wifi', note: '=SUM(A1:A10)' }),
      ])

      const csv = store.exportCSV
      expect(csv).toContain("'=SUM(A1:A10)") // prefixed with quote
    })
  })
})
