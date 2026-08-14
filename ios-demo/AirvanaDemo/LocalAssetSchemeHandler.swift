import Foundation
import WebKit

final class LocalAssetSchemeHandler: NSObject, WKURLSchemeHandler {
    private let worker = DispatchQueue(label: "ai.airvana.ios.asset-server", qos: .userInitiated)
    private let lock = NSLock()
    private var activeTasks = Set<ObjectIdentifier>()

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        let identifier = ObjectIdentifier(urlSchemeTask)
        lock.lock()
        activeTasks.insert(identifier)
        lock.unlock()

        worker.async { [weak self] in
            self?.serve(urlSchemeTask, identifier: identifier)
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        let identifier = ObjectIdentifier(urlSchemeTask)
        lock.lock()
        activeTasks.remove(identifier)
        lock.unlock()
    }

    private func serve(_ task: WKURLSchemeTask, identifier: ObjectIdentifier) {
        guard let url = task.request.url else {
            finish(task, identifier: identifier, error: AssetError.invalidURL)
            return
        }

        let decodedPath = url.path.removingPercentEncoding ?? url.path
        guard !decodedPath.split(separator: "/").contains("..") else {
            finish(task, identifier: identifier, error: AssetError.forbiddenPath)
            return
        }

        if decodedPath.hasPrefix("/api/") {
            let data = Data("{\"ok\":false,\"code\":\"IOS_DEMO_FRONTEND_ONLY\",\"message\":\"当前 iOS 演示仅包含前端；真实账号与服务能力待后端接入。\"}".utf8)
            send(task, identifier: identifier, data: data, mimeType: "application/json", encoding: "utf-8")
            return
        }

        var relativePath = decodedPath.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        if relativePath.isEmpty {
            relativePath = "index.html"
        } else if decodedPath.hasSuffix("/") {
            relativePath += "/index.html"
        }

        guard let root = Bundle.main.resourceURL?.appendingPathComponent("www", isDirectory: true) else {
            finish(task, identifier: identifier, error: AssetError.missingBundle)
            return
        }
        let fileURL = root.appendingPathComponent(relativePath).standardizedFileURL
        guard fileURL.path.hasPrefix(root.standardizedFileURL.path) else {
            finish(task, identifier: identifier, error: AssetError.forbiddenPath)
            return
        }

        do {
            let data = try Data(contentsOf: fileURL, options: .mappedIfSafe)
            send(task, identifier: identifier, data: data, mimeType: mimeType(for: fileURL.pathExtension), encoding: textEncoding(for: fileURL.pathExtension))
        } catch {
            finish(task, identifier: identifier, error: error)
        }
    }

    private func send(
        _ task: WKURLSchemeTask,
        identifier: ObjectIdentifier,
        data: Data,
        mimeType: String,
        encoding: String?
    ) {
        DispatchQueue.main.async { [weak self] in
            guard let self, self.takeIfActive(identifier) else { return }
            guard let url = task.request.url else {
                task.didFailWithError(AssetError.invalidURL)
                return
            }
            let response = URLResponse(
                url: url,
                mimeType: mimeType,
                expectedContentLength: data.count,
                textEncodingName: encoding
            )
            task.didReceive(response)
            task.didReceive(data)
            task.didFinish()
        }
    }

    private func finish(_ task: WKURLSchemeTask, identifier: ObjectIdentifier, error: Error) {
        DispatchQueue.main.async { [weak self] in
            guard let self, self.takeIfActive(identifier) else { return }
            task.didFailWithError(error)
        }
    }

    private func takeIfActive(_ identifier: ObjectIdentifier) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        return activeTasks.remove(identifier) != nil
    }

    private func mimeType(for extensionName: String) -> String {
        switch extensionName.lowercased() {
        case "html": return "text/html"
        case "css": return "text/css"
        case "js", "mjs": return "application/javascript"
        case "json": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "gif": return "image/gif"
        case "webp": return "image/webp"
        case "mp4": return "video/mp4"
        case "webm": return "video/webm"
        case "mp3": return "audio/mpeg"
        case "wav": return "audio/wav"
        case "woff": return "font/woff"
        case "woff2": return "font/woff2"
        default: return "application/octet-stream"
        }
    }

    private func textEncoding(for extensionName: String) -> String? {
        switch extensionName.lowercased() {
        case "html", "css", "js", "mjs", "json", "svg": return "utf-8"
        default: return nil
        }
    }

    private enum AssetError: LocalizedError {
        case invalidURL
        case forbiddenPath
        case missingBundle

        var errorDescription: String? {
            switch self {
            case .invalidURL: return "无效的本地资源地址"
            case .forbiddenPath: return "不允许访问该本地路径"
            case .missingBundle: return "Airvana 前端资源未被打包"
            }
        }
    }
}
