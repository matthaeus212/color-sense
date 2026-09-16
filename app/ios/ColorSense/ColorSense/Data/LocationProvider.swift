// 위치는 "사용 중" 권한만, 대략적 정확도로 요청한다. 거부하면 nil —
// 호출자가 기본 도시 + 배지로 처리한다(조용한 서울 폴백 금지).
import CoreLocation

@MainActor
final class LocationProvider: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var waiting: CheckedContinuation<CLLocationCoordinate2D?, Never>?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyReduced
    }

    /// 권한이 아직 결정되지 않았으면 사용자가 대화상자에 답할 때까지 기다린다 —
    /// 답하기 전에 기본 도시로 떨어뜨리면 "기본 도시" 배지가 잘못 붙는다.
    func current() async -> CLLocationCoordinate2D? {
        if waiting != nil { return nil }
        let status = manager.authorizationStatus
        if status == .denied || status == .restricted { return nil }

        return await withCheckedContinuation { continuation in
            waiting = continuation
            if status == .notDetermined {
                manager.requestWhenInUseAuthorization()
            } else {
                manager.requestLocation()
            }
            armTimeout()
        }
    }

    /// 대화상자를 열어 둔 채 두거나 위치 확정이 늦어져도 화면이 영원히 "위치 확인 중"에 머물지 않게 한다.
    private func armTimeout() {
        Task { [weak self] in
            try? await Task.sleep(for: .seconds(20))
            self?.finish(nil)
        }
    }

    private func finish(_ coordinate: CLLocationCoordinate2D?) {
        waiting?.resume(returning: coordinate)
        waiting = nil
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let coordinate = locations.last?.coordinate
        Task { @MainActor in self.finish(coordinate) }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in self.finish(nil) }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            guard self.waiting != nil else { return }
            switch status {
            case .denied, .restricted: self.finish(nil)
            case .authorizedWhenInUse, .authorizedAlways: manager.requestLocation()
            default: break
            }
        }
    }
}
