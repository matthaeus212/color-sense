# 날씨별 음향·햅틱 (F-18·F-19 · P-11 · D8)

## 원칙
- 음향은 **기본 꺼짐**, 햅틱은 **기본 켜짐**. 둘 다 정보의 유일한 통로가 아니다(색·라벨과 항상 중복).
- 음향은 홈 표시 중에만. 시트·설정 위에서는 −6dB, 백그라운드·잠금 즉시 정지. iOS `AVAudioSession .ambient`(무음 스위치·타 앱 오디오 존중), Android `AudioAttributes USAGE_GAME/CONTENT_TYPE_SONIFICATION` + 오디오 포커스 양보. 웹은 첫 제스처 후 재생.
- 크로스페이드 1.2s = 배경색 전환 시간. 루프 20~40초, 이음매 없음.
- 햅틱은 이벤트에만. 연속 진동 1.5초 상한. 시스템 햅틱 끄기·저전력 모드에서 자동 비활성. 웹은 Android Chrome `navigator.vibrate`만, 미지원은 조용히 무시.

## 매핑
| 구성 | 기저 레이어 | 강수 레이어 (게인 inten 1/2/3) | 원샷 | 햅틱 |
|---|---|---|---|---|
| sky 0~1 주간 | `amb-clear-day` 약한 바람·멀리 새 | — | — | — |
| sky 0~1 야간 | `amb-clear-night` 풀벌레·정적 | — | — | — |
| sky 2~3 | `amb-wind-soft` | — | — | — |
| rain / showers | 기저 −6dB | `rain-loop` 0.35 / 0.6 / 0.9 | — | 강도 변화 시 탭 1회(강도 3은 더블 탭) |
| drizzle | 기저 | `drizzle-loop` 0.3 | — | — |
| snow / sleet | `amb-wind-cold` | snow 없음 · sleet `rain-loop` 0.3 | — | — |
| fog | `amb-fog` 저역 통과 바람 | — | — | — |
| storm | `amb-wind-strong` | `rain-loop` 0.7 | `thunder-1~3` 번쩍임(7s 주기 91%)과 동기, 무작위 | 천둥과 동시 강한 임팩트(iOS transient sharpness .6 · Android HEAVY_CLICK) |
| dust 1/2 | `amb-wind-dust` 0.5 / 0.8 | 강수 있으면 위 규칙 | — | — |
| 도시 전환 ⇄ | 1.2s 크로스페이드 교체 | | | 가벼운 탭(selection) |
| 시트 열림/닫힘 | 홈 레이어 −6dB / 복원 | | | 소프트 임팩트 |

## 에셋
파일명 = 위 코드. AAC 96kbps m4a(iOS·웹) + Opus 64kbps ogg(Android·웹). 파일 ≤ 300KB, 총 ≤ 3MB. CloudFront로 배포, 앱은 첫 실행 후 캐시. 라이선스 CC0만, 출처는 설정 하단에 표기.

## 설정 UI (SCR-04 #7)
"날씨 환경음" 토글(기본 꺼짐) → 켜면 볼륨 슬라이더(0~100, 기본 40)와 즉시 미리듣기. "햅틱" 토글(기본 켜짐). 시스템 햅틱 꺼짐이면 비활성 + 안내.
