#!/usr/bin/env tsx
/**
 * profiling/benchmark.ts — Seeded session-data profiler for BoomerBill frontend
 *
 * Measures evaluation time of key computed properties at different dataset sizes.
 *
 * Usage:
 *   npx tsx scripts/profile.ts                    # all tiers, 5 iterations
 *   npx tsx scripts/profile.ts --tier 1000        # single tier
 *   npx tsx scripts/profile.ts --iterations 20    # more iterations
 *   npx tsx scripts/profile.ts --json             # machine-readable output
 *   npx tsx scripts/profile.ts --tier 5000 --json # combined flags
 */

// ── CLI argument parsing ─────────────────────────────────────────────────────

const args = process.argv.slice(2)

function parseArgs() {
  const result = {
    tiers: [100, 1000, 5000] as number[],
    iterations: 5,
    json: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--tier':
      case '-t': {
        const val = parseInt(args[++i], 10)
        if (Number.isFinite(val) && val > 0) result.tiers = [val]
        break
      }
      case '--tiers': {
        // comma-separated list, e.g. --tiers 100,500,1000
        const parts = (args[++i] || '').split(',').map(Number).filter(Number.isFinite)
        if (parts.length > 0) result.tiers = parts
        break
      }
      case '--iterations':
      case '-i': {
        const val = parseInt(args[++i], 10)
        if (Number.isFinite(val) && val > 0) result.iterations = val
        break
      }
      case '--json':
      case '-j':
        result.json = true
        break
      case '--help':
      case '-h':
        console.log(`Usage: npx tsx scripts/profile.ts [options]

Options:
  --tier, -t <N>        Run a single volume tier (e.g. 1000)
  --tiers <N,N,...>     Run multiple tiers comma-separated
  --iterations, -i <N>  Number of benchmark iterations per tier (default: 5)
  --json, -j            Output results as JSON instead of table
  --help, -h            Show this help message

Default: runs tiers 100, 1000, 5000 with 5 iterations each.`)
        process.exit(0)
    }
  }

  return result
}

const config = parseArgs()

// ── jsdom bootstrap (must happen before any Vue/Pinia import) ────────────────

import { JSDOM } from 'jsdom'
import { performance as nodePerformance } from 'node:perf_hooks'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:4321',
  pretendToBeVisual: true,
})

// @ts-expect-error - jsdom provides browser globals
globalThis.window = dom.window
// @ts-expect-error - jsdom provides browser globals
globalThis.document = dom.window.document
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  writable: true,
  configurable: true,
})
// @ts-expect-error - jsdom provides browser globals
globalThis.localStorage = dom.window.localStorage
// Use Node.js native performance (jsdom's has recursion issues with .now())
Object.defineProperty(globalThis, 'performance', {
  value: nodePerformance,
  writable: true,
  configurable: true,
})

// ── Mock clipboard API (used by LoggingPage) ─────────────────────────────────

// @ts-expect-error - mock clipboard
globalThis.navigator.clipboard = {
  writeText: () => Promise.resolve(),
  readText: () => Promise.resolve(''),
}

// ── Vue / Pinia imports (after jsdom) ────────────────────────────────────────

import { createPinia, setActivePinia } from 'pinia'
import { useBoomerBill, type Session } from '../src/components/vue/store/boomerbills'

// ── Session seeding helpers ──────────────────────────────────────────────────

