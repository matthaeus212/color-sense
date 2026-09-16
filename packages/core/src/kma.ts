// 기상청(KMA) 원본 필드 -> 공통 날씨 모델 매핑. frontend/src/lib/kma.js 의 TypeScript 원본.
//
// 입력 필드(기상청 단기예보/초단기실황 카테고리):
//   SKY: 1 맑음, 3 구름많음, 4 흐림                      (초단기실황에는 없음 → 초단기예보 첫 시각 사용)
//   PTY: 0 없음, 1 비, 2 비/눈, 3 눈, 4 소나기, 5 빗방울, 6 빗방울눈날림, 7 눈날림
//   PCP: 1시간 강수량 (mm, 문자열 "강수없음" | "1.0mm 미만" | "1.5" | "30.0~50.0mm" | "50.0mm 이상")
//   SNO: 1시간 신적설 (cm, "적설없음" | "1.0cm 미만" | "2.3" | "5.0cm 이상")
//   RN1: 초단기실황 1시간 강수량(mm, 숫자)
//   LGT: 초단기예보 낙뢰 (0 없음, 1 있음)
//   VIS: 시정(m) — 지상관측(ASOS/AWS)에서 보완, 없으면 null
//   warnings: 특보 문자열 배열 (예: ["안개", "호우주의보"])
//   pm10Grade: 에어코리아 PM10 등급 1좋음 2보통 3나쁨 4매우나쁨 (null 가능)
//   yellowDust: 기상청 황사 관측/특보 boolean
import { composition, type Dust, type Precip, type Sky, type WeatherComposition } from './model.js'

export interface KmaFields {
  SKY?: number | string | null
  PTY?: number | string | null
  PCP?: number | string | null
  SNO?: number | string | null
  RN1?: number | string | null
  LGT?: number | string | null
  VIS?: number | string | null
  warnings?: string[]
  pm10Grade?: number | string | null
  yellowDust?: boolean
}

export function skyFromKma(sky: number | string | null | undefined): Sky {
  const v = Number(sky)
  if (v === 1) return 0
  if (v === 3) return 2
  if (v === 4) return 3
  return 2 // 결측 시 보수적으로 구름많음
}

// 강수량 문자열/숫자 -> mm 숫자 (구간 표기는 하한)
export function mmFrom(pcp: number | string | null | undefined): number {
  if (pcp == null) return 0
  if (typeof pcp === 'number') return pcp
  const s = String(pcp).trim()
  if (/없음/.test(s)) return 0
  if (/미만/.test(s)) return 0.5
  const m = s.match(/(\d+(?:\.\d+)?)/)
  return m ? Number(m[1]) : 0
}

// 강도: 비 mm/h 기준 (기상청 강수 강도 구분 참고), 눈 cm/h 기준
export function intensityRain(mm: number): 1 | 2 | 3 { return mm >= 15 ? 3 : mm >= 3 ? 2 : 1 }
export function intensitySnow(cm: number): 1 | 2 | 3 { return cm >= 5 ? 3 : cm >= 1 ? 2 : 1 }

export function precipFromPty(pty: number | string | null | undefined): Precip {
  const v = Number(pty)
  if (v === 1) return 'rain'
  if (v === 2 || v === 6) return 'sleet'
  if (v === 3 || v === 7) return 'snow'
  if (v === 4) return 'showers'
  if (v === 5) return 'drizzle'
  return 'none'
}

export function dustFromAirKorea(pm10Grade: number | string | null | undefined, yellowDust?: boolean): Dust {
  if (yellowDust) return 2
  if (pm10Grade != null && Number(pm10Grade) >= 3) return 1
  return 0
}

// 중기예보 육상 문자열(wf4Am 등: "맑음" · "구름많음/비" · "흐림/눈" · "소나기") -> 공통 모델.
// 중기예보는 강수량·강도를 주지 않으므로 inten 은 보통(2), 소나기만 약(1)으로 둔다.
export function fromMidTermWf(wf: string | null | undefined): WeatherComposition {
  const s = String(wf ?? '')
  const sky: Sky = /흐림/.test(s) ? 3 : /구름많음/.test(s) ? 2 : /구름조금/.test(s) ? 1 : 0
  let precip: Precip = 'none'
  if (/소나기/.test(s)) precip = 'showers'
  else if (/비\/눈|눈\/비/.test(s)) precip = 'sleet'
  else if (/눈/.test(s)) precip = 'snow'
  else if (/비/.test(s)) precip = 'rain'
  return composition({ sky, precip, inten: precip === 'showers' ? 1 : 2 })
}

export function fromKma(f: KmaFields = {}): WeatherComposition {
  const precip = precipFromPty(f.PTY)
  let sky = skyFromKma(f.SKY)
  // 강수 중 하늘상태 결측이면 흐림, 소나기는 구름많음 유지
  if (precip !== 'none' && f.SKY == null) sky = precip === 'showers' ? 2 : 3
  let inten: 1 | 2 | 3 = 2
  if (precip === 'snow') inten = intensitySnow(mmFrom(f.SNO))
  else if (precip !== 'none') inten = intensityRain(f.RN1 != null ? Number(f.RN1) : mmFrom(f.PCP))
  if (precip === 'drizzle') inten = 1
  const warnings = f.warnings || []
  const storm = Number(f.LGT) === 1 || warnings.some((w) => /낙뢰|뇌전/.test(w))
  const fog = (f.VIS != null && Number(f.VIS) < 1000) || warnings.some((w) => /안개/.test(w))
  const dust = dustFromAirKorea(f.pm10Grade, f.yellowDust)
  return composition({ sky, precip, inten, fog, storm, dust })
}
