// 홈 화면의 상태. GPS → 최근접 도시 → BFF → 뷰 모델.
// 배경색은 언제나 날씨 그대로이고, 데이터 상태는 배지로만 나타낸다(D4).
import CoreLocation
import Foundation
import Observation

enum LocationKind: String, Sendable { case gps, defaultCity, picked }

enum Badge: String, Sendable, Identifiable {
    case stale, delayed, offline, fallback, defaultCity
    var id: String { rawValue }
}

enum LoadStatus: Sendable { case locating, loading, ready, error }

@MainActor
@Observable
final class WeatherStore {
    private(set) var status: LoadStatus = .locating
    private(set) var weather: CityWeather?
    private(set) var city: City?
    private(set) var locationKind: LocationKind = .gps

    private let catalog = Catalog.bundled
    private let client: BFFClient
    private let location: LocationProvider
    private var refreshTask: Task<Void, Never>?

    init(client: BFFClient = BFFClient(), location: LocationProvider? = nil) {
        self.client = client
        self.location = location ?? LocationProvider()
    }

    var badges: [Badge] {
        guard let weather else { return [] }
        var list: [Badge] = []
        switch dataState(updatedAt: weather.updatedAtDate, nextUpdateAt: weather.nextUpdateAtDate) {
        case .fresh: break
        case .stale: list.append(.stale)
        case .delayed: list.append(.delayed)
        case .offline: list.append(.offline)
        }
        if weather.source == .openMeteoFallback { list.append(.fallback) }
        if locationKind == .defaultCity { list.append(.defaultCity) }
        return list
    }

    func load() async {
        refreshTask?.cancel()
        if city == nil { await resolveCity() }
        guard let city else {
            status = .error
            return
        }
        if weather == nil { status = .loading }
        do {
            weather = try await client.weather(cityId: city.id)
            status = .ready
            scheduleRefresh()
        } catch {
            // 마지막으로 성공한 데이터는 남겨 두고, 보여 줄 게 없을 때만 오류 화면으로 간다.
            status = weather == nil ? .error : .ready
        }
    }

    private func resolveCity() async {
        status = .locating
        // 웹의 ?city=KR-PUS 와 같은 QA 수단 — 웹·앱 화면을 같은 도시로 놓고 색을 대조할 때 쓴다.
        if let forced = ProcessInfo.processInfo.environment["CITY_ID"], let picked = catalog.city(id: forced) {
            city = picked
            locationKind = .picked
            return
        }
        if let coordinate = await location.current(),
           let nearest = catalog.nearest(lat: coordinate.latitude, lon: coordinate.longitude) {
            city = nearest
            locationKind = .gps
        } else {
            city = catalog.city(id: Catalog.defaultCityId)
            locationKind = .defaultCity
        }
    }

    /// nextUpdateAt 전에는 다시 부르지 않는다(쿼터 보호). 최소 1분은 둔다.
    private func scheduleRefresh() {
        guard let next = weather?.nextUpdateAtDate else { return }
        let seconds = max(60, next.timeIntervalSinceNow + 5)
        refreshTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(seconds))
            guard !Task.isCancelled else { return }
            await self?.load()
        }
    }
}
