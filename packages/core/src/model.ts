// 공통 날씨 모델 (BFF 계약의 핵심). frontend/src/lib/model.js 의 TypeScript 원본.
// 두 구현이 어긋나면 tests/parity.test.mjs 가 실패한다.

export type Sky = 0 | 1 | 2 | 3
export type Precip = 'none' | 'rain' | 'drizzle' | 'snow' | 'sleet' | 'showers'
export type Inten = 1 | 2 | 3
export type Dust = 0 | 1 | 2

export interface WeatherComposition {
  sky: Sky
  precip: Precip
  inten: Inten
  fog: boolean
  storm: boolean
  dust: Dust
}

export const SKY = { CLEAR: 0, MOSTLY_CLEAR: 1, PARTLY_CLOUDY: 2, OVERCAST: 3 } as const
export const PRECIP: Precip[] = ['none', 'rain', 'drizzle', 'snow', 'sleet', 'showers']

export interface CompositionInput {
  sky?: unknown
  precip?: unknown
  inten?: unknown
  fog?: unknown
  storm?: unknown
  dust?: unknown
}

export function composition(o: CompositionInput = {}): WeatherComposition {
  return {
    sky: clampInt(o.sky, 0, 3, 0) as Sky,
    precip: PRECIP.includes(o.precip as Precip) ? (o.precip as Precip) : 'none',
    inten: clampInt(o.inten, 1, 3, 2) as Inten,
    fog: !!o.fog,
    storm: !!o.storm,
    dust: clampInt(o.dust, 0, 2, 0) as Dust,
  }
}

function clampInt(v: unknown, lo: number, hi: number, def: number): number {
  if (v == null || Number.isNaN(Number(v))) return def
  return Math.max(lo, Math.min(hi, Math.round(Number(v))))
}

// Open-Meteo WMO weather_code -> composition (프로토 decode2와 동일 표)
const WMO: Record<number, CompositionInput> = {
  0: { sky: 0 }, 1: { sky: 1 }, 2: { sky: 2 }, 3: { sky: 3 }, 45: { sky: 3, fog: 1 }, 48: { sky: 3, fog: 1 },
  51: { sky: 3, precip: 'drizzle', inten: 1 }, 53: { sky: 3, precip: 'drizzle', inten: 2 }, 55: { sky: 3, precip: 'drizzle', inten: 2 },
  56: { sky: 3, precip: 'sleet', inten: 1 }, 57: { sky: 3, precip: 'sleet', inten: 2 },
  61: { sky: 3, precip: 'rain', inten: 1 }, 63: { sky: 3, precip: 'rain', inten: 2 }, 65: { sky: 3, precip: 'rain', inten: 3 },
  66: { sky: 3, precip: 'sleet', inten: 2 }, 67: { sky: 3, precip: 'sleet', inten: 3 },
  71: { sky: 3, precip: 'snow', inten: 1 }, 73: { sky: 3, precip: 'snow', inten: 2 }, 75: { sky: 3, precip: 'snow', inten: 3 }, 77: { sky: 3, precip: 'snow', inten: 1 },
  80: { sky: 2, precip: 'showers', inten: 1 }, 81: { sky: 2, precip: 'showers', inten: 2 }, 82: { sky: 2, precip: 'showers', inten: 3 },
  85: { sky: 2, precip: 'snow', inten: 2 }, 86: { sky: 2, precip: 'snow', inten: 3 },
  95: { sky: 3, precip: 'rain', inten: 2, storm: 1 }, 96: { sky: 3, precip: 'sleet', inten: 2, storm: 1 }, 99: { sky: 3, precip: 'sleet', inten: 3, storm: 1 },
}

export function fromWmo(code: number, dust: Dust | number = 0): WeatherComposition {
  return composition({ ...(WMO[code] || { sky: 2 }), dust })
}

// Open-Meteo 대기질(모델 예측값) -> dust 등급. 해외 도시용. 한국은 에어코리아 실측(kma.ts) 사용.
export function dustFromOpenMeteo({ pm10, dust }: { pm10?: number | null; dust?: number | null } = {}): Dust {
  const p = pm10 ?? 0, d = dust ?? 0
  if (d >= 200 || (p >= 150 && d >= 80)) return 2
  if (p >= 80) return 1
  return 0
}

// 예보 아이콘용 단순 카테고리
export function catOf(wx: WeatherComposition): 'snow' | 'rain' | 'fog' | 'cloudy' | 'clear' {
  if (wx.precip === 'snow') return 'snow'
  if (wx.precip !== 'none' || wx.storm) return 'rain'
  if (wx.fog) return 'fog'
  if (wx.sky >= 2) return 'cloudy'
  return 'clear'
}

// 데이터 상태: fresh | stale | delayed | offline  (D4: 배지로만 표현)
export const STALE_AFTER_MS = 3 * 60 * 60 * 1000

export function dataState(
  { updatedAt, nextUpdateAt }: { updatedAt?: string | null; nextUpdateAt?: string | null },
  nowMs: number,
  online = true,
): 'fresh' | 'stale' | 'delayed' | 'offline' {
  if (!online) return 'offline'
  if (!updatedAt) return 'delayed'
  const age = nowMs - Date.parse(updatedAt)
  if (age > STALE_AFTER_MS) return 'delayed'
  if (nextUpdateAt && nowMs > Date.parse(nextUpdateAt) + 30 * 60 * 1000) return 'stale'
  return 'fresh'
}
