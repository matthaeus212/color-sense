// Open-Meteo 응답 -> CityWeather. 해외 도시의 기본 경로이자 기상청 폴백 경로.
import { dustFromOpenMeteo, fromWmo } from '@colorsense/core'
import type { City } from '../catalog.js'
import type { CityWeather } from '../contract.js'
import type { OpenMeteoAir, OpenMeteoForecast } from '../sources/openMeteo.js'
import { pm10Grade, round1, withOffset } from './common.js'
import { localIso } from '../time.js'

// 해외는 수요 기반 캐시라 30분 주기로 갱신한다(api-contract.md §4).
const REFRESH_MS = 30 * 60e3

export function buildFromOpenMeteo(
  city: City,
  fc: OpenMeteoForecast,
  air: OpenMeteoAir | null,
  nowMs: number,
  source: 'open-meteo' | 'open-meteo-fallback',
): CityWeather {
  const off = fc.utc_offset_seconds
  const dust = air ? dustFromOpenMeteo({ pm10: air.pm10, dust: air.dust }) : 0

  const startIdx = Math.max(0, fc.hourly.time.findIndex((t) => t.slice(0, 13) === fc.current.time.slice(0, 13)))
  const hourly = fc.hourly.time.slice(startIdx, startIdx + 24).map((t, i) => ({
    time: withOffset(t, off),
    tempC: round1(fc.hourly.temperature_2m[startIdx + i]),
    pop: fc.hourly.precipitation_probability[startIdx + i] ?? null,
    wx: fromWmo(fc.hourly.weather_code[startIdx + i]),
  }))

  const daily = fc.daily.time.slice(0, 7).map((date, i) => ({
    date,
    hi: Math.round(fc.daily.temperature_2m_max[i]),
    lo: Math.round(fc.daily.temperature_2m_min[i]),
    pop: fc.daily.precipitation_probability_max[i] ?? null,
    wx: fromWmo(fc.daily.weather_code[i]),
  }))

  return {
    cityId: city.id,
    source,
    updatedAt: withOffset(fc.current.time, off),
    nextUpdateAt: localIso(nowMs + REFRESH_MS, off),
    tz: city.tz,
    utcOffsetSec: off,
    current: {
      time: withOffset(fc.current.time, off),
      tempC: round1(fc.current.temperature_2m),
      feelsC: round1(fc.current.apparent_temperature),
      isDay: fc.current.is_day ? 1 : 0,
      wx: fromWmo(fc.current.weather_code, dust),
      humidity: fc.current.relative_humidity_2m ?? null,
      windMs: round1(fc.current.wind_speed_10m),
      windDeg: fc.current.wind_direction_10m ?? null,
      pop: hourly[0]?.pop ?? null,
    },
    hourly,
    daily,
    sun: {
      sunrise: fc.daily.sunrise[0] ? withOffset(fc.daily.sunrise[0], off) : null,
      sunset: fc.daily.sunset[0] ? withOffset(fc.daily.sunset[0], off) : null,
    },
    airQuality: air ? { kind: 'forecast', pm10: air.pm10, pm25: air.pm25, grade: pm10Grade(air.pm10) } : { kind: 'unavailable' },
    // 파도는 2차 범위(D5). 해안 도시라도 지금은 내려주지 않는다.
    marine: { kind: 'unavailable' },
  }
}
