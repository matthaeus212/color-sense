import type { WeatherComposition } from '@colorsense/core'

// 체감온도: 겨울은 바람냉각(기상청 공식), 여름은 열지수, 그 사이는 기온 그대로.
export function feelsLike(tempC: number, windMs: number | null, humidity: number | null): number {
  const v = windMs ?? 0
  if (tempC <= 10 && v >= 1.3) {
    const kmh = v * 3.6
    const p = Math.pow(kmh, 0.16)
    return round1(13.12 + 0.6215 * tempC - 11.37 * p + 0.3965 * tempC * p)
  }
  if (tempC >= 27 && humidity != null) {
    const t = tempC, r = humidity
    const hi = -8.784695 + 1.61139411 * t + 2.338549 * r - 0.14611605 * t * r - 0.012308094 * t * t
      - 0.016424828 * r * r + 0.002211732 * t * t * r + 0.00072546 * t * r * r - 0.000003582 * t * t * r * r
    return round1(Math.max(hi, tempC))
  }
  return round1(tempC)
}

export const round1 = (n: number) => Math.round(n * 10) / 10

// 한국 PM10 등급 기준(좋음 ≤30, 보통 ≤80, 나쁨 ≤150, 매우나쁨 >150)
export function pm10Grade(pm10: number | null): number | null {
  if (pm10 == null) return null
  if (pm10 <= 30) return 1
  if (pm10 <= 80) return 2
  if (pm10 <= 150) return 3
  return 4
}

// 하루 대표 날씨: 강수가 있으면 가장 강한 강수 시간, 없으면 낮 시간대 하늘상태의 최빈값.
export function dailyWx(hours: { wx: WeatherComposition; hour: number }[]): WeatherComposition | undefined {
  if (!hours.length) return undefined
  const wet = hours.filter((h) => h.wx.precip !== 'none')
  if (wet.length) return wet.reduce((a, b) => (b.wx.inten > a.wx.inten ? b : a)).wx
  const day = hours.filter((h) => h.hour >= 6 && h.hour <= 18)
  const pool = day.length ? day : hours
  const count = new Map<number, number>()
  for (const h of pool) count.set(h.wx.sky, (count.get(h.wx.sky) ?? 0) + 1)
  const sky = [...count.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0]
  return pool.find((h) => h.wx.sky === sky)!.wx
}

// Open-Meteo 의 로컬 시각 문자열("2026-09-16T05:24")에 오프셋을 붙여 계약 형태로 만든다.
export function withOffset(localTime: string, offsetSec: number): string {
  const sign = offsetSec >= 0 ? '+' : '-'
  const abs = Math.abs(offsetSec)
  const hh = String(Math.floor(abs / 3600)).padStart(2, '0')
  const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, '0')
  const withSeconds = localTime.length === 16 ? `${localTime}:00` : localTime
  return `${withSeconds}${sign}${hh}:${mm}`
}
