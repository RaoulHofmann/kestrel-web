<script setup lang="ts">
import { endpoints, sitesGuide, travelGuide, type GuideLanguage } from '~/utils/guide'

const auth = useAuthStore()
const {
  language,
  setLanguage,
  baseUrl,
  docsUrl,
  setupCode,
  steps,
  stepCode,
  sitesCode,
  travelCode,
  visibleSites
} = useGuide()

const languages: { label: string; value: GuideLanguage }[] = [
  { label: 'cURL', value: 'curl' },
  { label: 'JavaScript', value: 'javascript' }
]

const noFlash = new Set<string>()

const sectionIds = computed(() => ['setup', ...steps.map((s) => s.id), 'sites', 'travel', 'endpoints'])
const labels: Record<string, string> = {
  setup: 'Setup',
  sites: 'Sites',
  travel: 'Travel',
  endpoints: 'Endpoints'
}
function tocLabel(id: string) {
  return labels[id] ?? steps.find((s) => s.id === id)?.title ?? id
}

const active = ref('setup')
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) active.value = entry.target.id
      }
    },
    { rootMargin: '-96px 0px -70% 0px' }
  )
  for (const id of sectionIds.value) {
    const el = document.getElementById(id)
    if (el) observer.observe(el)
  }
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <UContainer class="py-12 lg:py-16">
    <div class="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
      <!-- TOC -->
      <aside class="hidden lg:block">
        <div class="sticky top-24">
          <p class="text-[10px] uppercase tracking-[0.16em] text-dimmed">On this page</p>
          <nav class="mt-4 space-y-1 border-l border-default">
            <a
              v-for="id in sectionIds"
              :key="id"
              :href="`#${id}`"
              class="-ml-px block border-l-2 py-1 pl-3 text-sm transition-colors"
              :class="
                active === id
                  ? 'border-primary text-default'
                  : 'border-transparent text-muted hover:text-default'
              "
            >
              {{ tocLabel(id) }}
            </a>
          </nav>
        </div>
      </aside>

      <!-- Content -->
      <div class="min-w-0">
        <header class="border-b border-default pb-8">
          <p class="text-xs uppercase tracking-[0.22em] text-dimmed">Guide · REST API</p>
          <h1 class="mt-4 font-display text-5xl font-bold leading-[0.95]">Kestrel API guide</h1>
          <p class="mt-5 max-w-2xl text-lg text-muted">
            A company, a ship, and a hold full of ore — start to finish, over the REST API.
          </p>

          <div class="mt-6 flex flex-wrap items-center gap-3">
            <NuxtLink :to="auth.isAuthenticated ? '/dashboard' : '/login'">
              <UButton color="primary" trailing-icon="i-lucide-arrow-right">
                {{ auth.isAuthenticated ? 'Open dashboard' : 'Create an account' }}
              </UButton>
            </NuxtLink>
            <NuxtLink to="/map">
              <UButton color="neutral" variant="outline" icon="i-lucide-orbit">Galaxy map</UButton>
            </NuxtLink>
          </div>

          <div
            v-if="auth.isAuthenticated"
            class="mt-6 flex flex-wrap items-center gap-2 border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted"
          >
            <UIcon name="i-lucide-check" class="text-primary" />
            Examples use <span class="text-default">{{ auth.company?.name || 'your company' }}</span> and
            its ships.
          </div>
        </header>

        <!-- language toggle -->
        <div class="sticky top-16 z-10 -mx-4 mb-10 flex items-center justify-end border-b border-default bg-default/85 px-4 py-3 backdrop-blur">
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
              @click="setLanguage(item.value)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>

        <!-- Setup -->
        <section id="setup" class="scroll-mt-28">
          <h2 class="font-display text-3xl font-bold">Setup</h2>
          <p class="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Every endpoint lives under <code class="font-mono text-default">{{ baseUrl }}</code>. Send a
            bearer credential on every request except the auth routes and the galaxy catalog. Errors
            share one envelope:
          </p>
          <code class="mt-4 block max-w-2xl border border-default bg-elevated/60 px-4 py-3 font-mono text-xs">
            { "error": { "code": "ship_busy", "message": "…" } }
          </code>
          <div class="mt-6">
            <CodeBlock :code="setupCode" :label="language === 'curl' ? 'shell' : 'javascript'" />
          </div>
        </section>

        <!-- Steps -->
        <section
          v-for="(step, index) in steps"
          :id="step.id"
          :key="step.id"
          class="mt-16 scroll-mt-28 border-t border-default pt-10"
        >
          <h2 class="font-display text-3xl font-bold">
            <span class="mr-3 text-primary">{{ String(index + 1).padStart(2, '0') }}</span>{{ step.title }}
          </h2>
          <p class="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{{ step.body }}</p>
          <ul v-if="step.notes?.length" class="mt-4 max-w-2xl space-y-2">
            <li
              v-for="note in step.notes"
              :key="note"
              class="flex gap-2 text-xs leading-relaxed text-dimmed"
            >
              <UIcon name="i-lucide-arrow-right" class="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>{{ note }}</span>
            </li>
          </ul>
          <div class="mt-6">
            <CodeBlock :code="stepCode(step)" :language="language" />
            <p v-if="step.response" class="mt-2 break-all font-mono text-[11px] text-dimmed">
              <span class="uppercase tracking-[0.14em]">response</span> {{ step.response }}
            </p>
          </div>
        </section>

        <!-- Sites -->
        <section id="sites" class="mt-16 scroll-mt-28 border-t border-default pt-10">
          <h2 class="font-display text-3xl font-bold">Sites</h2>
          <p class="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{{ sitesGuide.body }}</p>
          <div class="mt-6">
            <CodeBlock :code="sitesCode" :language="language" />
          </div>
          <div class="mt-8">
            <SiteTable :sites="visibleSites" :flash-ids="noFlash" />
          </div>
        </section>

        <!-- Travel -->
        <section id="travel" class="mt-16 scroll-mt-28 border-t border-default pt-10">
          <h2 class="font-display text-3xl font-bold">Travel</h2>
          <p class="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{{ travelGuide.body }}</p>
          <div class="mt-6">
            <CodeBlock :code="travelCode" :language="language" />
          </div>
        </section>

        <!-- Endpoints -->
        <section id="endpoints" class="mt-16 scroll-mt-28 border-t border-default pt-10">
          <h2 class="font-display text-3xl font-bold">Endpoint reference</h2>
          <div class="mt-6 overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-b border-default text-left text-[10px] uppercase tracking-[0.08em] text-dimmed">
                  <th class="px-3 py-2">Method</th>
                  <th class="px-3 py-2">Path</th>
                  <th class="px-3 py-2">Auth</th>
                  <th class="px-3 py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="endpoint in endpoints" :key="endpoint.method + endpoint.path" class="border-b border-muted/40">
                  <td class="px-3 py-2 font-mono text-xs text-primary">{{ endpoint.method }}</td>
                  <td class="px-3 py-2 font-mono text-xs">{{ endpoint.path }}</td>
                  <td class="px-3 py-2 text-xs text-dimmed">{{ endpoint.auth }}</td>
                  <td class="px-3 py-2 text-xs text-muted">{{ endpoint.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <a :href="docsUrl" target="_blank" rel="noopener" class="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
            Full Swagger reference
            <UIcon name="i-lucide-arrow-up-right" />
          </a>
        </section>
      </div>
    </div>
  </UContainer>
</template>
