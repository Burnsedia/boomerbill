import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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

// Default categories
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'wifi', name: 'WiFi Issues', icon: 'wifi', isDefault: true },
  { id: 'printer', name: 'Printer Problems', icon: 'printer', isDefault: true },
  { id: 'password', name: 'Password Reset', icon: 'lock', isDefault: true },
  { id: 'email', name: 'Email Setup', icon: 'mail', isDefault: true },
  { id: 'software', name: 'Software Install', icon: 'download', isDefault: true },
  { id: 'general', name: 'General Tech Support', icon: 'wrench', isDefault: true }
]

export const useBoomerBill = defineStore('boomerbills', () => {
  // ─────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────
  const rate = ref<number>(75)
  const sessions = ref<Session[]>([])
  const boomers = ref<Boomer[]>([])
  const categories = ref<Category[]>([...DEFAULT_CATEGORIES])
  const startTime = ref<number | null>(null)
  const selectedBoomerId = ref<string | null>(null)
  const selectedCategoryId = ref<string | null>(null)
  const nextId = ref<number>(1)
  const nextBoomerId = ref<number>(1)

  // ─────────────────────────────────────────────
  // DERIVED STATE
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // TIME PERIOD HELPERS
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // TIME STATS BY PERIOD
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // TOTALS
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // LEADERBOARDS
  // ─────────────────────────────────────────────
  const sortedSessions = computed(() =>
    [...sessions.value].sort((a, b) => b.cost - a.cost)
  )

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
    
    return Array.from(boomerStats.values())
      .sort((a, b) => b.cost - a.cost)
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
    
    return Array.from(categoryStats.values())
      .sort((a, b) => b.minutes - a.minutes)
  })

  // ─────────────────────────────────────────────
  // CHART DATA
  // ─────────────────────────────────────────────
  const boomerChartData = computed(() => {
    const topBoomers = boomerLeaderboard.value.slice(0, 5)
    return {
      labels: topBoomers.map(b => b.boomer.name),
      datasets: [{
        label: 'Total Cost ($)',
        data: topBoomers.map(b => b.cost),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)'
        ]
      }]
    }
  })

  const categoryChartData = computed(() => {
    const topCategories = categoryLeaderboard.value.slice(0, 5)
    return {
      labels: topCategories.map(c => c.category.name),
      datasets: [{
        label: 'Time (minutes)',
        data: topCategories.map(c => c.minutes),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)'
        ]
      }]
    }
  })

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // ACTIONS - SESSION
  // ─────────────────────────────────────────────
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

  function addSession(params: {
    minutes: number
    note?: string
    startedAt?: number
    endedAt?: number
  }) {
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

  // ─────────────────────────────────────────────
  // ACTIONS - BOOMER MANAGEMENT
  // ─────────────────────────────────────────────
  function addBoomer(name: string) {
    const id = `boomer-${nextBoomerId.value++}`
    boomers.value.push({
      id,
      name: name.trim(),
      createdAt: Date.now()
    })
    persist()
    return id
  }

  function removeBoomer(id: string) {
    boomers.value = boomers.value.filter(b => b.id !== id)
    if (selectedBoomerId.value === id) {
      selectedBoomerId.value = null
    }
    persist()
  }

  function selectBoomer(id: string | null) {
    selectedBoomerId.value = id
  }

  // ─────────────────────────────────────────────
  // ACTIONS - CATEGORY MANAGEMENT
  // ─────────────────────────────────────────────
  function addCategory(name: string) {
    const id = `category-${Date.now()}`
    categories.value.push({
      id,
      name: name.trim(),
      isDefault: false
    })
    persist()
    return id
  }

  function removeCategory(id: string) {
    const category = categories.value.find(c => c.id === id)
    if (category?.isDefault) {
      throw new Error('Cannot remove default categories')
    }
    categories.value = categories.value.filter(c => c.id !== id)
    if (selectedCategoryId.value === id) {
      selectedCategoryId.value = null
    }
    persist()
  }

  function selectCategory(id: string | null) {
    selectedCategoryId.value = id
  }

  // ─────────────────────────────────────────────
  // PERSISTENCE
  // ─────────────────────────────────────────────
  function load() {
    if (typeof window === 'undefined') return

    const r = localStorage.getItem('bb_rate')
    const s = localStorage.getItem('bb_sessions')
    const b = localStorage.getItem('bb_boomers')
    const c = localStorage.getItem('bb_categories')
    const n = localStorage.getItem('bb_next_id')
    const nb = localStorage.getItem('bb_next_boomer_id')

    if (r) rate.value = Number(r)
    if (s) sessions.value = JSON.parse(s)
    if (b) boomers.value = JSON.parse(b)
    if (c) {
      const savedCategories = JSON.parse(c)
      // Merge with defaults, keeping saved custom ones
      const customCategories = savedCategories.filter((c: Category) => !c.isDefault)
      categories.value = [...DEFAULT_CATEGORIES, ...customCategories]
    }
    if (n) nextId.value = Number(n)
    if (nb) nextBoomerId.value = Number(nb)
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

  // ─────────────────────────────────────────────
  // EXPORT
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────
  return {
    // state
    rate,
    sessions,
    boomers,
    categories,
    startTime,
    selectedBoomerId,
    selectedCategoryId,
    nextId,
    nextBoomerId,

    // derived state
    isRunning,
    selectedBoomer,
    selectedCategory,
    currentSessionInfo,

    // time stats
    todayStats,
    weekStats,
    monthStats,
    yearStats,

    // totals
    totals,
    incidentCount,

    // leaderboards
    sortedSessions,
    boomerLeaderboard,
    categoryLeaderboard,

    // chart data
    boomerChartData,
    categoryChartData,

    // helpers
    severity,
    currentDurationMs,

    // session actions
    start,
    stop,
    addSession,
    clearAll,

    // boomer actions
    addBoomer,
    removeBoomer,
    selectBoomer,

    // category actions
    addCategory,
    removeCategory,
    selectCategory,

    // persistence
    load,
    persist
  }
})
