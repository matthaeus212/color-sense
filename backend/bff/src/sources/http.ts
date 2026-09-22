import { config } from '../config.js'

export class SourceError extends Error {
  constructor(public source: string, message: string) {
    super(`${source}: ${message}`)
    this.name = 'SourceError'
  }
}

export const qs = (params: Record<string, string | number>) =>
  Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')

export async function getText(source: string, url: string): Promise<string> {
  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(config.fetchTimeoutMs) })
  } catch (e) {
    throw new SourceError(source, e instanceof Error ? e.message : 'fetch failed')
  }
  const body = await res.text()
  // 게이트웨이 오류는 HTTP 400/403 으로 오므로 상태 검사보다 먼저 분류한다
  const classified = gatewayError(source, body)
  if (classified) throw classified
  if (!res.ok) throw new SourceError(source, `HTTP ${res.status} ${body.slice(0, 120)}`)
  return body
}

export async function getJson<T>(source: string, url: string): Promise<T> {
  const body = await getText(source, url)
  try {
    return JSON.parse(body) as T
  } catch {
    // 공공데이터포털은 오류 시 JSON 대신 XML/HTML 을 돌려준다
    throw new SourceError(source, `not JSON: ${body.slice(0, 160)}`)
  }
}

// 공공데이터포털 게이트웨이 오류 코드. 원인이 우리 쪽인지 포털 쪽인지 메시지로 못 박아 둔다 —
// 경로 오타(12)를 활용신청 미승인으로 오진하느라 시간을 버린 적이 있다.
const GATEWAY_CODES: Record<string, string> = {
  '10': '요청 파라미터가 잘못됐다 — 우리 코드 문제',
  '12': '그 경로에 서비스가 없다(폐기 또는 오타) — 우리 코드 문제. 서비스명 철자를 확인하라',
  '20': '서비스 접근이 거부됐다 — 포털에서 활용신청 상태 확인',
  '22': '요청 한도를 초과했다 — 쿼터 문제',
  '30': '이 키에 서비스가 등록되지 않았다 — 포털에서 활용신청 필요',
  '31': '활용기간이 만료됐다 — 포털에서 연장 필요',
  '32': '등록되지 않은 도메인·IP — 포털 설정 확인',
}

/// 게이트웨이 오류 봉투(JSON·XML 둘 다)를 찾으면 SourceError 로 바꾼다. 아니면 null.
export function gatewayError(source: string, body: string): SourceError | null {
  if (!body.includes('cmmMsgHeader')) return null
  const code = body.match(/"returnReasonCode"\s*:\s*"?(\d+)|<returnReasonCode>(\d+)/)
  const msg = body.match(/"errMsg"\s*:\s*"([^"]*)|<errMsg>([^<]*)/)
  const key = code?.[1] ?? code?.[2] ?? '?'
  const name = msg?.[1] ?? msg?.[2] ?? 'unknown'
  return new SourceError(source, `게이트웨이 오류 ${key} ${name} — ${GATEWAY_CODES[key] ?? '원인 미분류'}`)
}
