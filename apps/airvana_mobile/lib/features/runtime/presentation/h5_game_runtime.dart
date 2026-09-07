import 'dart:convert';

import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// 一次 H5 完整玩法的结果（来自旧版 Web 游戏引擎的 onComplete）。
class H5GameResult {
  const H5GameResult({
    required this.success,
    required this.score,
    required this.stage,
    required this.summary,
  });

  final bool success;
  final int score;
  final String stage;
  final String summary;
}

/// 是否可用内嵌 WebView 承载 H5 完整玩法。
/// Web 目标与未注册 WebView 平台实现的环境（如 widget 测试、桌面）自动降级。
bool h5GameRuntimeSupported() => !kIsWeb && WebViewPlatform.instance != null;

/// 把 legacy playable_id（plb_neon_dash）换算为引擎 gameKey（neon-dash）。
String? h5GameKeyForPlayable(String playableId) {
  if (!playableId.startsWith('plb_')) return null;
  return playableId.substring(4).replaceAll('_', '-');
}

/// 受控 WebView 容器：加载打包在 assets/runner 里的旧版 Web 游戏引擎
/// （complete-v3 32 款 + deep-v2 6 款），完整玩法在页内运行，
/// 事件经 GameBridge JS channel 回传。仅加载本地资产，不访问网络。
class H5GameRuntime extends StatefulWidget {
  const H5GameRuntime({
    super.key,
    required this.gameKey,
    required this.muted,
    required this.onComplete,
    this.onLoadError,
  });

  final String gameKey;
  final bool muted;
  final ValueChanged<H5GameResult> onComplete;
  final ValueChanged<String>? onLoadError;

  @override
  State<H5GameRuntime> createState() => _H5GameRuntimeState();
}

class _H5GameRuntimeState extends State<H5GameRuntime> {
  late final WebViewController _controller;
  bool _ready = false;
  bool _paused = false;
  String? _error;
  String _statusText = '';
  int _liveScore = 0;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0B0A10))
      ..addJavaScriptChannel('GameBridge', onMessageReceived: _onBridgeMessage)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) => _startGame(),
          onWebResourceError: (error) {
            // 子资源级错误（favicon、可选素材等）不致命；只有 runner 主文档
            // 加载失败才降级到本地演示结构。
            if (error.isForMainFrame != true) return;
            if (!mounted) return;
            setState(() => _error = error.description);
            widget.onLoadError?.call(error.description);
          },
          // 只允许 runner 资产页自身；外部导航一律拦截。
          onNavigationRequest: (request) =>
              request.url.startsWith('http') &&
                  !request.url.contains('flutter_assets')
              ? NavigationDecision.prevent
              : NavigationDecision.navigate,
        ),
      )
      ..loadFlutterAsset('assets/runner/playable-runner.html');
  }

  void _startGame() {
    _controller.runJavaScript(
      'startAirvanaGame(${jsonEncode(widget.gameKey)}, ${widget.muted})',
    );
  }

  @override
  void didUpdateWidget(covariant H5GameRuntime oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.gameKey != widget.gameKey) {
      _startGame();
    } else if (oldWidget.muted != widget.muted) {
      // Update the existing engine; toggling feed audio must not restart a run.
      setMuted(widget.muted);
    }
  }

  void _onBridgeMessage(JavaScriptMessage message) {
    Map<String, dynamic> payload;
    try {
      final decoded = jsonDecode(message.message);
      if (decoded is! Map) return;
      payload = Map<String, dynamic>.from(decoded);
    } on Object {
      return;
    }
    if (!mounted) return;
    switch (payload['type']) {
      case 'ready':
        setState(() => _ready = true);
      case 'status':
        setState(() {
          _paused = payload['paused'] == true;
          _liveScore = (payload['score'] as num?)?.toInt() ?? _liveScore;
          _statusText = '${payload['text'] ?? ''}';
        });
      case 'complete':
        widget.onComplete(
          H5GameResult(
            success: payload['success'] == true,
            score: (payload['score'] as num?)?.toInt() ?? 0,
            stage: '${payload['stage'] ?? ''}',
            summary: '${payload['summary'] ?? ''}',
          ),
        );
      case 'error':
        setState(() => _error = '${payload['message'] ?? 'unknown'}');
        widget.onLoadError?.call('${payload['message'] ?? 'unknown'}');
    }
  }

  void togglePause() {
    _controller.runJavaScript('airvanaRunnerControl.togglePause()');
  }

  void restart() {
    _controller.runJavaScript('airvanaRunnerControl.restart()');
  }

  void setMuted(bool value) {
    _controller.runJavaScript('airvanaRunnerControl.mute($value)');
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Text(
            '完整玩法加载失败：$_error',
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
        Positioned(
          left: 12,
          right: 12,
          bottom: 10,
          child: Row(
            children: [
              _RuntimeChip(label: _paused ? '继续' : '暂停', onTap: togglePause),
              const SizedBox(width: 8),
              _RuntimeChip(label: '重开', onTap: restart),
              const Spacer(),
              if (_statusText.isNotEmpty)
                Flexible(
                  child: Text(
                    _statusText,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white60, fontSize: 10),
                  ),
                ),
              const SizedBox(width: 8),
              Text(
                '$_liveScore',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _RuntimeChip extends StatelessWidget {
  const _RuntimeChip({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(999),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white24),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    ),
  );
}
