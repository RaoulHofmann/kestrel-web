<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { GalaxySystem, ObserverShip, ObserverSite } from '~/types/api'
import { cargoTotal, companyColor, formatDecimal, shortId } from '~/utils/format'

const api = useApi()

const canvasEl = ref<HTMLCanvasElement>()
const hostEl = ref<HTMLDivElement>()

const ready = ref(false)
const loadError = ref<string | null>(null)
const statusText = ref('initialising…')
const statusState = ref<'ok' | 'error' | 'loading'>('loading')

const selectedKey = ref<string | null>(null)
const selectedSystem = ref<GalaxySystem | null>(null)
const selectedPlanets = ref<{ name: string; pos: number; sites: ObserverSite[] }[]>([])
const selectedShips = ref<ObserverShip[]>([])

const SCALE = 46
const SYSTEM_COLOR = 0x22c55e
const LANE_COLOR = 0x3f3f46
const MINE_COLOR = 0x10b981
const MARKET_COLOR = 0x0ea5e9

const KIND_COLOR: Record<string, number> = {
  rocky: 0xb08d63,
  barren: 0x94866c,
  icy: 0x8fd0e6,
  gas: 0xd9b06a,
  volcanic: 0xc05f3f,
  verdant: 0x7fb56a
}

// --- non-reactive three.js state -------------------------------------------
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let raycaster: THREE.Raycaster | null = null
let clock: THREE.Clock | null = null
let frame = 0
let resizeObserver: ResizeObserver | null = null

interface SystemEntry {
  data: GalaxySystem
  group: THREE.Group
  star: THREE.Mesh
  ring: THREE.Mesh
  world: THREE.Vector3
  planets: Map<string, PlanetEntry>
}

interface PlanetEntry {
  name: string
  pos: number
  pivot: THREE.Group
  sites: ObserverSite[]
  markers: Map<string, THREE.Object3D>
}

interface ShipEntry {
  group: THREE.Group
  mesh: THREE.Mesh
  data: ObserverShip
  target: THREE.Vector3
  fromPos: THREE.Vector3 | null
  total: number | null
  lastTicks: number | null
}

const systems = new Map<string, SystemEntry>()
const ships = new Map<string, ShipEntry>()
const siteMarkers = new Map<string, THREE.Object3D>()
const laneMeshes: { a: string; b: string; mesh: THREE.Mesh }[] = []

function hash(input: string): number {
  let h = 2166136261
  for (const ch of input) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function toWorld(x: number, y: number, key = ''): THREE.Vector3 {
  return new THREE.Vector3(x * SCALE, ((hash(key) % 7) - 3) * 3.2, y * SCALE)
}

// --- textures / sprites -----------------------------------------------------
function radialSprite(stops: [number, string][], size: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [offset, color] of stops) grad.addColorStop(offset, color)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

let glowTexture: THREE.CanvasTexture | null = null

function makeGlow(color: number, size: number, opacity = 0.9): THREE.Sprite {
  if (!glowTexture) {
    glowTexture = radialSprite(
      [
        [0, 'rgba(255,255,255,1)'],
        [0.25, 'rgba(255,255,255,.55)'],
        [1, 'rgba(255,255,255,0)']
      ],
      128
    )
  }
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  )
  sprite.scale.setScalar(size)
  return sprite
}

function makeLabel(text: string, color = '#e4e4e7', scale = 1): THREE.Sprite {
  const pad = 12
  const font = 44
  const canvas = document.createElement('canvas')
  const measure = canvas.getContext('2d')!
  measure.font = `600 ${font}px ui-monospace, monospace`
  canvas.width = Math.ceil(measure.measureText(text).width) + pad * 2
  canvas.height = font + pad * 2
  const ctx = canvas.getContext('2d')!
  ctx.font = `600 ${font}px ui-monospace, monospace`
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.shadowColor = 'rgba(0,0,0,.9)'
  ctx.shadowBlur = 8
  ctx.fillText(text, pad, canvas.height / 2)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  )
  sprite.scale.set((canvas.width / canvas.height) * 9 * scale, 9 * scale, 1)
  return sprite
}

