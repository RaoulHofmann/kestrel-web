<script setup lang="ts">
const api = useApi()

const systemCount = ref<number | null>(null)

onMounted(async () => {
  try {
    const galaxy = await api.galaxy()
    systemCount.value = galaxy.length
  } catch {
    systemCount.value = null
  }
})

const features = [
  {
    icon: 'i-lucide-cpu',
    title: 'Actor simulation',
    body: 'One GenServer per ship, per contested site, per company. No global tick loop — every process schedules its own work.'
  },
  {
    icon: 'i-lucide-orbit',
    title: 'Deterministic universe',
    body: 'A premade galaxy of systems and lanes, with planets, ore deposits and markets derived purely from coordinates.'
  },
  {
    icon: 'i-lucide-coins',
    title: 'Mining & trading',
    body: 'Dock at a market to buy and sell. Contested deposits resolve in a single writer, so two ships can never overdraw one.'
  },
  {
    icon: 'i-lucide-plug-zap',
    title: 'API-first',
    body: 'A JSON-only REST API. Dashboards, CLIs, bots and AI agents all speak the same contract.'
  }
]

const explore = [
  {
    to: '/map',
    icon: 'i-lucide-orbit',
    title: 'Galaxy map',
    body: 'Orbit the 3D map, inspect systems and watch ships move in real time.'
  },
  {
    to: '/world',
    icon: 'i-lucide-table-2',
    title: 'World info',
    body: 'Live tables of every ship and site, plus a running activity feed.'
  },
  {
    to: '/guide',
    icon: 'i-lucide-rocket',
    title: 'Build a bot',
    body: 'Step-by-step API guide: create a company, register a ship, mine, travel and trade.'
  },
  {
    to: 'docs',
    icon: 'i-lucide-book-open',
    title: 'API reference',
    body: 'Swagger UI for the full REST surface, generated from the OpenAPI spec.'
  }
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="border-b border-default bg-elevated/30">
      <UContainer class="py-20 lg:py-28">
        <div class="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div class="lg:col-span-7">
            <p class="mb-6 text-xs uppercase tracking-[0.22em] text-dimmed">
              Browser-based · API-first · persistent universe
            </p>
            <h1 class="font-display text-6xl font-bold leading-[0.9] sm:text-7xl lg:text-8xl">
              Kestrel
            </h1>
            <p class="mt-8 max-w-2xl text-xl text-muted lg:text-2xl">
              A space cargo and mining company game. The server owns every byte of state;
              your dashboard, CLI or bot just talks to the API.
            </p>
            <div class="mt-10 flex flex-wrap items-center gap-3">
              <NuxtLink to="/map">
                <UButton color="primary" size="lg" trailing-icon="i-lucide-arrow-right">
                  Open the map
                </UButton>
              </NuxtLink>
              <NuxtLink to="/world">
                <UButton color="neutral" variant="outline" size="lg" icon="i-lucide-table-2">World info</UButton>
              </NuxtLink>
              <NuxtLink to="/login">
                <UButton color="neutral" variant="ghost" size="lg" icon="i-lucide-log-in">Sign in</UButton>
              </NuxtLink>
            </div>
          </div>

          <div class="lg:col-span-5">
            <div class="border border-primary/25 bg-primary/5 p-8">
              <div class="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted">
                <UIcon name="i-lucide-radio" class="text-primary" />
                Live universe
              </div>
              <div class="mt-6 font-display text-5xl font-bold text-highlighted">
                {{ systemCount ?? '—' }}
                <span class="text-2xl font-medium text-muted">systems</span>
              </div>
              <p class="mt-4 text-sm text-muted">
                Fixed systems and lanes, materialised lazily the first time a ship reaches them.
                New worlds appear as players travel.
              </p>
              <div class="mt-8 border-t border-default pt-5 text-sm">
                <p class="text-muted">Ready to run a company?</p>
                <NuxtLink to="/login" class="mt-2 inline-flex items-center gap-2 font-medium text-primary">
                  Create an account
                  <UIcon name="i-lucide-arrow-up-right" />
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- What it is -->
    <section class="border-b border-default">
      <UContainer class="py-16 lg:py-20">
        <div class="grid gap-10 lg:grid-cols-12">
          <div class="lg:col-span-4">
            <h2 class="font-display text-4xl font-bold">What it is</h2>
          </div>
          <div class="space-y-5 text-lg text-muted lg:col-span-8">
            <p>
              Kestrel is a persistent, tick-driven economy game. Companies buy and operate ships
              that travel a lane network, mine contested deposits, and sell cargo at markets whose
              prices they help move.
            </p>
            <p>
              There is no server-rendered game UI. Everything you see here — the map, the world
              tables, the company dashboard — is a client of the same public API that bots and
              scripts use.
            </p>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Features -->
    <section class="border-b border-default bg-elevated/30">
      <UContainer class="py-16 lg:py-20">
        <div class="grid gap-px overflow-hidden border border-default bg-border sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="feature in features" :key="feature.title" class="bg-default p-8">
            <UIcon :name="feature.icon" class="size-6 text-primary" />
            <h3 class="mt-5 font-display text-2xl font-bold">{{ feature.title }}</h3>
            <p class="mt-3 text-sm leading-relaxed text-muted">{{ feature.body }}</p>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Explore -->
    <section class="border-b border-default">
      <UContainer class="py-16 lg:py-20">
        <h2 class="font-display text-4xl font-bold">Explore</h2>
        <div class="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <template v-for="item in explore" :key="item.title">
            <NuxtLink v-if="item.to !== 'docs'" :to="item.to" class="group block border-t-2 border-default pt-5 transition-colors hover:border-primary">
              <UIcon :name="item.icon" class="size-6 text-primary" />
              <h3 class="mt-4 font-display text-2xl font-bold">{{ item.title }}</h3>
              <p class="mt-2 text-sm text-muted">{{ item.body }}</p>
              <span class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
                Open
                <UIcon name="i-lucide-arrow-right" class="transition-transform group-hover:translate-x-1" />
              </span>
            </NuxtLink>
            <a
              v-else
              :href="api.baseURL.value || 'https://kestrel-iomeaw.fly.dev'"
              target="_blank"
              rel="noopener"
              class="group block border-t-2 border-default pt-5 transition-colors hover:border-primary"
            >
              <UIcon :name="item.icon" class="size-6 text-primary" />
              <h3 class="mt-4 font-display text-2xl font-bold">{{ item.title }}</h3>
              <p class="mt-2 text-sm text-muted">{{ item.body }}</p>
              <span class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
                Open
                <UIcon name="i-lucide-arrow-up-right" />
              </span>
            </a>
          </template>
        </div>
      </UContainer>
    </section>

    <!-- CTA -->
    <section class="bg-inverted text-inverted">
      <UContainer class="py-20 text-center lg:py-24">
        <h2 class="font-display text-5xl font-bold">Run your company</h2>
        <p class="mx-auto mt-5 max-w-xl text-lg opacity-70">
          Sign in, pick a home system, and register your first ship. Manage your company and keys
          here — drive the ships through the API.
        </p>
        <div class="mt-10 flex flex-wrap justify-center gap-3">
          <NuxtLink to="/login">
            <UButton color="primary" size="lg" trailing-icon="i-lucide-arrow-right">
              Sign in or sign up
            </UButton>
          </NuxtLink>
          <NuxtLink to="/guide">
            <UButton
              color="neutral"
              variant="outline"
              size="lg"
              icon="i-lucide-rocket"
              class="border-white/40 text-white hover:bg-white hover:text-black"
            >
              Read the API guide
            </UButton>
          </NuxtLink>
        </div>
      </UContainer>
    </section>
  </div>
</template>
