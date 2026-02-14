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

  const isRunning = computed(() => startTime.value !== null)

  const selectedBoomer = computed(() => {
    if (!selectedBoomerId.value) return null
    return boomers.value.find(b => b.id === selectedBoomerId.value) || null
  })

  const selectedCategory = computed(() => {
    if (!selectedCategoryId.value) return null
    return categories.value.find(c => c.id === selectedCategoryId.value) || null
  })

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
    persist()
  }

  function selectBoomer(id: string | null) {
    selectedBoomerId.value = id
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
    persist()
  }

  function selectCategory(id: string | null) {
    selectedCategoryId.value = id
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
    if (!selectedCategoryId.value && categories.value.length > 0) {
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

    isRunning,
    selectedBoomer,
    selectedCategory,

    currentDurationMs,
    severity,

    totals,
    incidentCount,
    sortedSessions,
    daysActive,
    avgPerDay,
    avgPerWeek,
    avgPerYear,
    weeklySummary,
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
