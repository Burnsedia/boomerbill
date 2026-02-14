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

  // Filters for analytics
  const dateRange = ref<{ start: number | null, end: number | null }>({ start: null, end: null })
  const filteredBoomers = ref<string[]>([])
  const filteredCategories = ref<string[]>([])

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
  // FILTERED SESSIONS
  // ─────────────────────────────────────────────
  const filteredSessions = computed(() => {
    return sessions.value.filter(s => {
      const inDateRange = !dateRange.value.start || (s.startedAt >= dateRange.value.start && s.endedAt <= (dateRange.value.end || Date.now()))
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

  // ─────────────────────────────────────────────
  // TREND COMPUTATIONS
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // ADDITIONAL STATS
  // ─────────────────────────────────────────────
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
  // TIME SERIES DATA FOR TRENDS
  // ─────────────────────────────────────────────
  const timeSeriesData = computed(() => {
    const grouped = new Map<string, { date: string; sessions: number; cost: number; minutes: number }>()
    
    sessions.value.forEach(session => {
      const date = new Date(session.startedAt).toISOString().split('T')[0] // Daily granularity
      const existing = grouped.get(date) || { date, sessions: 0, cost: 0, minutes: 0 }
      existing.sessions++
      existing.cost += session.cost
      existing.minutes += session.minutes
      grouped.set(date, existing)
    })
    
    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date))
  })

  const trendChartData = computed(() => {
    const data = timeSeriesData.value

    return {
      labels: data.map(d => new Date(d.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Total Cost ($)',
          data: data.map(d => d.cost),
          borderColor: '#ff6384',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1
        },
        {
          label: 'Time (minutes)',
          data: data.map(d => d.minutes),
          borderColor: '#36a2eb',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.1
        }
      ]
    }
  })

  const weeklyTimeSeries = computed(() => {
    const grouped = new Map<string, { week: string; sessions: number; cost: number; minutes: number }>()

    sessions.value.forEach(session => {
      const weekStart = getStartOfWeek(session.startedAt)
      const week = new Date(weekStart).toISOString().split('T')[0]
      const existing = grouped.get(week) || { week, sessions: 0, cost: 0, minutes: 0 }
      existing.sessions++
      existing.cost += session.cost
      existing.minutes += session.minutes
      grouped.set(week, existing)
    })

    return Array.from(grouped.values()).sort((a, b) => a.week.localeCompare(b.week))
  })

  const monthlyTimeSeries = computed(() => {
    const grouped = new Map<string, { month: string; sessions: number; cost: number; minutes: number }>()

    sessions.value.forEach(session => {
      const monthStart = getStartOfMonth(session.startedAt)
      const month = new Date(monthStart).toISOString().slice(0, 7) // YYYY-MM
      const existing = grouped.get(month) || { month, sessions: 0, cost: 0, minutes: 0 }
      existing.sessions++
      existing.cost += session.cost
      existing.minutes += session.minutes
      grouped.set(month, existing)
    })

    return Array.from(grouped.values()).sort((a, b) => a.month.localeCompare(b.month))
  })

  const hourlyPatterns = computed(() => {
    const hourStats = new Map<number, { hour: number; sessions: number; totalCost: number; totalMinutes: number; avgCost: number; avgMinutes: number }>()

    sessions.value.forEach(session => {
      const hour = new Date(session.startedAt).getHours()
      const existing = hourStats.get(hour) || { hour, sessions: 0, totalCost: 0, totalMinutes: 0, avgCost: 0, avgMinutes: 0 }
      existing.sessions++
      existing.totalCost += session.cost
      existing.totalMinutes += session.minutes
      hourStats.set(hour, existing)
    })

    return Array.from(hourStats.values()).map(stat => ({
      ...stat,
      avgCost: stat.sessions > 0 ? stat.totalCost / stat.sessions : 0,
      avgMinutes: stat.sessions > 0 ? stat.totalMinutes / stat.sessions : 0
    })).sort((a, b) => a.hour - b.hour)
  })

  const dayOfWeekPatterns = computed(() => {
    const dayStats = new Map<number, { day: number; dayName: string; sessions: number; totalCost: number; totalMinutes: number; avgCost: number; avgMinutes: number }>()

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    sessions.value.forEach(session => {
      const day = new Date(session.startedAt).getDay()
      const existing = dayStats.get(day) || { day, dayName: dayNames[day], sessions: 0, totalCost: 0, totalMinutes: 0, avgCost: 0, avgMinutes: 0 }
      existing.sessions++
      existing.totalCost += session.cost
      existing.totalMinutes += session.minutes
      dayStats.set(day, existing)
    })

    return Array.from(dayStats.values()).map(stat => ({
      ...stat,
      avgCost: stat.sessions > 0 ? stat.totalCost / stat.sessions : 0,
      avgMinutes: stat.sessions > 0 ? stat.totalMinutes / stat.sessions : 0
    })).sort((a, b) => a.day - b.day)
  })

  const costEfficiencyChartData = computed(() => {
    const data = timeSeriesData.value.filter(d => d.sessions > 0 && d.minutes > 0)

    return {
      labels: data.map(d => new Date(d.date).toLocaleDateString()),
      datasets: [{
        label: 'Cost per Minute ($)',
        data: data.map(d => d.cost / d.minutes),
        borderColor: '#4bc0c0',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    }
  })

  const sessionDurationDistribution = computed(() => {
    const buckets = [
      { label: '0-5 min', min: 0, max: 5, count: 0, totalCost: 0, totalMinutes: 0 },
      { label: '5-15 min', min: 5, max: 15, count: 0, totalCost: 0, totalMinutes: 0 },
      { label: '15-30 min', min: 15, max: 30, count: 0, totalCost: 0, totalMinutes: 0 },
      { label: '30-60 min', min: 30, max: 60, count: 0, totalCost: 0, totalMinutes: 0 },
      { label: '60+ min', min: 60, max: Infinity, count: 0, totalCost: 0, totalMinutes: 0 }
    ]

    sessions.value.forEach(session => {
      const bucket = buckets.find(b => session.minutes >= b.min && session.minutes < b.max)
      if (bucket) {
        bucket.count++
        bucket.totalCost += session.cost
        bucket.totalMinutes += session.minutes
      }
    })

    return buckets.map(b => ({
      ...b,
      percentage: sessions.value.length > 0 ? (b.count / sessions.value.length) * 100 : 0
    }))
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
    dateRange,
    filteredBoomers,
    filteredCategories,

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
    todayTrend,
    weekTrend,
    monthTrend,
    yearTrend,
    avgSessionTime,
    costPerMinute,
    peakDayThisMonth,

    // totals
    totals,
    filteredSessions,

    // leaderboards
    sortedSessions,
    boomerLeaderboard,
    categoryLeaderboard,

    // chart data
    boomerChartData,
    categoryChartData,
    timeSeriesData,
    trendChartData,
    weeklyTimeSeries,
    monthlyTimeSeries,
    hourlyPatterns,
    dayOfWeekPatterns,
    costEfficiencyChartData,
    sessionDurationDistribution,

    // export
    exportCSV,

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
