<template>
  <ClientOnly>
    <GalaxyMap />
    <template #fallback>
      <div
        class="flex h-[calc(100vh-6rem)] items-center justify-center text-xs uppercase tracking-[0.2em] text-muted"
      >
        Loading map…
      </div>
    </template>
  </ClientOnly>
</template>
