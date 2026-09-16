// 홈 화면. 콘텐츠 층(배경색·온도·도시)과 컨트롤 층(배지·도크)을 분리한다 — design/ios-design-notes.html C1·C2.
// 배경색은 오직 날씨·기온·주야로만 정해지고, 데이터 상태는 배지로만 드러난다.
import Combine
import SwiftUI

struct HomeView: View {
    @State private var store = WeatherStore()
    @State private var now = Date()

    private let lang = AppLanguage.current
    private let tick = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    @ScaledMetric(relativeTo: .largeTitle) private var tempSize: CGFloat = 78

    var body: some View {
        ZStack {
            background.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 0) {
                header
                Spacer(minLength: 24)
                cityBlock
            }
            .padding(.horizontal, 21)
            .padding(.bottom, 96)
            .frame(maxWidth: .infinity, alignment: .leading)
            .foregroundStyle(.white)

            if !store.badges.isEmpty { badgeStack }
            dock
            StatusOverlay(status: store.status, lang: lang) { Task { await store.load() } }
        }
        .preferredColorScheme(.dark)
        .task { await store.load() }
        .onReceive(tick) { now = $0 }
    }

    private var background: some View {
        Group {
            if let current = store.weather?.current {
                ColorEngine.gradient(tempC: current.tempC, wx: current.wx, isDay: current.isDay == 1)
            } else {
                Color.black
            }
        }
        .animation(.easeInOut(duration: 0.6), value: store.weather?.current.tempC)
    }

    // 데이터가 오기 전에는 기기 시간대로 보여준다 — 0(UTC)으로 두면 잠깐 엉뚱한 시각이 스친다.
    private var offsetSec: Int { store.weather?.utcOffsetSec ?? TimeZone.current.secondsFromGMT() }

    @ViewBuilder private var header: some View {
        let current = store.weather?.current
        VStack(alignment: .leading, spacing: 6) {
            Text(Fmt.time(now, offsetSec: offsetSec, lang: lang))
                .font(.title3.weight(.light))
                .monospacedDigit()
            Text(Fmt.date(now, offsetSec: offsetSec, lang: lang))
                .font(.footnote)
                .opacity(0.75)

            if let current {
                HStack(spacing: 8) {
                    Image(systemName: Labels.symbol(current.wx, isDay: current.isDay == 1))
                        .symbolRenderingMode(.hierarchical)
                        .font(.title3)
                    Text(Labels.weather(current.wx, lang))
                        .font(.subheadline.weight(.medium))
                }
                .padding(.top, 10)

                Text("\(Fmt.temperature(current.tempC))°")
                    .font(.system(size: min(tempSize, 96), weight: .thin))
                    .monospacedDigit()

                Text("\(lang == .ko ? "체감" : "FEELS") \(Fmt.temperature(current.feelsC))°")
                    .font(.footnote)
                    .opacity(0.75)
            } else {
                Text("—°")
                    .font(.system(size: min(tempSize, 96), weight: .thin))
                    .padding(.top, 10)
            }
        }
        .padding(.top, 8)
    }

    @ViewBuilder private var cityBlock: some View {
        if let city = store.city {
            VStack(spacing: 4) {
                Text(lang == .ko ? city.name.ko : city.name.en.uppercased())
                    .font(.system(size: 30, weight: .light))
                Text(lang == .ko ? city.countryName.ko : city.countryName.en.uppercased())
                    .font(.caption)
                    .opacity(0.75)
            }
            .frame(maxWidth: .infinity)
        }
    }

    private var badgeStack: some View {
        VStack {
            HStack {
                Spacer()
                HStack(spacing: 6) {
                    ForEach(store.badges) { badge in
                        Text(Labels.badge(badge, lang))
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(.black.opacity(0.28), in: .capsule)
                            .overlay(Capsule().strokeBorder(.white.opacity(0.35), lineWidth: 0.5))
                    }
                }
            }
            Spacer()
        }
        .padding(.horizontal, 21)
        .padding(.top, 8)
    }

    private var dock: some View {
        VStack {
            Spacer()
            HStack(spacing: 8) {
                Image(systemName: Labels.locationSymbol[store.locationKind] ?? "location.fill")
                    .font(.caption)
                Text(Labels.locationKind(store.locationKind, lang))
                    .font(.caption.weight(.medium))
                if let city = store.city, let weather = store.weather {
                    Text("\(Fmt.utcLabel(weather.utcOffsetSec)) · \(String(format: "%.2f, %.2f", city.lat, city.lon))")
                        .font(.caption2)
                        .monospaced()
                        .opacity(0.75)
                }
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .frame(minHeight: 44)
            .background(.black.opacity(0.28), in: .capsule)
            .overlay(Capsule().strokeBorder(.white.opacity(0.35), lineWidth: 0.5))
            .padding(.bottom, 21)
        }
    }
}

private struct StatusOverlay: View {
    let status: LoadStatus
    let lang: AppLanguage
    let retry: () -> Void

    var body: some View {
        switch status {
        case .ready:
            EmptyView()
        case .locating, .loading:
            VStack(spacing: 12) {
                ProgressView().tint(.white)
                Text(status == .locating
                     ? (lang == .ko ? "위치 확인 중" : "LOCATING…")
                     : (lang == .ko ? "불러오는 중" : "LOADING…"))
                    .font(.footnote)
                    .foregroundStyle(.white)
            }
            .padding(24)
            .background(.black.opacity(0.35), in: .rect(cornerRadius: 20))
        case .error:
            VStack(spacing: 14) {
                Text(lang == .ko ? "데이터를 불러오지 못했어요" : "Could not load data")
                    .font(.subheadline)
                    .foregroundStyle(.white)
                Button(lang == .ko ? "다시 시도" : "RETRY", action: retry)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 18)
                    .frame(minHeight: 44)
                    .background(.white.opacity(0.18), in: .capsule)
            }
            .padding(24)
            .background(.black.opacity(0.45), in: .rect(cornerRadius: 20))
        }
    }
}

#Preview {
    HomeView()
}
