// 에어코리아 측정소별 실시간 대기오염. 한국 도시의 dust 등급과 airQuality(실측)의 근거.
// 실패하면 예외를 던지지 않고 unavailable 을 돌려준다 — 대기질 하나 때문에 날씨 전체를 실패시키지 않는다.
import { config } from '../config.js'
import { getJson, qs } from './http.js'
import type { AirQuality } from '../contract.js'

const URL_BASE = 'https://apis.data.go.kr/B552584/ArpltnInfrInqireSvc/getMsrstnAcctoRltmMesureDnsty'

interface AirItem { pm10Value?: string; pm25Value?: string; pm10Grade?: string; pm25Grade?: string; dataTime?: string }
interface AirResponse { response?: { header?: { resultCode?: string }; body?: { items?: AirItem[] } } }

const num = (v?: string) => {
  if (v == null || v === '-' || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export interface AirResult { airQuality: AirQuality; pm10Grade: number | null }

export const unavailableAir: AirResult = { airQuality: { kind: 'unavailable' }, pm10Grade: null }

export async function airKorea(stationName: string): Promise<AirResult> {
  if (!config.airKey) return unavailableAir
  const url = `${URL_BASE}?${qs({ serviceKey: config.airKey, returnType: 'json', numOfRows: 1, pageNo: 1, stationName, dataTerm: 'DAILY', ver: '1.3' })}`
  try {
    const json = await getJson<AirResponse>('airkorea', url)
    const item = json.response?.body?.items?.[0]
    if (!item) return unavailableAir
    const pm10Grade = num(item.pm10Grade)
    return {
      airQuality: { kind: 'observed', pm10: num(item.pm10Value), pm25: num(item.pm25Value), grade: pm10Grade },
      pm10Grade,
    }
  } catch {
    return unavailableAir
  }
}
