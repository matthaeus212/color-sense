// BFF 계약(backend/api-contract.md §3)의 Swift 표현. 필드 이름은 JSON 과 1:1 이라 CodingKeys 가 없다.
import Foundation

enum WeatherSource: String, Codable, Sendable {
    case kma
    case openMeteo = "open-meteo"
    case openMeteoFallback = "open-meteo-fallback"
}

struct CityWeather: Codable, Sendable {
    let cityId: String
    let source: WeatherSource
    let updatedAt: String
    let nextUpdateAt: String
    let tz: String
    let utcOffsetSec: Int
    let current: Current
    let hourly: [Hour]
    let daily: [Day]
    let sun: Sun
    let airQuality: AirQuality
    let marine: Marine

    struct Current: Codable, Sendable {
        let time: String
        let tempC: Double
        let feelsC: Double
        let isDay: Int
        let wx: WeatherComposition
        let humidity: Double?
        let windMs: Double?
        let windDeg: Double?
        let pop: Double?
    }

    struct Hour: Codable, Sendable {
        let time: String
        let tempC: Double
        let pop: Double?
        let wx: WeatherComposition
    }

    struct Day: Codable, Sendable {
        let date: String
        let hi: Double
        let lo: Double
        let pop: Double?
        let wx: WeatherComposition
    }

    struct Sun: Codable, Sendable {
        let sunrise: String?
        let sunset: String?
    }

    // 값이 없으면 kind:"unavailable" 로 명시된다 — null 이나 0 으로 감추지 않는 것이 계약이다.
    struct AirQuality: Codable, Sendable {
        let kind: Kind
        let pm10: Double?
        let pm25: Double?
        let grade: Int?

        enum Kind: String, Codable, Sendable { case observed, forecast, unavailable }
    }

    struct Marine: Codable, Sendable {
        let kind: Kind
        let waveM: Double?

        enum Kind: String, Codable, Sendable { case observed, forecast, unavailable }
    }
}

extension CityWeather {
    var updatedAtDate: Date? { parseContractTime(updatedAt, utcOffsetSec: utcOffsetSec) }
    var nextUpdateAtDate: Date? { parseContractTime(nextUpdateAt, utcOffsetSec: utcOffsetSec) }
}

/// 계약의 시각 문자열을 Date 로. 세 가지 형태를 모두 받는다:
///   2026-09-16T11:00:00+09:00   실 BFF
///   2026-09-16T06:03:23.517Z    모의 BFF (밀리초 포함)
///   2026-09-16T06:12:00         오프셋 없음 → 그 도시의 오프셋으로 읽는다
/// 파싱에 실패하면 dataState 가 delayed 로 떨어져 멀쩡한 데이터에 "오래된 데이터" 배지가 붙는다.
func parseContractTime(_ text: String, utcOffsetSec: Int) -> Date? {
    let withFraction = ISO8601DateFormatter()
    withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let d = withFraction.date(from: text) { return d }

    let iso = ISO8601DateFormatter()
    iso.formatOptions = [.withInternetDateTime]
    if let d = iso.date(from: text) { return d }

    let plain = DateFormatter()
    plain.locale = Locale(identifier: "en_US_POSIX")
    plain.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
    plain.timeZone = TimeZone(secondsFromGMT: utcOffsetSec)
    return plain.date(from: text)
}
