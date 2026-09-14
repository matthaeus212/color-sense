// Color engine: dawn/dusk sky palettes interpolated by temperature,
// then modulated by weather composition (clouds, precipitation, fog, storm, dust, night).

// temperature -> single color ramp, used for the weekly forecast range bars
export const BOT = [
  { t: -10, c: [120, 140, 180] }, { t: 0, c: [150, 166, 196] }, { t: 10, c: [196, 182, 178] },
  { t: 18, c: [240, 178, 120] }, { t: 24, c: [255, 150, 78] }, { t: 30, c: [255, 112, 58] }, { t: 38, c: [255, 74, 52] },
]

const lerp = (a, b, r) => a + (b - a) * r
export const mix = (a, b, r) => a.map((v, i) => v + (b[i] - v) * r)
export const grey = (c) => { const l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; return [l, l, l] }
export const rgb = (c) => `rgb(${c.map((v) => Math.round(v)).join(',')})`

export function interp(stops, t) {
  t = Math.max(stops[0].t, Math.min(stops[stops.length - 1].t, t))
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1]
    if (t >= a.t && t <= b.t) { const r = (t - a.t) / (b.t - a.t); return [0, 1, 2].map((k) => lerp(a.c[k], b.c[k], r)) }
  }
  return stops[stops.length - 1].c.slice()
}

// multi-stop dawn/dusk sky palettes (top -> bottom), interpolated by temperature
const ANCHORS = [
  { t: -15, s: [[8, 12, 40], [16, 36, 84], [40, 80, 132], [96, 140, 176], [196, 200, 206], [130, 140, 168]] },
  { t: 0,  s: [[12, 20, 52], [26, 52, 104], [58, 104, 158], [120, 168, 196], [214, 206, 196], [150, 150, 170]] },
  { t: 10, s: [[12, 24, 60], [26, 64, 120], [58, 120, 168], [140, 186, 198], [238, 206, 160], [206, 160, 120]] },
  { t: 19, s: [[12, 26, 66], [24, 72, 128], [58, 132, 172], [176, 206, 196], [246, 204, 140], [236, 150, 80]] },
  { t: 27, s: [[26, 30, 74], [40, 78, 134], [120, 158, 176], [240, 200, 150], [246, 150, 78], [226, 104, 54]] },
  { t: 36, s: [[46, 34, 82], [96, 80, 138], [200, 150, 150], [250, 180, 120], [245, 120, 64], [216, 58, 44]] },
]
const SKYPOS = [0, 30, 52, 70, 84, 100]

export function buildStops(t) {
  t = Math.max(-15, Math.min(36, t))
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const a = ANCHORS[i], b = ANCHORS[i + 1]
    if (t >= a.t && t <= b.t) { const r = (t - a.t) / (b.t - a.t); return a.s.map((c, k) => c.map((v, j) => lerp(v, b.s[k][j], r))) }
  }
  return (t < ANCHORS[0].t ? ANCHORS[0] : ANCHORS[ANCHORS.length - 1]).s.map((c) => c.slice())
}

// 6-stop RGB array for temperature + weather composition + day/night. (D4: 계절 틴트 없음)
// 이 함수가 컬러 엔진의 단일 진실이며 spec/color-engine.json 골든 케이스와 일치해야 한다.
export function skyStops(tempC, wx, isDay) {
  const temp = tempC == null ? 15 : tempC
  let s = buildStops(temp)
  const w = wx || { sky: 0, precip: 'none' }
  // cloud coverage muting (partly cloudy stays brighter than overcast)
  const mute = [0, 0.06, 0.18, 0.34][w.sky] || 0, dk = [1, 0.98, 0.95, 0.9][w.sky] || 1
  if (mute > 0) s = s.map((c) => mix(c, grey(c), mute).map((v) => v * dk))
  const p = w.precip
  if (p === 'rain' || p === 'showers' || p === 'drizzle' || p === 'sleet') s = s.map((c) => mix(c, grey(c), 0.3).map((v) => v * (p === 'drizzle' ? 0.78 : 0.68)))
  if (p === 'snow' || p === 'sleet') s = s.map((c, i) => mix(c, [255, 255, 255], i < 3 ? 0.16 : 0.3))
  if (w.fog) s = s.map((c) => mix(c, grey(c), 0.5).map((v) => v * 0.92))
  if (w.storm) s = s.map((c) => c.map((v) => v * 0.78))
  if (w.dust) { const amt = w.dust === 2 ? 0.44 : 0.26, ochre = [198, 168, 112]; s = s.map((c) => mix(mix(c, grey(c), 0.28), ochre, amt).map((v) => v * 0.95)) }
  if (isDay === 0) { const nf = [0.4, 0.45, 0.5, 0.55, 0.64, 0.6]; s = s.map((c, i) => mix(c, grey(c), 0.22).map((v) => v * nf[i])) }
  return s.map((c) => c.map((v) => Math.round(Math.max(0, Math.min(255, v)))))
}

export function skyGradient(tempC, wx, isDay) {
  const s = skyStops(tempC, wx, isDay)
  return 'linear-gradient(180deg,' + s.map((c, i) => `${rgb(c)} ${SKYPOS[i]}%`).join(',') + ')'
}
export { ANCHORS, SKYPOS }
