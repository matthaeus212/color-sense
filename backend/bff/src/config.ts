// 환경 설정. 키는 배포 환경에서 SSM Parameter Store -> 환경변수로 주입된다(infra/README.md).
// 로컬은 backend/.env.local 을 export 해서 쓴다.

export const config = {
  port: Number(process.env.PORT || 8788),
  kmaKey: process.env.KMA_KEY || '',
  airKey: process.env.AIR_KEY || '',
  astroKey: process.env.ASTRO_KEY || '',
  // 외부 API 한 건당 제한 시간. Lambda 기본 타임아웃보다 넉넉히 짧게 잡는다.
  fetchTimeoutMs: Number(process.env.FETCH_TIMEOUT_MS || 6000),
  corsOrigin: process.env.CORS_ORIGIN || '*',
}

export const hasKmaKeys = () => config.kmaKey.length > 0
