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
