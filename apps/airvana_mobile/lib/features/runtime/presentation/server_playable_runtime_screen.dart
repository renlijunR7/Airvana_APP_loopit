import 'dart:async';

import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/runtime/domain/runtime_bridge.dart';
import 'package:airvana_mobile/features/runtime/presentation/playable_runtime_screen.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Uses the server-confirmed H5 runtime only for server content IDs. Local
/// releases and the frozen legacy catalog remain explicitly labelled demos.
class PlayableRuntimeEntryScreen extends StatelessWidget {
  const PlayableRuntimeEntryScreen({super.key, required this.playable});

  final Playable playable;

  @override
  Widget build(BuildContext context) {
    final serverContent =
        !playable.localDemo && playable.id.startsWith('content_');
    if (!serverContent) return PlayableRuntimeScreen(playable: playable);
    return ServerPlayableRuntimeScreen(playable: playable);
  }
}

class ServerPlayableRuntimeScreen extends ConsumerStatefulWidget {
  const ServerPlayableRuntimeScreen({super.key, required this.playable});

  final Playable playable;

  @override
  ConsumerState<ServerPlayableRuntimeScreen> createState() =>
      _ServerPlayableRuntimeScreenState();
}

class _ServerPlayableRuntimeScreenState
    extends ConsumerState<ServerPlayableRuntimeScreen> {
  WebViewController? _controller;
  int _progress = 0;
  bool _initializing = true;
  String? _error;
  String _runtimeStatus = '正在建立受控运行容器';
  final List<String> _acceptedEvents = <String>[];

  Uri get _runtimeUri {
    final environment = ref.read(appEnvironmentProvider);
    return environment.resolve(
      '/content/${Uri.encodeComponent(widget.playable.id)}',
    );
  }

  @override
  void initState() {
    super.initState();
    unawaited(_initialize());
  }

  Future<void> _initialize() async {
    if (kIsWeb || WebViewPlatform.instance == null) {
      if (!mounted) return;
      setState(() {
        _initializing = false;
        _runtimeStatus = '当前宿主不提供原生 WebView';
      });
      return;
    }

    try {
      final repository = ref.read(airvanaRepositoryProvider);
      final cookie = await repository.sessionCookie();
      if (cookie == null || !cookie.contains('=')) {
        throw StateError('登录会话不存在，请返回首页重新载入');
      }
      final separator = cookie.indexOf('=');
      await WebViewCookieManager().setCookie(
        WebViewCookie(
          name: cookie.substring(0, separator),
          value: cookie.substring(separator + 1),
          domain: _runtimeUri.host,
          path: '/',
        ),
      );

      final controller = WebViewController();
      await controller.setJavaScriptMode(JavaScriptMode.unrestricted);
      await controller.setBackgroundColor(const Color(0xFF0E120F));
      await controller.addJavaScriptChannel(
        'AirvanaBridge',
        onMessageReceived: (message) => _handleBridgeMessage(message.message),
      );
      await controller.setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (mounted) setState(() => _progress = progress);
          },
          onPageStarted: (_) {
            if (!mounted) return;
            setState(() {
              _error = null;
              _runtimeStatus = '正在载入服务端成品';
            });
          },
          onPageFinished: (_) {
            if (mounted && _runtimeStatus == '正在载入服务端成品') {
              setState(() => _runtimeStatus = '等待 Runtime 就绪回执');
            }
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame != true || !mounted) return;
            setState(() {
              _error = '成品载入失败：${error.description}';
              _runtimeStatus = '运行容器失败';
            });
          },
          onNavigationRequest: (request) {
            final candidate = Uri.tryParse(request.url);
            if (candidate != null &&
                isAllowedRuntimeUri(
                  candidate,
                  ref.read(appEnvironmentProvider).apiBaseUri,
                )) {
              return NavigationDecision.navigate;
            }
            if (mounted) {
              setState(() {
                _error = '已阻止非 Airvana 同源跳转';
                _runtimeStatus = '外部导航已拦截';
              });
            }
            return NavigationDecision.prevent;
          },
        ),
      );
      if (!mounted) return;
      setState(() {
        _controller = controller;
        _initializing = false;
      });
      await controller.loadRequest(_runtimeUri);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _initializing = false;
        _error = '$error'.replaceFirst('Bad state: ', '');
        _runtimeStatus = '运行容器初始化失败';
      });
    }
  }

  void _handleBridgeMessage(String raw) {
    try {
      final message = RuntimeBridgeMessage.parse(raw);
      if (message.type == 'runtime_ready') {
        if (message.payload['contentId'] != widget.playable.id) {
          throw const FormatException('Runtime 内容标识不匹配');
        }
        setState(() {
          _runtimeStatus = '服务端 Runtime 已就绪';
          _error = null;
        });
        return;
      }

      final eventType = message.payload['eventType'] as String;
      if (_acceptedEvents.contains(eventType)) return;
      setState(() {
        _acceptedEvents.add(eventType);
        _runtimeStatus = eventType == 'playable_complete'
            ? '服务端已确认完成'
            : '服务端已确认 ${_eventLabel(eventType)}';
        _error = null;
      });
      if (eventType == 'playable_complete') {
        ref.invalidate(experienceHistoryProvider);
        ref.invalidate(homeProvider);
      }
    } on FormatException catch (error) {
      setState(() {
        _error = 'Bridge 回执被拒绝：${error.message}';
        _runtimeStatus = '未接受未验证的运行回执';
      });
    }
  }

  String _eventLabel(String eventType) => switch (eventType) {
    'playable_start' => '开始事件',
    'step_complete' => '阶段事件',
    'playable_complete' => '完成事件',
    _ => eventType,
  };

  Future<void> _copyRuntimeUrl() async {
    await Clipboard.setData(ClipboardData(text: _runtimeUri.toString()));
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Runtime 地址已复制')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0E120F),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111512),
        foregroundColor: Colors.white,
        titleSpacing: 0,
        leading: IconButton(
          tooltip: '返回',
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.playable.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
            ),
            Text(
              _runtimeStatus,
              key: const ValueKey('server-runtime-status'),
              style: TextStyle(
                color: _error == null
                    ? const Color(0xFF8DE6AE)
                    : const Color(0xFFFF8F98),
                fontSize: 10,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: '重新载入',
            onPressed: _controller == null
                ? null
                : () => unawaited(_controller!.reload()),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: Column(
        children: [
          if (_progress < 100 && _controller != null)
            LinearProgressIndicator(
              value: _progress / 100,
              minHeight: 2,
              color: AirvanaColors.accent,
              backgroundColor: Colors.white12,
            ),
          if (_acceptedEvents.isNotEmpty)
            _ServerProofStrip(events: _acceptedEvents),
          Expanded(child: _runtimeBody()),
        ],
      ),
    );
  }

  Widget _runtimeBody() {
    if (_initializing) {
      return const Center(
        child: CircularProgressIndicator(color: AirvanaColors.accent),
      );
    }
    if (_controller != null) {
      return WebViewWidget(
        key: const ValueKey('server-runtime-webview'),
        controller: _controller!,
      );
    }
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.phone_iphone_rounded,
              color: Colors.white54,
              size: 48,
            ),
            const SizedBox(height: 16),
            const Text(
              '服务端成品需要在 Android 或 iOS 的受控 WebView 中运行',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                fontSize: 17,
                fontWeight: FontWeight.w800,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? 'Flutter Web 预览不会伪造服务端完成回执。',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white60, height: 1.5),
            ),
            const SizedBox(height: 18),
            OutlinedButton.icon(
              onPressed: _copyRuntimeUrl,
              icon: const Icon(Icons.link_rounded),
              label: const Text('复制受控 Runtime 地址'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ServerProofStrip extends StatelessWidget {
  const _ServerProofStrip({required this.events});

  final List<String> events;

  @override
  Widget build(BuildContext context) {
    const ordered = <(String, String)>[
      ('playable_start', '开始'),
      ('step_complete', '阶段'),
      ('playable_complete', '完成'),
    ];
    return Semantics(
      liveRegion: true,
      label: '服务端运行事件已确认 ${events.length} 项',
      child: Container(
        key: const ValueKey('server-runtime-proof-strip'),
        color: const Color(0xFF18231C),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        child: Row(
          children: ordered
              .map((entry) {
                final accepted = events.contains(entry.$1);
                return Expanded(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        accepted
                            ? Icons.check_circle_rounded
                            : Icons.radio_button_unchecked_rounded,
                        size: 14,
                        color: accepted
                            ? const Color(0xFF78E9A3)
                            : Colors.white30,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        entry.$2,
                        style: TextStyle(
                          color: accepted ? Colors.white : Colors.white38,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                );
              })
              .toList(growable: false),
        ),
      ),
    );
  }
}
