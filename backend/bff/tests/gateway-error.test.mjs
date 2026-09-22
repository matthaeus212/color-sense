// 공공데이터포털 게이트웨이 오류 분류. 경로 오타(12)를 활용신청 미승인(30)으로 오진해
// 엉뚱한 곳을 6일간 들여다본 적이 있어, 원인 주체를 메시지에 못 박아 두고 테스트로 고정한다.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gatewayError } from '../dist/sources/http.js'

const envelope = (code, msg) => JSON.stringify({
  OpenAPI_ServiceResponse: { cmmMsgHeader: { errMsg: msg, returnAuthMsg: '...', returnReasonCode: code } },
})

test('code 12(경로 없음)는 우리 코드 문제로 안내한다', () => {
  const error = gatewayError('airkorea', envelope('12', 'NO_OPENAPI_SERVICE_ERROR'))
  assert.ok(error)
  assert.match(error.message, /12/)
  assert.match(error.message, /우리 코드 문제/)
  assert.match(error.message, /철자/)
})

test('code 30(키 미등록)은 포털 활용신청 문제로 안내한다', () => {
  const error = gatewayError('airkorea', envelope('30', 'SERVICE_KEY_IS_NOT_REGISTERED_ERROR'))
  assert.ok(error)
  assert.match(error.message, /활용신청/)
  assert.doesNotMatch(error.message, /우리 코드 문제/)
})

test('code 22(한도 초과)는 쿼터 문제로 안내한다', () => {
  assert.match(gatewayError('kma', envelope('22', 'LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR')).message, /한도/)
})

test('XML 봉투도 읽는다 — 천문연은 XML 만 준다', () => {
  const xml = '<response><cmmMsgHeader><errMsg>NO_OPENAPI_SERVICE_ERROR</errMsg><returnReasonCode>12</returnReasonCode></cmmMsgHeader></response>'
  assert.match(gatewayError('astro', xml).message, /12/)
})

test('정상 응답은 오류로 분류하지 않는다', () => {
  assert.equal(gatewayError('kma', JSON.stringify({ response: { header: { resultCode: '00' } } })), null)
  assert.equal(gatewayError('open-meteo', JSON.stringify({ current: { temperature_2m: 21 } })), null)
})

test('모르는 코드도 삼키지 않고 미분류로 알린다', () => {
  assert.match(gatewayError('kma', envelope('99', 'SOMETHING_NEW')).message, /미분류/)
})
