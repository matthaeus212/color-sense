// 도시 카탈로그. 번들 사본(Resources/catalog.json = database/catalog.json)으로 첫 실행 시
// 네트워크 없이도 도시를 고를 수 있다. BFF 의 version 이 올라가면 갱신한다(2차).
import Foundation

struct City: Codable, Sendable, Identifiable, Equatable {
    let id: String
    let country: String
    let name: Localized
    let countryName: Localized
    let lat: Double
    let lon: Double
    let tz: String
    let coastal: Bool

    struct Localized: Codable, Sendable, Equatable {
        let ko: String
        let en: String
    }
}

struct Catalog: Codable, Sendable {
    let version: Int
    let cities: [City]

    static let bundled: Catalog = {
        guard let url = Bundle.main.url(forResource: "catalog", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode(Catalog.self, from: data)
        else { return Catalog(version: 0, cities: []) }
        return decoded
    }()

    static let defaultCityId = "KR-SEL"

    func city(id: String) -> City? { cities.first { $0.id == id } }

    /// 가장 가까운 카탈로그 도시. 한국은 50km, 해외는 150km 를 넘으면 nil —
    /// 조용히 서울로 떨어뜨리지 않고 호출자가 "기본 도시" 배지를 붙이도록 한다.
    func nearest(lat: Double, lon: Double) -> City? {
        var best: (city: City, km: Double)?
        for c in cities {
            let km = haversineKm(lat, lon, c.lat, c.lon)
            if best == nil || km < best!.km { best = (c, km) }
        }
        guard let found = best else { return nil }
        let limit: Double = found.city.country == "KR" ? 50 : 150
        return found.km <= limit ? found.city : nil
    }
}

private func haversineKm(_ lat1: Double, _ lon1: Double, _ lat2: Double, _ lon2: Double) -> Double {
    let r = 6371.0, toRad = Double.pi / 180
    let dLat = (lat2 - lat1) * toRad, dLon = (lon2 - lon1) * toRad
    let h = pow(sin(dLat / 2), 2) + cos(lat1 * toRad) * cos(lat2 * toRad) * pow(sin(dLon / 2), 2)
    return 2 * r * asin(min(1, sqrt(h)))
}
