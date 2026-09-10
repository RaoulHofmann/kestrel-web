<script setup lang="ts">
import type { ObserverEvent, ObserverShip, ObserverSite } from '~/types/api'
import type { FeedLine } from '~/components/ActivityFeed.vue'
import { cargoTotal, formatDecimal, shortId } from '~/utils/format'

const api = useApi()

const status = ref('connecting…')
const statusOk = ref(false)
const ships = ref<ObserverShip[]>([])
const sites = ref<ObserverSite[]>([])
const feed = ref<FeedLine[]>([])
const shipFlash = ref<Set<string>>(new Set())
const siteFlash = ref<Set<string>>(new Set())

const seenEvents = new Set<string>()
const prevShips = new Map<string, ObserverShip>()
const prevSites = new Map<string, ObserverSite>()

let timer: ReturnType<typeof setTimeout> | null = null
let running = true

function payload(event: ObserverEvent, key: string): unknown {
  return (event.payload as Record<string, unknown>)[key]
}

function fmtEvent(event: ObserverEvent): string {
  const qty = payload(event, 'quantity') ?? '?'
  const commodity = payload(event, 'commodity') ?? 'ore'
  const ship = event.ship ? `${event.ship} ` : ''
  switch (event.kind) {
    case 'ship_mined':
      return `${ship}mined ${qty} ${commodity}`
    case 'ship_moved':
      return `${ship}${payload(event, 'action') || 'moved'}`
    case 'cargo_sold':
      return `${ship}sold ${qty} ${commodity} for ${payload(event, 'proceeds') ?? '?'} cr`
    case 'cargo_bought':
      return `${ship}bought ${qty} ${commodity} for ${payload(event, 'cost') ?? '?'} cr`
    case 'credit':
      return `${event.company || ''} +${payload(event, 'amount') ?? '?'} cr`
    case 'debit':
      return `${event.company || ''} -${payload(event, 'amount') ?? '?'} cr`
    default:
      return `${event.kind} ${JSON.stringify(event.payload ?? {})}`
  }
}

function pushFeed(event: ObserverEvent) {
  feed.value = [
    {
      id: event.id,
      time: new Date(event.at).toLocaleTimeString(),
      who: event.ship ? `ship:${event.ship}` : event.company ? `co:${event.company}` : '',
      text: fmtEvent(event)
    },
    ...feed.value
  ].slice(0, 200)
}

function logLine(text: string, who: string) {
  feed.value = [
    { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, time: new Date().toLocaleTimeString(), who, text },
    ...feed.value
  ].slice(0, 200)
}

async function poll() {
  try {
    const [shipData, siteData, eventData] = await Promise.all([
      api.observerShips(),
      api.observerSites(),
      api.observerEvents(100)
    ])

    statusOk.value = true
    status.value = `${shipData.length} ships · ${siteData.length} sites · ${eventData.length} recent events · ${new Date().toLocaleTimeString()}`

    for (const event of eventData) {
      if (seenEvents.has(event.id)) continue
      seenEvents.add(event.id)
      if (seenEvents.size > 500) seenEvents.delete(seenEvents.values().next().value as string)
      pushFeed(event)
    }

    const nowShipIds = new Set(shipData.map((s) => s.id))
    for (const id of [...prevShips.keys()]) {
      if (!nowShipIds.has(id)) {
        logLine(`${prevShips.get(id)!.name} left the world (deleted?)`, 'ship')
        prevShips.delete(id)
      }
    }
    const nextShipFlash = new Set<string>()
    for (const ship of shipData) {
      const old = prevShips.get(ship.id)
      const signature = JSON.stringify({ order: old?.order, cargo: old?.cargo })
      const current = JSON.stringify({ order: ship.order, cargo: ship.cargo })
      if (old && signature !== current) {
        const bits: string[] = []
        const oldCargo = cargoTotal(old.cargo)
        const newCargo = cargoTotal(ship.cargo)
        if (oldCargo !== newCargo) bits.push(`cargo ${oldCargo} → ${newCargo}`)
        const oldType = old.order?.type
        const newType = ship.order?.type
        if (oldType !== newType) bits.push(`order: ${oldType || 'none'} → ${newType || 'done'}`)
        if (bits.length) logLine(`${ship.name}: ${bits.join(' · ')}`, `ship:${ship.company}`)
        nextShipFlash.add(ship.id)
      } else if (!old) {
        if (ship.order) logLine(`${ship.name}: order ${ship.order.type} running`, `ship:${ship.company}`)
        else if (ship.docked_site_id) logLine(`${ship.name}: docked at ${shortId(ship.docked_site_id)}`, `ship:${ship.company}`)
        nextShipFlash.add(ship.id)
      }
      prevShips.set(ship.id, ship)
    }

    const nowSiteIds = new Set(siteData.map((s) => s.id))
    for (const id of [...prevSites.keys()]) if (!nowSiteIds.has(id)) prevSites.delete(id)
    const nextSiteFlash = new Set<string>()
    for (const site of siteData) {
      const old = prevSites.get(site.id)
      const key = (s: ObserverSite) => JSON.stringify(s.kind === 'mine' ? s.ore : s.prices)
      const changed = old && key(old) !== key(site)
      if (changed && site.kind === 'mine') {
        const ore = Object.entries(site.ore).map(([k, v]) => `${k} ${formatDecimal(v)}`).join(', ') || 'empty'
        logLine(`${site.name}: ore → ${ore}`, `site:${site.system || ''}`)
      }
      if (changed || !old) nextSiteFlash.add(site.id)
      prevSites.set(site.id, site)
    }

    ships.value = shipData
    sites.value = siteData
    shipFlash.value = nextShipFlash
    siteFlash.value = nextSiteFlash
  } catch (error) {
    statusOk.value = false
    status.value = `⚠ ${(error as Error).message}`
  } finally {
    if (running) timer = setTimeout(poll, 800)
  }
}

onMounted(() => poll())
onBeforeUnmount(() => {
  running = false
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <UContainer class="py-10">
    <header class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h1 class="font-display text-4xl font-bold">World info</h1>
      <p class="text-sm text-muted">read-only, keyless. Drive actions with the API; watch ticks here.</p>
    </header>
    <p class="mt-2 text-xs" :class="statusOk ? 'text-success' : 'text-error'">{{ status }}</p>

    <div class="mt-10 grid gap-10 lg:grid-cols-2">
      <section class="min-w-0">
        <div class="mb-3 flex items-baseline gap-2 border-b border-default pb-2">
          <h2 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-dimmed">Ships</h2>
          <span class="text-xs text-primary">{{ ships.length }}</span>
        </div>
        <ShipTable :ships="ships" :flash-ids="shipFlash" />
      </section>

      <section class="min-w-0">
        <div class="mb-3 flex items-baseline gap-2 border-b border-default pb-2">
          <h2 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-dimmed">Sites</h2>
          <span class="text-xs text-primary">{{ sites.length }}</span>
        </div>
        <SiteTable :sites="sites" :flash-ids="siteFlash" />
      </section>
    </div>

    <section class="mt-12">
      <div class="mb-3 flex items-baseline gap-2 border-b border-default pb-2">
        <h2 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-dimmed">Activity feed</h2>
        <span class="text-xs text-primary">{{ feed.length }}</span>
      </div>
      <ActivityFeed :lines="feed" />
    </section>
  </UContainer>
</template>
