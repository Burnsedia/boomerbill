import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type Session = {
  id: number
  minutes: number
  cost: number
  note?: string
  ended_at: number
}

export const useBoomerBill = defineStore('boomerbills', () => {
  // ─────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────
  const rate = ref<number>(75)
  const sessions = ref<Session[]>([])
  const startTime = ref<number | null>(null)
  const nextId = ref<number>(1)

  // ─────────────────────────────────────────────
  // DERIVED STATE (NEW)
  // ─────────────────────────────────────────────
  const isRunning = computed(() => startTime.value !== null)

  // ─────────────────────────────────────────────
  // PERSISTENCE (Astro-safe)
  // ─────────────────────────────────────────────
  function load() {
    if (typeof window === 'undefined') return

    const r = localStorage.getItem('bb_rate')
    const s = localStorage.getItem('bb_sessions')
    const n = localStorage.getItem('bb_next_id')

    if (r) rate.value = Number(r)
    if (s) sessions.value = JSON.parse(s)
    if (n) nextId.value = Number(n)
  }

  function persist() {
    if (typeof window === 'undefined') return

    localStorage.setItem('bb_rate', String(rate.value))
    localStorage.setItem('bb_sessions', JSON.stringify(sessions.value))
    localStorage.setItem('bb_next_id', String(nextId.value))
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────
  function severity(minutes: number) {
    if (minutes < 5) return 'Minor annoyance'
    if (minutes < 15) return 'Avoidable'
    if (minutes < 30) return 'Painful'
    return 'Unforgivable'
  }

  // PURE helper for ticking clock (NEW)
  function currentDurationMs(now = Date.now()) {
    if (!startTime.value) return 0
    return Math.max(0, now - startTime.value)
  }

  // ─────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────
  function start(now = Date.now()) {
    startTime.value = now
  }

  function stop(note?: string, now = Date.now()) {
    if (!startTime.value) return

    const minutes = Math.max(
      1,
      Math.round((now - startTime.value) / 60000)
    )

    addSession(minutes, note, now)
    startTime.value = null
  }

  function addSession(minutes: number, note?: string, endedAt = Date.now()) {
    const cost = (minutes / 60) * rate.value

    sessions.value.push({
      id: nextId.value++,
      minutes,
      cost,
      note,
      ended_at: endedAt
    })

    persist()
  }

  function clearAll() {
    sessions.value = []
    persist()
  }

  // ─────────────────────────────────────────────
  // DERIVED TOTALS
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

  const sortedSessions = computed(() =>
    [...sessions.value].sort((a, b) => b.cost - a.cost)
  )

  // ─────────────────────────────────────────────
  // TIME-BASED DASHBOARD METRICS
  // ─────────────────────────────────────────────
  const firstIncidentAt = computed(() => {
    if (sessions.value.length === 0) return null
    return Math.min(...sessions.value.map(s => s.ended_at))
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

  // ─────────────────────────────────────────────
  // WEEKLY SUMMARY
  // ─────────────────────────────────────────────
  const weeklySummary = computed(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    const week = sessions.value.filter(s => s.ended_at >= cutoff)
    const cost = week.reduce((a, s) => a + s.cost, 0)

    return `You lost $${cost.toFixed(2)} this week.`
  })

  // ─────────────────────────────────────────────
  // EXPORT
  // ─────────────────────────────────────────────
  const exportCSV = computed(() => {
    const rows = [
      'minutes,cost,note',
      ...sessions.value.map(s =>
        `${s.minutes},${s.cost.toFixed(2)},"${s.note ?? ''}"`
      )
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
    startTime,
    isRunning,

    // timing helpers
    currentDurationMs,

    // totals
    totals,
    incidentCount,
    sortedSessions,

    // dashboard
    daysActive,
    avgPerDay,
    avgPerWeek,
    avgPerYear,

    // helpers
    severity,
    weeklySummary,
    exportCSV,

    // actions
    start,
    stop,
    addSession,
    clearAll,
    load
  }
})

