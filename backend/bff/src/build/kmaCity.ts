// 기상청 초단기실황·초단기예보·단기예보·중기예보 + 에어코리아 + 천문연 -> CityWeather.
//
// 계층:
//   current  = 초단기실황(기온·PTY·RN1·습도·바람) + 초단기예보 첫 시각(SKY·LGT·POP)
//   hourly   = 단기예보 24칸, 겹치는 앞부분은 더 최신인 초단기예보로 덮어쓴다
//   daily    = 단기예보(오늘~+3) + 중기예보(그 이후)
import { fromKma, fromMidTermWf, type WeatherComposition } from '@colorsense/core'
import type { City } from '../catalog.js'
import type { CityWeather } from '../contract.js'
import type { AirResult } from '../sources/airkorea.js'
import type { Sun } from '../sources/astro.js'
import type { FcstItem, MidLand, MidTa } from '../sources/kmaApi.js'
import { SourceError } from '../sources/http.js'
import { KST_OFFSET_SEC, kmaSlotMs, kstParts, localIso, midTmFc, ncstBase, nextKmaUpdateMs, ymd } from '../time.js'
import { dailyWx, feelsLike, round1 } from './common.js'

type Slot = { date: string; time: string; ms: number; v: Record<string, string> }

function slots(items: FcstItem[]): Map<string, Slot> {
  const map = new Map<string, Slot>()
  for (const it of items) {
    const key = `${it.fcstDate}${it.fcstTime}`
    let slot = map.get(key)
    if (!slot) {
      slot = { date: it.fcstDate, time: it.fcstTime, ms: kmaSlotMs(it.fcstDate, it.fcstTime), v: {} }
      map.set(key, slot)
    }
    slot.v[it.category] = it.fcstValue
  }
  return map
}

const numOrNull = (v: string | undefined) => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function daysBetween(a: string, b: string): number {
  const at = Date.UTC(+a.slice(0, 4), +a.slice(4, 6) - 1, +a.slice(6, 8))
  const bt = Date.UTC(+b.slice(0, 4), +b.slice(4, 6) - 1, +b.slice(6, 8))
  return Math.round((bt - at) / 86400e3)
}

function wxOf(v: Record<string, string>, pm10Grade: number | null = null): WeatherComposition {
  return fromKma({
    SKY: v.SKY ?? null,
    PTY: v.PTY ?? null,
    PCP: v.PCP ?? null,
    SNO: v.SNO ?? null,
    RN1: v.RN1 ?? null,
    LGT: v.LGT ?? null,
    pm10Grade,
  })
}

export interface KmaInput {
  ncst: Record<string, string>
  ultra: FcstItem[]
  vilage: FcstItem[]
  midLand?: MidLand
  midTa?: MidTa
  air: AirResult
  sun: Sun
}

export function buildFromKma(city: City, input: KmaInput, nowMs: number): CityWeather {
  const { ncst, ultra, vilage, midLand, midTa, air, sun } = input
  const tempC = numOrNull(ncst.T1H)
  if (tempC == null) throw new SourceError('kma', '초단기실황에 기온(T1H) 없음')

  const ultraSlots = [...slots(ultra).values()].sort((a, b) => a.ms - b.ms)
  const vilageSlots = [...slots(vilage).values()].sort((a, b) => a.ms - b.ms)
  const head = ultraSlots[0]?.v ?? {}

  const humidity = numOrNull(ncst.REH)
  const windMs = numOrNull(ncst.WSD)
  const observedBase = ncstBase(nowMs)
  const observedMs = kmaSlotMs(observedBase.base_date, observedBase.base_time)
  const current = {
    time: localIso(observedMs, KST_OFFSET_SEC),
    tempC: round1(tempC),
    feelsC: feelsLike(tempC, windMs, humidity),
    isDay: isDayAt(nowMs, sun) as 0 | 1,
    wx: wxOf({ ...ncst, SKY: head.SKY ?? '', LGT: head.LGT ?? '' }, air.pm10Grade),
    humidity,
    windMs: windMs == null ? null : round1(windMs),
    windDeg: numOrNull(ncst.VEC),
    pop: numOrNull(head.POP),
  }

  // 단기예보 24칸에, 겹치는 구간은 초단기예보 값을 덮어쓴다.
  const ultraByKey = new Map(ultraSlots.map((s) => [`${s.date}${s.time}`, s]))
  const future = vilageSlots.filter((s) => s.ms > nowMs - 3600e3)
  const hourly = future.slice(0, 24).map((s) => {
    const fresh = ultraByKey.get(`${s.date}${s.time}`)
    const v = fresh ? { ...s.v, ...fresh.v } : s.v
    const t = numOrNull(v.TMP) ?? numOrNull(v.T1H)
    return {
      time: localIso(s.ms, KST_OFFSET_SEC),
      tempC: t == null ? round1(tempC) : round1(t),
      pop: numOrNull(v.POP),
      wx: wxOf(v),
    }
  })
  if (hourly.length < 24) throw new SourceError('kma', `단기예보 시간이 ${hourly.length}칸뿐`)

  const daily = buildDaily(vilageSlots, midLand, midTa, nowMs)
  if (daily.length < 7) throw new SourceError('kma', `일별 예보가 ${daily.length}일뿐`)

  return {
    cityId: city.id,
    source: 'kma',
    updatedAt: localIso(observedMs, KST_OFFSET_SEC),
    nextUpdateAt: localIso(nextKmaUpdateMs(nowMs), KST_OFFSET_SEC),
    tz: city.tz,
    utcOffsetSec: KST_OFFSET_SEC,
    current,
    hourly,
    daily,
    sun,
    airQuality: air.airQuality,
    marine: { kind: 'unavailable' },
  }
}

