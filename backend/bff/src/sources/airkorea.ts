// 에어코리아 측정소별 실시간 대기오염. 한국 도시의 dust 등급과 airQuality(실측)의 근거.
// 실패하면 예외를 던지지 않고 unavailable 을 돌려준다 — 대기질 하나 때문에 날씨 전체를 실패시키지 않는다.
import { config } from '../config.js'
import { getJson, qs } from './http.js'
import type { AirQuality } from '../contract.js'

// 서비스 경로는 ArpltnInforInqireSvc — Infor 의 o 를 빼면 게이트웨이가 code 12
// (NO_OPENAPI_SERVICE_ERROR)를 돌려주는데, 이게 미승인 오류처럼 보여 한동안 헤맸다.
const URL_BASE = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty'

interface AirItem { pm10Value?: string; pm25Value?: string; pm10Grade?: string; pm25Grade?: string; dataTime?: string }
interface AirResponse { response?: { header?: { resultCode?: string }; body?: { items?: AirItem[] } } }

const num = (v?: string) => {
  if (v == null || v === '-' || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export interface AirResult { airQuality: AirQuality; pm10Grade: number | null }

export const unavailableAir: AirResult = { airQuality: { kind: 'unavailable' }, pm10Grade: null }

// dust 등급이 배경색에 들어가므로(황사·미세먼지 틴트) 간헐적 실패를 그대로 두면 갱신마다 색이 흔들린다.
// 에어코리아는 응답이 0.1초일 때도 있고 6초를 넘길 때도 있어 한 번 더 시도한다.
// 한국 20개 도시 × 24회 = 480건/일 이라 재시도 여유가 충분하다(한도 10,000건).
const ATTEMPTS = 2

export async function airKorea(stationName: string): Promise<AirResult> {
  if (!config.airKey) return unavailableAir
  const url = `${URL_BASE}?${qs({ serviceKey: config.airKey, returnType: 'json', numOfRows: 1, pageNo: 1, stationName, dataTerm: 'DAILY', ver: '1.3' })}`

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const json = await getJson<AirResponse>('airkorea', url)
      const item = json.response?.body?.items?.[0]
      if (item) {
        const pm10Grade = num(item.pm10Grade)
        return {
          airQuality: { kind: 'observed', pm10: num(item.pm10Value), pm25: num(item.pm25Value), grade: pm10Grade },
          pm10Grade,
        }
      }
      // 빈 응답은 측정소명이 목록과 다를 때 생긴다 — 재시도해도 같으면 카탈로그를 고쳐야 한다
      if (attempt === ATTEMPTS) {
        console.warn(`[airkorea] "${stationName}" 응답이 비었다 — 측정소명을 확인하라(npm run smoke)`)
      }
    } catch (error) {
      // 조용히 unavailable 로 떨어지면 원인이 안 보인다 — 대기질은 없어도 날씨는 내보내되, 이유는 남긴다
      if (attempt === ATTEMPTS) {
        console.warn(`[airkorea] "${stationName}" 실패:`, error instanceof Error ? error.message : error)
      }
    }
  }
  return unavailableAir
}
