// 컬러 엔진 골든 케이스 생성기. spec/golden-cases.json 을 갱신하고 마크다운 표를 stdout 으로 출력한다.
// 사용: node scripts/gen-golden.mjs > /dev/null  (JSON 갱신)  |  node scripts/gen-golden.mjs --md (표 출력)
import { writeFileSync } from 'node:fs'
import { skyStops, ANCHORS, SKYPOS, BOT } from '../src/lib/color.js'
import { CTP, wxFrom } from '../src/lib/weather.js'

const TEMPS = [-15, -5, 0, 10, 19, 27, 36]
const cases = []
for (const [preset, comp] of Object.entries(CTP)) {
  for (const isDay of [1, 0]) {
    for (const t of TEMPS) {
      const wx = wxFrom(comp)
      cases.push({ id: `${preset}/${isDay ? 'day' : 'night'}/${t}`, preset, tempC: t, isDay, wx, stops: skyStops(t, wx, isDay) })
    }
  }
}
const spec = {
  version: 1, generatedAt: new Date().toISOString().slice(0, 10),
  algorithm: 'src/lib/color.js skyStops()',
  positions: SKYPOS, anchors: ANCHORS, weeklyBar: BOT,
  rules: {
    clampTempC: [-15, 36],
    cloudMute: [0, 0.06, 0.18, 0.34], cloudDarken: [1, 0.98, 0.95, 0.9],
    wet: { precip: ['rain', 'showers', 'drizzle', 'sleet'], greyMix: 0.3, darken: 0.68, drizzleDarken: 0.78 },
    snow: { precip: ['snow', 'sleet'], whiteMixTop3: 0.16, whiteMixBottom3: 0.3 },
    fog: { greyMix: 0.5, darken: 0.92 }, storm: { darken: 0.78 },
    dust: { ochre: [198, 168, 112], greyMix: 0.28, amount: { 1: 0.26, 2: 0.44 }, darken: 0.95 },
    night: { greyMix: 0.22, factors: [0.4, 0.45, 0.5, 0.55, 0.64, 0.6] },
    order: ['temp-interp', 'cloud', 'wet', 'snow', 'fog', 'storm', 'dust', 'night', 'round-clamp'],
    seasonTint: 'removed (D4, 2026-09-14)',
  },
  presets: Object.fromEntries(Object.entries(CTP).map(([k, v]) => [k, wxFrom(v)])),
  cases,
}
writeFileSync(new URL('../spec/color-engine.json', import.meta.url), JSON.stringify(spec, null, 1))
if (process.argv.includes('--md')) {
  const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
  console.log('| 프리셋 | 주/야 | 온도 | top | … | bottom |\n|---|---|---|---|---|---|')
  for (const c of cases.filter((c) => [-5, 10, 27].includes(c.tempC)))
    console.log(`| ${c.preset} | ${c.isDay ? 'day' : 'night'} | ${c.tempC}° | ${hex(c.stops[0])} | ${hex(c.stops[2])} · ${hex(c.stops[3])} | ${hex(c.stops[5])} |`)
}
console.error(`${cases.length} cases written`)
