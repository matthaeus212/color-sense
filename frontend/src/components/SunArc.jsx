import { fmtClock, minOf, nowLocalMin } from '../lib/format.js'

// Dashed arc showing the sun's path between sunrise and sunset,
// with the sun positioned by the current local time.
export default function SunArc({ view, lang, nowMs }) {
  if (!view || !view.sunrise || !view.sunset) return <div className="arc" />
  const W = 340, baseY = 118, x0 = 48, x1 = 292, cx = (x0 + x1) / 2, rx = (x1 - x0) / 2, ry = 80
  const sr = minOf(view.sunrise), ss = minOf(view.sunset), now = nowLocalMin(nowMs, view.offset)
  let t, day
  if (now <= sr) { t = 0; day = false } else if (now >= ss) { t = 1; day = false } else { t = (now - sr) / (ss - sr); day = true }
  const sx = cx - rx * Math.cos(Math.PI * t), sy = baseY - ry * Math.sin(Math.PI * t)
  const sunFill = day ? '#F6C558' : 'rgba(246,197,88,.4)'
  const rays = day ? [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
    const r = (a * Math.PI) / 180
    return `<line x1="${(sx + Math.cos(r) * 8).toFixed(1)}" y1="${(sy + Math.sin(r) * 8).toFixed(1)}" x2="${(sx + Math.cos(r) * 11).toFixed(1)}" y2="${(sy + Math.sin(r) * 11).toFixed(1)}" stroke="${sunFill}" stroke-width="1.4" stroke-linecap="round"/>`
  }).join('') : ''
  const markup = `<svg viewBox="0 0 ${W} 150">
    <path d="M${x0},${baseY} A${rx},${ry} 0 0 1 ${x1},${baseY}" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="1.5 8"/>
    <line x1="14" y1="${baseY}" x2="326" y2="${baseY}" stroke="rgba(255,255,255,.85)" stroke-width="1.4" stroke-linecap="round"/>
    <text x="${cx}" y="104" text-anchor="middle" fill="rgba(255,255,255,.72)" font-size="12.5" letter-spacing="${lang === 'ko' ? 3 : 2}" font-family="inherit">${lang === 'ko' ? '일출 · 일몰' : 'SUNRISE &amp; SUNSET'}</text>
    ${rays}<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="6.5" fill="${sunFill}"/>
    <text x="${x0 - 4}" y="143" text-anchor="middle" fill="rgba(255,255,255,.9)" font-size="12.5" letter-spacing="1.5" font-family="inherit">${fmtClock(view.sunrise, lang)}</text>
    <text x="${x1 + 4}" y="143" text-anchor="middle" fill="rgba(255,255,255,.9)" font-size="12.5" letter-spacing="1.5" font-family="inherit">${fmtClock(view.sunset, lang)}</text>
  </svg>`
  return <div className="arc" dangerouslySetInnerHTML={{ __html: markup }} />
}
