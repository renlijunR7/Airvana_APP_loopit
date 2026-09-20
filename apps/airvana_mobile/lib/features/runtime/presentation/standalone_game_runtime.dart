import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

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
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0B0A10))
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
          // 只允许停留在安装包内的资产页，外部导航一律拦截。
          onNavigationRequest: (request) =>
              request.url.startsWith('http') &&
                  !request.url.contains('flutter_assets')
              ? NavigationDecision.prevent
              : NavigationDecision.navigate,
        ),
      )
      ..loadFlutterAsset(widget.asset);
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
