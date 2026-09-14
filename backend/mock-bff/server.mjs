// 로컬 테스트용 모의 BFF. 실제 계약(backend/api-contract.md §3)과 같은 형태의 CityWeather 를 키 없이 돌려준다.
//   node backend/mock-bff/server.mjs            → http://localhost:8787
//   GET /v1/catalog
//   GET /v1/weather/KR-SEL?scenario=stale|delayed|fallback|error|slow
//   GET /v1/weather?ids=KR-SEL,JP-TYO
// 한국 도시는 기상청 형태의 원본 필드를 만들어 kma.js 로, 해외 도시는 WMO 코드를 model.js 로 정규화한다.
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fromKma } from '../../frontend/src/lib/kma.js'
import { fromWmo, catOf } from '../../frontend/src/lib/model.js'

const PORT = Number(process.env.PORT || 8787)
const catalog = JSON.parse(readFileSync(new URL('../../database/catalog.json', import.meta.url)))

// 도시 id 로 결정되는 고정 시나리오(데모가 매번 같도록)
const seed = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const KMA_SCENES = [
  { SKY: 1, PTY: 0 }, { SKY: 3, PTY: 0 }, { SKY: 4, PTY: 0 }, { SKY: 4, PTY: 1, PCP: '3.0' }, { SKY: 3, PTY: 4, PCP: '8.0' },
  { SKY: 4, PTY: 3, SNO: '2.0' }, { SKY: 4, PTY: 0, VIS: 500 }, { SKY: 4, PTY: 1, PCP: '20.0', LGT: 1 }, { SKY: 3, PTY: 0, pm10Grade: 3 }, { SKY: 3, PTY: 0, yellowDust: true },
]
const WMO_SCENES = [0, 1, 2, 3, 45, 61, 80, 71, 95, 3]
const TEMP_BY_LAT = (lat, i) => Math.round((34 - Math.abs(lat) * 0.4 + (i % 5) * 1.2) * 10) / 10

function pad(n) { return String(n).padStart(2, '0') }
function localIso(ms, offsetSec) {
  const d = new Date(ms + offsetSec * 1000)
  const s = offsetSec >= 0 ? '+' : '-', a = Math.abs(offsetSec)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00${s}${pad(a / 3600 | 0)}:${pad((a % 3600) / 60)}`
}
function offsetFor(tz, ms) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName').value
  const m = f.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/); if (!m) return 0
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 3600 + Number(m[3] || 0) * 60)
}

function build(city, scenario) {
  const now = Date.now(), off = offsetFor(city.tz, now), i = seed(city.id) % 10
  const kr = city.source === 'kma'
  const cur = kr ? fromKma({ ...KMA_SCENES[i], RN1: KMA_SCENES[i].PCP ? Number(KMA_SCENES[i].PCP) : undefined }) : fromWmo(WMO_SCENES[i], i === 8 ? 1 : 0)
  const localHour = new Date(now + off * 1000).getUTCHours()
  const isDay = localHour >= 6 && localHour < 19 ? 1 : 0
  const base = TEMP_BY_LAT(city.lat, i)
  const hourly = Array.from({ length: 24 }, (_, h) => {
    const t = now + h * 3600e3, lh = (localHour + h) % 24
    const diurnal = -3 * Math.cos(((lh - 14) / 24) * 2 * Math.PI)
    const code = h < 4 ? cur : (kr ? fromKma(KMA_SCENES[(i + (h >> 2)) % 10]) : fromWmo(WMO_SCENES[(i + (h >> 2)) % 10]))
    return { time: localIso(t, off), tempC: Math.round((base + diurnal) * 10) / 10, pop: code.precip !== 'none' ? 60 + (h % 3) * 10 : (h * 7) % 30, wx: code }
  })
  const daily = Array.from({ length: 7 }, (_, d) => {
    const w = kr ? fromKma(KMA_SCENES[(i + d) % 10]) : fromWmo(WMO_SCENES[(i + d) % 10])
    return { date: localIso(now + d * 86400e3, off).slice(0, 10), hi: Math.round(base + 4 - (d % 3)), lo: Math.round(base - 5 + (d % 2)), pop: w.precip !== 'none' ? 70 : 10, wx: w }
  })
  const day0 = localIso(now, off).slice(0, 10)
  let updatedAt = now - 5 * 60e3, nextUpdateAt = now + 25 * 60e3, source = kr ? 'kma' : 'open-meteo'
  if (scenario === 'stale') { updatedAt = now - 70 * 60e3; nextUpdateAt = now - 40 * 60e3 }
  if (scenario === 'delayed') { updatedAt = now - 4 * 3600e3; nextUpdateAt = now - 3.5 * 3600e3 }
  if (scenario === 'fallback') source = 'open-meteo-fallback'
  return {
    cityId: city.id, source, updatedAt: new Date(updatedAt).toISOString(), nextUpdateAt: new Date(nextUpdateAt).toISOString(),
    tz: city.tz, utcOffsetSec: off,
    current: { time: localIso(now, off), tempC: base, feelsC: Math.round((base + (cur.precip !== 'none' ? -1.5 : 1.2)) * 10) / 10, isDay, wx: cur, humidity: 55 + i * 3, windMs: 1 + i * 0.6, windDeg: (i * 47) % 360, pop: hourly[0].pop },
    hourly, daily,
    sun: { sunrise: `${day0}T06:12:00`, sunset: `${day0}T18:40:00` },
    airQuality: kr ? { kind: 'observed', pm10: 20 + i * 8, pm25: 10 + i * 4, grade: cur.dust ? 3 : 2 } : { kind: 'forecast', pm10: 15 + i * 6, pm25: 8 + i * 3, grade: 2 },
    marine: city.coastal ? { kind: 'observed', waveM: Math.round((0.3 + i * 0.15) * 10) / 10 } : { kind: 'unavailable' },
  }
}

const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)) }
createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), scenario = u.searchParams.get('scenario') || ''
  if (req.method === 'OPTIONS') return json(res, 204, {})
  if (scenario === 'slow') await new Promise((r) => setTimeout(r, 3000))
  if (scenario === 'error') return json(res, 500, { error: 'mock failure' })
  if (u.pathname === '/v1/catalog') return json(res, 200, catalog)
  let m = u.pathname.match(/^\/v1\/weather\/([A-Z]{2}-[A-Z]{3})$/)
  if (m) { const c = catalog.cities.find((x) => x.id === m[1]); return c ? json(res, 200, build(c, scenario)) : json(res, 404, { error: 'unknown city' }) }
  if (u.pathname === '/v1/weather' && u.searchParams.get('ids')) {
    const ids = u.searchParams.get('ids').split(',').slice(0, 11)
    return json(res, 200, ids.map((id) => catalog.cities.find((x) => x.id === id)).filter(Boolean).map((c) => build(c, scenario)))
  }
  json(res, 404, { error: 'not found', routes: ['/v1/catalog', '/v1/weather/{cityId}?scenario=stale|delayed|fallback|error|slow', '/v1/weather?ids='] })
}).listen(PORT, () => console.log(`mock BFF  http://localhost:${PORT}/v1/weather/KR-SEL  (scenario=stale|delayed|fallback|error|slow)`))
