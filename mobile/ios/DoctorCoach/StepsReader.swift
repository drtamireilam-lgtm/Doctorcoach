import Foundation
import HealthKit

final class StepsReader {
    let store = HKHealthStore()
    let steps = HKQuantityType.quantityType(forIdentifier: .stepCount)!
    var observer: HKObserverQuery?
    func authorize() async throws {
        guard HKHealthStore.isHealthDataAvailable() else { throw NSError(domain: "unavailable", code: 1) }
        // Successful prompt completion does NOT prove read permission.
        try await store.requestAuthorization(toShare: [], read: [steps])
    }
    func readDays() async throws -> [[String: Any]] {
        let zone = TimeZone.current
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = zone
        let now = Date(); let formatter = ISO8601DateFormatter()
        let dateFormatter = DateFormatter(); dateFormatter.calendar = calendar; dateFormatter.timeZone = zone
        dateFormatter.locale = Locale(identifier: "en_US_POSIX"); dateFormatter.dateFormat = "yyyy-MM-dd"
        var days: [[String: Any]] = []
        for offset in (-6...0) {
            let start = calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: now))!
            let end = calendar.date(byAdding: .day, value: 1, to: start)!
            let predicate = HKQuery.predicateForSamples(withStart: start, end: min(end, now), options: .strictStartDate)
            let quantity: HKQuantity? = try await withCheckedThrowingContinuation { continuation in
                let query = HKStatisticsQuery(quantityType: steps, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
                    if let error { continuation.resume(throwing: error) }
                    else { continuation.resume(returning: result?.sumQuantity()) }
                }
                store.execute(query)
            }
            days.append(["date": dateFormatter.string(from: start), "timezone": zone.identifier,
                "startAt": formatter.string(from: start), "endAt": formatter.string(from: end),
                "steps": quantity.map { NSNumber(value: $0.doubleValue(for: .count())) as Any } ?? NSNull(),
                "observedAt": formatter.string(from: now), "partial": true,
                "method": "healthkit_cumulative", "provenance": ["healthkit:platform-aggregate"]])
        }
        return days
    }
    // Best effort invalidation only: no account credential or health payload persisted.
    func observe(onChange: @escaping () -> Void) {
        observer = HKObserverQuery(sampleType: steps, predicate: nil) { _, completion, error in
            if error == nil { onChange() }; completion()
        }
        store.execute(observer!)
        store.enableBackgroundDelivery(for: steps, frequency: .hourly) { _, _ in }
    }
    func stop() {
        if let observer { store.stop(observer) }; observer = nil
        store.disableBackgroundDelivery(for: steps) { _, _ in }
    }
}
