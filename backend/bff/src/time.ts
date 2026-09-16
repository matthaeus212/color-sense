// 시각 유틸 + 기상청 발표 시각 계산.
// 기상청은 한국 표준시(UTC+9, 서머타임 없음) 기준으로만 발표하므로 KST 고정 오프셋을 쓴다.

export const KST_OFFSET_SEC = 9 * 3600

export const pad = (n: number) => String(n).padStart(2, '0')

// UTC epoch(ms) -> 해당 오프셋의 로컬 ISO 문자열 (예: 2026-09-16T05:00:00+09:00)
export function localIso(ms: number, offsetSec: number): string {
  const d = new Date(ms + offsetSec * 1000)
  const sign = offsetSec >= 0 ? '+' : '-'
  const abs = Math.abs(offsetSec)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00${sign}${pad(Math.floor(abs / 3600))}:${pad(Math.floor((abs % 3600) / 60))}`
}

export function offsetForTz(tz: string, ms: number): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
    .formatToParts(new Date(ms))
    .find((p) => p.type === 'timeZoneName')?.value
  const m = name?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
  if (!m) return 0
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 3600 + Number(m[3] || 0) * 60)
}

interface KstParts { y: number; m: number; d: number; h: number; min: number }

export function kstParts(ms: number): KstParts {
  const d = new Date(ms + KST_OFFSET_SEC * 1000)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes() }
}

export const ymd = (p: KstParts) => `${p.y}${pad(p.m)}${pad(p.d)}`

// KST 기준 n시간 전/후의 날짜·시각 파트
const shiftHours = (ms: number, h: number) => kstParts(ms + h * 3600e3)

// 초단기실황: 매시 정시 발표, 약 40분 뒤 제공
export function ncstBase(nowMs: number): { base_date: string; base_time: string } {
  const p = kstParts(nowMs)
  const q = p.min >= 40 ? p : shiftHours(nowMs, -1)
  return { base_date: ymd(q), base_time: `${pad(q.h)}00` }
}

// 초단기예보: 매시 30분 발표, 약 45분 뒤 제공
export function ultraFcstBase(nowMs: number): { base_date: string; base_time: string } {
  const p = kstParts(nowMs)
  const q = p.min >= 45 ? p : shiftHours(nowMs, -1)
  return { base_date: ymd(q), base_time: `${pad(q.h)}30` }
}

// 단기예보: 02·05·08·11·14·17·20·23시 발표, 약 10분 뒤 제공
const VILAGE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23]
export function vilageBase(nowMs: number): { base_date: string; base_time: string } {
  for (let back = 0; back < 30; back++) {
    const p = shiftHours(nowMs, -back)
    if (!VILAGE_HOURS.includes(p.h)) continue
    // 발표 시각과 같은 시간대면 10분이 지나야 제공된다
    if (back === 0 && p.min < 10) continue
    return { base_date: ymd(p), base_time: `${pad(p.h)}00` }
  }
  const p = kstParts(nowMs)
  return { base_date: ymd(p), base_time: '2300' }
}

// 중기예보: 06·18시 발표
export function midTmFc(nowMs: number): string {
  for (let back = 0; back < 30; back++) {
    const p = shiftHours(nowMs, -back)
    if (p.h === 6 || p.h === 18) return `${ymd(p)}${pad(p.h)}00`
  }
  const p = kstParts(nowMs)
  return `${ymd(p)}0600`
}

// 다음 갱신 예정 시각: 초단기실황이 매시 :40 에 갱신되므로 그 시각을 알린다.
export function nextKmaUpdateMs(nowMs: number): number {
  const p = kstParts(nowMs)
  const add = p.min >= 40 ? 60 - p.min + 40 : 40 - p.min
  return nowMs + add * 60e3
}

// 기상청 fcstDate(20260916) + fcstTime(1400) -> epoch ms
export function kmaSlotMs(fcstDate: string, fcstTime: string): number {
  const y = Number(fcstDate.slice(0, 4)), m = Number(fcstDate.slice(4, 6)), d = Number(fcstDate.slice(6, 8))
  const h = Number(fcstTime.slice(0, 2)), min = Number(fcstTime.slice(2, 4))
  return Date.UTC(y, m - 1, d, h, min) - KST_OFFSET_SEC * 1000
}