// --- scene setup ------------------------------------------------------------
function initScene() {
  const canvas = canvasEl.value!
  const host = hostEl.value!

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(host.clientWidth, host.clientHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x09090b, 0.0016)

  camera = new THREE.PerspectiveCamera(55, host.clientWidth / host.clientHeight, 0.1, 6000)
  camera.position.set(0, 240, 320)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.minDistance = 30
  controls.maxDistance = 1400
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.35

  scene.add(new THREE.AmbientLight(0x8a8578, 0.6))
  const core = new THREE.PointLight(0xcfc6b4, 2.0, 4000)
  scene.add(core)

  const n = 2600
  const pos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const r = 900 + Math.random() * 1600
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = r * Math.cos(phi)
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  scene.add(
    new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0x71717a,
        size: 2.2,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.7
      })
    )
  )

  raycaster = new THREE.Raycaster()
  clock = new THREE.Clock()

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointerup', onPointerUp)

  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !camera || !host) return
    const w = host.clientWidth
    const h = host.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })
  resizeObserver.observe(host)
}

async function loadGalaxy() {
  const galaxy = await api.galaxy()

  const drawn = new Set<string>()
  for (const sys of galaxy) {
    const world = toWorld(sys.x, sys.y, sys.key)
    const group = new THREE.Group()
    group.position.copy(world)

    const star = new THREE.Mesh(
      new THREE.SphereGeometry(4.2, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xdcfce7,
        emissive: SYSTEM_COLOR,
        emissiveIntensity: 1.5,
        roughness: 0.45
      })
    )
    star.userData.key = sys.key
    group.add(star)
    group.add(makeGlow(SYSTEM_COLOR, 44, 0.8))

    const label = makeLabel(sys.name, '#e4e4e7', 1.15)
    label.position.y = 12
    group.add(label)

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(7, 7.6, 48),
      new THREE.MeshBasicMaterial({
        color: SYSTEM_COLOR,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    )
    ring.rotation.x = -Math.PI / 2
    ring.visible = false
    group.add(ring)

    scene!.add(group)
    systems.set(sys.key, { data: sys, group, star, ring, world, planets: new Map() })
  }

  for (const sys of galaxy) {
    for (const other of sys.lanes) {
      const pair = [sys.key, other].sort().join('|')
      if (drawn.has(pair)) continue
      drawn.add(pair)
      const a = systems.get(sys.key)
      const b = systems.get(other)
      if (!a || !b) continue
      const curve = new THREE.QuadraticBezierCurve3(
        a.world,
        a.world.clone().lerp(b.world, 0.5).add(new THREE.Vector3(0, 14, 0)),
        b.world
      )
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 24, 0.6, 6, false),
        new THREE.MeshBasicMaterial({ color: LANE_COLOR, transparent: true, opacity: 0.7 })
      )
      scene!.add(tube)
      laneMeshes.push({ a: sys.key, b: other, mesh: tube })
    }
  }
}

function systemByCoords(x: number, y: number): SystemEntry | null {
  for (const entry of systems.values()) {
    if (entry.data.x === x && entry.data.y === y) return entry
  }
  return null
}

function ensurePlanets(entry: SystemEntry, rows: ObserverSite[]) {
  const grouped = new Map<string, PlanetEntry>()
  for (const site of rows) {
    const pos = site.planet_pos ?? 99
    const id = `${entry.data.key}:${pos}:${site.planet}`
    if (!grouped.has(id)) {
      grouped.set(id, {
        name: site.planet ?? 'Unknown',
        pos,
        pivot: new THREE.Group(),
        sites: [],
        markers: new Map()
      })
    }
    grouped.get(id)!.sites.push(site)
  }

  for (const planet of grouped.values()) {
    const existing = entry.planets.get(planet.name)
    if (existing) {
      existing.sites = planet.sites
      continue
    }

    const orbitR = 16 + planet.pos * 5.5
    const pivot = new THREE.Group()
    pivot.rotation.y = planet.pos * 2.399
    entry.group.add(pivot)

    const orbit = new THREE.Mesh(
      new THREE.RingGeometry(orbitR - 0.15, orbitR + 0.15, 64),
      new THREE.MeshBasicMaterial({
        color: 0x3f3f46,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    )
    orbit.rotation.x = -Math.PI / 2
    pivot.add(orbit)

    const kind = (planet.name.split(' ')[0] || '').toLowerCase()
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.6 + ((planet.pos * 7) % 3) * 0.35, 20, 20),
      new THREE.MeshStandardMaterial({ color: KIND_COLOR[kind] ?? 0x8a8478, roughness: 0.85 })
    )
    mesh.position.set(orbitR, 0, 0)
    pivot.add(mesh)

    entry.planets.set(planet.name, {
      name: planet.name,
      pos: planet.pos,
      pivot,
      sites: planet.sites,
      markers: new Map()
    })
  }
}

