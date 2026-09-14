// BFF 클라이언트. 계약: backend/api-contract.md
//
// BFF가 배포되기 전까지는 VITE_BFF_URL 이 비어 있으면 로컬 어댑터가 Open-Meteo 무료 티어를 직접 호출해
// 같은 CityWeather 형태를 만들어 준다(개발용 · 비상업). 배포 시 어댑터 경로는 제거된다.
import catalog from '../../../database/catalog.json'
import { fromWmo, dustFromOpenMeteo } from './model.js'

const BFF = (import.meta.env && import.meta.env.VITE_BFF_URL) || ''

export function getCatalog() { return catalog }

export function nearestCity(lat, lon) {
  let best = null, bestD = Infinity
  for (const c of catalog.cities) {
    const d = haversineKm(lat, lon, c.lat, c.lon)
    if (d < bestD) { bestD = d; best = c }
  }
  const limit = best && best.country === 'KR' ? 50 : 150
  return best && bestD <= limit ? { city: best, distanceKm: bestD } : null
}

export function cityById(id) { return catalog.cities.find((c) => c.id === id) || null }
export const DEFAULT_CITY_ID = 'KR-SEL'

// 개발용 URL 파라미터: ?city=KR-PUS (도시 강제) · ?scenario=stale|delayed|fallback|error|slow (모의 BFF 시나리오)
export function devParams() {
  try { const q = new URLSearchParams(location.search); return { city: q.get('city'), scenario: q.get('scenario') } } catch (e) { return {} }
}

export async function fetchCityWeather(cityId) {
  if (BFF) {
    const { scenario } = devParams()
    return jget(`${BFF}/v1/weather/${encodeURIComponent(cityId)}${scenario ? `?scenario=${encodeURIComponent(scenario)}` : ''}`)
  }
  return localAdapter(cityById(cityId))
}

// ---------- local adapter (Open-Meteo, dev only) ----------
async function localAdapter(city) {
  if (!city) throw new Error('unknown city')
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m,wind_speed_10m,wind_direction_10m` +
    `&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max` +
    `&wind_speed_unit=ms&timezone=${encodeURIComponent(city.tz)}&forecast_days=7&forecast_hours=24`
  const w = await jget(u)
  let aq = { kind: 'unavailable' }, dust = 0
  try {
    const a = await jget(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=pm10,pm2_5,dust&timezone=${encodeURIComponent(city.tz)}`)
    const cur = (a && a.current) || {}
    dust = dustFromOpenMeteo({ pm10: cur.pm10, dust: cur.dust })
    aq = { kind: 'forecast', pm10: cur.pm10 ?? null, pm25: cur.pm2_5 ?? null, grade: dust ? 3 : 2 }
  } catch (e) { /* unavailable stays */ }

  const curTime = w.current.time
  const hourly = (w.hourly.time || []).map((t, i) => ({
    time: t, tempC: w.hourly.temperature_2m[i], pop: w.hourly.precipitation_probability[i], wx: fromWmo(w.hourly.weather_code[i], 0),
  }))
  const key = curTime.slice(0, 13)
  const hIdx = Math.max(0, hourly.findIndex((h) => h.time.slice(0, 13) === key))
  const daily = (w.daily.time || []).map((d, i) => ({
    date: d, hi: w.daily.temperature_2m_max[i], lo: w.daily.temperature_2m_min[i], pop: w.daily.precipitation_probability_max[i], wx: fromWmo(w.daily.weather_code[i], 0),
  }))
  const now = Date.now()
  return {
    cityId: city.id, source: 'open-meteo', updatedAt: new Date(now).toISOString(), nextUpdateAt: new Date(now + 30 * 60 * 1000).toISOString(),
    tz: city.tz, utcOffsetSec: w.utc_offset_seconds || 0,
    current: {
      time: curTime, tempC: w.current.temperature_2m, feelsC: w.current.apparent_temperature, isDay: w.current.is_day,
      wx: fromWmo(w.current.weather_code, dust), humidity: w.current.relative_humidity_2m,
      windMs: w.current.wind_speed_10m, windDeg: w.current.wind_direction_10m,
      pop: hourly[hIdx] ? hourly[hIdx].pop : (daily[0] ? daily[0].pop : null),
    },
    hourly, daily,
    sun: { sunrise: w.daily.sunrise[0], sunset: w.daily.sunset[0] },
    airQuality: aq,
    marine: { kind: 'unavailable' }, // 2차
  }
}

async function jget(u) {
  const r = await fetch(u, { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error(r.status)
  return r.json()
}

function haversineKm(a1, o1, a2, o2) {
  const R = 6371, d2r = Math.PI / 180
  const dA = (a2 - a1) * d2r, dO = (o2 - o1) * d2r
  const h = Math.sin(dA / 2) ** 2 + Math.cos(a1 * d2r) * Math.cos(a2 * d2r) * Math.sin(dO / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// GPS only. 실패 시 null — 호출자가 기본 도시로 처리하고 배지를 붙인다 (서울 조용한 폴백 금지).
export function resolveGps() {
  return new Promise((res) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return res(null)
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => res(null),
      { timeout: 8000, maximumAge: 600000, enableHighAccuracy: false },
    )
  })
}
