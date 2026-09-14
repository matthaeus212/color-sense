# 도시 카탈로그 · 공통 날씨 모델 · BFF 계약 (Theo)

작성: 2026-09-14 · 결정 근거: `planning/05-decisions.md` D1·D3·D5·D6

## 1. 도시 카탈로그 (`frontend/data/catalog.json`)

백엔드가 소유하는 버전 관리 데이터. 클라이언트(웹·앱)는 `GET /v1/catalog`로 받고 `version`이 바뀔 때만 갱신한다. 앱은 번들에 포함해 첫 실행 시 네트워크 없이 도시 선택이 가능하다(Lily 요청).

| 필드 | 설명 |
|---|---|
| `id` | `{ISO2}-{3글자}` 고정 ID. 즐겨찾기 저장 키 |
| `name.ko / name.en` | 표기. 화면 규칙은 Cecilia 문서 참조 |
| `lat, lon, tz` | 대표 지점(시청) 좌표·IANA 타임존 |
| `coastal` | 파도 데이터 대상 여부(2차) |
| `source` | `kma`(한국) 또는 `open-meteo`(해외) |
| `kma.nx, ny` | 단기예보 격자 |
| `kma.regLand, regTemp` | 중기예보 육상·기온 지역코드 |
| `kma.airStation` | 에어코리아 측정소명 |
| `kma.verify` | 코드 미검증 표시. Joy 스모크 테스트 통과 후 제거 |

현재 38개 도시(한국 20 + 해외 18). 현재 위치는 카탈로그 최근접 도시로 매핑하며(하버사인, 한국은 50km·해외는 150km 이내가 아니면 "지원하지 않는 위치"), 외부 역지오코딩·IP 위치 API는 사용하지 않는다.

## 2. 공통 날씨 모델 (`src/lib/model.js`)

```
WeatherComposition { sky 0~3, precip none|rain|drizzle|snow|sleet|showers, inten 1~3, fog, storm, dust 0~2 }
```

프로토의 `decode2` 출력과 같은 형태다. 차이는 `showers`가 별도 값이 된 것(D3: 라벨 "소나기")뿐이다. 컬러 엔진(`color.js`)은 `showers`를 `rain`과 동일하게 취급한다.

### 2-1. 기상청 → 공통 모델 매핑 (`src/lib/kma.js`)

| 기상청 필드 | 값 | 공통 모델 |
|---|---|---|
| SKY | 1 / 3 / 4 | sky 0 / 2 / 3 (sky 1은 Open-Meteo에서만 발생) |
| PTY | 0 | precip none |
| PTY | 1 / 5 | rain / drizzle(inten 1 고정) |
| PTY | 2 / 6 | sleet |
| PTY | 3 / 7 | snow |
| PTY | 4 | showers (sky 결측 시 2) |
| PCP 또는 RN1 (mm/h) | <3 / 3~15 / ≥15 | inten 1 / 2 / 3 |
| SNO (cm/h) | <1 / 1~5 / ≥5 | inten 1 / 2 / 3 |
| LGT=1 또는 특보 "낙뢰·뇌전" | | storm true |
| VIS<1000m 또는 특보 "안개" | | fog true |
| 에어코리아 PM10 등급 ≥3(나쁨) | | dust 1 |
| 기상청 황사 관측/특보 | | dust 2 |

PCP 문자열("1.0mm 미만", "30.0~50.0mm", "강수없음")은 `mmFrom()`이 숫자로 바꾼다(구간은 하한). 초단기실황에는 SKY가 없으므로 현재 구성은 실황 PTY/RN1 + 초단기예보 첫 시각 SKY를 합쳐 만든다.

### 2-2. Open-Meteo → 공통 모델

`fromWmo(code, dust)` — 프로토 표 그대로. 대기질은 CAMS 모델값이라 `dustFromOpenMeteo`로 등급화하되 응답에 `airQuality.kind = "forecast"`를 넣어 화면에서 "예측" 표기한다(D6).

## 3. BFF 계약

### `GET /v1/catalog` → `catalog.json` 그대로 (ETag 지원)

### `GET /v1/weather/{cityId}` → CityWeather

```jsonc
{
  "cityId": "KR-SEL",
  "source": "kma",              // kma | open-meteo | open-meteo-fallback
  "updatedAt": "2026-09-14T05:10:00+09:00",
  "nextUpdateAt": "2026-09-14T06:10:00+09:00",
  "tz": "Asia/Seoul", "utcOffsetSec": 32400,
  "current": {
    "time": "2026-09-14T05:00:00+09:00",
    "tempC": 21.3, "feelsC": 21.0, "isDay": 0,
    "wx": { "sky": 2, "precip": "none", "inten": 2, "fog": false, "storm": false, "dust": 0 },
    "humidity": 78, "windMs": 2.1, "windDeg": 200, "pop": 20
  },
  "hourly": [ { "time": "...", "tempC": 21, "pop": 20, "wx": { } } ],   // 24개
  "daily":  [ { "date": "2026-09-14", "hi": 27, "lo": 19, "pop": 30, "wx": { } } ], // 7개
  "sun": { "sunrise": "2026-09-14T06:12:00+09:00", "sunset": "2026-09-14T18:40:00+09:00" },
  "airQuality": { "kind": "observed", "pm10": 35, "pm25": 18, "grade": 2 },   // kind: observed | forecast | unavailable
  "marine": { "kind": "unavailable" }                                          // 2차. coastal 이면 observed/forecast
}
```

규칙: 값이 없으면 필드를 `null`이 아니라 `kind: "unavailable"`로 명시한다(오류를 "내륙"이나 "좋음"으로 둔갑시키지 않는다). 클라이언트는 `nextUpdateAt` 전에 재요청하지 않고, 데이터 상태(`model.js dataState`)는 `updatedAt`·`nextUpdateAt`으로 계산한다.

### `GET /v1/weather?ids=KR-SEL,JP-TYO` → CityWeather[] (즐겨찾기 일괄, 최대 11개)

## 4. 수집 스케줄과 쿼터 (infra/README.md 와 연동)

| 소스 | 대상 | 주기 | 일 호출 (한국 20개 / 해외 18개 기준) |
|---|---|---|---|
| 기상청 초단기실황 | 한국 | 매시 :40 | 20 × 24 = 480 |
| 기상청 초단기예보 | 한국 | 매시 :45 | 480 |
| 기상청 단기예보 | 한국 | 02·05·08·11·14·17·20·23시 +10분 | 160 |
| 기상청 중기예보(육상+기온) | 한국 | 06·18시 | 80 |
| 에어코리아 측정소 실시간 | 한국 | 매시 :20 | 480 |
| 천문연 출몰시각 | 한국 | 1일 1회 | 20 |
| Open-Meteo forecast(+AQ) | 해외(최근 24h 조회된 도시) | 30분 | ≤ 18 × 48 × 1.4 ≈ 1,210 |

합계 약 2,900건/일. 공공데이터포털 일 10,000건, Open-Meteo 일 10,000건 안에 충분히 든다. 도시가 100개로 늘어도 기상청 계열 약 8,400건으로 한도 안이다.

## 5. 다음 단계
- 공공데이터포털에서 단기예보·중기예보 조회서비스, 에어코리아 대기오염정보, 천문연 출몰시각 활용신청(개발계정) → 키 4개를 Mark의 시크릿 저장소에.
- `verify:true` 도시 4곳의 regTemp·측정소명을 Joy 스모크 테스트로 확정.
- 해외 도시 확장은 카탈로그에 행 추가로 끝나며, 쿼터만 재계산한다.
