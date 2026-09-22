// 카탈로그 스모크(온라인): 외부 소스가 실제로 응답하는지 도시별로 확인한다.
//   한국  — 기상청 초단기실황·단기예보·중기기온, 에어코리아 측정소, 천문연 출몰시각
//   해외  — Open-Meteo (키 없음)
//
// 사용: KMA_KEY=… AIR_KEY=… ASTRO_KEY=… npm run smoke -- [cityId ...]
//       (키는 backend/.env.local. set -a; . backend/.env.local; set +a 로 넣으면 된다)
//
// 왜 이 스크립트가 있나: 서비스 경로 오타(ArpltnInfrInqireSvc)와 잘못된 측정소명이 각각
// "미승인"·"데이터 없음"처럼 보여 오진한 적이 있다. 게이트웨이 오류 코드를 분류하고
// 빈 응답은 재시도해서, 우리 코드 문제 / 포털 신청 문제 / 일시적 장애를 구분한다.
import { readFileSync } from 'node:fs'

const cat = JSON.parse(readFileSync(new URL('../../database/catalog.json', import.meta.url)))
const KMA = process.env.KMA_KEY, AIR = process.env.AIR_KEY, ASTRO = process.env.ASTRO_KEY
const only = process.argv.slice(2)

const pad = (n) => String(n).padStart(2, '0')
const kst = (ms) => new Date(ms + 9 * 3600e3)
const nowMs = Date.now()
const obs = kst(nowMs - 60 * 60e3) // 1시간 전 실황(발표 지연 고려)
const ymd = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
const today = ymd(kst(nowMs))
const base = ymd(obs), hh = `${pad(obs.getUTCHours())}00`
const tmFc = `${today}${kst(nowMs).getUTCHours() < 18 ? '0600' : '1800'}`

// 공공데이터포털 게이트웨이 오류 코드 → 누가 고쳐야 하는지
const GATEWAY = {
  10: ['우리', '요청 파라미터 오류'],
  12: ['우리', '경로에 서비스가 없음(폐기·오타) — 서비스명 철자 확인'],
  20: ['포털', '접근 거부 — 활용신청 상태 확인'],
  22: ['쿼터', '요청 한도 초과'],
  30: ['포털', '이 키에 서비스 미등록 — 활용신청 필요'],
  31: ['포털', '활용기간 만료'],
  32: ['포털', '미등록 도메인·IP'],
}

const qs = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')

// 빈 응답은 게이트웨이가 간헐적으로 내므로 재시도한다 — 일시적인 것과 진짜 오류를 가른다
async function probe(url, pick, tries = 3) {
  let last = { state: 'FAIL', detail: '시도 없음' }
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(12000) })
      const text = await r.text()
      if (text.includes('cmmMsgHeader')) {
        const code = Number(text.match(/"returnReasonCode"\s*:\s*"?(\d+)|<returnReasonCode>(\d+)/)?.slice(1).find(Boolean))
        const [who, why] = GATEWAY[code] ?? ['?', '원인 미분류']
        return { state: 'ERROR', detail: `code ${code} [${who}] ${why}` }
      }
      let body
      try { body = JSON.parse(text) } catch { body = { raw: text } }
      const got = pick(body)
      if (got) return { state: 'OK', detail: got }
      last = { state: 'EMPTY', detail: body?.response?.header?.resultMsg ?? body?.raw?.slice(0, 80) ?? '데이터 없음' }
    } catch (e) {
      last = { state: 'FAIL', detail: e.message }
    }
  }
  return last
}

const B_KMA = 'https://apis.data.go.kr/1360000'
const kmaItems = (b) => {
  if (b?.response?.header?.resultCode !== '00') return null
  const it = b.response.body?.items?.item
  const arr = Array.isArray(it) ? it : it ? [it] : []
  return arr.length ? `${arr.length}건` : null
}

const cities = cat.cities.filter((c) => !only.length || only.includes(c.id))
const tally = {}
const actions = []
const note = (state, source, city, detail) => {
  tally[source] ??= { OK: 0, other: 0 }
  tally[source][state === 'OK' ? 'OK' : 'other']++
  if (state !== 'OK') actions.push(`${city} ${source}: ${state} ${detail}`)
}

