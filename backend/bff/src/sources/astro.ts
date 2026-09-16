// 천문연구원 출몰시각. 한국 도시의 일출·일몰. XML 만 제공한다.
// 실패하면 null 을 돌려주고 화면은 일출·일몰 없이 그린다(색은 isDay 로 결정되므로 영향 없음).
import { config } from '../config.js'
import { getText, qs } from './http.js'
import { KST_OFFSET_SEC, kstParts, pad, ymd } from '../time.js'

const URL_BASE = 'https://apis.data.go.kr/B090041/openapi/service/RiseSetInfoService/getAreaRiseSetInfo'

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1]?.trim() ?? ''

// "0614" -> "2026-09-16T06:14:00+09:00"
function atKst(hhmm: string, date: string): string | null {
  if (!/^\d{4}$/.test(hhmm)) return null
  const sign = KST_OFFSET_SEC >= 0 ? '+' : '-'
  const off = `${sign}${pad(KST_OFFSET_SEC / 3600)}:00`
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}:00${off}`
}

export interface Sun { sunrise: string | null; sunset: string | null }

export const unavailableSun: Sun = { sunrise: null, sunset: null }

export async function riseSet(locationKo: string, nowMs: number): Promise<Sun> {
  if (!config.astroKey) return unavailableSun
  const locdate = ymd(kstParts(nowMs))
  const url = `${URL_BASE}?${qs({ serviceKey: config.astroKey, locdate, location: locationKo })}`
  try {
    const xml = await getText('astro', url)
    if (tag(xml, 'resultCode') !== '00') return unavailableSun
    return { sunrise: atKst(tag(xml, 'sunrise'), locdate), sunset: atKst(tag(xml, 'sunset'), locdate) }
  } catch {
    return unavailableSun
  }
}
