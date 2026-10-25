import SwiftUI
import WebKit
import HealthKit

@main struct DoctorCoachApp: App {
    var body: some Scene { WindowGroup { Wrapper().ignoresSafeArea() } }
}
struct Wrapper: UIViewRepresentable {
    func makeCoordinator() -> Bridge { Bridge() }
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.add(context.coordinator, name: "doctorcoach")
        let web = WKWebView(frame: .zero, configuration: configuration)
        context.coordinator.web = web; web.navigationDelegate = context.coordinator
        web.load(URLRequest(url: context.coordinator.origin)); return web
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
final class Bridge: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    // Configure at build time. No production host is assumed.
    let origin = URL(string: Bundle.main.object(forInfoDictionaryKey: "DoctorCoachOrigin") as! String)!
    weak var web: WKWebView?
    let reader = StepsReader()
    var scope: String?; var epoch = 0
    func invalidate() { epoch += 1; scope = nil; reader.stop() }
    func trusted(_ url: URL?) -> Bool {
        guard let url else { return false }
        return url.scheme == "https" && url.host == origin.host && (url.port ?? 443) == (origin.port ?? 443)
    }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        // Fail closed on all external navigation including subframes and new windows.
        guard trusted(action.request.url) else { invalidate(); decisionHandler(.cancel); return }
        if action.targetFrame?.isMainFrame == true { invalidate() }
        decisionHandler(.allow)
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { invalidate() }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, trusted(message.frameInfo.request.url), trusted(web?.url),
              let body = message.body as? [String: Any], let command = body["command"] as? String,
              let id = body["requestId"] as? String, !id.isEmpty, id.count <= 128,
              let account = body["accountScope"] as? String, !account.isEmpty, account.count <= 128,
              ["bind", "invalidate", "connect", "sync", "disconnect"].contains(command) else { return }
        if command == "bind" { invalidate(); scope = account }
        guard scope == account else { return }
        let ticket = epoch
        if command == "invalidate" || command == "disconnect" { invalidate(); return }
        Task { @MainActor in
            var result: [String: Any] = ["requestId": id, "accountScope": account, "platform": "healthkit"]
            do {
                guard HKHealthStore.isHealthDataAvailable() else { result["status"] = "unavailable"; emit(result, ticket: ticket); return }
                if command == "connect" { try await reader.authorize() }
                guard epoch == ticket, scope == account else { return }
                if command == "bind" { result["status"] = "available" }
                else {
                    let days = try await reader.readDays(); result["days"] = days
                    result["status"] = days.contains { $0["steps"] is NSNumber } ? "ok" : "no-readable-data"
                }
            } catch { result["status"] = "error" }
            emit(result, ticket: ticket)
        }
    }
    @MainActor func emit(_ result: [String: Any], ticket: Int) {
        guard epoch == ticket, scope == result["accountScope"] as? String, trusted(web?.url),
              let bytes = try? JSONSerialization.data(withJSONObject: result), let json = String(data: bytes, encoding: .utf8) else { return }
        web?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('doctorcoach:native-result',{detail:\(json)}))")
    }
}