function isDayAt(nowMs: number, sun: Sun): number {
  if (sun.sunrise && sun.sunset) {
    const t = nowMs
    return t >= Date.parse(sun.sunrise) && t < Date.parse(sun.sunset) ? 1 : 0
  }
  const h = kstParts(nowMs).h
  return h >= 6 && h < 19 ? 1 : 0
}

function buildDaily(vilageSlots: Slot[], midLand: MidLand | undefined, midTa: MidTa | undefined, nowMs: number) {
  const today = kstParts(nowMs)
  const dates = Array.from({ length: 7 }, (_, i) => ymd(kstParts(nowMs + i * 86400e3)))
  const tmFcDate = midTmFc(nowMs).slice(0, 8)
  const byDate = new Map<string, Slot[]>()
  for (const s of vilageSlots) {
    const arr = byDate.get(s.date)
    if (arr) arr.push(s)
    else byDate.set(s.date, [s])
  }

  const out: CityWeather['daily'] = []
  for (const date of dates) {
    const daySlots = byDate.get(date) ?? []
    const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
    const temps = daySlots.map((s) => numOrNull(s.v.TMP)).filter((n): n is number => n != null)
    // 단기예보가 그 날을 충분히 덮을 때만 쓴다(오늘은 이미 지난 시간대가 빠져 있어도 그대로 쓴다)
    if (temps.length >= (date === ymd(today) ? 1 : 6)) {
      const tmx = daySlots.map((s) => numOrNull(s.v.TMX)).find((n) => n != null)
      const tmn = daySlots.map((s) => numOrNull(s.v.TMN)).find((n) => n != null)
      const pops = daySlots.map((s) => numOrNull(s.v.POP)).filter((n): n is number => n != null)
      const wx = dailyWx(daySlots.map((s) => ({ wx: wxOf(s.v), hour: Number(s.time.slice(0, 2)) })))
      if (wx) {
        out.push({
          date: iso,
          hi: Math.round(tmx ?? Math.max(...temps)),
          lo: Math.round(tmn ?? Math.min(...temps)),
          pop: pops.length ? Math.max(...pops) : null,
          wx,
        })
        continue
      }
    }
    const mid = midDay(daysBetween(tmFcDate, date), midLand, midTa)
    if (mid) out.push({ date: iso, ...mid })
  }
  return out
}

function midDay(n: number, midLand: MidLand | undefined, midTa: MidTa | undefined) {
  if (n < 3 || n > 10 || !midTa) return undefined
  const hi = Number(midTa[`taMax${n}`]), lo = Number(midTa[`taMin${n}`])
  if (!Number.isFinite(hi) || !Number.isFinite(lo)) return undefined
  const am = midLand?.[`wf${n}Am`] as string | undefined
  const pm = midLand?.[`wf${n}Pm`] as string | undefined
  const single = midLand?.[`wf${n}`] as string | undefined
  const wfAm = am ?? single
  const wfPm = pm ?? single
  // 낮을 대표로 삼되, 오전에만 비가 오면 그쪽을 쓴다
  const amWx = wfAm ? fromMidTermWf(wfAm) : undefined
  const pmWx = wfPm ? fromMidTermWf(wfPm) : undefined
  const wx = pmWx?.precip !== 'none' ? pmWx : amWx?.precip !== 'none' ? amWx : (pmWx ?? amWx)
  if (!wx) return undefined
  const rn = [midLand?.[`rnSt${n}Am`], midLand?.[`rnSt${n}Pm`], midLand?.[`rnSt${n}`]]
    .map((v) => (v == null ? null : Number(v)))
    .filter((v): v is number => v != null && Number.isFinite(v))
  return { hi: Math.round(hi), lo: Math.round(lo), pop: rn.length ? Math.max(...rn) : null, wx }
}
