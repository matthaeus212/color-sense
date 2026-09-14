# ColorSense 데이터 소스 검토 — Open-Meteo 상용 플랜 비용과 대안

작성: 2026-09-14 · 요청: Mateus · 전제 결정: **1차 런칭 국가 = UN 정회원국(193개국)**

## 1. 규모 가정

193개국 × 주요 도시 3~5개 → 도시 카탈로그 약 600~1,000개. 비용 산정의 핵심은 사용자 수가 아니라 **BFF가 도시 단위로 캐시해서 서버가 호출하는 횟수**다. 프로토처럼 클라이언트가 직접 호출하면 비용이 사용자 수에 비례하고 키도 노출되므로, 어떤 소스를 고르든 BFF + 도시별 캐시는 전제다.

서버 갱신 정책 예시(1,000개 도시 전부를 선제 갱신하는 최악 케이스): 예보 15분 주기 = 96회/일, 대기질 1시간 = 24회/일, 해양은 해안 도시(~300개)만 1시간 = 24회/일 → 하루 약 12.7만 호출, 월 약 380만 호출. 실제로는 "사용자가 최근에 본 도시만 갱신"하는 수요 기반 캐시로 가면 초기에는 이보다 훨씬 적다(월 수십만 수준).

주의: Open-Meteo는 한 호출에 변수 10개 초과 또는 2주 초과 기간을 요청하면 호출을 분수로 가중 계산한다. 현재 프로토의 forecast 요청은 변수 14개(current 7 + hourly 1 + daily 6)라 1회가 1.4회쯤으로 잡힌다. 예산 산정 시 1.5~2배 여유를 두거나 요청을 분리해야 한다.

## 2. Open-Meteo 상용 플랜

| 플랜 | 월 요금 | 월 호출 | 포함 API |
|---|---|---|---|
| Free (비상업 전용) | €0 | 30만 (600/분, 5천/시, 1만/일) | 전부, 키 없음, 출처 표기 필수 |
| API Standard | €29 (연 €319) | 100만 | Forecast, Marine, Air Quality, Geocoding, Elevation, Flood |
| API Professional | €99 (연 €1,099) | 500만 | Standard + Historical, Climate, Ensemble, Seasonal |
| API Enterprise | 협의 | 5,000만 이상 | 맞춤 |

초과 과금 없음(80/90/100% 알림 후 제한). 상용 구독 시 전용 엔드포인트와 API 키 제공. 데이터 라이선스는 CC BY 4.0이라 앱 내 "Weather data by Open-Meteo" 표기가 필요하다. 셀프호스팅 서버 코드는 AGPLv3로 공개돼 있어 라이선스상 상용 셀프호스팅이 가능하지만, Open-Meteo 스스로 "수십억 호출 규모에서 실용적"이라고 안내한다.

**우리 규모 판단**: 위 최악 케이스(월 380만 × 가중치 1.5 ≈ 570만)면 Professional 경계, 수요 기반 캐시면 Standard(€29)로 충분히 시작 가능. 즉 **월 €29~99** 범위다. 필요 기능(Forecast·Marine·Air Quality·Geocoding)이 모두 Standard에 들어 있고, 프로토 코드를 그대로 쓸 수 있다는 점이 최대 장점이다.

## 3. 대안 비교

