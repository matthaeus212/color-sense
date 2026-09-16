// 웹(frontend/src/lib)과 코어 패키지가 같은 결과를 내는지 검증한다.
// Lisiena가 웹을 @colorsense/core로 옮기기 전까지 두 구현이 공존하므로, 이 테스트가 갈라짐을 막는 장치다.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as core from '../dist/index.js'
import * as webKma from '../../../frontend/src/lib/kma.js'
import * as webModel from '../../../frontend/src/lib/model.js'

const SKY = [1, 3, 4, 2, null, undefined]
const PTY = [0, 1, 2, 3, 4, 5, 6, 7, 9]
const PCP = ['강수없음', '1.0mm 미만', '5.0', '30.0~50.0mm', '50.0mm 이상', 12.5, null]
const SNO = ['적설없음', '1.0cm 미만', '2.3', '5.0cm 이상', null]
const EXTRA = [{}, { LGT: 1 }, { VIS: 600 }, { VIS: 15000 }, { warnings: ['뇌전주의보'] }, { warnings: ['안개'] }, { pm10Grade: 3 }, { pm10Grade: 4, yellowDust: true }, { RN1: 20 }]

test('fromKma: 웹 구현과 전 조합 일치', () => {
  let n = 0
  for (const sky of SKY) for (const pty of PTY) for (const pcp of PCP) for (const sno of SNO) for (const extra of EXTRA) {
    const input = { SKY: sky, PTY: pty, PCP: pcp, SNO: sno, ...extra }
    assert.deepEqual(core.fromKma(input), webKma.fromKma(input), JSON.stringify(input))
    n++
  }
  assert.ok(n > 5000, `조합 수 ${n}`)
})

test('mmFrom · skyFromKma · precipFromPty · dustFromAirKorea 일치', () => {
  for (const v of [...PCP, ...SNO, '', 0]) assert.equal(core.mmFrom(v), webKma.mmFrom(v), String(v))
  for (const v of SKY) assert.equal(core.skyFromKma(v), webKma.skyFromKma(v))
  for (const v of PTY) assert.equal(core.precipFromPty(v), webKma.precipFromPty(v))
  for (const g of [null, 1, 2, 3, 4]) for (const y of [false, true]) {
    assert.equal(core.dustFromAirKorea(g, y), webKma.dustFromAirKorea(g, y))
  }
})

test('fromWmo · dustFromOpenMeteo · catOf · dataState 일치', () => {
  for (let code = 0; code <= 100; code++) for (const dust of [0, 1, 2]) {
    assert.deepEqual(core.fromWmo(code, dust), webModel.fromWmo(code, dust), `wmo ${code}/${dust}`)
  }
  for (const pm10 of [0, 80, 150, 300]) for (const dust of [0, 80, 200]) {
    assert.equal(core.dustFromOpenMeteo({ pm10, dust }), webModel.dustFromOpenMeteo({ pm10, dust }))
  }
  for (let code = 0; code <= 100; code++) assert.equal(core.catOf(core.fromWmo(code)), webModel.catOf(webModel.fromWmo(code)))

  const now = Date.parse('2026-09-16T12:00:00Z')
  const cases = [
    { updatedAt: new Date(now - 5 * 60e3).toISOString(), nextUpdateAt: new Date(now + 25 * 60e3).toISOString() },
    { updatedAt: new Date(now - 70 * 60e3).toISOString(), nextUpdateAt: new Date(now - 40 * 60e3).toISOString() },
    { updatedAt: new Date(now - 4 * 3600e3).toISOString(), nextUpdateAt: new Date(now - 3.5 * 3600e3).toISOString() },
    { updatedAt: null, nextUpdateAt: null },
  ]
  for (const c of cases) for (const online of [true, false]) {
    assert.equal(core.dataState(c, now, online), webModel.dataState(c, now, online), JSON.stringify(c))
  }
})

test('fromMidTermWf: 중기예보 문자열 매핑 (코어 전용)', () => {
  const rows = [
    ['맑음', { sky: 0, precip: 'none' }],
    ['구름많음', { sky: 2, precip: 'none' }],
    ['흐림', { sky: 3, precip: 'none' }],
    ['구름많음/비', { sky: 2, precip: 'rain', inten: 2 }],
    ['흐림/비', { sky: 3, precip: 'rain' }],
    ['흐림/눈', { sky: 3, precip: 'snow' }],
    ['흐림/비/눈', { sky: 3, precip: 'sleet' }],
    ['구름많음/소나기', { sky: 2, precip: 'showers', inten: 1 }],
    ['', { sky: 0, precip: 'none' }],
  ]
  for (const [wf, expect] of rows) {
    const out = core.fromMidTermWf(wf)
    for (const k of Object.keys(expect)) assert.equal(out[k], expect[k], `${wf} ${k}`)
  }
})
