// Hono 라우트. 계약은 backend/api-contract.md §3.
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { config } from './config.js'
import { catalog, catalogEtag } from './catalog.js'
import { getCityWeather, UnknownCityError } from './service.js'

// 즐겨찾기 상한 10개 + 현재 도시 1개
const MAX_IDS = 11
const CITY_ID = /^[A-Z]{2}-[A-Z]{3}$/

export const app = new Hono()

app.use('*', cors({ origin: config.corsOrigin }))

app.get('/health', (c) => c.json({ ok: true, catalogVersion: catalog.version, cities: catalog.cities.length }))

app.get('/v1/catalog', (c) => {
  if (c.req.header('if-none-match') === catalogEtag) return c.body(null, 304)
  c.header('ETag', catalogEtag)
  c.header('Cache-Control', 'public, max-age=3600')
  return c.json(catalog)
})

app.get('/v1/weather', async (c) => {
  const raw = c.req.query('ids')
  if (!raw) return c.json({ error: 'ids 쿼리가 필요하다' }, 400)
  const ids = [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, MAX_IDS)
  if (ids.some((id) => !CITY_ID.test(id))) return c.json({ error: '도시 id 형식이 아니다' }, 400)

  const results = await Promise.allSettled(ids.map((id) => getCityWeather(id)))
  const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
  // 일부 도시가 실패해도 나머지는 내려준다 — 즐겨찾기 하나 때문에 목록 전체가 비면 안 된다.
  return c.json(ok)
})

app.get('/v1/weather/:cityId', async (c) => {
  const cityId = c.req.param('cityId')
  if (!CITY_ID.test(cityId)) return c.json({ error: '도시 id 형식이 아니다' }, 400)
  try {
    const weather = await getCityWeather(cityId)
    c.header('Cache-Control', 'no-store')
    return c.json(weather)
  } catch (error) {
    if (error instanceof UnknownCityError) return c.json({ error: 'unknown city' }, 404)
    console.error(`[error] ${cityId}:`, error)
    return c.json({ error: 'weather unavailable' }, 502)
  }
})

app.notFound((c) => c.json({ error: 'not found', routes: ['/v1/catalog', '/v1/weather/{cityId}', '/v1/weather?ids='] }, 404))