for (const c of cities) {
  const row = { id: c.id, name: c.name.ko }
  if (c.source === 'kma') {
    if (!KMA) { console.error('KMA_KEY 필요 (공공데이터포털 일반 인증키, 디코딩 값)'); process.exit(2) }
    const k = c.kma
    row.ncst = await probe(`${B_KMA}/VilageFcstInfoService_2.0/getUltraSrtNcst?${qs({ serviceKey: KMA, dataType: 'JSON', numOfRows: 10, pageNo: 1, base_date: base, base_time: hh, nx: k.nx, ny: k.ny })}`, kmaItems)
    row.vilage = await probe(`${B_KMA}/VilageFcstInfoService_2.0/getVilageFcst?${qs({ serviceKey: KMA, dataType: 'JSON', numOfRows: 10, pageNo: 1, base_date: base, base_time: '0500', nx: k.nx, ny: k.ny })}`, kmaItems)
    row.midTa = await probe(`${B_KMA}/MidFcstInfoService/getMidTa?${qs({ serviceKey: KMA, dataType: 'JSON', numOfRows: 10, pageNo: 1, regId: k.regTemp, tmFc })}`, kmaItems)
    if (AIR) {
      row.air = await probe(
        `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?${qs({ serviceKey: AIR, returnType: 'json', numOfRows: 1, pageNo: 1, stationName: k.airStation, dataTerm: 'DAILY', ver: '1.3' })}`,
        (b) => (b?.response?.body?.items?.[0] ? `pm10=${b.response.body.items[0].pm10Value}` : null),
      )
      if (row.air.state === 'EMPTY') actions.push(`  → ${c.name.ko}: 측정소 "${k.airStation}" 이름을 에어코리아 목록과 대조하라(시도별 조회로 확인)`)
    }
    if (ASTRO) {
      row.astro = await probe(
        `https://apis.data.go.kr/B090041/openapi/service/RiseSetInfoService/getAreaRiseSetInfo?${qs({ serviceKey: ASTRO, locdate: today, location: c.name.ko })}`,
        (b) => (b?.raw?.match(/<sunrise>\s*(\d{4})/) ? `일출 ${b.raw.match(/<sunrise>\s*(\d{4})/)[1]}` : null),
      )
    }
  } else {
    row.openMeteo = await probe(
      `https://api.open-meteo.com/v1/forecast?${qs({ latitude: c.lat, longitude: c.lon, current: 'temperature_2m,weather_code', timezone: 'auto' })}`,
      (b) => (b?.current?.temperature_2m != null ? `${b.current.temperature_2m}°C` : null),
    )
  }

  const parts = []
  for (const [source, r] of Object.entries(row)) {
    if (source === 'id' || source === 'name') continue
    note(r.state, source, c.id, r.detail)
    parts.push(`${source}=${r.state === 'OK' ? 'OK' : r.state}`)
  }
  console.log(`${c.id.padEnd(7)} ${c.name.ko.padEnd(6)} ${parts.join(' ')}${c.kma?.verify ? '  <verify>' : ''}`)
}

console.log('\n=== 소스별 집계 ===')
for (const [source, t] of Object.entries(tally)) console.log(`  ${source.padEnd(10)} OK ${t.OK} / 문제 ${t.other}`)

if (actions.length) {
  console.log('\n=== 확인할 것 ===')
  for (const a of actions) console.log(`  ${a}`)
  process.exitCode = 1
} else {
  console.log('\n모든 소스가 응답한다.')
  const pending = cities.filter((c) => c.kma?.verify).map((c) => `${c.id}(${c.kma.airStation})`)
  // 응답이 온다고 그 측정소가 그 도시를 대표한다는 뜻은 아니다 — 좌표 대조는 별도로 해야 한다
  if (pending.length) console.log(`verify 남은 도시: ${pending.join(', ')} — 측정소가 그 도시 소재인지 좌표로 확인한 뒤 플래그를 제거하라.`)
}
