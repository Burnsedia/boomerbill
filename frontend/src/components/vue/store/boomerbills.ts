import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type Boomer = {
  id: string
  name: string
  createdAt: number
}

export type Category = {
  id: string
  name: string
  icon?: string
  isDefault: boolean
}

export type Session = {
  id: number
  boomerId: string
  categoryId: string
  minutes: number
  cost: number
  startedAt: number
  endedAt: number
  note?: string
}

type AddSessionParams = {
  minutes: number
  note?: string
  startedAt?: number
  endedAt?: number
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'wifi', name: 'WiFi Issues', icon: 'wifi', isDefault: true },
  { id: 'printer', name: 'Printer Problems', icon: 'printer', isDefault: true },
  { id: 'password', name: 'Password Reset', icon: 'lock', isDefault: true },
  { id: 'email', name: 'Email Setup', icon: 'mail', isDefault: true },
  { id: 'software', name: 'Software Install', icon: 'download', isDefault: true },
  { id: 'general', name: 'General Tech Support', icon: 'wrench', isDefault: true }
]

const LEGACY_BOOMER_ID = 'legacy'

export const useBoomerBill = defineStore('boomerbills', () => {
  const rate = ref<number>(75)
  const sessions = ref<Session[]>([])
  const boomers = ref<Boomer[]>([])
  const categories = ref<Category[]>([...DEFAULT_CATEGORIES])
  const startTime = ref<number | null>(null)
  const selectedBoomerId = ref<string | null>(null)
  const selectedCategoryId = ref<string | null>(null)
  const nextId = ref<number>(1)
  const nextBoomerId = ref<number>(1)
  const dateRange = ref<{ start: number | null; end: number | null }>({ start: null, end: null })
  const filteredBoomers = ref<string[]>([])
  const filteredCategories = ref<string[]>([])

  const isRunning = computed(() => startTime.value !== null)

  const selectedBoomer = computed(() => {
    if (!selectedBoomerId.value) return null
    return boomers.value.find(b => b.id === selectedBoomerId.value) || null
  })

  const selectedCategory = computed(() => {
    if (!selectedCategoryId.value) return null
    return categories.value.find(c => c.id === selectedCategoryId.value) || null
  })

  const currentSessionInfo = computed(() => {
    if (!isRunning.value) return null
    return {
      boomer: selectedBoomer.value,
      category: selectedCategory.value,
      startTime: startTime.value
    }
  })

  function getStartOfDay(timestamp: number): number {
    const date = new Date(timestamp)
    date.setHours(0, 0, 0, 0)
    return date.getTime()
  }

  function getStartOfWeek(timestamp: number): number {
    const date = new Date(timestamp)
    const day = date.getDay()
    const diff = date.getDate() - day
    date.setDate(diff)
    date.setHours(0, 0, 0, 0)
    return date.getTime()
  }

  function getStartOfMonth(timestamp: number): number {
    const date = new Date(timestamp)
    date.setDate(1)
    date.setHours(0, 0, 0, 0)
    return date.getTime()
  }

  function getStartOfYear(timestamp: number): number {
    const date = new Date(timestamp)
    date.setMonth(0, 1)
    date.setHours(0, 0, 0, 0)
    return date.getTime()
  }

  function severity(minutes: number) {
    if (minutes < 5) return 'Minor annoyance'
    if (minutes < 15) return 'Avoidable'
    if (minutes < 30) return 'Painful'
    return 'Unforgivable'
  }

  function currentDurationMs(now = Date.now()) {
    if (!startTime.value) return 0
    return Math.max(0, now - startTime.value)
  }

  function start(now = Date.now()) {
    if (!selectedBoomerId.value || !selectedCategoryId.value) {
      throw new Error('Must select a boomer and category before starting')
    }
    startTime.value = now
  }

  function stop(note?: string, now = Date.now()) {
    if (!startTime.value) return
    if (!selectedBoomerId.value || !selectedCategoryId.value) {
      throw new Error('No boomer or category selected')
    }

    const minutes = Math.max(
      1,
      Math.round((now - startTime.value) / 60000)
    )

    addSession({
      minutes,
      note,
      startedAt: startTime.value,
      endedAt: now
    })

    startTime.value = null
  }

  function addSession(params: AddSessionParams) {
    const { minutes, note, startedAt = Date.now(), endedAt = Date.now() } = params

    if (!selectedBoomerId.value || !selectedCategoryId.value) {
      throw new Error('Must select boomer and category')
    }

    const cost = (minutes / 60) * rate.value

    sessions.value.push({
      id: nextId.value++,
      boomerId: selectedBoomerId.value,
      categoryId: selectedCategoryId.value,
      minutes,
      cost,
      startedAt,
      endedAt,
      note
    })

    persist()
  }

  function clearAll() {
    sessions.value = []
    persist()
  }

  function addBoomer(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const id = `boomer-${nextBoomerId.value++}`
    boomers.value.push({ id, name: trimmed, createdAt: Date.now() })
    persist()
    return id
  }

  function removeBoomer(id: string) {
    boomers.value = boomers.value.filter(b => b.id !== id)
    if (selectedBoomerId.value === id) selectedBoomerId.value = null
    if (typeof window !== 'undefined') {
      const lastBoomer = localStorage.getItem('bb_last_boomer_id')
      if (lastBoomer === id) localStorage.removeItem('bb_last_boomer_id')
    }
    persist()
  }

  function selectBoomer(id: string | null) {
    selectedBoomerId.value = id
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('bb_last_boomer_id', id)
      } else {
        localStorage.removeItem('bb_last_boomer_id')
      }
    }
  }

  function addCategory(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const id = `category-${Date.now()}`
    categories.value.push({ id, name: trimmed, isDefault: false })
    persist()
    return id
  }

  function removeCategory(id: string) {
    const category = categories.value.find(c => c.id === id)
    if (category?.isDefault) {
      throw new Error('Cannot remove default categories')
    }
    categories.value = categories.value.filter(c => c.id !== id)
    if (selectedCategoryId.value === id) selectedCategoryId.value = null
    if (typeof window !== 'undefined') {
      const lastCategory = localStorage.getItem('bb_last_category_id')
      if (lastCategory === id) localStorage.removeItem('bb_last_category_id')
    }
    persist()
  }

  function selectCategory(id: string | null) {
    selectedCategoryId.value = id
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('bb_last_category_id', id)
      } else {
        localStorage.removeItem('bb_last_category_id')
      }
    }
  }

  const totals = computed(() => {
    return sessions.value.reduce(
      (acc, s) => {
        acc.minutes += s.minutes
        acc.cost += s.cost
        return acc
      },
      { minutes: 0, cost: 0 }
    )
  })

  const incidentCount = computed(() => sessions.value.length)

  const filteredSessions = computed(() => {
    return sessions.value.filter(s => {
      const start = dateRange.value.start
      const end = dateRange.value.end ?? Date.now()
      const inDateRange = !start || (s.startedAt >= start && s.endedAt <= end)
      const inBoomers = filteredBoomers.value.length === 0 || filteredBoomers.value.includes(s.boomerId)
      const inCategories = filteredCategories.value.length === 0 || filteredCategories.value.includes(s.categoryId)
      return inDateRange && inBoomers && inCategories
    })
  })

  const todayStats = computed(() => {
    const startOfDay = getStartOfDay(Date.now())
    const todaySessions = sessions.value.filter(s => s.endedAt >= startOfDay)
    return todaySessions.reduce(
      (acc, s) => {
        acc.minutes += s.minutes
        acc.cost += s.cost
        return acc
      },
      { minutes: 0, cost: 0, count: todaySessions.length }
    )
  })

  const weekStats = computed(() => {
    const startOfWeek = getStartOfWeek(Date.now())
    const weekSessions = sessions.value.filter(s => s.endedAt >= startOfWeek)
    return weekSessions.reduce(
      (acc, s) => {
        acc.minutes += s.minutes
        acc.cost += s.cost
        return acc
      },
      { minutes: 0, cost: 0, count: weekSessions.length }
    )
  })

  const monthStats = computed(() => {
    const startOfMonth = getStartOfMonth(Date.now())
    const monthSessions = sessions.value.filter(s => s.endedAt >= startOfMonth)
    return monthSessions.reduce(
      (acc, s) => {
        acc.minutes += s.minutes
        acc.cost += s.cost
        return acc
      },
      { minutes: 0, cost: 0, count: monthSessions.length }
    )
  })

  const yearStats = computed(() => {
    const startOfYear = getStartOfYear(Date.now())
    const yearSessions = sessions.value.filter(s => s.endedAt >= startOfYear)
    return yearSessions.reduce(
      (acc, s) => {
        acc.minutes += s.minutes
        acc.cost += s.cost
        return acc
      },
      { minutes: 0, cost: 0, count: yearSessions.length }
    )
  })

  const todayTrend = computed(() => {
    const yesterdayStart = getStartOfDay(Date.now() - 86400000)
    const yesterdayEnd = getStartOfDay(Date.now())
    const yesterdaySessions = sessions.value.filter(s => s.endedAt >= yesterdayStart && s.endedAt < yesterdayEnd)
    const yesterdayCost = yesterdaySessions.reduce((sum, s) => sum + s.cost, 0)
    const change = todayStats.value.cost - yesterdayCost
    const percentChange = yesterdayCost === 0 ? (change > 0 ? 100 : 0) : (change / yesterdayCost) * 100
    return { change, percentChange, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same' }
  })

  const weekTrend = computed(() => {
    const prevWeekStart = getStartOfWeek(Date.now() - 7 * 86400000)
    const prevWeekEnd = getStartOfWeek(Date.now())
    const prevWeekSessions = sessions.value.filter(s => s.endedAt >= prevWeekStart && s.endedAt < prevWeekEnd)
    const prevWeekCost = prevWeekSessions.reduce((sum, s) => sum + s.cost, 0)
    const change = weekStats.value.cost - prevWeekCost
    const percentChange = prevWeekCost === 0 ? (change > 0 ? 100 : 0) : (change / prevWeekCost) * 100
    return { change, percentChange, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same' }
  })

  const monthTrend = computed(() => {
    const prevMonthStart = getStartOfMonth(new Date(Date.now() - 30 * 86400000).getTime())
    const prevMonthEnd = getStartOfMonth(Date.now())
    const prevMonthSessions = sessions.value.filter(s => s.endedAt >= prevMonthStart && s.endedAt < prevMonthEnd)
    const prevMonthCost = prevMonthSessions.reduce((sum, s) => sum + s.cost, 0)
    const change = monthStats.value.cost - prevMonthCost
    const percentChange = prevMonthCost === 0 ? (change > 0 ? 100 : 0) : (change / prevMonthCost) * 100
    return { change, percentChange, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same' }
  })

  const yearTrend = computed(() => {
    const prevYearStart = getStartOfYear(Date.now() - 365 * 86400000)
    const prevYearEnd = getStartOfYear(Date.now())
    const prevYearSessions = sessions.value.filter(s => s.endedAt >= prevYearStart && s.endedAt < prevYearEnd)
    const prevYearCost = prevYearSessions.reduce((sum, s) => sum + s.cost, 0)
    const change = yearStats.value.cost - prevYearCost
    const percentChange = prevYearCost === 0 ? (change > 0 ? 100 : 0) : (change / prevYearCost) * 100
    return { change, percentChange, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same' }
  })

  const avgSessionTime = computed(() => {
    return incidentCount.value > 0 ? totals.value.minutes / incidentCount.value : 0
  })

  const costPerMinute = computed(() => rate.value / 60)

  const peakDayThisMonth = computed(() => {
    const startOfMonth = getStartOfMonth(Date.now())
    const monthSessions = sessions.value.filter(s => s.endedAt >= startOfMonth)
    const dayMap = new Map<string, { cost: number; count: number }>()

    monthSessions.forEach(s => {
      const day = new Date(s.startedAt).toDateString()
      const existing = dayMap.get(day) || { cost: 0, count: 0 }
      existing.cost += s.cost
      existing.count += 1
      dayMap.set(day, existing)
    })

    let max = { day: '', cost: 0, count: 0 }
    for (const [day, data] of dayMap) {
      if (data.cost > max.cost) {
        max = { day, cost: data.cost, count: data.count }
      }
    }
    return max
  })

  const sortedSessions = computed(() =>
    [...sessions.value].sort((a, b) => b.cost - a.cost)
  )

  const firstIncidentAt = computed(() => {
    if (sessions.value.length === 0) return null
    return Math.min(...sessions.value.map(s => s.endedAt))
  })

  const daysActive = computed(() => {
    if (!firstIncidentAt.value) return 0
    const ms = Date.now() - firstIncidentAt.value
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
  })

  const avgPerDay = computed(() => {
    if (daysActive.value === 0) return 0
    return totals.value.minutes / daysActive.value
  })

  const avgPerWeek = computed(() => avgPerDay.value * 7)
  const avgPerYear = computed(() => avgPerDay.value * 365)

  const weeklySummary = computed(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    const week = sessions.value.filter(s => s.endedAt >= cutoff)
    const cost = week.reduce((a, s) => a + s.cost, 0)
    return `You lost $${cost.toFixed(2)} this week.`
  })

  const boomerLeaderboard = computed(() => {
    const boomerStats = new Map<string, { boomer: Boomer; minutes: number; cost: number; count: number }>()
    sessions.value.forEach(session => {
      const boomer = boomers.value.find(b => b.id === session.boomerId)
      if (!boomer) return
      const existing = boomerStats.get(boomer.id)
      if (existing) {
        existing.minutes += session.minutes
        existing.cost += session.cost
        existing.count += 1
      } else {
        boomerStats.set(boomer.id, {
          boomer,
          minutes: session.minutes,
          cost: session.cost,
          count: 1
        })
      }
    })
    return Array.from(boomerStats.values()).sort((a, b) => b.cost - a.cost)
  })

  const categoryLeaderboard = computed(() => {
    const categoryStats = new Map<string, { category: Category; minutes: number; cost: number; count: number }>()
    sessions.value.forEach(session => {
      const category = categories.value.find(c => c.id === session.categoryId)
      if (!category) return
      const existing = categoryStats.get(category.id)
      if (existing) {
        existing.minutes += session.minutes
        existing.cost += session.cost
        existing.count += 1
      } else {
        categoryStats.set(category.id, {
          category,
          minutes: session.minutes,
          cost: session.cost,
          count: 1
        })
      }
    })
    return Array.from(categoryStats.values()).sort((a, b) => b.minutes - a.minutes)
  })

  const sessionDetails = computed(() => {
    return [...sessions.value]
      .map(session => {
        const boomer = boomers.value.find(b => b.id === session.boomerId)
        const category = categories.value.find(c => c.id === session.categoryId)
        return {
          ...session,
          boomerName: boomer?.name || 'Unknown',
          categoryName: category?.name || 'Unknown'
        }
      })
      .sort((a, b) => b.endedAt - a.endedAt)
  })

  const exportCSV = computed(() => {
    const rows = [
      'id,boomer,category,minutes,cost,startedAt,endedAt,note',
      ...sessions.value.map(s => {
        const boomer = boomers.value.find(b => b.id === s.boomerId)?.name || 'Unknown'
        const category = categories.value.find(c => c.id === s.categoryId)?.name || 'Unknown'
        return `${s.id},"${boomer}","${category}",${s.minutes},${s.cost.toFixed(2)},${s.startedAt},${s.endedAt},"${s.note ?? ''}"`
      })
    ]
    return rows.join('\n')
  })

  function normalizeSessions(raw: unknown[]): Session[] {
    const fallbackCategory = DEFAULT_CATEGORIES[0]?.id || 'general'
    const normalized: Session[] = []

    raw.forEach(entry => {
      if (!entry || typeof entry !== 'object') return
      const record = entry as Record<string, unknown>
      const legacyEnded = record.ended_at as number | undefined
      const endedAt = typeof legacyEnded === 'number'
        ? legacyEnded
        : (record.endedAt as number | undefined) ?? Date.now()
      const startedAt = (record.startedAt as number | undefined) ?? endedAt
      const minutes = Number(record.minutes ?? 0)
      const cost = Number(record.cost ?? 0)
      const boomerId = (record.boomerId as string | undefined) || LEGACY_BOOMER_ID
      const categoryId = (record.categoryId as string | undefined) || fallbackCategory
      const id = Number(record.id ?? 0)

      if (!id) return

      normalized.push({
        id,
        boomerId,
        categoryId,
        minutes,
        cost,
        startedAt,
        endedAt,
        note: record.note as string | undefined
      })
    })

    return normalized
  }

  function ensureLegacyBoomerIfNeeded(sessionList: Session[]) {
    const needsLegacy = sessionList.some(s => s.boomerId === LEGACY_BOOMER_ID)
    if (!needsLegacy) return
    if (boomers.value.some(b => b.id === LEGACY_BOOMER_ID)) return
    boomers.value.unshift({ id: LEGACY_BOOMER_ID, name: 'Legacy', createdAt: 0 })
  }

  function load() {
    if (typeof window === 'undefined') return

    const r = localStorage.getItem('bb_rate')
    const s = localStorage.getItem('bb_sessions')
    const b = localStorage.getItem('bb_boomers')
    const c = localStorage.getItem('bb_categories')
    const n = localStorage.getItem('bb_next_id')
    const nb = localStorage.getItem('bb_next_boomer_id')
    const lastBoomerId = localStorage.getItem('bb_last_boomer_id')
    const lastCategoryId = localStorage.getItem('bb_last_category_id')

    if (r) rate.value = Number(r)
    if (b) boomers.value = JSON.parse(b)
    if (c) {
      const savedCategories = JSON.parse(c) as Category[]
      const customCategories = savedCategories.filter(category => !category.isDefault)
      categories.value = [...DEFAULT_CATEGORIES, ...customCategories]
    }
    if (s) {
      const parsed = JSON.parse(s) as unknown[]
      sessions.value = normalizeSessions(parsed)
    }
    if (n) nextId.value = Number(n)
    if (nb) nextBoomerId.value = Number(nb)

    ensureLegacyBoomerIfNeeded(sessions.value)
    if (lastBoomerId && boomers.value.some(b => b.id === lastBoomerId)) {
      selectedBoomerId.value = lastBoomerId
    } else if (!selectedBoomerId.value && boomers.value.length === 1) {
      selectedBoomerId.value = boomers.value[0].id
    }

    if (lastCategoryId && categories.value.some(c => c.id === lastCategoryId)) {
      selectedCategoryId.value = lastCategoryId
    } else if (!selectedCategoryId.value && categories.value.length > 0) {
      selectedCategoryId.value = categories.value[0].id
    }
  }

  function persist() {
    if (typeof window === 'undefined') return
    localStorage.setItem('bb_rate', String(rate.value))
    localStorage.setItem('bb_sessions', JSON.stringify(sessions.value))
    localStorage.setItem('bb_boomers', JSON.stringify(boomers.value))
    localStorage.setItem('bb_categories', JSON.stringify(categories.value))
    localStorage.setItem('bb_next_id', String(nextId.value))
    localStorage.setItem('bb_next_boomer_id', String(nextBoomerId.value))
  }

  return {
    rate,
    sessions,
    boomers,
    categories,
    startTime,
    selectedBoomerId,
    selectedCategoryId,
    nextId,
    nextBoomerId,
    dateRange,
    filteredBoomers,
    filteredCategories,

    isRunning,
    selectedBoomer,
    selectedCategory,
    currentSessionInfo,

    currentDurationMs,
    severity,

    totals,
    incidentCount,
    filteredSessions,
    sortedSessions,
    daysActive,
    avgPerDay,
    avgPerWeek,
    avgPerYear,
    weeklySummary,
    todayStats,
    weekStats,
    monthStats,
    yearStats,
    todayTrend,
    weekTrend,
    monthTrend,
    yearTrend,
    avgSessionTime,
    costPerMinute,
    peakDayThisMonth,
    boomerLeaderboard,
    categoryLeaderboard,
    sessionDetails,
    exportCSV,

    start,
    stop,
    addSession,
    clearAll,
    addBoomer,
    removeBoomer,
    selectBoomer,
    addCategory,
    removeCategory,
    selectCategory,
    load,
    persist
  }
})
