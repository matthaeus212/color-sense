// 기상청 공공데이터포털 API 호출. 정규화는 build/kmaCity.ts 가 맡고 여기서는 원본 아이템만 돌려준다.
import { config } from '../config.js'
import { getJson, qs, SourceError } from './http.js'
import { midTmFc, ncstBase, ultraFcstBase, vilageBase } from '../time.js'

const BASE = 'https://apis.data.go.kr/1360000'

export interface FcstItem { category: string; fcstDate: string; fcstTime: string; fcstValue: string }
interface NcstItem { category: string; obsrValue: string }

interface KmaResponse<T> {
  response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: { item?: T | T[] } } }
}

async function call<T>(path: string, params: Record<string, string | number>): Promise<T[]> {
  if (!config.kmaKey) throw new SourceError('kma', 'KMA_KEY 없음')
  const url = `${BASE}/${path}?${qs({ serviceKey: config.kmaKey, dataType: 'JSON', pageNo: 1, ...params })}`
  const json = await getJson<KmaResponse<T>>('kma', url)
  const header = json.response?.header
  if (header?.resultCode !== '00') throw new SourceError('kma', `${header?.resultCode ?? '?'} ${header?.resultMsg ?? 'unknown'}`)
  const item = json.response?.body?.items?.item
  if (!item) return []
  return Array.isArray(item) ? item : [item]
}

// 초단기실황 — 현재 기온·습도·강수형태·1시간 강수량·바람 (SKY 없음)
export async function ultraSrtNcst(nx: number, ny: number, nowMs: number): Promise<Record<string, string>> {
  const items = await call<NcstItem>('VilageFcstInfoService_2.0/getUltraSrtNcst', { numOfRows: 60, ...ncstBase(nowMs), nx, ny })
  return Object.fromEntries(items.map((i) => [i.category, i.obsrValue]))
}

// 초단기예보 — 향후 6시간. 실황에 없는 SKY·LGT·POP 을 여기서 보완한다.
export async function ultraSrtFcst(nx: number, ny: number, nowMs: number): Promise<FcstItem[]> {
  return call<FcstItem>('VilageFcstInfoService_2.0/getUltraSrtFcst', { numOfRows: 300, ...ultraFcstBase(nowMs), nx, ny })
}

// 단기예보 — 발표일 +3일. 시간별 24칸과 daily 앞부분의 근거.
export async function vilageFcst(nx: number, ny: number, nowMs: number): Promise<FcstItem[]> {
  return call<FcstItem>('VilageFcstInfoService_2.0/getVilageFcst', { numOfRows: 1000, ...vilageBase(nowMs), nx, ny })
}

export interface MidLand { [key: string]: string | number }
export interface MidTa { [key: string]: string | number }

// 중기육상예보 — D+4~D+10 하늘상태·강수확률
export async function midLandFcst(regLand: string, nowMs: number): Promise<MidLand | undefined> {
  const items = await call<MidLand>('MidFcstInfoService/getMidLandFcst', { numOfRows: 10, regId: regLand, tmFc: midTmFc(nowMs) })
  return items[0]
}

// 중기기온 — D+4~D+10 최저·최고기온
export async function midTaFcst(regTemp: string, nowMs: number): Promise<MidTa | undefined> {
  const items = await call<MidTa>('MidFcstInfoService/getMidTa', { numOfRows: 10, regId: regTemp, tmFc: midTmFc(nowMs) })
  return items[0]
}
