// 라벨·아이콘 — frontend/src/lib/weather.js wxLabel() 과 i18n.js 의 iOS 이식.
// 기상청 용어를 쓰고, 소나기는 단독 라벨이며, 계절 표현은 없다(D3).
import Foundation

enum AppLanguage: Sendable {
    case ko, en

    /// 앱에 아직 현지화 리소스가 없어 Locale.current 는 개발 언어(en)로 고정된다.
    /// 사용자가 실제로 설정한 언어를 보려면 preferredLanguages 를 봐야 한다.
    static var current: AppLanguage {
        (Locale.preferredLanguages.first ?? "en").hasPrefix("ko") ? .ko : .en
    }
}

enum Labels {
    static func sky(_ value: Int, _ lang: AppLanguage) -> String {
        let ko = ["맑음", "구름조금", "구름많음", "흐림"]
        let en = ["CLEAR", "MOSTLY CLEAR", "PARTLY CLOUDY", "CLOUDY"]
        let index = max(0, min(3, value))
        return lang == .ko ? ko[index] : en[index]
    }

    static func precip(_ value: Precip, _ lang: AppLanguage) -> String {
        switch (value, lang) {
        case (.rain, .ko): return "비"
        case (.drizzle, .ko): return "이슬비"
        case (.snow, .ko): return "눈"
        case (.sleet, .ko): return "진눈깨비"
        case (.showers, .ko): return "소나기"
        case (.rain, .en): return "RAIN"
        case (.drizzle, .en): return "DRIZZLE"
        case (.snow, .en): return "SNOW"
        case (.sleet, .en): return "SLEET"
        case (.showers, .en): return "SHOWERS"
        case (.none, _): return ""
        }
    }

    /// 예: "흐림 & 강한 비 & 미세먼지" / "CLOUDY & HEAVY RAIN & FINE DUST"
    static func weather(_ wx: WeatherComposition, _ lang: AppLanguage = .current) -> String {
        var parts: [String] = []
        if wx.fog {
            parts = [lang == .ko ? "안개" : "FOG"]
        } else if wx.storm {
            parts = [sky(wx.sky, lang), lang == .ko ? "뇌우" : "THUNDERSTORM"]
        } else if wx.precip == .showers {
            parts = [precip(.showers, lang)]
        } else if wx.precip != .none {
            var text = precip(wx.precip, lang)
            if wx.inten == 3 {
                text = (lang == .ko ? "강한 " : "HEAVY ") + text
            } else if wx.inten == 1, wx.precip == .snow || wx.precip == .rain {
                text = (lang == .ko ? "약한 " : "LIGHT ") + text
            }
            parts = [sky(wx.sky, lang), text]
        } else {
            parts = [sky(wx.sky, lang)]
        }
        if wx.dust > 0 {
            let dust = wx.dust == 2 ? (lang == .ko ? "황사" : "YELLOW DUST") : (lang == .ko ? "미세먼지" : "FINE DUST")
            parts.append(dust)
        }
        return parts.joined(separator: " & ")
    }

    static func badge(_ badge: Badge, _ lang: AppLanguage = .current) -> String {
        switch (badge, lang) {
        case (.stale, .ko): return "갱신 지연"
        case (.delayed, .ko): return "오래된 데이터"
        case (.offline, .ko): return "오프라인"
        case (.fallback, .ko): return "대체 데이터"
        case (.defaultCity, .ko): return "기본 도시"
        case (.stale, .en): return "DELAYED UPDATE"
        case (.delayed, .en): return "STALE DATA"
        case (.offline, .en): return "OFFLINE"
        case (.fallback, .en): return "BACKUP SOURCE"
        case (.defaultCity, .en): return "DEFAULT CITY"
        }
    }

    static func locationKind(_ kind: LocationKind, _ lang: AppLanguage = .current) -> String {
        switch (kind, lang) {
        case (.gps, .ko): return "현재 위치"
        case (.defaultCity, .ko): return "기본 도시"
        case (.picked, .ko): return "즐겨찾기"
        case (.gps, .en): return "CURRENT LOCATION"
        case (.defaultCity, .en): return "DEFAULT CITY"
        case (.picked, .en): return "SAVED"
        }
    }

    static let locationSymbol: [LocationKind: String] = [
        .gps: "location.fill", .defaultCity: "house.fill", .picked: "star.fill",
    ]

    /// 조건 아이콘. Cecilia 의 커스텀 심볼 세트가 나오기 전까지는 SF Symbols 로 같은 형태를 맞춘다.
    static func symbol(_ wx: WeatherComposition, isDay: Bool) -> String {
        if wx.dust > 0, wx.precip == .none, !wx.storm, !wx.fog { return "sun.dust.fill" }
        if wx.fog { return "cloud.fog.fill" }
        if wx.storm { return "cloud.bolt.rain.fill" }
        switch wx.precip {
        case .rain: return "cloud.rain.fill"
        case .showers: return isDay ? "cloud.sun.rain.fill" : "cloud.moon.rain.fill"
        case .drizzle: return "cloud.drizzle.fill"
        case .sleet: return "cloud.sleet.fill"
        case .snow: return "cloud.snow.fill"
        case .none: break
        }
        if wx.sky >= 2 { return "cloud.fill" }
        if wx.sky == 1 { return isDay ? "cloud.sun.fill" : "cloud.moon.fill" }
        return isDay ? "sun.max.fill" : "moon.stars.fill"
    }
}

enum Fmt {
    /// "UTC+9" / "UTC-4:30" — 좌표 줄의 시간대 접두어
    static func utcLabel(_ seconds: Int) -> String {
        let sign = seconds < 0 ? "-" : "+"
        let abs = Swift.abs(seconds)
        let hours = abs / 3600, minutes = (abs % 3600) / 60
        return minutes == 0 ? "UTC\(sign)\(hours)" : String(format: "UTC%@%d:%02d", sign, hours, minutes)
    }

    static func temperature(_ value: Double) -> String {
        String(Int(value.rounded()))
    }

    static func time(_ date: Date, offsetSec: Int, lang: AppLanguage = .current) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: lang == .ko ? "ko_KR" : "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: offsetSec)
        formatter.setLocalizedDateFormatFromTemplate("j:mm")
        return formatter.string(from: date)
    }

    static func date(_ date: Date, offsetSec: Int, lang: AppLanguage = .current) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: lang == .ko ? "ko_KR" : "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: offsetSec)
        formatter.setLocalizedDateFormatFromTemplate(lang == .ko ? "MMMd EEE" : "EEE, MMM d")
        return formatter.string(from: date)
    }
}
