// BFF 응답 계약 (backend/api-contract.md §3). 응답을 내보내기 전에 이 스키마로 검증한다 —
// 계약을 깨는 응답은 화면에서 조용히 잘못된 색으로 나타나므로 서버에서 먼저 막는다.
import { z } from 'zod'

export const compositionSchema = z.object({
  sky: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  precip: z.enum(['none', 'rain', 'drizzle', 'snow', 'sleet', 'showers']),
  inten: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  fog: z.boolean(),
  storm: z.boolean(),
  dust: z.union([z.literal(0), z.literal(1), z.literal(2)]),
})

export const airQualitySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.enum(['observed', 'forecast']),
    pm10: z.number().nullable(),
    pm25: z.number().nullable(),
    grade: z.number().int().min(1).max(4).nullable(),
  }),
  z.object({ kind: z.literal('unavailable') }),
])

export const marineSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.enum(['observed', 'forecast']), waveM: z.number().nullable() }),
  z.object({ kind: z.literal('unavailable') }),
])

export const cityWeatherSchema = z.object({
  cityId: z.string().regex(/^[A-Z]{2}-[A-Z]{3}$/),
  source: z.enum(['kma', 'open-meteo', 'open-meteo-fallback']),
  updatedAt: z.string(),
  nextUpdateAt: z.string(),
  tz: z.string(),
  utcOffsetSec: z.number().int(),
  current: z.object({
    time: z.string(),
    tempC: z.number(),
    feelsC: z.number(),
    isDay: z.union([z.literal(0), z.literal(1)]),
    wx: compositionSchema,
    humidity: z.number().nullable(),
    windMs: z.number().nullable(),
    windDeg: z.number().nullable(),
    pop: z.number().nullable(),
  }),
  hourly: z.array(z.object({
    time: z.string(),
    tempC: z.number(),
    pop: z.number().nullable(),
    wx: compositionSchema,
  })).length(24),
  daily: z.array(z.object({
    date: z.string(),
    hi: z.number(),
    lo: z.number(),
    pop: z.number().nullable(),
    wx: compositionSchema,
  })).length(7),
  sun: z.object({ sunrise: z.string().nullable(), sunset: z.string().nullable() }),
  airQuality: airQualitySchema,
  marine: marineSchema,
})

export type CityWeather = z.infer<typeof cityWeatherSchema>
export type AirQuality = z.infer<typeof airQualitySchema>
export type Marine = z.infer<typeof marineSchema>