const BOOMER_NAMES = ['Dad', 'Mom', 'Uncle Dave', 'Aunt Sue', 'Grandpa Joe']
const CATEGORY_IDS = ['wifi', 'printer', 'password', 'email', 'software', 'general']
const NOTES = [
  'Router rebooted, working now',
  'Changed password again',
  'Printer jam cleared',
  'Installed new email client',
  'Removed toolbar from browser',
  'Reset modem',
  'Updated Windows',
  'Fixed desktop icons',
  'Recovered deleted photos',
  'Set up Zoom call',
  'Connected to WiFi',
  'Installed antivirus',
  'Fixed sound settings',
  'Cleared cache and cookies',
  'Helped with online banking',
]

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function generateSessions(count: number, seed = 42): Session[] {
  const rng = seededRandom(seed)
  const sessions: Session[] = []
  const now = Date.now()
  const oneYearMs = 365 * 24 * 60 * 60 * 1000

  for (let i = 0; i < count; i++) {
    const endedAt = now - Math.floor(rng() * oneYearMs)
    const durationMs = (5 + Math.floor(rng() * 55)) * 60 * 1000 // 5-60 min
    const startedAt = endedAt - durationMs
    const minutes = Math.max(1, Math.round(durationMs / 60000))
    const cost = (minutes / 60) * 75 // default rate $75/hr

    sessions.push({
      id: i + 1,
      boomerId: `boomer-${1 + Math.floor(rng() * BOOMER_NAMES.length)}`,
      categoryId: CATEGORY_IDS[Math.floor(rng() * CATEGORY_IDS.length)],
      minutes,
      cost,
      startedAt,
      endedAt,
      note: rng() > 0.4 ? NOTES[Math.floor(rng() * NOTES.length)] : undefined,
    })
  }

  return sessions
}

// ── Benchmark harness ────────────────────────────────────────────────────────

interface BenchmarkResult {
  tier: number
  iterations: number
  metrics: Record<string, { meanMs: number; p95Ms: number; sessionsPerMs: number }>
}

interface MetricSample {
  name: string
  durationsMs: number[]
}

/**
 * Measures the evaluation time of a function over N iterations.
 * Uses performance.now() for sub-millisecond precision.
 */
function measureIterations(fn: () => void, iterations: number): number[] {
  const durations: number[] = []

  // Warm-up: run once to trigger any lazy computation
  fn()

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    const end = performance.now()
    durations.push(end - start)
  }

  return durations
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

// ── Computed-property benchmark definitions ──────────────────────────────────

/**
 * Each benchmark target is a function that reads one or more computed
 * properties from the store, forcing their re-evaluation.
 */
function createBenchmarks(store: ReturnType<typeof useBoomerBill>) {
  return {
    // Dashboard stats
    'Dashboard: totals': () => { void store.totals },
    'Dashboard: incidentCount': () => { void store.incidentCount },
    'Dashboard: daysActive': () => { void store.daysActive },
    'Dashboard: avgPerDay': () => { void store.avgPerDay },
    'Dashboard: avgPerWeek': () => { void store.avgPerWeek },
    'Dashboard: avgPerYear': () => { void store.avgPerYear },
    'Dashboard: todayStats': () => { void store.todayStats },
    'Dashboard: weekStats': () => { void store.weekStats },
    'Dashboard: monthStats': () => { void store.monthStats },
    'Dashboard: yearStats': () => { void store.yearStats },
    'Dashboard: todayTrend': () => { void store.todayTrend },
    'Dashboard: weekTrend': () => { void store.weekTrend },
    'Dashboard: monthTrend': () => { void store.monthTrend },
    'Dashboard: yearTrend': () => { void store.yearTrend },
    'Dashboard: avgSessionTime': () => { void store.avgSessionTime },
    'Dashboard: peakDayThisMonth': () => { void store.peakDayThisMonth },
    'Dashboard: weeklySummary': () => { void store.weeklySummary },

    // Leaderboards
    'Leaderboard: boomerLeaderboard': () => { void store.boomerLeaderboard },
    'Leaderboard: categoryLeaderboard': () => { void store.categoryLeaderboard },
    'Leaderboard: sortedSessions': () => { void store.sortedSessions },

    // LoggingPage
    'LoggingPage: sessionDetails': () => { void store.sessionDetails },
    'LoggingPage: filteredSessions': () => { void store.filteredSessions },
    'LoggingPage: exportCSV': () => { void store.exportCSV },
  }
}

