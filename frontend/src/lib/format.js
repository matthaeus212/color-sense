// Date / time / temperature formatting helpers (language-aware).

export const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
export const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
export const WDKO = ['일', '월', '화', '수', '목', '금', '토']

export const fmtT = (tc) => { const v = Math.round(tc); return (v < 0 ? '−' : '') + Math.abs(v) }

const pad = (n) => String(n).padStart(2, '0')

// sunrise/sunset clock string from an ISO-ish "....THH:MM"
export function fmtClock(iso, lang) {
  let [h, m] = iso.slice(11, 16).split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; const mm = pad(m)
  return lang === 'ko' ? `${ap === 'PM' ? '오후' : '오전'} ${h}:${mm}` : `${h}:${mm} ${ap}`
}

export const minOf = (iso) => { const [h, m] = iso.slice(11, 16).split(':').map(Number); return h * 60 + m }

// current local minutes-of-day at a given UTC offset (seconds)
export function nowLocalMin(nowMs, offset) {
  const d = new Date(nowMs + new Date(nowMs).getTimezoneOffset() * 60000 + offset * 1000)
  return d.getHours() * 60 + d.getMinutes()
}

// live wall clock at a given offset
export function formatTime(nowMs, offset, lang) {
  const d = new Date(nowMs + new Date(nowMs).getTimezoneOffset() * 60000 + offset * 1000)
  let h = d.getHours(); const mm = pad(d.getMinutes()); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12
  return lang === 'ko' ? `${ap === 'PM' ? '오후' : '오전'} ${h}:${mm}` : `${h}:${mm} ${ap}`
}

// header date from the location's local ISO time
export function formatDate(curTime, lang) {
  const mo = parseInt(curTime.slice(5, 7), 10), day = parseInt(curTime.slice(8, 10), 10)
  return lang === 'ko' ? `${mo}월 ${day}일` : `${MON[mo - 1]} ${day}`
}

// a synthetic "now" ISO in local time (for color-test defaults when offline)
export function nowIso() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
