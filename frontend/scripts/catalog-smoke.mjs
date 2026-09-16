// 카탈로그 스모크 테스트(온라인): 한국 도시마다 기상청 초단기실황·중기예보(기온)·에어코리아 응답이 오는지 확인.
// 사용: KMA_KEY=... AIR_KEY=... node scripts/catalog-smoke.mjs [cityId ...]
// 결과가 OK 인 도시의 kma.verify 플래그는 카탈로그에서 제거한다. 호출 수: 도시당 3건.
import { readFileSync } from 'node:fs'
const cat = JSON.parse(readFileSync(new URL('../../database/catalog.json', import.meta.url)))
const KMA = process.env.KMA_KEY, AIR = process.env.AIR_KEY
if (!KMA) { console.error('KMA_KEY 필요 (공공데이터포털 일반 인증키, 디코딩 값)'); process.exit(2) }
const only = process.argv.slice(2)
const pad = (n) => String(n).padStart(2, '0')
const now = new Date(Date.now() - 60 * 60 * 1000) // 1시간 전 실황(발표 지연 고려)
const base = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`, hh = `${pad(now.getHours())}00`
const tmFc = `${base}${now.getHours() < 18 ? '0600' : '1800'}`

async function j(u) { const r = await fetch(u); const t = await r.text(); try { return JSON.parse(t) } catch { return { raw: t.slice(0, 120) } } }
function okKma(d) { return d?.response?.header?.resultCode === '00' }

for (const c of cat.cities.filter((c) => c.source === 'kma' && (!only.length || only.includes(c.id)))) {
  const res = { id: c.id }
  const ncst = await j(`https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${encodeURIComponent(KMA)}&dataType=JSON&numOfRows=10&pageNo=1&base_date=${base}&base_time=${hh}&nx=${c.kma.nx}&ny=${c.kma.ny}`)
  res.ncst = okKma(ncst) ? 'OK' : (ncst?.response?.header?.resultMsg || ncst.raw || 'FAIL')
  const ta = await j(`https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa?serviceKey=${encodeURIComponent(KMA)}&dataType=JSON&numOfRows=10&pageNo=1&regId=${c.kma.regTemp}&tmFc=${tmFc}`)
  res.midTa = okKma(ta) && ta.response.body?.items?.item?.length ? 'OK' : (ta?.response?.header?.resultMsg || ta.raw || 'FAIL')
  if (AIR) {
    const air = await j(`https://apis.data.go.kr/B552584/ArpltnInfrInqireSvc/getMsrstnAcctoRltmMesureDnsty?serviceKey=${encodeURIComponent(AIR)}&returnType=json&numOfRows=1&pageNo=1&stationName=${encodeURIComponent(c.kma.airStation)}&dataTerm=DAILY&ver=1.3`)
    res.air = air?.response?.body?.items?.length ? 'OK' : (air?.response?.header?.resultMsg || air?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg || air.raw || 'FAIL')
  }
  res.verify = c.kma.verify ? 'verify-pending' : ''
  console.log(JSON.stringify(res))
}
