// SVG icon markup builders (returned as strings, rendered via dangerouslySetInnerHTML).
// The header condition icon encodes precipitation intensity by droplet/flake count.

const ST = 'stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"'
const XS = [8.5, 12, 15.5]

// header condition icon (white line), precipitation count encodes intensity
export function condIcon(wx, isDay) {
  const cloud = `<path d="M6 16.3h10a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.7-1.1A3.3 3.3 0 0 0 6 16.3z" ${ST}/>`
  const drops = (n) => XS.slice(0, n).map((x) => `<line x1="${x}" y1="18.5" x2="${x - 1}" y2="21.5" ${ST}/>`).join('')
  const dots = (n) => XS.slice(0, n).map((x) => `<circle cx="${x}" cy="20" r=".9" fill="#fff" stroke="none"/>`).join('')
  const flakes = (n) => XS.slice(0, n).map((x) => `<circle cx="${x}" cy="20" r="1" fill="#fff" stroke="none"/>`).join('')
  const wrap = (inner) => `<svg viewBox="0 0 24 24">${inner}</svg>`
  if (wx.dust && wx.precip === 'none' && !wx.storm && !wx.fog)
    return wrap(`<circle cx="16.5" cy="8" r="3" ${ST}/><line x1="4" y1="13.5" x2="17" y2="13.5" ${ST}/><line x1="4" y1="17" x2="20" y2="17" ${ST}/><line x1="6" y1="20.5" x2="18" y2="20.5" ${ST}/>`)
  if (wx.fog) return wrap(`${cloud}<line x1="6" y1="19.5" x2="15" y2="19.5" ${ST}/><line x1="9" y1="22" x2="18" y2="22" ${ST}/>`)
  if (wx.storm) return wrap(`${cloud}<path d="M12 17.5l-2.2 3.4h2.6L10.6 24" ${ST}/>`)
  if (wx.precip === 'rain') return wrap(cloud + drops(wx.inten))
  if (wx.precip === 'drizzle') return wrap(cloud + dots(2))
  if (wx.precip === 'sleet') return wrap(cloud + `<line x1="9" y1="18.5" x2="8" y2="21.5" ${ST}/><circle cx="14.5" cy="20" r="1" fill="#fff" stroke="none"/>`)
  if (wx.precip === 'snow') return wrap(cloud + flakes(wx.inten))
  if (wx.sky >= 2) return wrap(cloud)
  if (wx.sky === 1) return wrap(`<circle cx="8.5" cy="9" r="3" ${ST}/>${cloud}`)
  if (isDay === 0) return wrap(`<path d="M17 13.5A6 6 0 1 1 11 5.7 4.9 4.9 0 0 0 17 13.5z" ${ST}/>`)
  return wrap(`<circle cx="12" cy="12" r="4" ${ST}/>` + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
    const r = (a * Math.PI) / 180
    return `<line x1="${(12 + Math.cos(r) * 6.6).toFixed(1)}" y1="${(12 + Math.sin(r) * 6.6).toFixed(1)}" x2="${(12 + Math.cos(r) * 8.8).toFixed(1)}" y2="${(12 + Math.sin(r) * 8.8).toFixed(1)}" ${ST}/>`
  }).join(''))
}

const SS = 'stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"'

// simplified forecast-row icon by category
export function wIcon(cat) {
  const cloud = `<path d="M6.5 17h9.2a3 3 0 0 0 .4-6 4.4 4.4 0 0 0-8.5-1.1A3.2 3.2 0 0 0 6.5 17z" ${SS}/>`
  if (cat === 'clear') return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.3" ${SS}/>` +
    [0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = (a * Math.PI) / 180
      return `<line x1="${(12 + Math.cos(r) * 7).toFixed(1)}" y1="${(12 + Math.sin(r) * 7).toFixed(1)}" x2="${(12 + Math.cos(r) * 9).toFixed(1)}" y2="${(12 + Math.sin(r) * 9).toFixed(1)}" ${SS}/>` }).join('') + `</svg>`
  if (cat === 'cloudy') return `<svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.2" ${SS}/>${cloud}</svg>`
  if (cat === 'rain') return `<svg viewBox="0 0 24 24">${cloud}<line x1="9" y1="19.5" x2="8" y2="22" ${SS}/><line x1="12.5" y1="19.5" x2="11.5" y2="22" ${SS}/><line x1="16" y1="19.5" x2="15" y2="22" ${SS}/></svg>`
  if (cat === 'snow') return `<svg viewBox="0 0 24 24">${cloud}<circle cx="9" cy="20.6" r=".8" fill="#fff" stroke="none"/><circle cx="12.5" cy="21" r=".8" fill="#fff" stroke="none"/><circle cx="16" cy="20.6" r=".8" fill="#fff" stroke="none"/></svg>`
  return `<svg viewBox="0 0 24 24">${cloud}</svg>`
}

// settings gear icon
export const GEAR_SVG =
  `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5"><circle cx="12" cy="12" r="3.2"/>` +
  `<path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" stroke-linecap="round"/></svg>`
