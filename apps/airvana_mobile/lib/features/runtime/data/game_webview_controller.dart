import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

/// 建一个适合跑游戏的 WebView 控制器。
///
/// WKWebView 的默认值是 `allowsInlineMediaPlayback: false` 且音视频都要求用户手势，
/// 于是游戏的 BGM/音效会被静默拒绝、`<video>` 会被强拉成全屏原生播放器。
/// Android 的 Chromium 没有这两个限制，所以只跑 Android 时看不出问题。
WebViewController createGameWebViewController() {
  final params = WebViewPlatform.instance is WebKitWebViewPlatform
      ? WebKitWebViewControllerCreationParams(
          allowsInlineMediaPlayback: true,
          mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
        )
      : const PlatformWebViewControllerCreationParams();
  return WebViewController.fromPlatformCreationParams(params);
}
