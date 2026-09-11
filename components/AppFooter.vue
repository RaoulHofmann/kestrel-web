<script setup lang="ts">
const config = useRuntimeConfig()
const apiBase = computed(() => String(config.public.apiBase || 'https://kestrel-iomeaw.fly.dev'))
const docsUrl = computed(() => `${apiBase.value.replace(/\/+$/, '')}/`)
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-default bg-elevated/40">
    <UContainer class="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-baseline gap-2">
        <span class="font-display text-lg font-bold">Kestrel</span>
        <span class="text-xs text-dimmed">© {{ year }} · space company game</span>
      </div>
      <nav class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
        <NuxtLink to="/map" class="transition-colors hover:text-default">Galaxy map</NuxtLink>
        <NuxtLink to="/world" class="transition-colors hover:text-default">World info</NuxtLink>
        <NuxtLink to="/guide" class="transition-colors hover:text-default">API guide</NuxtLink>
        <a :href="docsUrl" target="_blank" rel="noopener" class="transition-colors hover:text-default">
          API docs
        </a>
        <a
          href="https://github.com/RaoulHofmann/kestrel-web"
          target="_blank"
          rel="noopener"
          class="transition-colors hover:text-default"
        >
          GitHub
        </a>
      </nav>
    </UContainer>
  </footer>
</template>
