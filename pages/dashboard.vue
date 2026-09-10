<script setup lang="ts">
import type { ApiKey, Company, GalaxySystem, Ship } from '~/types/api'
import { cargoTotal, formatDecimal, formatNumber, shortId, shipStatus } from '~/utils/format'

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const api = useApi()

const loading = ref(true)
const error = ref<string | null>(null)
const galaxy = ref<GalaxySystem[]>([])
const company = ref<Company | null>(null)
const apiKeys = ref<ApiKey[]>([])
const ships = ref<Ship[]>([])

const homeSystemName = computed(() => {
  const id = company.value?.home_system_id
  if (!id) return '—'
  const match = galaxy.value.find((s) => s.system_id === id)
  return match ? match.name : shortId(id)
})

// --- create company ---------------------------------------------------------
const newCompanyName = ref('')
const homeSystem = ref('sol')
const creatingCompany = ref(false)

const homeSystemItems = computed(() =>
  galaxy.value.map((system) => ({ label: `${system.name} (${system.key})`, value: system.key }))
)

// --- api keys ---------------------------------------------------------------
const newKeyName = ref('default')
const mintingKey = ref(false)
const revealedKey = ref<string | null>(null)
const showKeyModal = ref(false)

// --- ships ------------------------------------------------------------------
const newShipName = ref('')
const creatingShip = ref(false)

// --- company edit/delete (endpoints not implemented yet) --------------------
const editOpen = ref(false)
const editName = ref('')
const editHome = ref('sol')
const savingCompany = ref(false)
const deletingCompany = ref(false)

