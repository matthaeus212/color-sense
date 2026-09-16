// 도시 카탈로그. 백엔드가 소유하는 버전 관리 데이터(database/catalog.json)를 그대로 내려준다.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export interface City {
  id: string
  country: string
  name: { ko: string; en: string }
  countryName: { ko: string; en: string }
  lat: number
  lon: number
  tz: string
  coastal: boolean
  source: 'kma' | 'open-meteo'
  kma?: { nx: number; ny: number; regLand: string; regTemp: string; airStation: string; verify?: boolean }
}

export interface Catalog {
  version: number
  updatedAt: string
  note?: string
  cities: City[]
}

// src/ 와 dist/ 가 backend/bff 아래 같은 깊이라 두 경우 모두 이 경로로 맞는다.
const defaultPath = new URL('../../../database/catalog.json', import.meta.url)

const path = process.env.CATALOG_PATH ? new URL(`file://${process.env.CATALOG_PATH}`) : defaultPath
const raw = readFileSync(path, 'utf8')

export const catalog: Catalog = JSON.parse(raw)
export const catalogEtag = `W/"catalog-${catalog.version}-${createHash('sha1').update(raw).digest('hex').slice(0, 12)}"`

const byId = new Map(catalog.cities.map((c) => [c.id, c]))
export const cityById = (id: string): City | undefined => byId.get(id)
