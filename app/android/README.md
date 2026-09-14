# Android (Jetpack Compose, minSdk 26)

1. Android Studio → Empty Activity(Compose) 프로젝트, 패키지 `com.colorsense`, 이 폴더에 저장.
2. `app/src/main/kotlin/com/colorsense/engine/*.kt` 와 `app/src/test/kotlin/.../ColorEngineGoldenTest.kt` 는 그대로 사용.
3. 의존성: `org.jetbrains.kotlinx:kotlinx-serialization-json`, `kotlin-test`. `plugins { kotlin("plugin.serialization") }`.
4. `frontend/spec/color-engine.json` 을 `app/src/test/resources/color-engine.json` 으로 복사. `npm run golden` 할 때마다 갱신.
5. `AndroidManifest.xml`: `ACCESS_COARSE_LOCATION`(정밀 위치 불필요 — 카탈로그 최근접 도시면 충분), `INTERNET`. DEBUG 빌드만 `usesCleartextTraffic="true"`(모의 BFF `http://<맥 IP>:8787`).
6. 배포: Play Console 내부 테스트 트랙(D2).
