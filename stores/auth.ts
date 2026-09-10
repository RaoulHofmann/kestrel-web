import { defineStore } from 'pinia'
import type { Company, Session } from '~/types/api'

const STORAGE_KEY = 'kestrel.session'

interface Persisted {
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const expiresAt = ref<number | null>(null)
  const user = ref<Record<string, unknown> | null>(null)
  const company = ref<Company | null>(null)
  const loading = ref(false)
  const ready = ref(false)

  const isAuthenticated = computed(() => !!accessToken.value)
  const email = computed(() => (user.value?.email as string | undefined) ?? null)

  function persist() {
    if (!import.meta.client) return
    const data: Persisted = {
      accessToken: accessToken.value,
      refreshToken: refreshToken.value,
      expiresAt: expiresAt.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function restore() {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw) as Persisted
        accessToken.value = data.accessToken
        refreshToken.value = data.refreshToken
        expiresAt.value = data.expiresAt
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
    ready.value = true
  }

  function applySession(session: Session) {
    accessToken.value = session.access_token
    refreshToken.value = session.refresh_token
    expiresAt.value =
      session.expires_at ??
      (session.expires_in ? Math.floor(Date.now() / 1000) + session.expires_in : null)
    if (session.user) user.value = session.user
    persist()
  }

  function clear() {
    accessToken.value = null
    refreshToken.value = null
    expiresAt.value = null
    user.value = null
    company.value = null
    if (import.meta.client) localStorage.removeItem(STORAGE_KEY)
  }

  async function loadMe() {
    const api = useApi()
    const me = await api.me()
    company.value = me.company
    if (me.auth.sub) user.value = { ...(user.value ?? {}), sub: me.auth.sub }
    return me
  }

  async function signup(mail: string, password: string) {
    loading.value = true
    try {
      const api = useApi()
      const res = await api.signup(mail, password)
      applySession(res.data)
      await loadMe().catch(() => {})
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function login(mail: string, password: string) {
    loading.value = true
    try {
      const api = useApi()
      const res = await api.login(mail, password)
      applySession(res.data)
      await loadMe().catch(() => {})
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function refresh(): Promise<boolean> {
    if (!refreshToken.value) return false
    try {
      const api = useApi()
      const res = await api.refresh(refreshToken.value)
      applySession(res.data)
      return true
    } catch {
      clear()
      return false
    }
  }

  async function logout() {
    try {
      await useApi().logout()
    } catch {
      // best effort — revoke may fail if the token already expired
    }
    clear()
  }

  return {
    accessToken,
    refreshToken,
    expiresAt,
    user,
    company,
    loading,
    ready,
    isAuthenticated,
    email,
    restore,
    clear,
    loadMe,
    signup,
    login,
    refresh,
    logout
  }
})
