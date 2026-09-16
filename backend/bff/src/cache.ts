// 도시별 응답 캐시. nextUpdateAt 까지는 같은 응답을 재사용해 공공데이터 쿼터를 지킨다.
// 배포 시에는 DynamoDB(TTL 24h)로 옮긴다(infra/README.md) — 인터페이스는 그대로 두고 구현만 바꾼다.

interface Entry<T> { value: T; expiresAtMs: number }

export class TtlCache<T> {
  private map = new Map<string, Entry<T>>()

  get(key: string, nowMs: number): T | undefined {
    const hit = this.map.get(key)
    if (!hit) return undefined
    if (hit.expiresAtMs <= nowMs) {
      this.map.delete(key)
      return undefined
    }
    return hit.value
  }

  set(key: string, value: T, expiresAtMs: number): void {
    this.map.set(key, { value, expiresAtMs })
  }

  get size(): number {
    return this.map.size
  }
}
