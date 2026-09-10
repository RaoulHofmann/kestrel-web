<script setup lang="ts">
import { storeToRefs } from 'pinia'

const server = useServerStatusStore()
const { state, label, latencyMs } = storeToRefs(server)

const dotClass = computed(() => {
  switch (state.value) {
    case 'online':
      return 'bg-success'
    case 'waking':
      return 'bg-warning animate-pulse'
    case 'offline':
      return 'bg-error'
    default:
      return 'bg-muted animate-pulse'
  }
})
</script>

<template>
  <div class="border-b border-default bg-elevated/40 text-xs">
    <UContainer class="flex h-8 items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <span class="size-2 rounded-full" :class="dotClass" />
        <span class="text-muted">{{ label }}</span>
        <span v-if="state === 'online' && latencyMs !== null" class="text-dimmed">
          {{ latencyMs }}ms
        </span>
      </div>
      <button
        type="button"
        class="flex items-center gap-1.5 text-dimmed transition-colors hover:text-default"
        title="Check now"
        @click="server.check()"
      >
        <UIcon name="i-lucide-refresh-cw" class="size-3.5" />
        refresh
      </button>
    </UContainer>
  </div>
</template>
