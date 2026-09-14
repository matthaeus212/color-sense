// 공통 날씨 모델 — backend/api-contract.md §2 와 1:1. BFF JSON 을 그대로 디코딩한다.
import Foundation

enum Precip: String, Codable { case none, rain, drizzle, snow, sleet, showers }

struct WeatherComposition: Codable, Equatable {
    var sky: Int = 0          // 0 맑음 · 1 구름조금 · 2 구름많음 · 3 흐림
    var precip: Precip = .none
    var inten: Int = 2        // 1 약 · 2 보통 · 3 강
    var fog: Bool = false
    var storm: Bool = false
    var dust: Int = 0         // 0 · 1 미세먼지 · 2 황사

    var isWet: Bool { [.rain, .showers, .drizzle, .sleet].contains(precip) }
    var isSnowy: Bool { precip == .snow || precip == .sleet }
}

enum DataState: String { case fresh, stale, delayed, offline }

/// updatedAt / nextUpdateAt (ISO-8601) → 데이터 상태. frontend/src/lib/model.js dataState 와 동일 규칙.
func dataState(updatedAt: Date?, nextUpdateAt: Date?, now: Date = Date(), online: Bool = true) -> DataState {
    if !online { return .offline }
    guard let u = updatedAt else { return .delayed }
    if now.timeIntervalSince(u) > 3 * 3600 { return .delayed }
    if let n = nextUpdateAt, now.timeIntervalSince(n) > 30 * 60 { return .stale }
    return .fresh
}
