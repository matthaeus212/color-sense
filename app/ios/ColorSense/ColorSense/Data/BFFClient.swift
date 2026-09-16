// BFF 만 호출한다 — 외부 API 직접 호출 금지(프로젝트 공통 원칙).
// 개발 중 주소는 실행 인자/환경변수로 바꾼다:
//   모의 BFF  http://localhost:8787   (npm run mock)
//   실 BFF    http://localhost:8788   (npm run bff)
//   실기기    http://<맥 IP>:8787
import Foundation

enum BFFConfig {
    static let defaultBaseURL = URL(string: "http://localhost:8787")!

    static var baseURL: URL {
        if let text = ProcessInfo.processInfo.environment["BFF_URL"], let url = URL(string: text) { return url }
        if let text = UserDefaults.standard.string(forKey: "bffURL"), let url = URL(string: text) { return url }
        return defaultBaseURL
    }
}

struct BFFClient: Sendable {
    var baseURL: URL = BFFConfig.baseURL

    enum Failure: Error {
        case badStatus(Int)
        case unknownCity(String)
    }

    func weather(cityId: String) async throws -> CityWeather {
        let url = baseURL.appending(path: "v1/weather/\(cityId)")
        let (data, response) = try await URLSession.shared.data(from: url)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 404 { throw Failure.unknownCity(cityId) }
        guard (200..<300).contains(status) else { throw Failure.badStatus(status) }
        return try JSONDecoder().decode(CityWeather.self, from: data)
    }
}
