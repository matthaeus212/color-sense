// Weather composition: WMO codes -> {sky, precip, intensity, fog, storm, dust}
// plus label building and season/compass helpers.

import { fromWmo, catOf as catOfModel, composition } from './model.js'
export { fromWmo, composition }
export const decode2 = (code) => fromWmo(code)
export const catOf = catOfModel

// compound label from a composition, using a language dictionary (I18N[lang])
export function wxLabel(wx, dict) {
  if (!wx) return ''
  let parts = []
  if (wx.fog) parts = [dict.fogLabel]
  else {
    const skyL = dict.sky[['clear', 'mclear', 'pcloudy', 'overcast'][wx.sky]]
    if (wx.storm) parts = [skyL, dict.stormLabel]
    else if (wx.precip === 'showers') parts = [dict.precip.showers] // D3: 소나기는 단독 라벨
    else if (wx.precip !== 'none') {
      let pL = dict.precip[wx.precip] || ''
      if (wx.inten === 3) pL = dict.heavy + ' ' + pL
      else if (wx.inten === 1 && (wx.precip === 'snow' || wx.precip === 'rain')) pL = dict.light + ' ' + pL
      parts = [skyL, pL]
    } else parts = [skyL]
  }
  if (wx.dust) parts.push(dict.dust[wx.dust])
  return parts.join(dict.amp)
}

export function seasonOf(month, lat) {
  let m = month
  if (lat < 0) m = ((month + 6 - 1) % 12) + 1
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}

export const compassIndex = (deg) => Math.round(deg / 45) % 8

// Color-test presets: preset key -> composition
export const CTP = {
  clear: { sky: 0 }, pcloudy: { sky: 2 }, overcast: { sky: 3 },
  rain: { sky: 3, precip: 'rain', inten: 2 }, showers: { sky: 2, precip: 'showers', inten: 2 },
  snow: { sky: 3, precip: 'snow', inten: 2 }, sleet: { sky: 3, precip: 'sleet', inten: 2 },
  fog: { sky: 3, fog: 1 }, storm: { sky: 3, precip: 'rain', inten: 2, storm: 1 },
  finedust: { sky: 2, dust: 1 }, yellowdust: { sky: 2, dust: 2 },
}

export const wxFrom = composition