function ensureSiteMarker(entry: SystemEntry, planet: PlanetEntry, site: ObserverSite) {
  if (planet.markers.has(site.id)) return
  const isMine = site.kind === 'mine'
  const color = isMine ? MINE_COLOR : MARKET_COLOR
  const marker = new THREE.Mesh(
    isMine
      ? new THREE.OctahedronGeometry(1.9)
      : new THREE.TorusGeometry(1.8, 0.55, 8, 20),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      roughness: 0.5
    })
  )
  const index = planet.markers.size
  const angle = index * 2.399
  const radius = 16 + planet.pos * 5.5 + 5.5
  marker.position.set(Math.cos(angle) * radius, ((index % 3) - 1) * 1.6, Math.sin(angle) * radius)
  marker.add(makeGlow(color, 9, 0.55))
  marker.userData.site = site
  planet.pivot.add(marker)
  planet.markers.set(site.id, marker)
  siteMarkers.set(site.id, marker)
}

function ensureShip(ship: ObserverShip): ShipEntry {
  const existing = ships.get(ship.id)
  if (existing) return existing
  const color = new THREE.Color(companyColor(ship.company))
  const group = new THREE.Group()
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(1.8, 5, 5),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      roughness: 0.3
    })
  )
  mesh.rotation.x = Math.PI / 2
  group.add(mesh)
  group.add(makeGlow(color.getHex(), 16, 0.8))
  const label = makeLabel(ship.name, '#eae6dd', 0.8)
  label.position.y = 6
  group.add(label)
  scene!.add(group)
  const entry: ShipEntry = {
    group,
    mesh,
    data: ship,
    target: new THREE.Vector3(),
    fromPos: null,
    total: null,
    lastTicks: null
  }
  ships.set(ship.id, entry)
  return entry
}

function updateShips(shipData: ObserverShip[]) {
  const seen = new Set<string>()
  for (const ship of shipData) {
    seen.add(ship.id)
    const entry = ensureShip(ship)
    entry.data = ship
    const system = systemByCoords(ship.x, ship.y)
    const order = ship.order
    let target = system ? system.world.clone() : new THREE.Vector3()

    if (order?.type === 'travel' && order.to_system && systems.has(order.to_system)) {
      const dest = systems.get(order.to_system)!
      const ticks = order.ticks_left ?? null
      if (
        entry.total === null ||
        (ticks !== null && entry.lastTicks !== null && ticks > entry.lastTicks)
      ) {
        entry.fromPos = entry.group.position.clone()
        entry.total = ticks ?? 1
      }
      if (ticks !== null) entry.lastTicks = ticks
      const progress = entry.total ? Math.min(1, Math.max(0, 1 - ticks! / entry.total)) : 0.5
      const start = entry.fromPos ?? (system ? system.world.clone() : dest.world.clone())
      target = start.clone().lerp(dest.world, progress)
      entry.mesh.lookAt(dest.world)
    } else {
      entry.fromPos = null
      entry.total = null
      entry.lastTicks = null
      if (system && ship.pos_x !== null && ship.pos_y !== null) {
        target = system.world.clone().add(new THREE.Vector3(ship.pos_x * 1.6, 4, ship.pos_y * 1.6))
      } else if (system && ship.docked_site_id && siteMarkers.has(ship.docked_site_id)) {
        target = siteMarkers.get(ship.docked_site_id)!.getWorldPosition(new THREE.Vector3())
      }
      entry.mesh.rotation.set(Math.PI / 2, 0, 0)
    }
    entry.target.copy(target)
  }

  for (const id of [...ships.keys()]) {
    if (!seen.has(id)) {
      scene!.remove(ships.get(id)!.group)
      ships.delete(id)
    }
  }
}

function updateSites(siteData: ObserverSite[]) {
  const bySystem = new Map<string, ObserverSite[]>()
  for (const site of siteData) {
    if (site.x === null) continue
    const key = `${site.x}:${site.y}`
    if (!bySystem.has(key)) bySystem.set(key, [])
    bySystem.get(key)!.push(site)
  }
  for (const entry of systems.values()) {
    const rows = bySystem.get(`${entry.data.x}:${entry.data.y}`) ?? []
    ensurePlanets(entry, rows)
    for (const site of rows) {
      const planet = entry.planets.get(site.planet ?? '')
      if (planet) ensureSiteMarker(entry, planet, site)
    }
  }
}

