// 골든 케이스 회귀 — frontend/spec/color-engine.json 을 테스트 번들 리소스로 복사해 둔다 (npm run golden 후 갱신).
import XCTest
@testable import ColorSense

final class ColorEngineGoldenTests: XCTestCase {
    struct Spec: Decodable { let cases: [Case] }
    struct Case: Decodable { let id: String; let tempC: Double; let isDay: Int; let wx: WeatherComposition; let stops: [[Int]] }

    func testGoldenCasesMatchWebWithinOne() throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "color-engine", withExtension: "json"))
        let spec = try JSONDecoder().decode(Spec.self, from: Data(contentsOf: url))
        XCTAssertGreaterThanOrEqual(spec.cases.count, 150)
        for c in spec.cases {
            let out = ColorEngine.skyStops(tempC: c.tempC, wx: c.wx, isDay: c.isDay == 1)
            for i in 0..<6 { for k in 0..<3 {
                XCTAssertLessThanOrEqual(abs(out[i][k] - c.stops[i][k]), 1, "\(c.id) stop\(i) ch\(k): \(out[i][k]) vs \(c.stops[i][k])")
            } }
        }
    }

    func testSubZeroDiffersFromZero() {
        let clear = WeatherComposition()
        XCTAssertNotEqual(ColorEngine.skyStops(tempC: -15, wx: clear, isDay: true), ColorEngine.skyStops(tempC: 0, wx: clear, isDay: true))
    }
}
