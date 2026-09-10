<script setup lang="ts">
import type { ObserverSite } from '~/types/api'
import { formatDecimal, shortId } from '~/utils/format'

const props = defineProps<{
  sites: ObserverSite[]
  flashIds: Set<string>
}>()

function commodityText(site: ObserverSite): string {
  if (site.kind === 'mine') {
    return Object.entries(site.ore).map(([k, v]) => `${k} ${formatDecimal(v)}`).join(', ')
  }
  return Object.entries(site.prices)
    .map(([k, v]) => `${k} ${v.buy}/${v.sell}`)
    .join(', ')
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr class="border-b border-default">
          <th class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-dimmed">
            Site
          </th>
          <th class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-dimmed">
            Kind
          </th>
          <th class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-dimmed">
            Location
          </th>
          <th class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-dimmed">
            Ore / Prices
          </th>
          <th class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-dimmed">
            Miners
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!props.sites.length">
          <td colspan="5" class="px-3 py-6 text-center text-sm italic text-dimmed">
            no sites materialised yet
          </td>
        </tr>
        <tr
          v-for="site in props.sites"
          :key="site.id"
          class="border-b border-muted/40"
          :class="{ 'kestrel-flash': props.flashIds.has(site.id) }"
        >
          <td class="px-3 py-2 font-medium">{{ site.name || shortId(site.id) }}</td>
          <td class="px-3 py-2">
            <span
              class="inline-block border px-2 py-0.5 text-[10px] uppercase tracking-wide"
              :class="
                site.kind === 'mine'
                  ? 'border-emerald-500/50 text-emerald-400'
                  : 'border-sky-500/50 text-sky-400'
              "
            >
              {{ site.kind }}
            </span>
          </td>
          <td class="px-3 py-2 text-xs text-muted">
            {{ site.system || '—' }}
            <span v-if="site.x !== null">({{ site.x }}, {{ site.y }})</span>
            <span v-if="site.planet">· {{ site.planet }}</span>
          </td>
          <td class="px-3 py-2 text-xs text-muted">
            {{ commodityText(site) || '(no commodities)' }}
          </td>
          <td class="px-3 py-2 text-xs">{{ site.mining_ships.length }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
