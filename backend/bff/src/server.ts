// 로컬 실행 엔트리. 배포(Lambda)는 Mark의 CDK 스택에서 별도 핸들러로 감싼다.
import { serve } from '@hono/node-server'
import { app } from './app.js'
import { config, hasKmaKeys } from './config.js'

serve({ fetch: app.fetch, port: config.port }, (info) => {
  const keys = hasKmaKeys() ? '기상청 키 있음' : '기상청 키 없음 — 한국 도시는 Open-Meteo 폴백으로 응답'
  console.log(`ColorSense BFF  http://localhost:${info.port}/v1/weather/KR-SEL  (${keys})`)
})