async function loadAll() {
  loading.value = true
  error.value = null
  try {
    const me = await auth.loadMe()
    company.value = me.company
    apiKeys.value = me.api_keys ?? []
    if (me.company) {
      ships.value = await api.listShips(me.company.id)
    }
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

async function createCompany() {
  creatingCompany.value = true
  error.value = null
  try {
    const result = await api.createCompany(newCompanyName.value, homeSystem.value)
    revealedKey.value = result.data.api_key
    showKeyModal.value = true
    newCompanyName.value = ''
    await loadAll()
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    creatingCompany.value = false
  }
}

async function mintKey() {
  if (!company.value) return
  mintingKey.value = true
  error.value = null
  try {
    const key = await api.createApiKey(company.value.id, newKeyName.value || 'default')
    revealedKey.value = key.api_key
    showKeyModal.value = true
    apiKeys.value = await api.listApiKeys(company.value.id)
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    mintingKey.value = false
  }
}

async function revokeKey(key: ApiKey) {
  if (!company.value) return
  if (!window.confirm(`Revoke API key "${key.name}" (${key.key_prefix}…)? This cannot be undone.`)) return
  error.value = null
  try {
    await api.revokeApiKey(key.id)
    apiKeys.value = await api.listApiKeys(company.value.id)
  } catch (err) {
    error.value = (err as Error).message
  }
}

async function createShip() {
  if (!company.value) return
  creatingShip.value = true
  error.value = null
  try {
    await api.createShip(company.value.id, newShipName.value)
    newShipName.value = ''
    ships.value = await api.listShips(company.value.id)
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    creatingShip.value = false
  }
}

async function saveCompany() {
  if (!company.value) return
  savingCompany.value = true
  error.value = null
  try {
    company.value = await api.updateCompany(company.value.id, {
      name: editName.value,
      home_system: editHome.value
    })
    editOpen.value = false
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    savingCompany.value = false
  }
}

async function deleteCompany() {
  if (!company.value) return
  deletingCompany.value = true
  error.value = null
  try {
    await api.deleteCompany(company.value.id)
    company.value = null
    ships.value = []
    apiKeys.value = []
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    deletingCompany.value = false
  }
}

function copyRevealedKey() {
  if (revealedKey.value) navigator.clipboard?.writeText(revealedKey.value)
}

onMounted(async () => {
  try {
    galaxy.value = await api.galaxy()
  } catch {
    galaxy.value = []
  }
  await loadAll()
})
</script>

<template>
  <UContainer class="py-10">
    <header class="flex flex-wrap items-baseline justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl font-bold">Dashboard</h1>
        <p class="mt-1 text-sm text-muted">
          Manage your company, API keys and ships. Ship control is done through the API.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs text-dimmed">{{ auth.email || 'signed in' }}</span>
        <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-refresh-cw" :loading="loading" @click="loadAll">
          Refresh
        </UButton>
      </div>
    </header>

    <UAlert
      v-if="error"
      class="mt-6"
      color="error"
      variant="soft"
      icon="i-lucide-triangle-alert"
      :title="error"
      description="If this is a network error, the API may be waking up or blocking this origin (CORS)."
    />

    <div v-if="loading && !company" class="mt-16 text-center text-xs uppercase tracking-[0.2em] text-muted">
      Loading…
    </div>

    <!-- no company yet -->
    <div v-else-if="!company" class="mx-auto mt-12 max-w-xl border border-default bg-elevated/40 p-8">
      <h2 class="font-display text-2xl font-bold">Bootstrap your company</h2>
      <p class="mt-2 text-sm text-muted">
        Pick a name and a home system. New ships spawn at your home system.
      </p>
      <form class="mt-6 space-y-4" @submit.prevent="createCompany">
        <UFormField label="Company name">
          <UInput v-model="newCompanyName" required placeholder="Acme Interstellar" class="w-full" />
        </UFormField>
        <UFormField label="Home system">
          <USelect v-model="homeSystem" :items="homeSystemItems" class="w-full" />
        </UFormField>
        <UButton type="submit" color="primary" size="lg" block :loading="creatingCompany">
          Create company
        </UButton>
      </form>
    </div>

    <template v-else>
      <!-- company -->
      <section class="mt-10 border border-default bg-elevated/40">
        <div class="flex flex-wrap items-start justify-between gap-4 border-b border-default p-6">
          <div>
            <p class="text-[10px] uppercase tracking-[0.14em] text-dimmed">Company</p>
            <h2 class="mt-1 font-display text-3xl font-bold">{{ company.name }}</h2>
            <p class="mt-1 text-xs text-muted">
              Home system: {{ homeSystemName }} · <span class="font-mono">{{ shortId(company.id) }}</span>
            </p>
          </div>
          <div class="text-right">
            <p class="text-[10px] uppercase tracking-[0.14em] text-dimmed">Credits</p>
            <p class="font-display text-3xl font-bold text-primary">
              {{ formatNumber(company.credits) }}
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3 p-6">
          <UTooltip text="Company edit endpoint not implemented yet">
            <span>
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-pencil"
                disabled
                @click="editOpen = true"
              >
                Edit
              </UButton>
            </span>
          </UTooltip>
          <UTooltip text="Company delete endpoint not implemented yet">
            <span>
              <UButton
                color="error"
                variant="outline"
                size="sm"
                icon="i-lucide-trash-2"
                disabled
                :loading="deletingCompany"
                @click="deleteCompany"
              >
                Delete
              </UButton>
            </span>
          </UTooltip>
          <span class="text-xs text-dimmed">Edit / delete are scaffolded for when the API lands.</span>
        </div>
      </section>

      <div class="mt-10 grid gap-10 lg:grid-cols-2">
        <!-- api keys -->
        <section class="min-w-0 border border-default bg-elevated/40 p-5">
          <div class="mb-3 flex items-baseline gap-2 border-b border-default pb-2">
            <h2 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-dimmed">API keys</h2>
            <span class="text-xs text-primary">{{ apiKeys.length }}</span>
          </div>

          <div class="space-y-2">
            <div
              v-for="key in apiKeys"
              :key="key.id"
              class="flex items-center justify-between gap-3 border border-default px-4 py-3"
              :class="{ 'opacity-50': key.revoked_at }"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ key.name }}</p>
                <p class="font-mono text-xs text-dimmed">{{ key.key_prefix }}…</p>
                <p class="text-[11px] text-dimmed">
                  {{ key.revoked_at ? 'revoked' : key.last_used_at ? `last used ${new Date(key.last_used_at).toLocaleString()}` : 'never used' }}
                </p>
              </div>
              <UButton
                v-if="!key.revoked_at"
                color="error"
                variant="ghost"
                size="xs"
                icon="i-lucide-ban"
                @click="revokeKey(key)"
              >
                Revoke
              </UButton>
            </div>
            <p v-if="!apiKeys.length" class="py-4 text-sm italic text-dimmed">No API keys yet.</p>
          </div>

          <form class="mt-4 flex gap-2" @submit.prevent="mintKey">
            <UInput v-model="newKeyName" placeholder="key name" class="flex-1" />
            <UButton type="submit" color="primary" variant="soft" :loading="mintingKey" icon="i-lucide-key-round">
              Mint
            </UButton>
          </form>
        </section>

        <!-- ships -->
        <section class="min-w-0 border border-default bg-elevated/40 p-5">
          <div class="mb-3 flex items-baseline gap-2 border-b border-default pb-2">
            <h2 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-dimmed">Ships</h2>
            <span class="text-xs text-primary">{{ ships.length }}</span>
          </div>

          <div class="space-y-2">
            <div v-for="ship in ships" :key="ship.id" class="border border-default px-4 py-3">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-medium">{{ ship.name }}</p>
                <span
                  class="border px-2 py-0.5 text-[10px] uppercase tracking-wide"
                  :class="
                    shipStatus(ship.order, !!ship.docked_site_id).kind === 'docked'
                      ? 'border-teal-500/50 text-teal-400'
                      : shipStatus(ship.order, !!ship.docked_site_id).kind === 'idle'
                        ? 'border-default text-muted'
                        : 'border-primary/50 text-primary'
                  "
                >
                  {{ shipStatus(ship.order, !!ship.docked_site_id).label }}
                </span>
              </div>
              <p class="mt-1 text-[11px] text-dimmed">
                <span class="font-mono">{{ shortId(ship.id) }}</span>
                · hull {{ formatDecimal(ship.hull) }}
                · cargo {{ cargoTotal(ship.cargo) }}
              </p>
            </div>
            <p v-if="!ships.length" class="py-4 text-sm italic text-dimmed">
              No ships yet. Register one below.
            </p>
          </div>

          <form class="mt-4 flex gap-2" @submit.prevent="createShip">
            <UInput v-model="newShipName" required placeholder="Hauler-1" class="flex-1" />
            <UButton type="submit" color="primary" variant="soft" :loading="creatingShip" icon="i-lucide-rocket">
              Register ship
            </UButton>
          </form>
        </section>
      </div>
    </template>

    <!-- raw key modal -->
    <UModal v-model:open="showKeyModal">
      <template #header>
        <h3 class="font-display text-xl font-bold">Your new API key</h3>
      </template>
      <template #body>
        <p class="text-sm text-muted">
          Copy this key now. It is shown once and only a hash is stored on the server.
        </p>
        <div class="mt-4 flex items-center gap-2 border border-default bg-elevated p-3">
          <code class="min-w-0 flex-1 truncate font-mono text-xs">{{ revealedKey }}</code>
          <UButton color="neutral" variant="soft" size="xs" icon="i-lucide-copy" @click="copyRevealedKey">
            Copy
          </UButton>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton color="primary" @click="showKeyModal = false; revealedKey = null">Done</UButton>
        </div>
      </template>
    </UModal>

    <!-- company edit modal (scaffold; endpoint pending) -->
    <UModal v-model:open="editOpen">
      <template #header>
        <h3 class="font-display text-xl font-bold">Edit company</h3>
      </template>
      <template #body>
        <form class="space-y-4" @submit.prevent="saveCompany">
          <UFormField label="Company name">
            <UInput v-model="editName" class="w-full" />
          </UFormField>
          <UFormField label="Home system">
            <USelect v-model="editHome" :items="homeSystemItems" class="w-full" />
          </UFormField>
          <p class="text-xs text-dimmed">PATCH /companies/:id is not implemented on the server yet.</p>
          <UButton type="submit" color="primary" block :loading="savingCompany">Save</UButton>
        </form>
      </template>
    </UModal>
  </UContainer>
</template>
