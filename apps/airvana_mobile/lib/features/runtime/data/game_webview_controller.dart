import 'dart:async';

import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

import '../../shared/domain/power_capability.dart';
import 'power_permission_broker.dart';

/// 建一个适合跑游戏的 WebView 控制器。
///
/// WKWebView 的默认值是 `allowsInlineMediaPlayback: false` 且音视频都要求用户手势，
/// 于是游戏的 BGM/音效会被静默拒绝、`<video>` 会被强拉成全屏原生播放器。
/// Android 的 Chromium 没有这两个限制，所以只跑 Android 时看不出问题。
///
/// [allowedPermissions] 限定本次运行允许代答的权限；留空表示用 Power 目录里
/// 全部容器层能力推导出的范围。作品若明确声明过自己要什么，传进来能把
/// 弹窗面收窄到最小。
WebViewController createGameWebViewController({
  Set<PowerPermission>? allowedPermissions,
}) {
  final params = WebViewPlatform.instance is WebKitWebViewPlatform
      ? WebKitWebViewControllerCreationParams(
          allowsInlineMediaPlayback: true,
          mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
        )
      : const PlatformWebViewControllerCreationParams();
  final controller = WebViewController.fromPlatformCreationParams(
    params,
    // 手势、吹气、体感这类互动作品会去调标准 Web API 要设备权限。
    // 宿主在这里代答——这是 Power 容器层唯一需要做的事，也是它能对
    // 不可改动的第三方作品生效的原因。
    onPermissionRequest: (request) => handlePowerPermissionRequest(
      request,
      allowed: allowedPermissions,
    ),
  );
  // 定位走的是另一条回调，不接就恒被拒（插件默认 don't allow）。
  // 这里 fire-and-forget：它只是注册回调，失败也不该拦住作品加载。
  unawaited(attachGeolocationBroker(controller, allowed: allowedPermissions));
  return controller;
}
