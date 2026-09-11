export type GuideLanguage = 'curl' | 'javascript'

export interface GuideStep {
  id: string
  title: string
  body: string
  code: Record<GuideLanguage, string>
  response?: string
  notes?: string[]
}

/**
 * Replaces `{{token}}` placeholders with the values in `vars`. Unknown tokens
 * are left untouched so a missing value never silently becomes "undefined".
 */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => vars[key] ?? match)
}

export const setup: Record<GuideLanguage, string> = {
  curl: `BASE={{base}}
TOKEN=<your access token or kestrel_… API key>`,
  javascript: `const BASE = '{{base}}'
const TOKEN = '<your access token or kestrel_… API key>'`
}

export const travelGuide = {
  body:
    'Travel is deliberately one lane per order, so crossing the galaxy means chaining hops. The lane graph is public: fetch the catalog, find the shortest route, then send a travel order per hop and wait for each to clear before the next.',
  code: `// 1. Build the lane graph from the catalog
const galaxy = (await (await fetch(BASE + '/galaxy')).json()).data
const lanes = Object.fromEntries(galaxy.map((s) => [s.key, s.lanes]))

// 2. Shortest route by lane count (breadth-first search)
function route(from, to) {
  const queue = [[from]]
  const seen = new Set([from])
  while (queue.length) {
    const path = queue.shift()
    const node = path[path.length - 1]
    if (node === to) return path
    for (const next of lanes[node] ?? []) {
      if (!seen.has(next)) {
        seen.add(next)
        queue.push([...path, next])
      }
    }
  }
  return null
}

// 3. Hop one lane at a time, waiting for each order to clear
for (const hop of route('{{home_system}}', '{{to_system}}').slice(1)) {
  await fetch(BASE + '/ships/{{ship_id}}/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify({ type: 'travel', to_system: hop })
  })
  while (true) {
    const ship = (await (await fetch(BASE + '/ships/{{ship_id}}', {
      headers: { authorization: 'Bearer ' + TOKEN }
    })).json()).data
    if (!ship.order) break
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}`,
  notes: ['A system’s rows are materialised the first time a ship reaches or views it — a lane can point at a system that does not exist yet.']
}

export const sitesGuide = {
  body:
    'Mines and markets are sites. A system lists its planets and their sites; a single site reports remaining ore (mine) or current buy/sell prices (market). Use these IDs to aim move orders and to decide where to trade.',
  code: {
    curl: `# discover the sites in a system
curl -s $BASE/systems/{{system_id}} -H "authorization: Bearer $TOKEN"

# remaining ore / current prices for one site
curl -s $BASE/sites/{{mine_site_id}} -H "authorization: Bearer $TOKEN"`,
    javascript: `const system = (await (await fetch(BASE + '/systems/{{system_id}}', {
  headers: { authorization: 'Bearer ' + TOKEN }
})).json()).data

for (const planet of system.planets) {
  for (const site of planet.sites) {
    // site.id, site.kind ('mine' | 'market'), site.name
  }
}`
  }
}

