export interface GalaxySystem {
  key: string
  name: string
  x: number
  y: number
  system_id: string | null
  lanes: string[]
}

export interface Company {
  id: string
  name: string
  credits: number
  owner_sub: string | null
  home_system_id: string | null
}

export interface ApiKey {
  id: string
  company_id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  revoked_at: string | null
  inserted_at: string
}

export type OrderType = 'move' | 'travel' | 'mine' | 'sell' | 'buy'

export interface Order {
  type: OrderType
  to_site_id?: string
  to_system?: string
  site_id?: string
  ticks_left?: number
  quantity?: number
  mined?: number
  commodity?: string
  unit_price?: number
  proceeds?: number
  cost?: number
}

export interface Ship {
  id: string
  name: string
  company_id: string
  system_id: string | null
  docked_site_id: string | null
  hull: number | null
  cargo: Record<string, number>
  order: Order | null
  pos_x: number | null
  pos_y: number | null
  topic: string
}

export interface Site {
  id: string
  name: string
  kind: 'mine' | 'market'
  ore: Record<string, number>
  prices: Record<string, { buy: number; sell: number }>
  mining_ships: string[]
  topic: string
}

export interface ObserverShip {
  id: string
  name: string
  company: string
  system_id: string
  system: string
  x: number
  y: number
  docked_site_id: string | null
  hull: number | null
  cargo: Record<string, number>
  order: Order | null
  pos_x: number | null
  pos_y: number | null
}

export interface ObserverSite {
  id: string
  name: string
  kind: 'mine' | 'market'
  planet: string | null
  planet_pos: number | null
  system: string | null
  x: number | null
  y: number | null
  ore: Record<string, number>
  prices: Record<string, { buy: number; sell: number }>
  mining_ships: string[]
}

export interface ObserverEvent {
  id: string
  kind: string
  at: string
  company: string | null
  ship: string | null
  site: string | null
  payload: Record<string, unknown>
}

export interface Session {
  access_token: string
  refresh_token: string
  token_type?: string
  expires_in?: number
  expires_at?: number
  user?: Record<string, unknown>
}

export interface Me {
  auth: { type: 'api_key' | 'jwt'; sub: string | null }
  company: Company | null
  api_keys: ApiKey[]
}

export interface Planet {
  id: string
  name: string
  kind: string
  position: number
  sites: { id: string; kind: string; name: string }[]
}

export interface SystemDetail {
  id: string
  x: number
  y: number
  name: string
  type: string
  planets: Planet[]
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}
