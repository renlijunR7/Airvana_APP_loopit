import 'dart:async';

import 'package:airvana_mobile/features/runtime/data/game_webview_controller.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/runtime/data/standalone_asset_server.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../shared/domain/power_capability.dart';
import '../domain/game_power_profiles.dart';

/// 独立打包游戏（Web 的 120-132）在安装包内的入口白名单。
/// 与 Web 端 `openStandaloneGameRuntime` 的 slug 校验保持同一口径：
/// 只允许小写字母、数字和连字符，杜绝路径穿越。
final RegExp _standaloneAssetPattern = RegExp(
  r'^assets/arcade/[a-z0-9][a-z0-9-]*/index\.html$',
);

bool isStandaloneAsset(String asset) => _standaloneAssetPattern.hasMatch(asset);

/// 把整份原版游戏放进受控 WebView：素材已打包进安装包，运行期不访问网络。
class StandaloneGameRuntime extends StatefulWidget {
  const StandaloneGameRuntime({
    super.key,
    required this.asset,
    this.onLoadError,
  });

  final String asset;
  final ValueChanged<String>? onLoadError;

  @override
  State<StandaloneGameRuntime> createState() => _StandaloneGameRuntimeState();
}

class _StandaloneGameRuntimeState extends State<StandaloneGameRuntime> {
  late final WebViewController _controller;
  bool _ready = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (!isStandaloneAsset(widget.asset)) {
      _error = '游戏入口不在允许范围内';
      _controller = WebViewController();
      return;
    }
    // 按作品收窄权限代答面：arcade 作品里只有两个手势作品会调 getUserMedia，
    // 其余什么都不请求（数字由 game_power_profiles_test 钉住）。不传的话会回落到目录推导出的
    // 全量并集（camera + microphone + location），等于让一个纯触屏作品也能
    // 弹出摄像头授权框。
    _controller =
        createGameWebViewController(
            allowedPermissions: _allowedPermissions(widget.asset),
          )
          ..setJavaScriptMode(JavaScriptMode.unrestricted)
          ..setBackgroundColor(const Color(0xFF0B0A10));
    unawaited(_load());
  }

  /// 从 `assets/arcade/<slug>/index.html` 反查该作品声明的权限。
  ///
  /// 查不到档案时返回空集合而不是全量——未知作品应当最保守，
  /// 宁可让它降级到触屏，也不该凭空获得设备授权面。
  Set<PowerPermission> _allowedPermissions(String asset) {
    final parts = asset.split('/');
    final index = parts.indexOf('arcade');
    if (index < 0 || index + 1 >= parts.length) return const {};
    return gamePowerProfileFor(parts[index + 1])?.permissions ?? const {};
  }

  Future<void> _load() async {
    final Uri root;
    try {
      root = await StandaloneAssetServer.instance.ensureRunning();
    } on Object catch (error) {
      if (!mounted) return;
      setState(() => _error = '$error');
      widget.onLoadError?.call('$error');
      return;
    }
    if (!mounted) return;
    // assets/arcade/<slug>/index.html → <root>arcade/<slug>/index.html
    final target = root.resolve(widget.asset.substring('assets/'.length));
    _controller
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (mounted) setState(() => _ready = true);
          },
          onWebResourceError: (error) {
            // 原版游戏体量大，缺一两个可选素材不该让整局不可用；
            // 只有主文档加载失败才算失败。
            if (error.isForMainFrame != true) return;
            if (!mounted) return;
            setState(() => _error = error.description);
            widget.onLoadError?.call(error.description);
          },
          // 只允许停留在本机资产服务上，外部导航一律拦截。
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            if (uri == null) return NavigationDecision.prevent;
            return uri.host == root.host && uri.port == root.port
                ? NavigationDecision.navigate
                : NavigationDecision.prevent;
          },
        ),
      )
      ..loadRequest(target);
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Text(
            '原版游戏加载失败：$_error',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
        ),
      );
    }
    return Stack(
      fit: StackFit.expand,
      children: [
        WebViewWidget(controller: _controller),
        if (!_ready)
          const ColoredBox(
            color: Color(0xFF0B0A10),
            child: Center(
              child: CircularProgressIndicator(color: AirvanaColors.accent),
            ),
          ),
      ],
    );
  }
}
