import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

type Session = {
  started_at: number
  ended_at: number
  minutes: number
  hourly_rate: number
  cost: number
}

export const useBoomerBill = defineStore('boomerbill', () => {
  // state
  const rate = ref(75)
  const startTime = ref<number | null>(null)
  const sessions = ref<Session[]>([])

  // actions
  function start() {
    startTime.value = Date.now()
  }

  function stop() {
    if (!startTime.value) return

    const end = Date.now()
    const minutes = Math.max(
      1,
      Math.round((end - startTime.value) / 60000)
    )

    const cost = (minutes / 60) * rate.value

    sessions.value.push({
      started_at: startTime.value,
      ended_at: end,
      minutes,
      hourly_rate: rate.value,
      cost
    })

    startTime.value = null
    persist()
  }

  function persist() {
    if (typeof window === 'undefined') return
    localStorage.setItem('boomerbill_rate', String(rate.value))
    localStorage.setItem('boomerbill_sessions', JSON.stringify(sessions.value))
  }

  function load() {
    if (typeof window === 'undefined') return

    const savedRate = localStorage.getItem('boomerbill_rate')
    const savedSessions = localStorage.getItem('boomerbill_sessions')

    if (savedRate) rate.value = Number(savedRate)
    if (savedSessions) sessions.value = JSON.parse(savedSessions)
  }

  // derived state
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

  return {
    rate,
    startTime,
    sessions,
    totals,
    start,
    stop,
    load
  }
})
