// 라우트 계약. 외부 API 를 타지 않는 경로(카탈로그·입력 검증)만 검사한다.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { app } from '../dist/app.js'

test('GET /v1/catalog: 카탈로그와 ETag', async () => {
  const res = await app.request('/v1/catalog')
  assert.equal(res.status, 200)
  const etag = res.headers.get('etag')
  assert.ok(etag)
  const body = await res.json()
  assert.equal(body.cities.length, 38)
  assert.ok(body.version >= 1)

  const cached = await app.request('/v1/catalog', { headers: { 'if-none-match': etag } })
  assert.equal(cached.status, 304)
})

test('GET /v1/weather/{id}: 형식이 아니면 400, 없는 도시면 404', async () => {
  assert.equal((await app.request('/v1/weather/seoul')).status, 400)
  assert.equal((await app.request('/v1/weather/KR-ZZZ')).status, 404)
})

test('GET /v1/weather: ids 가 없으면 400', async () => {
  assert.equal((await app.request('/v1/weather')).status, 400)
  assert.equal((await app.request('/v1/weather?ids=oops')).status, 400)
})

test('없는 경로는 안내와 함께 404', async () => {
  const res = await app.request('/v2/weather')
  assert.equal(res.status, 404)
  assert.ok((await res.json()).routes.length >= 3)
})

test('GET /health', async () => {
  const body = await (await app.request('/health')).json()
  assert.equal(body.ok, true)
  assert.equal(body.cities, 38)
})
