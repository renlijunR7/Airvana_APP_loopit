import SwiftUI
import UIKit
import WebKit

struct AirvanaWebContainer: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
        configuration.setURLSchemeHandler(LocalAssetSchemeHandler(), forURLScheme: "airvana")

        let webView = InsetAwareWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.keyboardDismissMode = .none
        webView.inputAssistantItem.leadingBarButtonGroups = []
        webView.inputAssistantItem.trailingBarButtonGroups = []
        webView.isOpaque = false
        webView.backgroundColor = .systemGroupedBackground
        webView.customUserAgent = "AirvanaLoopit/1.0.11 (iOS; WKWebView)"
        webView.safeAreaDidChange = { [weak webView, weak coordinator = context.coordinator] in
            guard let webView else { return }
            coordinator?.injectNativeSafeArea(into: webView)
        }

        context.coordinator.webView = webView
        let url = URL(string: "airvana://app/?native-shell=1&native-platform=ios&native-version=1.0.11&native-build=13")!
        webView.load(URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.injectNativeSafeArea(into: webView)
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        weak var webView: WKWebView?

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            injectNativeSafeArea(into: webView)
        }

        func injectNativeSafeArea(into webView: WKWebView) {
            let top = max(0, webView.safeAreaInsets.top)
            let bottom = max(0, webView.safeAreaInsets.bottom)
            let script = """
            (() => {
              const root = document.documentElement;
              if (!root) return;
              root.classList.add('native-app-shell');
              root.style.setProperty('--native-safe-top', '\(top)px');
              root.style.setProperty('--safe-top', 'var(--native-safe-top)');
              root.style.setProperty('--native-safe-bottom', '\(bottom)px');
              root.style.setProperty('--safe-bottom', 'var(--native-safe-bottom)');
            })();
            """
            webView.evaluateJavaScript(script)
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            if url.scheme == "airvana" || url.scheme == "about" {
                decisionHandler(.allow)
                return
            }

            if let scheme = url.scheme, ["https", "http", "mailto", "tel"].contains(scheme) {
                UIApplication.shared.open(url)
            }
            decisionHandler(.cancel)
        }

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if let url = navigationAction.request.url {
                if url.scheme == "airvana" {
                    webView.load(navigationAction.request)
                } else {
                    UIApplication.shared.open(url)
                }
            }
            return nil
        }

        func webView(
            _ webView: WKWebView,
            runJavaScriptAlertPanelWithMessage message: String,
            initiatedByFrame frame: WKFrameInfo,
            completionHandler: @escaping () -> Void
        ) {
            presentAlert(title: "Airvana", message: message, confirmTitle: "确定") { _ in
                completionHandler()
            }
        }

        func webView(
            _ webView: WKWebView,
            runJavaScriptConfirmPanelWithMessage message: String,
            initiatedByFrame frame: WKFrameInfo,
            completionHandler: @escaping (Bool) -> Void
        ) {
            presentAlert(title: "Airvana", message: message, confirmTitle: "确定", hasCancel: true) {
                completionHandler($0)
            }
        }

        private func presentAlert(
            title: String,
            message: String,
            confirmTitle: String,
            hasCancel: Bool = false,
            completion: @escaping (Bool) -> Void
        ) {
            guard let presenter = topViewController() else {
                completion(false)
                return
            }
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            if hasCancel {
                alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completion(false) })
            }
            alert.addAction(UIAlertAction(title: confirmTitle, style: .default) { _ in completion(true) })
            presenter.present(alert, animated: true)
        }

        private func topViewController() -> UIViewController? {
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            var controller = scenes.flatMap(\.windows).first(where: \.isKeyWindow)?.rootViewController
            while let presented = controller?.presentedViewController {
                controller = presented
            }
            return controller
        }
    }
}

private final class InsetAwareWebView: WKWebView {
    var safeAreaDidChange: (() -> Void)?

    override func safeAreaInsetsDidChange() {
        super.safeAreaInsetsDidChange()
        safeAreaDidChange?()
    }
}
