// 컬러 엔진 — frontend/src/lib/color.js skyStops() 의 1:1 이식.
// 규칙과 앵커는 design/color-engine-spec.md. 골든 테스트(ColorEngineGoldenTests)가 웹과 ±1 일치를 보장한다.
import SwiftUI

enum ColorEngine {
    typealias RGB = [Double]

    static let positions: [CGFloat] = [0, 0.30, 0.52, 0.70, 0.84, 1.0]

    private struct Anchor { let t: Double; let s: [RGB] }
    private static let anchors: [Anchor] = [
        Anchor(t: -15, s: [[8,12,40],[16,36,84],[40,80,132],[96,140,176],[196,200,206],[130,140,168]]),
        Anchor(t: 0,   s: [[12,20,52],[26,52,104],[58,104,158],[120,168,196],[214,206,196],[150,150,170]]),
        Anchor(t: 10,  s: [[12,24,60],[26,64,120],[58,120,168],[140,186,198],[238,206,160],[206,160,120]]),
        Anchor(t: 19,  s: [[12,26,66],[24,72,128],[58,132,172],[176,206,196],[246,204,140],[236,150,80]]),
        Anchor(t: 27,  s: [[26,30,74],[40,78,134],[120,158,176],[240,200,150],[246,150,78],[226,104,54]]),
        Anchor(t: 36,  s: [[46,34,82],[96,80,138],[200,150,150],[250,180,120],[245,120,64],[216,58,44]]),
    ]

    private static func lerp(_ a: Double, _ b: Double, _ r: Double) -> Double { a + (b - a) * r }
    private static func mix(_ a: RGB, _ b: RGB, _ r: Double) -> RGB { zip(a, b).map { $0 + ($1 - $0) * r } }
    private static func grey(_ c: RGB) -> RGB { let l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; return [l, l, l] }

    private static func buildStops(_ tempC: Double) -> [RGB] {
        let t = max(-15, min(36, tempC))
        for i in 0..<(anchors.count - 1) {
            let a = anchors[i], b = anchors[i + 1]
            if t >= a.t && t <= b.t {
                let r = (t - a.t) / (b.t - a.t)
                return a.s.enumerated().map { k, c in c.enumerated().map { j, v in lerp(v, b.s[k][j], r) } }
            }
        }
        return anchors.last!.s
    }

    /// 6개 스톱(top→bottom)의 정수 RGB. 계절 입력은 없다(D4).
    static func skyStops(tempC: Double?, wx: WeatherComposition, isDay: Bool) -> [[Int]] {
        var s = buildStops(tempC ?? 15)
        let mute = [0, 0.06, 0.18, 0.34][max(0, min(3, wx.sky))]
        let dk = [1, 0.98, 0.95, 0.9][max(0, min(3, wx.sky))]
        if mute > 0 { s = s.map { mix($0, grey($0), mute).map { $0 * dk } } }
        if wx.isWet { let f = wx.precip == .drizzle ? 0.78 : 0.68; s = s.map { mix($0, grey($0), 0.3).map { $0 * f } } }
        if wx.isSnowy { s = s.enumerated().map { i, c in mix(c, [255, 255, 255], i < 3 ? 0.16 : 0.3) } }
        if wx.fog { s = s.map { mix($0, grey($0), 0.5).map { $0 * 0.92 } } }
        if wx.storm { s = s.map { $0.map { $0 * 0.78 } } }
        if wx.dust > 0 {
            let amt = wx.dust == 2 ? 0.44 : 0.26
            s = s.map { mix(mix($0, grey($0), 0.28), [198, 168, 112], amt).map { $0 * 0.95 } }
        }
        if !isDay {
            let nf = [0.4, 0.45, 0.5, 0.55, 0.64, 0.6]
            s = s.enumerated().map { i, c in mix(c, grey(c), 0.22).map { $0 * nf[i] } }
        }
        return s.map { $0.map { Int(max(0, min(255, $0)).rounded()) } }
    }

    /// SwiftUI 그라데이션. sRGB 공간, 감마 변환 없음.
    static func gradient(tempC: Double?, wx: WeatherComposition, isDay: Bool) -> LinearGradient {
        let stops = skyStops(tempC: tempC, wx: wx, isDay: isDay).enumerated().map { i, c in
            Gradient.Stop(color: Color(.sRGB, red: Double(c[0]) / 255, green: Double(c[1]) / 255, blue: Double(c[2]) / 255), location: positions[i])
        }
        return LinearGradient(gradient: Gradient(stops: stops), startPoint: .top, endPoint: .bottom)
    }
}
