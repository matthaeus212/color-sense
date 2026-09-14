// 기상청 → 공통 모델 매핑 테이블 테스트 (docs/02 §2-1 표와 1:1). node --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fromKma, mmFrom, skyFromKma, precipFromPty } from '../src/lib/kma.js'
import { fromWmo } from '../src/lib/model.js'

const rows = [
  // [설명, 입력, 기대]
  ['맑음', { SKY: 1, PTY: 0 }, { sky: 0, precip: 'none', fog: false, storm: false, dust: 0 }],
  ['구름많음', { SKY: 3, PTY: 0 }, { sky: 2, precip: 'none' }],
  ['흐림', { SKY: 4, PTY: 0 }, { sky: 3, precip: 'none' }],
  ['비 약', { SKY: 4, PTY: 1, PCP: '1.0mm 미만' }, { sky: 3, precip: 'rain', inten: 1 }],
  ['비 보통', { SKY: 4, PTY: 1, PCP: '5.0' }, { sky: 3, precip: 'rain', inten: 2 }],
  ['비 강(구간)', { SKY: 4, PTY: 1, PCP: '30.0~50.0mm' }, { sky: 3, precip: 'rain', inten: 3 }],
  ['실황 RN1 우선', { SKY: 4, PTY: 1, PCP: '1.0mm 미만', RN1: 20 }, { precip: 'rain', inten: 3 }],
  ['빗방울=이슬비', { SKY: 4, PTY: 5, PCP: '강수없음' }, { precip: 'drizzle', inten: 1 }],
  ['비/눈', { SKY: 4, PTY: 2, PCP: '3.0' }, { precip: 'sleet', inten: 2 }],
  ['빗방울눈날림', { SKY: 3, PTY: 6 }, { precip: 'sleet' }],
  ['눈 약', { SKY: 4, PTY: 3, SNO: '1.0cm 미만' }, { precip: 'snow', inten: 1 }],
  ['눈 강', { SKY: 4, PTY: 3, SNO: '5.0cm 이상' }, { precip: 'snow', inten: 3 }],
  ['눈날림', { SKY: 4, PTY: 7, SNO: '적설없음' }, { precip: 'snow', inten: 1 }],
  ['소나기', { SKY: 3, PTY: 4, PCP: '5.0' }, { sky: 2, precip: 'showers', inten: 2 }],
  ['소나기 SKY 결측', { PTY: 4, PCP: '5.0' }, { sky: 2, precip: 'showers' }],
  ['비 SKY 결측→흐림', { PTY: 1, PCP: '5.0' }, { sky: 3, precip: 'rain' }],
  ['낙뢰 LGT', { SKY: 4, PTY: 1, PCP: '10.0', LGT: 1 }, { storm: true, precip: 'rain' }],
  ['뇌전 특보', { SKY: 4, PTY: 1, PCP: '10.0', warnings: ['뇌전주의보'] }, { storm: true }],
  ['안개 시정', { SKY: 4, PTY: 0, VIS: 600 }, { fog: true }],
  ['안개 특보', { SKY: 4, PTY: 0, warnings: ['안개'] }, { fog: true }],
  ['시정 양호', { SKY: 1, PTY: 0, VIS: 15000 }, { fog: false }],
  ['미세먼지 나쁨', { SKY: 3, PTY: 0, pm10Grade: 3 }, { dust: 1 }],
  ['미세먼지 매우나쁨', { SKY: 3, PTY: 0, pm10Grade: 4 }, { dust: 1 }],
  ['보통은 dust 0', { SKY: 3, PTY: 0, pm10Grade: 2 }, { dust: 0 }],
  ['황사 우선', { SKY: 3, PTY: 0, pm10Grade: 4, yellowDust: true }, { dust: 2 }],
  ['전부 결측', {}, { sky: 2, precip: 'none', inten: 2, fog: false, storm: false, dust: 0 }],
]
for (const [name, input, expect] of rows) {
  test(`fromKma: ${name}`, () => {
    const out = fromKma(input)
    for (const k of Object.keys(expect)) assert.equal(out[k], expect[k], `${k}`)
  })
}

test('mmFrom parses KMA strings', () => {
  assert.equal(mmFrom('강수없음'), 0)
  assert.equal(mmFrom('1.0mm 미만'), 0.5)
  assert.equal(mmFrom('12.5'), 12.5)
  assert.equal(mmFrom('30.0~50.0mm'), 30)
  assert.equal(mmFrom('50.0mm 이상'), 50)
  assert.equal(mmFrom(7), 7)
  assert.equal(mmFrom(null), 0)
})
test('skyFromKma / precipFromPty tables', () => {
  assert.deepEqual([1, 3, 4, 2, undefined].map(skyFromKma), [0, 2, 3, 2, 2])
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 9].map(precipFromPty), ['none', 'rain', 'sleet', 'snow', 'showers', 'drizzle', 'sleet', 'snow', 'none'])
})
test('fromWmo keeps prototype table and maps showers separately', () => {
  assert.deepEqual(fromWmo(0), { sky: 0, precip: 'none', inten: 2, fog: false, storm: false, dust: 0 })
  assert.equal(fromWmo(81).precip, 'showers')
  assert.equal(fromWmo(95).storm, true)
  assert.equal(fromWmo(45).fog, true)
  assert.equal(fromWmo(999).sky, 2)
  assert.equal(fromWmo(3, 2).dust, 2)
})
