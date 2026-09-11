<script setup lang="ts">
const props = defineProps<{
  code: string
  language?: string
  label?: string
}>()

const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => (copied.value = false), 1600)
  } catch {
    // Clipboard API unavailable (insecure context) — leave the button as-is.
  }
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div class="border border-default bg-elevated/60">
    <div class="flex items-center justify-between gap-3 border-b border-default px-4 py-2">
      <span class="text-[10px] uppercase tracking-[0.14em] text-dimmed">
        {{ label || language || 'code' }}
      </span>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-default"
        @click="copy"
      >
        <UIcon :name="copied ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
    </div>
    <pre class="overflow-x-auto p-4 text-xs leading-relaxed"><code class="font-mono">{{ code }}</code></pre>
  </div>
</template>
