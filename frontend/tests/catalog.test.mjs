// 카탈로그 정합성 (오프라인). 실제 API 응답 확인은 scripts/catalog-smoke.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const cat = JSON.parse(readFileSync(new URL('../../database/catalog.json', import.meta.url)))

test('ids unique and well-formed', () => {
  const ids = cat.cities.map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const id of ids) assert.match(id, /^[A-Z]{2}-[A-Z]{3}$/)
})
test('required fields per source', () => {
  for (const c of cat.cities) {
    assert.ok(c.name.ko && c.name.en && c.countryName.ko && c.countryName.en, c.id)
    assert.ok(Math.abs(c.lat) <= 90 && Math.abs(c.lon) <= 180, c.id)
    assert.ok(/\//.test(c.tz), c.id)
    if (c.source === 'kma') {
      assert.equal(c.country, 'KR', c.id)
      assert.ok(Number.isInteger(c.kma.nx) && Number.isInteger(c.kma.ny), c.id)
      assert.match(c.kma.regLand, /^1[1-9][A-H]\d{5}$/, c.id)
      assert.match(c.kma.regTemp, /^[12]1[A-H]\d{5}$/, c.id)
      assert.ok(c.kma.airStation, c.id)
    } else assert.equal(c.source, 'open-meteo', c.id)
  }
})
test('KMA grid roughly matches lat/lon (Lambert grid sanity)', () => {
  // 서울(60,127) 기준 위도 1° ≈ 격자 22칸, 경도 1° ≈ 격자 18칸 (근사)
  const seoul = cat.cities.find((c) => c.id === 'KR-SEL')
  for (const c of cat.cities.filter((c) => c.source === 'kma')) {
    const ex = seoul.kma.nx + (c.lon - seoul.lon) * 18, ey = seoul.kma.ny + (c.lat - seoul.lat) * 22
    assert.ok(Math.abs(c.kma.nx - ex) < 6 && Math.abs(c.kma.ny - ey) < 6, `${c.id} nx/ny ${c.kma.nx},${c.kma.ny} expected ≈${ex.toFixed(0)},${ey.toFixed(0)}`)
  }
})
