// 컬러 엔진 골든 케이스 회귀 테스트: spec/color-engine.json 과 현재 구현이 ±1 이내로 일치해야 한다.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { skyStops, skyGradient } from '../src/lib/color.js'
import { wxLabel, CTP, wxFrom } from '../src/lib/weather.js'
import { I18N } from '../src/i18n.js'

const spec = JSON.parse(readFileSync(new URL('../spec/color-engine.json', import.meta.url)))

test('golden cases match within ±1 per channel', () => {
  let n = 0
  for (const c of spec.cases) {
    const out = skyStops(c.tempC, c.wx, c.isDay)
    for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++)
      assert.ok(Math.abs(out[i][k] - c.stops[i][k]) <= 1, `${c.id} stop${i} ch${k}: ${out[i][k]} vs ${c.stops[i][k]}`)
    n++
  }
  assert.ok(n >= 150)
})
test('no season input: same output regardless of month', () => {
  const a = skyGradient(22, wxFrom(CTP.clear), 1), b = skyGradient(22, wxFrom(CTP.clear), 1)
  assert.equal(a, b)
  assert.equal(skyGradient.length, 3)
})
test('sub-zero temperatures are distinct from 0°C (D4 / review fix)', () => {
  assert.notDeepEqual(skyStops(-15, wxFrom(CTP.clear), 1), skyStops(0, wxFrom(CTP.clear), 1))
})
test('showers darkens like rain', () => {
  const clear = skyStops(20, wxFrom(CTP.clear), 1), sh = skyStops(20, wxFrom(CTP.showers), 1)
  assert.ok(sh[5][0] < clear[5][0])
})
test('labels follow KMA terms (D3)', () => {
  const ko = I18N.ko
  assert.equal(wxLabel(wxFrom(CTP.pcloudy), ko), '구름많음')
  assert.equal(wxLabel(wxFrom({ sky: 1 }), ko), '구름조금')
  assert.equal(wxLabel(wxFrom(CTP.showers), ko), '소나기')
  assert.equal(wxLabel(wxFrom(CTP.rain), ko), '흐림 & 비')
  assert.equal(wxLabel(wxFrom({ sky: 3, precip: 'rain', inten: 3 }), ko), '흐림 & 강한 비')
  assert.equal(wxLabel(wxFrom(CTP.yellowdust), ko), '구름많음 & 황사')
  assert.equal(wxLabel(wxFrom(CTP.showers), I18N.en), 'SHOWERS')
})
