<script setup lang="ts">
const config = useRuntimeConfig()
const auth = useAuthStore()
const route = useRoute()
const open = ref(false)

const apiBase = computed(() => String(config.public.apiBase || 'https://kestrel-iomeaw.fly.dev'))
const docsUrl = computed(() => `${apiBase.value.replace(/\/+$/, '')}/`)

const links = [
  { label: 'Home', to: '/' },
  { label: 'Map', to: '/map' },
  { label: 'World', to: '/world' },
  { label: 'Guide', to: '/guide' }
]

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

async function signOut() {
  await auth.logout()
  open.value = false
  await navigateTo('/')
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-default bg-default/85 backdrop-blur">
    <UContainer class="flex h-16 items-center justify-between gap-6">
      <NuxtLink to="/" class="group flex items-baseline gap-2">
        <span class="font-display text-2xl font-bold tracking-tight">Kestrel</span>
        <span class="hidden text-[10px] uppercase tracking-[0.18em] text-dimmed sm:inline">
          API-first space company game
        </span>
      </NuxtLink>

      <nav class="hidden items-center gap-1 md:flex">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="px-3 py-2 text-sm transition-colors"
          :class="isActive(link.to) ? 'text-primary' : 'text-muted hover:text-default'"
        >
          {{ link.label }}
        </NuxtLink>
        <a
          :href="docsUrl"
          target="_blank"
          rel="noopener"
          class="px-3 py-2 text-sm text-muted transition-colors hover:text-default"
        >
          API
        </a>
      </nav>

      <div class="hidden items-center gap-3 md:flex">
        <template v-if="auth.isAuthenticated">
          <NuxtLink to="/dashboard">
            <UButton color="primary" variant="soft" size="sm" icon="i-lucide-gauge">Dashboard</UButton>
          </NuxtLink>
          <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-log-out" @click="signOut">Sign out</UButton>
        </template>
        <NuxtLink v-else to="/login">
          <UButton color="primary" size="sm" trailing-icon="i-lucide-arrow-right">Sign in</UButton>
        </NuxtLink>
      </div>

      <UButton
        class="md:hidden"
        color="neutral"
        variant="ghost"
        icon="i-lucide-menu"
        aria-label="Toggle menu"
        @click="open = !open"
      />
    </UContainer>

    <div v-if="open" class="border-t border-default md:hidden">
      <UContainer class="flex flex-col py-3">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="py-2 text-sm"
          :class="isActive(link.to) ? 'text-primary' : 'text-muted'"
          @click="open = false"
        >
          {{ link.label }}
        </NuxtLink>
        <a :href="docsUrl" target="_blank" rel="noopener" class="py-2 text-sm text-muted">API docs</a>
        <div class="mt-2 border-t border-default pt-3">
          <template v-if="auth.isAuthenticated">
            <NuxtLink to="/dashboard" @click="open = false">
              <UButton color="primary" variant="soft" size="sm" block>Dashboard</UButton>
            </NuxtLink>
            <UButton class="mt-2" color="neutral" variant="ghost" size="sm" block icon="i-lucide-log-out" @click="signOut">
              Sign out
            </UButton>
          </template>
          <NuxtLink v-else to="/login" @click="open = false">
            <UButton color="primary" size="sm" block trailing-icon="i-lucide-arrow-right">Sign in</UButton>
          </NuxtLink>
        </div>
      </UContainer>
    </div>
  </header>
</template>