| 소스 | 무료 범위 | 상용 요금 | 우리 필요 기능 커버 | 비고 |
|---|---|---|---|---|
| **WeatherAPI.com** | 월 10만 (3일 예보, 상용 허용) | Starter $7/300만, Pro+ $25/500만, Business $65/1,000만 | 현재·예보·대기질·해양(조석)·기상특보·천문 모두 포함 | 가장 저렴. 전지구 모델 기반이라 국지 해상도는 중간 |
| **Apple WeatherKit** | 월 50만 (Apple Developer Program $99/년 필요) | 100만 $49.99, 200만 $99.99, 500만 $249.99, 1,000만 $499.99 | 현재·시간별·일별·특보·대기질 일부, REST로 Android/웹도 가능 | 품질 우수(구 Dark Sky), Apple 로고·출처 표기 의무 |
| **OpenWeatherMap One Call 3.0** | 일 1,000회(카드 등록) | 초과분 호출당 약 $0.0015 → 100만 회 ≈ $1,500 | 현재·예보·대기질·특보 | 커뮤니티 크지만 우리 규모에선 Open-Meteo 대비 수십 배 비쌈 |
| **MET Norway (api.met.no)** | 무료, CC BY 4.0, 앱당 20 req/s | 대량 트래픽은 별도 협의 | Locationforecast(전지구), 대기질·해양은 노르딕 위주 | User-Agent 식별·캐시 의무. 보조·검증 소스로 적합 |
| **Open-Meteo 셀프호스팅** | AGPLv3 | 서버·스토리지·대역폭(모델 데이터 수백 GB) 비용 | Open-Meteo와 동일 | Mark 운영 부담 큼. 호출이 수천만/월 넘을 때만 의미 |
| **각국 기상청 API** (KMA 공공데이터포털, 미국 NWS, 독일 DWD 등) | 대부분 무료 | — | 해당 국가만 | 193개국 통합 불가. 특정 국가 정확도 보정용 오버레이로만 |

## 4. 권고안

1차 런칭은 **Open-Meteo API Standard(€29/월)를 주 소스**로 두고 BFF에서 도시별 캐시를 하는 것이 비용·개발 연속성 모두에서 가장 유리하다. 프로토 로직(WMO 코드 디코딩, 해양, 대기질, 지오코딩)을 그대로 재사용할 수 있고, 트래픽이 늘면 Professional로 올리면 된다. 계약 전 확인할 것: 정확한 호출 가중치(변수 개수), 대기질(CAMS)과 해양 데이터의 국가별 커버리지, SLA 유무.

**보조 소스**로 MET Norway를 BFF에 붙여 두면 Open-Meteo 장애 시 폴백과 정확도 교차검증(두 소스 차이가 크면 스테일/불확실 배지)에 쓸 수 있고 비용이 들지 않는다. 가격만 보면 WeatherAPI.com이 가장 싸므로 QA 단계에서 한국·미국·유럽·열대·남반구 도시 몇 곳을 잡아 Open-Meteo와 정확도를 비교해 볼 가치가 있다. WeatherKit은 iOS 전용 앱이었다면 1순위였겠지만 웹·Android까지 한 스키마로 가려면 로고 표기 의무와 Apple 계정 종속이 걸린다.

역지오코딩(BigDataCloud)과 IP 위치(ipwho.is/ipapi.co)는 UN 정회원국 도시 카탈로그를 우리 데이터로 갖추면 검색·표기에서 필요가 없어지고, "현재 위치" 판별용으로만 남는다. 이 부분은 Open-Meteo Geocoding(Standard 포함)이나 카탈로그 내 최근접 도시 매칭으로 대체 가능하다.

## 5. 역할별 후속

Mateus: 주 소스·보조 소스 확정, 출처 표기 정책, 갱신 주기(15분/1시간) 확정. Theo: BFF 캐시 설계와 호출량 추정 검증, Open-Meteo 키 관리, MET Norway 폴백 어댑터. Mark: 월 호출량 모니터링과 80% 알림 연동, 셀프호스팅은 보류. Joy: 소스별 정확도 비교 테스트(도시 10곳 × 1주). Cecilia: 출처 표기("Weather data by Open-Meteo")의 위치·스타일.

## 출처

- Open-Meteo Pricing: https://open-meteo.com/en/pricing
- Open-Meteo Licence: https://open-meteo.com/en/licence
- Open-Meteo 상용 구독 안내: https://openmeteo.substack.com/p/api-subscriptions-for-commercial
- Open-Meteo 요금 정리(EUR): https://www.ki-syndikat.de/tools/open-meteo/
- WeatherAPI.com Pricing: https://www.weatherapi.com/pricing.aspx
- Apple WeatherKit Get Started: https://developer.apple.com/weatherkit/get-started/
- OpenWeather 요금 정리: https://apicostcalc.com/openweather.html
- MET Norway Terms of Service: https://api.met.no/doc/TermsOfService
