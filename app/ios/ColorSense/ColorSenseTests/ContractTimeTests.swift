// 계약 시각 파싱 — 실 BFF(+09:00)와 모의 BFF(밀리초 Z)가 형태가 달라서 한쪽만 되면 배지가 거짓말을 한다.
import Foundation
import Testing
@testable import ColorSense

struct ContractTimeTests {
    @Test func 실BFF_오프셋형태() throws {
        let date = try #require(parseContractTime("2026-09-16T11:00:00+09:00", utcOffsetSec: 32400))
        #expect(date == Date(timeIntervalSince1970: 1_789_524_000))
    }

    @Test func 모의BFF_밀리초포함_UTC() throws {
        let date = try #require(parseContractTime("2026-09-16T06:03:23.517Z", utcOffsetSec: 32400))
        #expect(abs(date.timeIntervalSince1970 - 1_789_538_603.517) < 0.01)
    }

    @Test func 오프셋없는값은_도시_오프셋으로_읽는다() throws {
        let date = try #require(parseContractTime("2026-09-16T06:12:00", utcOffsetSec: 32400))
        let sameMoment = try #require(parseContractTime("2026-09-16T06:12:00+09:00", utcOffsetSec: 32400))
        #expect(date == sameMoment)
    }

    @Test func 형태가_아니면_nil() {
        #expect(parseContractTime("어제", utcOffsetSec: 0) == nil)
    }

    // 밀리초를 못 읽으면 updatedAt 이 nil 이 되고, 방금 받은 데이터에 "오래된 데이터" 배지가 붙었다.
    @Test func 방금_받은_모의BFF_응답은_fresh() throws {
        let now = Date()
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let updated = try #require(parseContractTime(iso.string(from: now.addingTimeInterval(-300)), utcOffsetSec: 32400))
        let next = try #require(parseContractTime(iso.string(from: now.addingTimeInterval(1500)), utcOffsetSec: 32400))
        #expect(dataState(updatedAt: updated, nextUpdateAt: next, now: now) == .fresh)
    }
}
