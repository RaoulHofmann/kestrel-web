<script setup lang="ts">
import type { GalaxySystem, ObserverSite, Ship, SystemDetail } from '~/types/api'
import { fill, setup, sitesGuide, steps, travelGuide, type GuideLanguage } from '~/utils/guide'

const config = useRuntimeConfig()
const api = useApi()
const auth = useAuthStore()

const language = ref<GuideLanguage>('curl')

const languages: { label: string; value: GuideLanguage }[] = [
  { label: 'cURL', value: 'curl' },
  { label: 'JavaScript', value: 'javascript' }
]

const baseUrl = computed(() => {
  const raw = String(config.public.apiBase || 'https://kestrel-iomeaw.fly.dev').replace(/\/+$/, '')
  return `${raw}/api/v1`
})

const galaxy = ref<GalaxySystem[]>([])
const observerSites = ref<ObserverSite[]>([])
const ship = ref<Ship | null>(null)
const system = ref<SystemDetail | null>(null)

const noFlash = new Set<string>()

const mineSite = computed(
  () => system.value?.planets.flatMap((planet) => planet.sites).find((site) => site.kind === 'mine') ?? null
)
const marketSite = computed(
  () => system.value?.planets.flatMap((planet) => planet.sites).find((site) => site.kind === 'market') ?? null
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

const setupCode = computed(() => fill(setup[language.value], vars.value))
const sitesCode = computed(() => fill(sitesGuide.code[language.value], vars.value))
const travelCode = computed(() => fill(travelGuide.code, vars.value))

function stepCode(step: (typeof steps)[number]) {
  return fill(step.code[language.value], vars.value)
}

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
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="border-b border-default bg-elevated/30">
      <UContainer class="py-16 lg:py-20">
        <p class="mb-5 text-xs uppercase tracking-[0.22em] text-dimmed">Guide · REST API</p>
        <h1 class="font-display text-5xl font-bold leading-[0.95] lg:text-6xl">
          Run a company from the API
        </h1>
        <p class="mt-6 max-w-3xl text-lg text-muted">
          Everything the dashboard does is a thin wrapper over the same REST endpoints. This guide
          walks through creating a company, registering a ship, moving it across the galaxy,
          mining a deposit and trading the cargo at a market.
        </p>

        <div
          v-if="auth.isAuthenticated"
          class="mt-8 flex flex-wrap items-center gap-3 border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
        >
          <UIcon name="i-lucide-check" class="text-primary" />
          <span class="text-muted">
            Signed in as <span class="text-default">{{ auth.email || 'you' }}</span
            ><template v-if="auth.company">
              · examples below use
              <span class="text-default">{{ auth.company.name }}</span></template
            >. Placeholders are filled with your company, ship and site IDs.
          </span>
        </div>

        <div class="mt-8 flex flex-wrap items-center gap-3">
          <NuxtLink :to="auth.isAuthenticated ? '/dashboard' : '/login'">
            <UButton color="primary" size="lg" trailing-icon="i-lucide-arrow-right">
              {{ auth.isAuthenticated ? 'Open dashboard' : 'Create an account' }}
            </UButton>
          </NuxtLink>
          <a :href="baseUrl.replace('/api/v1', '')" target="_blank" rel="noopener">
            <UButton color="neutral" variant="outline" size="lg" icon="i-lucide-book-open">
              API reference
            </UButton>
          </a>
        </div>
      </UContainer>
    </section>

    <!-- Setup + language switcher -->
    <section class="border-b border-default">
      <UContainer class="py-12 lg:py-16">
        <div class="grid gap-10 lg:grid-cols-12">
          <div class="lg:col-span-5">
            <h2 class="font-display text-3xl font-bold">Before you start</h2>
            <p class="mt-3 text-sm leading-relaxed text-muted">
              Every endpoint lives under <code class="font-mono text-default">{{ baseUrl }}</code>. Send
              a bearer credential on every request except the auth routes and the galaxy catalog.
              Errors share one envelope:
            </p>
            <code class="mt-4 block border border-default bg-elevated/60 px-4 py-3 font-mono text-xs">
              { "error": { "code": "ship_busy", "message": "…" } }
            </code>
            <p class="mt-4 text-sm leading-relaxed text-muted">
              Orders that change a ship’s state return <span class="text-default">202</span> and resolve
              asynchronously; a busy ship answers <span class="text-default">409</span>.
            </p>
          </div>
          <div class="lg:col-span-7">
            <div class="mb-3 flex items-center justify-between gap-4">
              <span class="text-[10px] uppercase tracking-[0.14em] text-dimmed">Setup</span>
              <div class="grid grid-cols-2 border border-default text-xs">
                <button
                  v-for="item in languages"
                  :key="item.value"
                  type="button"
                  class="px-3 py-1.5 transition-colors"
                  :class="
                    language === item.value
                      ? 'bg-elevated font-medium text-default'
                      : 'text-muted hover:text-default'
                  "
                  @click="language = item.value"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>
            <CodeBlock :code="setupCode" :label="language === 'curl' ? 'shell' : 'javascript'" />
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Steps -->
    <section class="border-b border-default bg-elevated/20">
      <UContainer class="py-12 lg:py-16">
        <div class="space-y-14">
          <article v-for="(step, index) in steps" :key="step.id" class="grid gap-8 lg:grid-cols-12">
            <div class="lg:col-span-5">
              <div class="flex items-baseline gap-3">
                <span class="font-display text-4xl font-bold text-primary">
                  {{ String(index + 1).padStart(2, '0') }}
                </span>
                <h2 class="font-display text-2xl font-bold">{{ step.title }}</h2>
              </div>
              <p class="mt-4 text-sm leading-relaxed text-muted">{{ step.body }}</p>
              <ul v-if="step.notes?.length" class="mt-4 space-y-2">
                <li
                  v-for="note in step.notes"
                  :key="note"
                  class="flex gap-2 text-xs leading-relaxed text-dimmed"
                >
                  <UIcon name="i-lucide-arrow-right" class="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span>{{ note }}</span>
                </li>
              </ul>
            </div>
            <div class="lg:col-span-7">
              <CodeBlock :code="stepCode(step)" :language="language" />
              <p v-if="step.response" class="mt-2 break-all font-mono text-[11px] text-dimmed">
                <span class="uppercase tracking-[0.14em]">response</span>
                {{ step.response }}
              </p>
            </div>
          </article>
        </div>
      </UContainer>
    </section>

    <!-- Sites -->
    <section class="border-b border-default">
      <UContainer class="py-12 lg:py-16">
        <div class="grid gap-10 lg:grid-cols-12">
          <div class="lg:col-span-5">
            <p class="text-[10px] uppercase tracking-[0.16em] text-dimmed">Reference</p>
            <h2 class="mt-2 font-display text-3xl font-bold">Sites</h2>
            <p class="mt-4 text-sm leading-relaxed text-muted">{{ sitesGuide.body }}</p>
          </div>
          <div class="lg:col-span-7">
            <CodeBlock :code="sitesCode" :language="language" />
          </div>
        </div>

        <div class="mt-10">
          <div class="mb-3 flex items-baseline gap-2 border-b border-default pb-2">
            <h3 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-dimmed">
              Live sites
            </h3>
            <span class="text-xs text-primary">{{ visibleSites.length }}</span>
          </div>
          <SiteTable :sites="visibleSites" :flash-ids="noFlash" />
        </div>
      </UContainer>
    </section>

    <!-- Cross-galaxy travel -->
    <section class="border-b border-default bg-elevated/30">
      <UContainer class="py-12 lg:py-16">
        <div class="grid gap-10 lg:grid-cols-12">
          <div class="lg:col-span-5">
            <p class="text-[10px] uppercase tracking-[0.16em] text-dimmed">Reference</p>
            <h2 class="mt-2 font-display text-3xl font-bold">Cross-galaxy travel</h2>
            <p class="mt-4 text-sm leading-relaxed text-muted">{{ travelGuide.body }}</p>
            <ul class="mt-4 space-y-2">
              <li
                v-for="note in travelGuide.notes"
                :key="note"
                class="flex gap-2 text-xs leading-relaxed text-dimmed"
              >
                <UIcon name="i-lucide-arrow-right" class="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>{{ note }}</span>
              </li>
            </ul>
            <NuxtLink to="/map" class="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
              See the lanes on the map
              <UIcon name="i-lucide-arrow-up-right" />
            </NuxtLink>
          </div>
          <div class="lg:col-span-7">
            <CodeBlock :code="travelCode" label="javascript" />
          </div>
        </div>
      </UContainer>
    </section>

    <!-- CTA -->
    <section class="bg-inverted text-inverted">
      <UContainer class="py-16 text-center lg:py-20">
        <h2 class="font-display text-4xl font-bold">Ready to ship?</h2>
        <p class="mx-auto mt-4 max-w-xl text-lg opacity-70">
          Create a company, keep the API key, and drive your fleet from a script or your own
          dashboard.
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <NuxtLink :to="auth.isAuthenticated ? '/dashboard' : '/login'">
            <UButton color="primary" size="lg" trailing-icon="i-lucide-arrow-right">
              {{ auth.isAuthenticated ? 'Open dashboard' : 'Create an account' }}
            </UButton>
          </NuxtLink>
          <a :href="baseUrl.replace('/api/v1', '')" target="_blank" rel="noopener">
            <UButton
              color="neutral"
              variant="outline"
              size="lg"
              class="border-white/40 text-white hover:bg-white hover:text-black"
            >
              Full API reference
            </UButton>
          </a>
        </div>
      </UContainer>
    </section>
  </div>
</template>
