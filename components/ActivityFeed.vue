<script setup lang="ts">
export interface FeedLine {
  id: string
  time: string
  who: string
  text: string
}

defineProps<{ lines: FeedLine[] }>()
</script>

<template>
  <div class="max-h-[26rem] overflow-auto">
    <p v-if="!lines.length" class="py-6 text-center text-sm italic text-dimmed">watching…</p>
    <ul v-else class="divide-y divide-muted/40">
      <li v-for="line in lines" :key="line.id" class="py-1.5 text-xs">
        <span class="mr-2 text-dimmed">{{ line.time }}</span>
        <span v-if="line.who" class="mr-1.5 text-muted">{{ line.who }}</span>
        <span>{{ line.text }}</span>
      </li>
    </ul>
  </div>
</template>
