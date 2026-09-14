import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveGps, nearestCity, cityById, fetchCityWeather, DEFAULT_CITY_ID, devParams } from '../lib/bff.js'
import { catOf, dataState } from '../lib/model.js'

// Loads a CityWeather from the BFF contract and derives the view model.
// - GPS → nearest catalog city; no GPS → default city with a badge (no silent Seoul fallback)
// - refreshes itself at nextUpdateAt (+ on tab focus); never before
// - data state (fresh/stale/delayed/offline) is computed here and shown as a badge only (D4)
export function useWeather(initialCityId) {
  const [cityId, setCityId] = useState(initialCityId || null)
  const [raw, setRaw] = useState(null)
  const [status, setStatus] = useState('locating') // locating | loading | ready | error
  const [locKind, setLocKind] = useState('gps')    // gps | default | picked
  const timer = useRef(null)

  const load = useCallback(async (id) => {
    let target = id || cityId
    try {
      if (!target && devParams().city && cityById(devParams().city)) { target = devParams().city; setLocKind('picked'); setCityId(target) }
      if (!target) {
        setStatus('locating')
        const g = await resolveGps()
        const n = g && nearestCity(g.lat, g.lon)
        if (n) { target = n.city.id; setLocKind('gps') } else { target = DEFAULT_CITY_ID; setLocKind('default') }
        setCityId(target)
      }
      setStatus('loading')
      const cw = await fetchCityWeather(target)
      setRaw(cw)
      setStatus('ready')
      schedule(cw)
    } catch (e) {
      // keep last good data on failure; only error when we have nothing
      setStatus(raw ? 'ready' : 'error')
    }
  }, [cityId, raw])

  function schedule(cw) {
    if (timer.current) clearTimeout(timer.current)
    const wait = Math.max(60 * 1000, Date.parse(cw.nextUpdateAt) - Date.now() + 5000)
    timer.current = setTimeout(() => load(cw.cityId), wait)
  }

  useEffect(() => { load(); return () => timer.current && clearTimeout(timer.current) }, []) // eslint-disable-line
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible' && raw && Date.now() > Date.parse(raw.nextUpdateAt)) load(raw.cityId) }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [raw, load])

  const pick = useCallback((id) => { setLocKind('picked'); setCityId(id); load(id) }, [load])

  const model = raw ? toModel(raw, locKind) : null
  return { model, status, load: () => load(cityId), pick, cityId }
}

function toModel(cw, locKind) {
  const city = cityById(cw.cityId)
  const c = cw.current
  const online = typeof navigator === 'undefined' ? true : navigator.onLine
  let state = dataState(cw, Date.now(), online)
  const badges = []
  if (state !== 'fresh') badges.push(state)
  if (cw.source === 'open-meteo-fallback') badges.push('fallback')
  if (locKind === 'default') badges.push('defaultCity')
  return {
    tempC: c.tempC, feelsC: c.feelsC, wx: c.wx, isDay: c.isDay,
    offset: cw.utcOffsetSec, curTime: c.time,
    sunrise: cw.sun.sunrise, sunset: cw.sun.sunset,
    wind: c.windMs, windDir: c.windDeg, hum: c.humidity, pop: c.pop,
    marine: cw.marine, airQuality: cw.airQuality,
    wave: cw.marine && cw.marine.kind !== 'unavailable' ? cw.marine.waveM : null,
    hourly: cw.hourly || [],
    daily: (cw.daily || []).map((d) => ({ date: d.date, cat: catOf(d.wx), hi: d.hi, lo: d.lo, pop: d.pop })),
    names: city ? { ko: { n1: city.name.ko, n2: city.countryName.ko }, en: { n1: city.name.en, n2: city.countryName.en } } : null,
    code: city ? `${utcLabel(cw.utcOffsetSec)} · ${city.lat.toFixed(2)}, ${city.lon.toFixed(2)}` : '',
    cityId: cw.cityId, source: cw.source, updatedAt: cw.updatedAt, nextUpdateAt: cw.nextUpdateAt, state, badges, locKind,
  }
}

// "UTC+9" / "UTC-4:30" — 좌표 문자열의 시간대 접두어 (P-09)
function utcLabel(sec) {
  const s = sec || 0, sign = s < 0 ? '-' : '+', a = Math.abs(s), h = Math.floor(a / 3600), m = Math.round((a % 3600) / 60)
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`
}
