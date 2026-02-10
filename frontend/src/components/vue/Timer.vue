<script setup>
import { ref } from 'vue'

const startTime = ref(null)

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

  const rate = Number(localStorage.getItem('boomerbill_rate') || 75)
  const cost = (minutes / 60) * rate

  const session = {
    started_at: startTime.value,
    ended_at: end,
    minutes,
    hourly_rate: rate,
    cost
  }

  saveSession(session)
  startTime.value = null
}

function saveSession(session) {
  const sessions =
    JSON.parse(localStorage.getItem('boomerbill_sessions') || '[]')
  sessions.push(session)
  localStorage.setItem(
    'boomerbill_sessions',
    JSON.stringify(sessions)
  )
}
</script>

<template>
  <button @click="start">Start</button>
  <button @click="stop">Stop</button>
</template>
