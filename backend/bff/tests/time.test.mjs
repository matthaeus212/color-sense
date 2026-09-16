// 기상청 발표 시각 규칙 (api-contract.md §4). 발표 전 시각을 요청하면 빈 응답이 오므로 여기가 틀리면 전부 폴백된다.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { kmaSlotMs, localIso, midTmFc, ncstBase, nextKmaUpdateMs, ultraFcstBase, vilageBase, KST_OFFSET_SEC } from '../dist/time.js'

// KST 기준 시각을 epoch ms 로
const kst = (y, m, d, h, min = 0) => Date.UTC(y, m - 1, d, h, min) - KST_OFFSET_SEC * 1000

test('초단기실황: 매시 :40 이후에야 그 시각 발표분을 쓴다', () => {
  assert.deepEqual(ncstBase(kst(2026, 9, 16, 11, 39)), { base_date: '20260916', base_time: '1000' })
  assert.deepEqual(ncstBase(kst(2026, 9, 16, 11, 40)), { base_date: '20260916', base_time: '1100' })
  // 자정 직후에는 전날 23시 발표분
  assert.deepEqual(ncstBase(kst(2026, 9, 16, 0, 10)), { base_date: '20260915', base_time: '2300' })
})

test('초단기예보: 매시 :30 발표, :45 이후 제공', () => {
  assert.deepEqual(ultraFcstBase(kst(2026, 9, 16, 11, 44)), { base_date: '20260916', base_time: '1030' })
  assert.deepEqual(ultraFcstBase(kst(2026, 9, 16, 11, 45)), { base_date: '20260916', base_time: '1130' })
})

test('단기예보: 02·05·08·11·14·17·20·23시 발표, :10 이후 제공', () => {
  assert.deepEqual(vilageBase(kst(2026, 9, 16, 11, 9)), { base_date: '20260916', base_time: '0800' })
  assert.deepEqual(vilageBase(kst(2026, 9, 16, 11, 10)), { base_date: '20260916', base_time: '1100' })
  assert.deepEqual(vilageBase(kst(2026, 9, 16, 13, 0)), { base_date: '20260916', base_time: '1100' })
  assert.deepEqual(vilageBase(kst(2026, 9, 16, 1, 0)), { base_date: '20260915', base_time: '2300' })
})

test('중기예보: 06·18시 발표분', () => {
  assert.equal(midTmFc(kst(2026, 9, 16, 11, 0)), '202609160600')
  assert.equal(midTmFc(kst(2026, 9, 16, 19, 0)), '202609161800')
  assert.equal(midTmFc(kst(2026, 9, 16, 5, 0)), '202609151800')
})

test('다음 갱신 시각은 다음 :40', () => {
  assert.equal(nextKmaUpdateMs(kst(2026, 9, 16, 11, 39)) - kst(2026, 9, 16, 11, 39), 60e3)
  assert.equal(nextKmaUpdateMs(kst(2026, 9, 16, 11, 40)) - kst(2026, 9, 16, 11, 40), 60 * 60e3)
})

test('localIso · kmaSlotMs 왕복', () => {
  assert.equal(localIso(kst(2026, 9, 16, 5, 0), KST_OFFSET_SEC), '2026-09-16T05:00:00+09:00')
  assert.equal(localIso(kst(2026, 1, 1, 0, 0), 0), '2025-12-31T15:00:00+00:00')
  assert.equal(kmaSlotMs('20260916', '1400'), kst(2026, 9, 16, 14))
})
