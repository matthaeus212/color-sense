// 도시 하나의 CityWeather 를 만드는 오케스트레이션: 캐시 -> 소스 호출 -> 폴백 -> 계약 검증.
import type { City } from './catalog.js'
import { cityById } from './catalog.js'
import { cityWeatherSchema, type CityWeather } from './contract.js'
import { TtlCache } from './cache.js'
import { buildFromKma } from './build/kmaCity.js'
import { buildFromOpenMeteo } from './build/openMeteoCity.js'
import { airKorea, unavailableAir } from './sources/airkorea.js'
import { riseSet, unavailableSun } from './sources/astro.js'
import * as kma from './sources/kmaApi.js'
import * as openMeteo from './sources/openMeteo.js'

const cache = new TtlCache<CityWeather>()

export class UnknownCityError extends Error {}

export async function getCityWeather(cityId: string, nowMs = Date.now()): Promise<CityWeather> {
  const city = cityById(cityId)
  if (!city) throw new UnknownCityError(cityId)

  const cached = cache.get(cityId, nowMs)
  if (cached) return cached

  const weather = city.source === 'kma' ? await fromKmaWithFallback(city, nowMs) : await fromOpenMeteo(city, nowMs, 'open-meteo')
  const parsed = cityWeatherSchema.parse(weather)
  cache.set(cityId, parsed, Date.parse(parsed.nextUpdateAt))
  return parsed
}

async function fromKmaWithFallback(city: City, nowMs: number): Promise<CityWeather> {
  try {
    return await fromKma(city, nowMs)
  } catch (error) {
    console.warn(`[fallback] ${city.id} kma 실패 -> open-meteo:`, error instanceof Error ? error.message : error)
    return fromOpenMeteo(city, nowMs, 'open-meteo-fallback')
  }
}

async function fromKma(city: City, nowMs: number): Promise<CityWeather> {
  const k = city.kma
  if (!k) throw new Error(`${city.id}: source=kma 인데 kma 격자 정보가 없다`)

  // 대기질·일출은 없어도 날씨는 성립하므로 실패해도 진행한다(각 소스가 스스로 기본값을 돌려준다).
  const [ncst, ultra, vilage, midLand, midTa, air, sun] = await Promise.all([
    kma.ultraSrtNcst(k.nx, k.ny, nowMs),
    kma.ultraSrtFcst(k.nx, k.ny, nowMs),
    kma.vilageFcst(k.nx, k.ny, nowMs),
    kma.midLandFcst(k.regLand, nowMs).catch(() => undefined),
    kma.midTaFcst(k.regTemp, nowMs).catch(() => undefined),
    airKorea(k.airStation).catch(() => unavailableAir),
    riseSet(city.name.ko, nowMs).catch(() => unavailableSun),
  ])

  return buildFromKma(city, { ncst, ultra, vilage, midLand, midTa, air, sun }, nowMs)
}

async function fromOpenMeteo(city: City, nowMs: number, source: 'open-meteo' | 'open-meteo-fallback'): Promise<CityWeather> {
  const [fc, air] = await Promise.all([
    openMeteo.forecast(city.lat, city.lon),
    openMeteo.airQuality(city.lat, city.lon),
  ])
  return buildFromOpenMeteo(city, fc, air, nowMs, source)
}

export const cacheSize = () => cache.size