function refreshSelection(siteData: ObserverSite[], shipData: ObserverShip[]) {
  const key = selectedKey.value
  if (!key) {
    selectedSystem.value = null
    selectedPlanets.value = []
    selectedShips.value = []
    return
  }
  const entry = systems.get(key)
  if (!entry) return
  selectedSystem.value = entry.data

  const rows = siteData.filter((s) => s.x === entry.data.x && s.y === entry.data.y)
  const planets = new Map<string, { name: string; pos: number; sites: ObserverSite[] }>()
  for (const site of rows) {
    const id = site.planet ?? 'Unknown'
    if (!planets.has(id)) {
      planets.set(id, { name: id, pos: site.planet_pos ?? 99, sites: [] })
    }
    planets.get(id)!.sites.push(site)
  }
  selectedPlanets.value = [...planets.values()].sort((a, b) => a.pos - b.pos)
  selectedShips.value = shipData.filter((s) => s.x === entry.data.x && s.y === entry.data.y)
}

function select(key: string | null) {
  selectedKey.value = key
  for (const entry of systems.values()) entry.ring.visible = entry.data.key === key
  for (const lane of laneMeshes) {
    const on = key !== null && (lane.a === key || lane.b === key)
    const material = lane.mesh.material as THREE.MeshBasicMaterial
    material.color.setHex(on ? SYSTEM_COLOR : LANE_COLOR)
    material.opacity = key ? (on ? 0.95 : 0.15) : 0.7
  }
  if (controls) controls.autoRotate = key === null
}

// --- picking ----------------------------------------------------------------
const pointer = new THREE.Vector2()
let downAt: { x: number; y: number } | null = null

function onPointerDown(event: PointerEvent) {
  downAt = { x: event.clientX, y: event.clientY }
}

function onPointerUp(event: PointerEvent) {
  if (!downAt || !renderer || !camera || !raycaster) return
  const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y)
  downAt = null
  if (moved > 5) return

  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects([...systems.values()].map((s) => s.star), false)
  select(hits.length ? (hits[0]!.object.userData.key as string) : null)
}

// --- polling ----------------------------------------------------------------
let pollTimer: ReturnType<typeof setTimeout> | null = null
let running = true

async function poll() {
  try {
    const [shipData, siteData] = await Promise.all([api.observerShips(), api.observerSites()])
    statusState.value = 'ok'
    statusText.value = `${shipData.length} ships · ${siteData.length} sites · ${new Date().toLocaleTimeString()}`
    updateSites(siteData)
    updateShips(shipData)
    refreshSelection(siteData, shipData)
  } catch (error) {
    statusState.value = 'error'
    statusText.value = `live data unavailable — ${(error as Error).message}`
  } finally {
    if (running) pollTimer = setTimeout(poll, 1500)
  }
}

function animate() {
  if (!running || !renderer || !scene || !camera || !controls || !clock) return
  frame = requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  for (const entry of systems.values()) {
    entry.star.rotation.y = t * 0.15
    for (const planet of entry.planets.values()) {
      planet.pivot.rotation.y += 0.0015 + planet.pos * 0.0004
    }
  }
  for (const ship of ships.values()) {
    ship.group.position.lerp(ship.target, 0.08)
    if (ship.data.order?.type === 'mine') ship.group.rotation.z += 0.06
  }

  controls.update()
  renderer.render(scene, camera)
}

function dispose() {
  running = false
  if (pollTimer) clearTimeout(pollTimer)
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  renderer?.domElement.removeEventListener('pointerdown', onPointerDown)
  renderer?.domElement.removeEventListener('pointerup', onPointerUp)
  controls?.dispose()
  renderer?.dispose()
  scene?.clear()
  systems.clear()
  ships.clear()
  siteMarkers.clear()
  laneMeshes.length = 0
}

onMounted(async () => {
  initScene()
  animate()
  try {
    await loadGalaxy()
    ready.value = true
    poll()
  } catch (error) {
    loadError.value = (error as Error).message
    statusState.value = 'error'
    statusText.value = `failed to load galaxy — ${loadError.value}`
  }
})

onBeforeUnmount(dispose)
</script>