export const steps: GuideStep[] = [
  {
    id: 'auth',
    title: 'Authenticate',
    body:
      'Browser users sign up or log in through the app’s own auth proxy — Phoenix never mints tokens. Bots skip this entirely and use the api_key returned when the company is created. Send the credential as a bearer token on every request that follows.',
    code: {
      curl: `# register
curl -s -X POST $BASE/auth/signup \\
  -H 'content-type: application/json' \\
  -d '{"email":"pilot@example.com","password":"secret"}'

# …or log in
curl -s -X POST $BASE/auth/login \\
  -H 'content-type: application/json' \\
  -d '{"email":"pilot@example.com","password":"secret"}'`,
      javascript: `const res = await fetch(BASE + '/auth/signup', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'pilot@example.com', password: 'secret' })
})
const { data } = await res.json()
// data.access_token, data.refresh_token`
    },
    response: '{"data":{"access_token":"…","refresh_token":"…","user":{…}}}',
    notes: ['The access token is short-lived. Call POST /auth/refresh with the refresh token when it expires.']
  },
  {
    id: 'galaxy',
    title: 'Pick a home system',
    body:
      'The galaxy catalog is keyless: it lists every premade system, its coordinates and the lanes that connect it to its neighbours. Pick a key to use as your home system.',
    code: {
      curl: `curl -s $BASE/galaxy`,
      javascript: `const galaxy = (await (await fetch(BASE + '/galaxy')).json()).data
// [{ key: 'sol', name: 'Sol', x: 0, y: 0, lanes: ['vega', …] }, …]`
    },
    response: '{"data":[{"key":"sol","name":"Sol","x":0,"y":0,"lanes":["vega",…]},…]}'
  },
  {
    id: 'company',
    title: 'Create a company',
    body:
      'Pick a name and a home system. A JWT caller becomes the owner; the response returns an api_key exactly once — store it now, because only a hash is kept on the server. home_system is optional and defaults to sol.',
    code: {
      curl: `curl -s -X POST $BASE/companies \\
  -H "authorization: Bearer $TOKEN" \\
  -H 'content-type: application/json' \\
  -d '{"name":"Acme Interstellar","home_system":"{{home_system}}"}'`,
      javascript: `const res = await fetch(BASE + '/companies', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer ' + TOKEN },
  body: JSON.stringify({ name: 'Acme Interstellar', home_system: '{{home_system}}' })
})
const { data } = await res.json()
// data.company.id, data.api_key, data.api_key_id`
    },
    response:
      '{"data":{"company":{…,"home_system_id":"…"},"api_key":"kestrel_…","api_key_id":"…"}}',
    notes: ['POST /companies accepts an optional bearer token; a fresh bot can call it unauthenticated and use the returned api_key.']
  },
  {
    id: 'ship',
    title: 'Register a ship',
    body:
      'A new ship takes only a name. It spawns in the company’s home system, idle, with an empty hold.',
    code: {
      curl: `curl -s -X POST $BASE/companies/{{company_id}}/ships \\
  -H "authorization: Bearer $TOKEN" \\
  -H 'content-type: application/json' \\
  -d '{"name":"Hauler-1"}'`,
      javascript: `const res = await fetch(BASE + '/companies/{{company_id}}/ships', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer ' + TOKEN },
  body: JSON.stringify({ name: 'Hauler-1' })
})
const { data: ship } = await res.json()`
    }
  },
  {
    id: 'move',
    title: 'Move and travel',
    body:
      'A move order changes position inside the current system; a travel order hops exactly one lane to an adjacent system. Both are accepted with 202 and resolved asynchronously — the ship rejects a conflicting order with 409 while it is busy.',
    code: {
      curl: `# hop one lane to an adjacent system
curl -s -X POST $BASE/ships/{{ship_id}}/orders \\
  -H "authorization: Bearer $TOKEN" \\
  -H 'content-type: application/json' \\
  -d '{"type":"travel","to_system":"{{to_system}}"}'

# reposition within the system, e.g. to a site
curl -s -X POST $BASE/ships/{{ship_id}}/orders \\
  -H "authorization: Bearer $TOKEN" \\
  -H 'content-type: application/json' \\
  -d '{"type":"move","to_site_id":"{{mine_site_id}}"}'`,
      javascript: `// hop one lane to an adjacent system
await fetch(BASE + '/ships/{{ship_id}}/orders', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer ' + TOKEN },
  body: JSON.stringify({ type: 'travel', to_system: '{{to_system}}' })
})

// reposition within the system, e.g. to a site
await fetch(BASE + '/ships/{{ship_id}}/orders', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer ' + TOKEN },
  body: JSON.stringify({ type: 'move', to_site_id: '{{mine_site_id}}' })
})`
    },
    response: '{"data":{"order":{…},"eta_ticks":10,"topic":"ship:{{ship_id}}"}}'
  },
  {
    id: 'mine',
    title: 'Mine',
    body:
      'Mine the deposit at your current site. quantity is optional: without it the ship mines until its hold fills or the deposit runs dry; with it, the ship stops itself once that many units are in the hold.',
    code: {
      curl: `curl -s -X POST $BASE/ships/{{ship_id}}/orders \\
  -H "authorization: Bearer $TOKEN" \\
  -H 'content-type: application/json' \\
  -d '{"type":"mine","quantity":30}'`,
      javascript: `await fetch(BASE + '/ships/{{ship_id}}/orders', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer ' + TOKEN },
  body: JSON.stringify({ type: 'mine', quantity: 30 })
})`
    },
    response: '{"data":{"order":{"type":"mine","quantity":30,"mined":0,…},"eta_ticks":null,…}}',
    notes: ['The ship broadcasts order_complete "quota_met" once the quota is reached.']
  },
  {
    id: 'sell',
    title: 'Sell at a market',
    body:
      'Dock at a market site and sell cargo. Pass an idempotency_key so a retried request can never double-sell a hold — the key is remembered per company.',
    code: {
      curl: `curl -s -X POST $BASE/ships/{{ship_id}}/sell \\
  -H "authorization: Bearer $TOKEN" \\
  -H 'content-type: application/json' \\
  -d '{"commodity":"{{commodity}}","quantity":40,"idempotency_key":"sale-001"}'`,
      javascript: `await fetch(BASE + '/ships/{{ship_id}}/sell', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer ' + TOKEN },
  body: JSON.stringify({
    commodity: '{{commodity}}',
    quantity: 40,
    idempotency_key: 'sale-001'
  })
})`
    },
    response: '{"data":{"order":{"type":"sell","quantity":40,"proceeds":400,…},"eta_ticks":null,…}}'
  },
  {
    id: 'buy',
    title: 'Buy at a market',
    body:
      'Buying works the same way, in reverse: it debits the company ledger and fills the hold. It also takes an idempotency_key.',
    code: {
      curl: `curl -s -X POST $BASE/ships/{{ship_id}}/buy \\
  -H "authorization: Bearer $TOKEN" \\
  -H 'content-type: application/json' \\
  -d '{"commodity":"{{commodity}}","quantity":10,"idempotency_key":"buy-001"}'`,
      javascript: `await fetch(BASE + '/ships/{{ship_id}}/buy', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer ' + TOKEN },
  body: JSON.stringify({
    commodity: '{{commodity}}',
    quantity: 10,
    idempotency_key: 'buy-001'
  })
})`
    },
    response: '{"data":{"order":{"type":"buy","quantity":10,"cost":120,…},"eta_ticks":null,…}}'
  },
  {
    id: 'orders',
    title: 'Watch an order finish',
    body:
      'Orders run on the ship’s own tick. There is no server queue, so wait for the current order to clear before sending the next one. The WebSocket channel is still on the roadmap; until then, poll the ship — or subscribe to its PubSub topic server-side.',
    code: {
      curl: `# poll until "order" is null
curl -s $BASE/ships/{{ship_id}} -H "authorization: Bearer $TOKEN"`,
      javascript: `while (true) {
  const res = await fetch(BASE + '/ships/{{ship_id}}', {
    headers: { authorization: 'Bearer ' + TOKEN }
  })
  const { data: ship } = await res.json()
  if (!ship.order) break
  await new Promise((resolve) => setTimeout(resolve, 1000))
}`
    },
    notes: ['PubSub topics are ship:{id}, site:{id} and company:{id}.']
  }
]