// ── Tier runner ──────────────────────────────────────────────────────────────

function runTier(tier: number, iterations: number): BenchmarkResult {
  // Fresh Pinia instance per tier to avoid cross-contamination
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useBoomerBill()

  // Seed boomers so sessions resolve properly
  for (const name of BOOMER_NAMES) {
    store.addBoomer(name)
  }

  // Generate and inject sessions directly (bypassing addSession for speed)
  const generatedSessions = generateSessions(tier)

  // Directly assign to the reactive ref (bypassing addSession's per-session persist)
  store.sessions = generatedSessions
  store.nextId = tier + 1

  const benchmarks = createBenchmarks(store)
  const metrics: BenchmarkResult['metrics'] = {}

  for (const [name, fn] of Object.entries(benchmarks)) {
    const durations = measureIterations(fn, iterations)
    const sorted = [...durations].sort((a, b) => a - b)
    const meanMs = mean(sorted)
    const p95Ms = percentile(sorted, 95)
    const sessionsPerMs = meanMs > 0 ? tier / meanMs : Infinity

    metrics[name] = {
      meanMs: Math.round(meanMs * 1000) / 1000,
      p95Ms: Math.round(p95Ms * 1000) / 1000,
      sessionsPerMs: Math.round(sessionsPerMs * 100) / 100,
    }
  }

  return { tier, iterations, metrics }
}

// ── Output formatters ────────────────────────────────────────────────────────

function formatTable(results: BenchmarkResult[]): string {
  const lines: string[] = []

  lines.push('')
  lines.push('┌─────────────────────────────────────────────────────────────────────────────┐')
  lines.push('│  BoomerBill — Session Dataset Profiling Benchmarks                          │')
  lines.push('└─────────────────────────────────────────────────────────────────────────────┘')
  lines.push('')

  for (const result of results) {
    lines.push(`  Tier: ${result.tier.toLocaleString()} sessions  |  Iterations: ${result.iterations}`)
    lines.push('')
    lines.push('  ' + padRight('Metric', 42) + padRight('Mean (ms)', 12) + padRight('P95 (ms)', 12) + 'Sessions/ms')
    lines.push('  ' + '─'.repeat(42) + '  ' + '─'.repeat(10) + '  ' + '─'.repeat(10) + '  ' + '─'.repeat(11))

    // Group by category
    const categories = ['Dashboard', 'Leaderboard', 'LoggingPage']
    for (const cat of categories) {
      const catMetrics = Object.entries(result.metrics).filter(([name]) => name.startsWith(cat))
      if (catMetrics.length === 0) continue

      for (const [name, data] of catMetrics) {
        const shortName = name.replace(`${cat}: `, '')
        lines.push(
          '  ' +
          padRight(shortName, 42) +
          padRight(data.meanMs.toFixed(3), 12) +
          padRight(data.p95Ms.toFixed(3), 12) +
          data.sessionsPerMs.toFixed(1)
        )
      }
      lines.push('')
    }

    lines.push('')
  }

  return lines.join('\n')
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!config.json) {
    console.log('')
    console.log('  Running profiling benchmarks...')
    console.log(`  Tiers: ${config.tiers.join(', ')}  |  Iterations: ${config.iterations}`)
    console.log('')
  }

  const results: BenchmarkResult[] = []

  for (const tier of config.tiers) {
    if (!config.json) {
      process.stdout.write(`    Seeding ${tier.toLocaleString()} sessions... `)
    }
    const result = runTier(tier, config.iterations)
    results.push(result)
    if (!config.json) {
      console.log('done')
    }
  }

  if (config.json) {
    console.log(JSON.stringify(results, null, 2))
  } else {
    console.log(formatTable(results))
  }
}

main().catch((err) => {
  console.error('Profiling failed:', err)
  process.exit(1)
})