<template>
  <div ref="hostEl" class="relative h-[calc(100vh-6rem)] w-full overflow-hidden bg-default">
    <canvas ref="canvasEl" class="absolute inset-0 block size-full" />

    <!-- title panel -->
    <div class="absolute left-4 top-4 max-w-xs border border-default bg-default/90 p-4 backdrop-blur">
      <h1 class="font-display text-2xl font-bold leading-none">Galaxy</h1>
      <p class="mt-2 text-xs text-muted">Read-only map · drag to orbit · scroll to zoom · click a star</p>
      <p
        class="mt-2 text-xs"
        :class="statusState === 'ok' ? 'text-success' : statusState === 'error' ? 'text-error' : 'text-muted'"
      >
        {{ statusText }}
      </p>
    </div>

    <!-- legend -->
    <div
      class="absolute bottom-4 left-4 flex flex-wrap gap-x-4 gap-y-2 border border-default bg-default/90 px-4 py-3 text-xs text-muted backdrop-blur"
    >
      <span class="inline-flex items-center gap-2">
        <i class="size-2 rounded-full" style="background: #22c55e" />system
      </span>
      <span class="inline-flex items-center gap-2">
        <i class="size-2 rotate-45" style="background: #10b981" />mine
      </span>
      <span class="inline-flex items-center gap-2">
        <i class="size-2 rounded-full" style="background: #0ea5e9" />market
      </span>
      <span class="inline-flex items-center gap-2">
        <i class="size-2" style="background: #f0b429" />ship
      </span>
    </div>

    <!-- selected system panel -->
    <div
      v-if="selectedSystem"
      class="absolute right-4 top-4 max-h-[calc(100%-2rem)] w-72 overflow-auto border border-default bg-default/95 p-5 backdrop-blur"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="font-display text-xl font-bold">{{ selectedSystem.name }}</h2>
          <p class="text-xs text-muted">
            {{ selectedSystem.x }}, {{ selectedSystem.y }} ·
            {{ selectedSystem.system_id ? 'materialised' : 'not yet visited' }}
          </p>
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-x"
          aria-label="Close"
          @click="select(null)"
        />
      </div>

      <h3 class="mt-4 border-b border-default pb-1 text-[10px] uppercase tracking-[0.12em] text-dimmed">
        Lanes
      </h3>
      <div class="mt-2 flex flex-wrap gap-1">
        <span
          v-for="lane in selectedSystem.lanes"
          :key="lane"
          class="border border-default px-2 py-0.5 text-[11px] text-muted"
        >
          {{ lane }}
        </span>
        <span v-if="!selectedSystem.lanes.length" class="text-xs italic text-dimmed">none</span>
      </div>

      <h3 class="mt-4 border-b border-default pb-1 text-[10px] uppercase tracking-[0.12em] text-dimmed">
        Planets &amp; sites
      </h3>
      <div v-if="selectedPlanets.length" class="mt-2 space-y-3">
        <div v-for="planet in selectedPlanets" :key="planet.name">
          <p class="text-sm font-medium">{{ planet.name }}</p>
          <div
            v-for="site in planet.sites"
            :key="site.id"
            class="mt-1 flex items-start gap-2 text-xs text-muted"
          >
            <span
              class="mt-0.5 shrink-0 border px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
              :class="
                site.kind === 'mine'
                  ? 'border-emerald-500/50 text-emerald-400'
                  : 'border-sky-500/50 text-sky-400'
              "
            >
              {{ site.kind }}
            </span>
            <span>
              {{ site.name }}
              <span v-if="site.kind === 'mine' && Object.keys(site.ore).length" class="text-dimmed">
                — {{ Object.entries(site.ore).map(([k, v]) => `${k} ${formatDecimal(v)}`).join(', ') }}
              </span>
            </span>
          </div>
        </div>
      </div>
      <p v-else class="mt-2 text-xs italic text-dimmed">no rows materialised</p>

      <h3 class="mt-4 border-b border-default pb-1 text-[10px] uppercase tracking-[0.12em] text-dimmed">
        Ships ({{ selectedShips.length }})
      </h3>
      <div v-if="selectedShips.length" class="mt-2 space-y-2">
        <div v-for="ship in selectedShips" :key="ship.id" class="text-xs">
          <span :style="{ color: companyColor(ship.company) }">●</span>
          {{ ship.name }}
          <span class="text-dimmed">
            {{
              ship.order
                ? ship.order.type === 'travel'
                  ? `→ ${ship.order.to_system} (${ship.order.ticks_left ?? '?'}t)`
                  : ship.order.type
                : ship.docked_site_id
                  ? `docked ${shortId(ship.docked_site_id)}`
                  : 'idle'
            }}
          </span>
          <span v-if="cargoTotal(ship.cargo)" class="text-dimmed">· {{ cargoTotal(ship.cargo) }} cargo</span>
        </div>
      </div>
      <p v-else class="mt-2 text-xs italic text-dimmed">none</p>
    </div>

    <!-- loading / error -->
    <div
      v-if="!ready"
      class="pointer-events-none absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.2em] text-muted"
    >
      {{ loadError ? `Failed: ${loadError}` : 'Initialising galaxy' }}
    </div>
  </div>
</template>
