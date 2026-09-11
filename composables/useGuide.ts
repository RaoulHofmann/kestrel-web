import type { GalaxySystem, ObserverSite, Ship, SystemDetail } from '~/types/api'
import { fill, setup, sitesGuide, steps, travelGuide, type GuideLanguage, type GuideStep } from '~/utils/guide'

/**
 * Shared state for every guide layout. Owns the language toggle, the API base,
 * the signed-in company/ship/system lookup, and the `{{token}}` substitution
 * used by all snippets. Placeholders stay readable when signed out.
 */
export function useGuide() {
  const config = useRuntimeConfig()
  const api = useApi()
  const auth = useAuthStore()

  const language = ref<GuideLanguage>('curl')

  function setLanguage(value: GuideLanguage) {
    language.value = value
  }

  const baseUrl = computed(() => {
    const raw = String(config.public.apiBase || 'https://kestrel-iomeaw.fly.dev').replace(/\/+$/, '')
    return `${raw}/api/v1`
  })
  const docsUrl = computed(() => baseUrl.value.replace('/api/v1', ''))

  const galaxy = ref<GalaxySystem[]>([])
  const observerSites = ref<ObserverSite[]>([])
  const ship = ref<Ship | null>(null)
  const system = ref<SystemDetail | null>(null)

  const mineSite = computed(
    () =>
      system.value?.planets
        .flatMap((planet) => planet.sites)
        .find((site) => site.kind === 'mine') ?? null
  )
  const marketSite = computed(
    () =>
      system.value?.planets
        .flatMap((planet) => planet.sites)
        .find((site) => site.kind === 'market') ?? null
  )
  const commodity = computed(() => {
    const site = observerSites.value.find((s) => s.id === mineSite.value?.id)
    return site ? (Object.keys(site.ore)[0] ?? null) : null
  })
  const homeKey = computed(() => {
    const id = auth.company?.home_system_id
    return galaxy.value.find((s) => s.system_id === id)?.key ?? null
  })
  const toSystem = computed(() => {
    const home = galaxy.value.find((s) => s.key === homeKey.value)
    return home?.lanes[0] ?? null
  })

  const visibleSites = computed(() => {
    const name = system.value?.name
    if (!name) return observerSites.value
    const inSystem = observerSites.value.filter((site) => site.system === name)
    return inSystem.length ? inSystem : observerSites.value
  })

  // Filled-in values when signed in; readable placeholders otherwise.
  const vars = computed<Record<string, string>>(() => ({
    base: baseUrl.value,
    company_id: auth.company?.id ?? '<company_id>',
    ship_id: ship.value?.id ?? '<ship_id>',
    home_system: homeKey.value ?? 'sol',
    to_system: toSystem.value ?? 'vega',
    system_id: ship.value?.system_id ?? '<system_id>',
    mine_site_id: mineSite.value?.id ?? '<mine_site_id>',
    market_site_id: marketSite.value?.id ?? '<market_site_id>',
    commodity: commodity.value ?? 'copper'
  }))

  function code(snippet: Record<GuideLanguage, string>) {
    return fill(snippet[language.value], vars.value)
  }

  function stepCode(step: GuideStep) {
    return code(step.code)
  }

  const setupCode = computed(() => code(setup))
  const sitesCode = computed(() => code(sitesGuide.code))
  const travelCode = computed(() => code(travelGuide.code))

  onMounted(async () => {
    try {
      galaxy.value = await api.galaxy()
    } catch {
      galaxy.value = []
    }
    try {
      observerSites.value = await api.observerSites()
    } catch {
      observerSites.value = []
    }

    if (!auth.isAuthenticated) return
    try {
      const me = await auth.loadMe()
      if (!me.company) return
      const ships = await api.listShips(me.company.id)
      ship.value = ships[0] ?? null
      if (ship.value?.system_id) {
        system.value = await api.system(ship.value.system_id).catch(() => null)
      }
    } catch {
      // keep the readable placeholders
    }
  })

  return {
    language,
    setLanguage,
    baseUrl,
    docsUrl,
    setupCode,
    sitesCode,
    travelCode,
    stepCode,
    steps,
    visibleSites
  }
}
