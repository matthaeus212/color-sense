// 공통 날씨 모델 (BFF 계약의 핵심). 컬러 엔진·라벨·아이콘은 이 모델만 본다.
//
// WeatherComposition = {
//   sky:    0 맑음 | 1 구름조금 | 2 구름많음 | 3 흐림
//   precip: 'none' | 'rain' | 'drizzle' | 'snow' | 'sleet' | 'showers'
//   inten:  1 약 | 2 보통 | 3 강            (precip !== 'none' 일 때 의미)
//   fog:    boolean
//   storm:  boolean                         (뇌우·낙뢰)
//   dust:   0 없음 | 1 미세먼지 | 2 황사
// }
//
// BFF 응답(CityWeather) 전체 계약은 backend/api-contract.md 참조.

export const SKY = { CLEAR: 0, MOSTLY_CLEAR: 1, PARTLY_CLOUDY: 2, OVERCAST: 3 }
export const PRECIP = ['none', 'rain', 'drizzle', 'snow', 'sleet', 'showers']

export function composition(o = {}) {
  return {
    sky: clampInt(o.sky, 0, 3, 0),
    precip: PRECIP.includes(o.precip) ? o.precip : 'none',
    inten: clampInt(o.inten, 1, 3, 2),
    fog: !!o.fog,
    storm: !!o.storm,
    dust: clampInt(o.dust, 0, 2, 0),
  }
}

function clampInt(v, lo, hi, def) {
  if (v == null || Number.isNaN(+v)) return def
  return Math.max(lo, Math.min(hi, Math.round(+v)))
}

// Open-Meteo WMO weather_code -> composition (프로토 decode2와 동일 표)
const WMO = {
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
export function fromWmo(code, dust = 0) {
  return composition({ ...(WMO[code] || { sky: 2 }), dust })
}

// Open-Meteo 대기질(모델 예측값) -> dust 등급. 해외 도시용. 한국은 에어코리아 실측(kma.js) 사용.
export function dustFromOpenMeteo({ pm10, dust } = {}) {
  const p = pm10 ?? 0, d = dust ?? 0
  if (d >= 200 || (p >= 150 && d >= 80)) return 2
  if (p >= 80) return 1
  return 0
}

// 예보 아이콘용 단순 카테고리
export function catOf(wx) {
  if (wx.precip === 'snow') return 'snow'
  if (wx.precip !== 'none' || wx.storm) return 'rain'
  if (wx.fog) return 'fog'
  if (wx.sky >= 2) return 'cloudy'
  return 'clear'
}

// 데이터 상태: fresh | stale | delayed | offline  (D4: 배지로만 표현)
export const STALE_AFTER_MS = 3 * 60 * 60 * 1000
export function dataState({ updatedAt, nextUpdateAt }, nowMs, online = true) {
  if (!online) return 'offline'
  if (!updatedAt) return 'delayed'
  const age = nowMs - Date.parse(updatedAt)
  if (age > STALE_AFTER_MS) return 'delayed'
  if (nextUpdateAt && nowMs > Date.parse(nextUpdateAt) + 30 * 60 * 1000) return 'stale'
  return 'fresh'
}
