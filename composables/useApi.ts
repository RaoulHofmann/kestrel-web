import type {
  ApiError,
  ApiKey,
  Company,
  GalaxySystem,
  Me,
  ObserverEvent,
  ObserverShip,
  ObserverSite,
  Session,
  Ship,
  SystemDetail
} from '~/types/api'

export class KestrelApiError extends Error {
  code: string
  status: number | undefined
  details: Record<string, unknown> | undefined

  constructor(error: ApiError, status?: number) {
    super(error.message)
    this.name = 'KestrelApiError'
    this.code = error.code
    this.status = status
    this.details = error.details
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
  query?: Record<string, unknown>
  auth?: boolean
  retry?: boolean
  signal?: AbortSignal
}

function toApiError(err: unknown, status?: number): KestrelApiError {
  const data = (err as { data?: { error?: ApiError } })?.data
  if (data?.error?.code) return new KestrelApiError(data.error, status)
  const message = err instanceof Error ? err.message : 'Request failed'
  return new KestrelApiError({ code: 'network_error', message }, status)
}

/**
 * The single HTTP entry point for the whole app. Owns the base URL, the bearer
 * header, the 401 -> refresh -> retry dance, and error-envelope unwrapping.
 *
 * `apiBase` is configurable (NUXT_PUBLIC_API_BASE). Leave it empty in dev to
 * route through the Nitro proxy in nuxt.config.ts and sidestep CORS.
 */
export function useApi() {
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  const baseURL = computed(() => String(config.public.apiBase || '').replace(/\/+$/, ''))

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, query, auth: withAuth = true, retry = true, signal } = opts

    const headers: Record<string, string> = { Accept: 'application/json' }
    if (withAuth && auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`

    try {
      return await $fetch<T>(`${baseURL.value}${path}`, { method, body, query, headers, signal })
    } catch (err: unknown) {
      const status =
        (err as { response?: { status?: number } })?.response?.status ??
        (err as { status?: number })?.status

      if (status === 401 && withAuth && retry && auth.refreshToken) {
        const refreshed = await auth.refresh()
        if (refreshed) return request<T>(path, { ...opts, retry: false })
      }

      throw toApiError(err, status)
    }
  }

  return {
    baseURL,

    // --- public ---------------------------------------------------------
    health: (signal?: AbortSignal) =>
      request<{ status: string }>('/api/v1/health', { auth: false, signal }),
    galaxy: async () =>
      (await request<{ data: GalaxySystem[] }>('/api/v1/galaxy', { auth: false })).data,
    observerShips: async () =>
      (await request<{ data: ObserverShip[] }>('/api/v1/observer/ships', { auth: false })).data,
    observerSites: async () =>
      (await request<{ data: ObserverSite[] }>('/api/v1/observer/sites', { auth: false })).data,
    observerEvents: async (limit = 100) =>
      (
        await request<{ data: ObserverEvent[] }>('/api/v1/observer/events', {
          auth: false,
          query: { limit }
        })
      ).data,

    // --- auth -----------------------------------------------------------
    signup: (email: string, password: string) =>
      request<{ data: Session }>('/api/v1/auth/signup', {
        method: 'POST',
        auth: false,
        body: { email, password }
      }),
    login: (email: string, password: string) =>
      request<{ data: Session }>('/api/v1/auth/login', {
        method: 'POST',
        auth: false,
        body: { email, password }
      }),
    refresh: (refreshToken: string) =>
      request<{ data: Session }>('/api/v1/auth/refresh', {
        method: 'POST',
        auth: false,
        body: { refresh_token: refreshToken }
      }),
    logout: () => request<unknown>('/api/v1/auth/logout', { method: 'POST' }),

    // --- principal ------------------------------------------------------
    me: async () => (await request<{ data: Me }>('/api/v1/me')).data,

    // --- companies ------------------------------------------------------
    createCompany: (name: string, homeSystem?: string) =>
      request<{ data: { company: Company; api_key_id: string; api_key: string } }>(
        '/api/v1/companies',
        { method: 'POST', body: { name, home_system: homeSystem } }
      ),
    getCompany: async (id: string) =>
      (await request<{ data: Company }>(`/api/v1/companies/${id}`)).data,
    // Scaffolded: endpoints not implemented server-side yet.
    updateCompany: async (id: string, body: { name?: string; home_system?: string }) =>
      (await request<{ data: Company }>(`/api/v1/companies/${id}`, { method: 'PATCH', body })).data,
    deleteCompany: (id: string) =>
      request<unknown>(`/api/v1/companies/${id}`, { method: 'DELETE' }),

    // --- api keys -------------------------------------------------------
    listApiKeys: async (companyId: string) =>
      (await request<{ data: ApiKey[] }>(`/api/v1/companies/${companyId}/api_keys`)).data,
    createApiKey: async (companyId: string, name = 'default') =>
      (
        await request<{ data: ApiKey & { api_key: string } }>(
          `/api/v1/companies/${companyId}/api_keys`,
          { method: 'POST', body: { name } }
        )
      ).data,
    revokeApiKey: (id: string) =>
      request<{ data: { revoked: boolean } }>(`/api/v1/api_keys/${id}`, { method: 'DELETE' }),

    // --- ships (create/list only; no control) ---------------------------
    listShips: async (companyId: string) =>
      (await request<{ data: Ship[] }>(`/api/v1/companies/${companyId}/ships`)).data,
    createShip: async (companyId: string, name: string) =>
      (await request<{ data: Ship }>(`/api/v1/companies/${companyId}/ships`, {
        method: 'POST',
        body: { name }
      })).data,

    // --- systems --------------------------------------------------------
    system: async (id: string) =>
      (await request<{ data: SystemDetail }>(`/api/v1/systems/${id}`)).data
  }
}
