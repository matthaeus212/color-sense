// Open-Meteo — 해외 도시의 기본 소스이자 기상청 장애 시 한국의 폴백.
// 무료 티어(비상업)라 키가 없다. 대기질은 CAMS 모델 예측값이므로 airQuality.kind = "forecast" 로 내린다.
import { getJson, qs } from './http.js'

const FORECAST = 'https://api.open-meteo.com/v1/forecast'
const AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality'

export interface OpenMeteoForecast {
  utc_offset_seconds: number
  timezone: string
  current: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    is_day: number
    weather_code: number
    relative_humidity_2m: number
    wind_speed_10m: number
    wind_direction_10m: number
  }
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; precipitation_probability: (number | null)[] }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: (number | null)[]
    sunrise: string[]
    sunset: string[]
  }
}

export async function forecast(lat: number, lon: number): Promise<OpenMeteoForecast> {
  const url = `${FORECAST}?${qs({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,apparent_temperature,is_day,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m',
    hourly: 'temperature_2m,weather_code,precipitation_probability',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    timezone: 'auto',
    forecast_days: 8,
    wind_speed_unit: 'ms',
  })}`
  return getJson<OpenMeteoForecast>('open-meteo', url)
}

export interface OpenMeteoAir { pm10: number | null; pm25: number | null; dust: number | null }

export async function airQuality(lat: number, lon: number): Promise<OpenMeteoAir | null> {
  const url = `${AIR}?${qs({ latitude: lat, longitude: lon, current: 'pm10,pm2_5,dust', timezone: 'auto' })}`
  try {
    const json = await getJson<{ current?: { pm10?: number; pm2_5?: number; dust?: number } }>('open-meteo-air', url)
    const c = json.current
    if (!c) return null
    return { pm10: c.pm10 ?? null, pm25: c.pm2_5 ?? null, dust: c.dust ?? null }
  } catch {
    return null
  }
}
