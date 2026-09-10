<script setup lang="ts">
import type { ObserverShip } from '~/types/api'
import { cargoTotal, companyColor, formatDecimal, shortId, shipStatus } from '~/utils/format'

const props = defineProps<{
  ships: ObserverShip[]
  flashIds: Set<string>
}>()

const CAP = 100

const tagClass: Record<string, string> = {
  docked: 'border-teal-500/50 text-teal-400',
  idle: 'border-default text-muted',
  transit: 'border-primary/50 text-primary',
  mining: 'border-primary/50 text-primary',
  busy: 'border-amber-500/50 text-amber-400'
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr class="border-b border-default">
          <th class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-dimmed">
            Ship
          </th>
          <th class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-dimmed">
            Company
          </th>
          <th class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-dimmed">
            Status
          </th>
          <th class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-dimmed">
            Location
          </th>
          <th class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-dimmed">
            Hull
          </th>
          <th class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-dimmed">
            Cargo
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!props.ships.length">
          <td colspan="6" class="px-3 py-6 text-center text-sm italic text-dimmed">
            no ships in the world yet
          </td>
        </tr>
        <tr
          v-for="ship in props.ships"
          :key="ship.id"
          class="border-b border-muted/40"
          :class="{ 'kestrel-flash': props.flashIds.has(ship.id) }"
        >
          <td class="px-3 py-2">
            <span class="mr-2 inline-block size-2 rounded-full align-middle" :style="{ background: companyColor(ship.company) }" />
            <span class="font-medium">{{ ship.name || shortId(ship.id) }}</span>
          </td>
          <td class="px-3 py-2 text-xs text-muted">{{ ship.company || '—' }}</td>
          <td class="px-3 py-2">
            <span
              class="inline-block border px-2 py-0.5 text-[10px] uppercase tracking-wide"
              :class="tagClass[shipStatus(ship.order, !!ship.docked_site_id).kind]"
            >
              {{ shipStatus(ship.order, !!ship.docked_site_id).label }}
            </span>
          </td>
          <td class="px-3 py-2 text-xs text-muted">
            {{ ship.system || '—' }}
            <span v-if="ship.x !== null">({{ ship.x }}, {{ ship.y }})</span>
            <span v-if="ship.docked_site_id">· docked {{ shortId(ship.docked_site_id) }}</span>
          </td>
          <td class="px-3 py-2 text-xs">{{ formatDecimal(ship.hull) }}</td>
          <td class="px-3 py-2 text-xs">
            <div>{{ cargoTotal(ship.cargo) }}/{{ CAP }}</div>
            <div v-if="Object.keys(ship.cargo).length" class="text-dimmed">
              {{ Object.entries(ship.cargo).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ') }}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
