import { defineStore } from 'pinia'

export type ServerState = 'checking' | 'online' | 'waking' | 'offline'

const TIMEOUT_MS = 8000
const ONLINE_INTERVAL = 20_000
const WAKING_INTERVAL = 4_000
const OFFLINE_INTERVAL = 15_000

/**
 * Polls GET /api/v1/health. The poll doubles as a wake-up call: the Fly machine
 * auto-starts on request, so a failed ping is retried aggressively and reported
 * as "waking" rather than "offline" until a few attempts have passed.
 */
export const useServerStatusStore = defineStore('serverStatus', () => {
  const state = ref<ServerState>('checking')
  const lastCheckedAt = ref<number | null>(null)
  const latencyMs = ref<number | null>(null)
  const failures = ref(0)

  let timer: ReturnType<typeof setTimeout> | null = null
  let running = false

  const isOnline = computed(() => state.value === 'online')
  const label = computed(() => {
    switch (state.value) {
      case 'online':
        return 'server online'
      case 'waking':
        return 'waking server…'
      case 'offline':
        return 'server offline'
      default:
        return 'checking server…'
    }
  })
  const color = computed(() => {
    switch (state.value) {
      case 'online':
        return 'success'
      case 'waking':
        return 'warning'
      case 'offline':
        return 'error'
      default:
        return 'neutral'
    }
  })

  function schedule(delay: number) {
    if (!running) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(check, delay)
  }

  async function check() {
    const api = useApi()
    const controller = new AbortController()
    const abort = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const startedAt = performance.now()

    try {
      await api.health(controller.signal)
      failures.value = 0
      state.value = 'online'
      latencyMs.value = Math.round(performance.now() - startedAt)
    } catch {
      failures.value += 1
      state.value = failures.value >= 3 ? 'offline' : 'waking'
      latencyMs.value = null
    } finally {
      clearTimeout(abort)
      lastCheckedAt.value = Date.now()
    }

    schedule(
      state.value === 'online'
        ? ONLINE_INTERVAL
        : state.value === 'waking'
          ? WAKING_INTERVAL
          : OFFLINE_INTERVAL
    )
  }

  function start() {
    if (!import.meta.client || running) return
    running = true
    check()
  }

  function stop() {
    running = false
    if (timer) clearTimeout(timer)
    timer = null
  }

  return { state, lastCheckedAt, latencyMs, failures, isOnline, label, color, check, start, stop }
})
