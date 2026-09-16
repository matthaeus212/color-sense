// 실 API 응답 픽스처 -> CityWeather 조립. 계약 스키마를 통과하는지까지 확인한다.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildFromKma } from '../dist/build/kmaCity.js'
import { buildFromOpenMeteo } from '../dist/build/openMeteoCity.js'
import { cityWeatherSchema } from '../dist/contract.js'
import { cityById } from '../dist/catalog.js'

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))
const kmaFx = fixture('kma-KR-SEL.json')
const omFx = fixture('open-meteo-JP-TYO.json')

const seoul = cityById('KR-SEL')
const tokyo = cityById('JP-TYO')
const noAir = { airQuality: { kind: 'unavailable' }, pm10Grade: null }
const sun = { sunrise: '2026-09-16T06:14:00+09:00', sunset: '2026-09-16T18:39:00+09:00' }

const buildSeoul = (over = {}) => buildFromKma(
  seoul,
  { ncst: Object.fromEntries(kmaFx.ncst.map((i) => [i.category, i.obsrValue])), ultra: kmaFx.ultra, vilage: kmaFx.vilage, midLand: kmaFx.midLand, midTa: kmaFx.midTa, air: noAir, sun, ...over },
  kmaFx.capturedAtMs,
)

test('기상청: 계약 스키마를 통과하고 24시간·7일을 채운다', () => {
  const w = buildSeoul()
  cityWeatherSchema.parse(w)
  assert.equal(w.source, 'kma')
  assert.equal(w.cityId, 'KR-SEL')
  assert.equal(w.utcOffsetSec, 32400)
  assert.equal(w.hourly.length, 24)
  assert.equal(w.daily.length, 7)
})

test('기상청: 시간별은 1시간 간격으로 이어진다', () => {
  const times = buildSeoul().hourly.map((h) => Date.parse(h.time))
  for (let i = 1; i < times.length; i++) assert.equal(times[i] - times[i - 1], 3600e3, `${i}번째 간격`)
})

test('기상청: 일별 날짜가 오늘부터 하루씩 이어지고 hi >= lo', () => {
  const daily = buildSeoul().daily
  for (let i = 1; i < daily.length; i++) {
    assert.equal(Date.parse(daily[i].date) - Date.parse(daily[i - 1].date), 86400e3, daily[i].date)
  }
  for (const d of daily) assert.ok(d.hi >= d.lo, `${d.date} hi ${d.hi} lo ${d.lo}`)
})

test('기상청: updatedAt 은 발표분 시각, nextUpdateAt 은 그 뒤', () => {
  const w = buildSeoul()
  assert.match(w.updatedAt, /\+09:00$/)
  assert.match(w.nextUpdateAt, /\+09:00$/)
  assert.ok(Date.parse(w.nextUpdateAt) > Date.parse(w.updatedAt))
  assert.equal(w.current.time, w.updatedAt)
})

test('기상청: 에어코리아 등급이 현재 dust 에 반영된다 (예보 시간대는 건드리지 않는다)', () => {
  const dusty = buildSeoul({ air: { airQuality: { kind: 'observed', pm10: 160, pm25: 70, grade: 4 }, pm10Grade: 4 } })
  assert.equal(dusty.current.wx.dust, 1)
  assert.equal(dusty.airQuality.kind, 'observed')
  assert.ok(dusty.hourly.every((h) => h.wx.dust === 0))
})

test('기상청: 실황에 기온이 없으면 예외 — 폴백으로 넘어가야 한다', () => {
  assert.throws(() => buildSeoul({ ncst: { PTY: '0' } }), /T1H/)
})

test('기상청: 단기예보가 24칸에 못 미치면 예외', () => {
  assert.throws(() => buildSeoul({ vilage: kmaFx.vilage.slice(0, 40) }), /24칸|시간이/)
})

test('Open-Meteo: 계약 스키마를 통과하고 현재 시각부터 24칸을 만든다', () => {
  const w = buildFromOpenMeteo(tokyo, omFx, { pm10: 13.2, pm25: 12.3, dust: 0.4 }, Date.parse(`${omFx.current.time}+09:00`), 'open-meteo')
  cityWeatherSchema.parse(w)
  assert.equal(w.source, 'open-meteo')
  assert.equal(w.hourly.length, 24)
  assert.equal(w.daily.length, 7)
  assert.equal(w.airQuality.kind, 'forecast')
  assert.equal(w.hourly[0].time.slice(0, 13), w.current.time.slice(0, 13))
})

test('Open-Meteo: 폴백일 때 source 에 드러난다 (배경색은 그대로, 배지만 다르다)', () => {
  const now = Date.parse(`${omFx.current.time}+09:00`)
  const normal = buildFromOpenMeteo(tokyo, omFx, null, now, 'open-meteo')
  const fallback = buildFromOpenMeteo(tokyo, omFx, null, now, 'open-meteo-fallback')
  assert.equal(fallback.source, 'open-meteo-fallback')
  assert.deepEqual(fallback.current.wx, normal.current.wx)
  assert.equal(fallback.airQuality.kind, 'unavailable')
})
