import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

/// iOS production shell for the exact Web bundle shipped by the Android APK.
///
/// Android copies `public/` into `assets/www`. The iOS Xcode target copies the
/// same directory into `Runner.app/www`, and this widget serves that bundle on
/// loopback so storage, relative URLs, iframes and game assets keep one origin.
class IosAndroidParityApp extends StatelessWidget {
  const IosAndroidParityApp({super.key});

  @override
  Widget build(BuildContext context) => const MaterialApp(
    title: 'Airvana',
    debugShowCheckedModeBanner: false,
    home: IosAndroidParityShell(),
  );
}

class IosAndroidParityShell extends StatefulWidget {
  const IosAndroidParityShell({super.key});

  @override
  State<IosAndroidParityShell> createState() => _IosAndroidParityShellState();
}

class _IosAndroidParityShellState extends State<IosAndroidParityShell>
    with WidgetsBindingObserver {
  HttpServer? _server;
  WebViewController? _controller;
  String? _error;
  bool _pageReady = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_start());
  }

  @override
  void didChangeMetrics() {
    super.didChangeMetrics();
    unawaited(_injectSafeArea());
  }

  Future<void> _start() async {
    try {
      final executableDirectory = File(Platform.resolvedExecutable).parent;
      final webRoot = Directory('${executableDirectory.path}/www');
      final index = File('${webRoot.path}/index.html');
      if (!await index.exists()) {
        throw StateError('iOS 安装包缺少与 Android 共用的 www/index.html');
      }

      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      _server = server;
      unawaited(_serve(server, webRoot));

      final creationParams = WebKitWebViewControllerCreationParams(
        allowsInlineMediaPlayback: true,
        mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
      );
      final controller =
          WebViewController.fromPlatformCreationParams(creationParams)
            ..setJavaScriptMode(JavaScriptMode.unrestricted)
            ..setBackgroundColor(const Color(0xFFF2F2F7))
            ..setNavigationDelegate(
              NavigationDelegate(
                onPageFinished: (_) {
                  if (!mounted) return;
                  setState(() => _pageReady = true);
                  unawaited(_injectSafeArea());
                },
                onWebResourceError: (error) {
                  if (error.isForMainFrame != true || !mounted) return;
                  setState(() => _error = error.description);
                },
                onNavigationRequest: (request) {
                  final uri = Uri.tryParse(request.url);
                  if (uri == null) return NavigationDecision.prevent;
                  final isBundledOrigin =
                      uri.host == InternetAddress.loopbackIPv4.address &&
                      uri.port == server.port;
                  return isBundledOrigin
                      ? NavigationDecision.navigate
                      : NavigationDecision.prevent;
                },
              ),
            );
      if (controller.platform is WebKitWebViewController) {
        final webKitController = controller.platform as WebKitWebViewController;
        await webKitController.setAllowsBackForwardNavigationGestures(true);
      }
      _controller = controller;
      await controller.loadRequest(
        Uri.parse(
          'http://${InternetAddress.loopbackIPv4.address}:${server.port}/'
          '?native-shell=1&app-version=21&platform=ios&web-parity=1',
        ),
      );
      if (mounted) setState(() {});
    } on Object catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  Future<void> _serve(HttpServer server, Directory webRoot) async {
    await for (final request in server) {
      unawaited(_serveRequest(request, webRoot));
    }
  }

  Future<void> _serveRequest(HttpRequest request, Directory webRoot) async {
    final response = request.response;
    response.headers
      ..set(HttpHeaders.cacheControlHeader, 'no-store, max-age=0')
      ..set(HttpHeaders.pragmaHeader, 'no-cache')
      ..set(HttpHeaders.expiresHeader, '0');
    try {
      final segments = request.uri.pathSegments;
      if (segments.any((segment) => segment == '..' || segment.contains('/'))) {
        await _writeText(response, HttpStatus.forbidden, 'Forbidden');
        return;
      }
      if (request.uri.path.startsWith('/api/')) {
        response.statusCode = HttpStatus.serviceUnavailable;
        response.headers.contentType = ContentType.json;
        response.write(
          '{"ok":false,"code":"IOS_DEMO_FRONTEND_ONLY",'
          '"message":"当前 iOS 与 Android 安装包共用本地前端演示；真实账号与服务能力待后端接入。"}',
        );
        await response.close();
        return;
      }

      var relativePath = segments.join(Platform.pathSeparator);
      if (relativePath.isEmpty || request.uri.path.endsWith('/')) {
        relativePath = relativePath.isEmpty
            ? 'index.html'
            : '$relativePath${Platform.pathSeparator}index.html';
      }
      final file = File(
        '${webRoot.path}${Platform.pathSeparator}$relativePath',
      );
      if (!await file.exists()) {
        await _writeText(response, HttpStatus.notFound, 'Not Found');
        return;
      }
      response.statusCode = HttpStatus.ok;
      response.headers.contentType = _contentTypeFor(relativePath);
      response.contentLength = await file.length();
      if (request.method != 'HEAD') {
        await response.addStream(file.openRead());
      }
      await response.close();
    } on Object {
      try {
        await _writeText(
          response,
          HttpStatus.internalServerError,
          'Internal Server Error',
        );
      } on Object {
        // The client may have already closed the socket.
      }
    }
  }

  Future<void> _writeText(
    HttpResponse response,
    int statusCode,
    String body,
  ) async {
    response
      ..statusCode = statusCode
      ..headers.contentType = ContentType.text
      ..write(body);
    await response.close();
  }

  ContentType _contentTypeFor(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.html')) return ContentType.html;
    if (lower.endsWith('.css')) {
      return ContentType('text', 'css', charset: 'utf-8');
    }
    if (lower.endsWith('.js') || lower.endsWith('.mjs')) {
      return ContentType('application', 'javascript', charset: 'utf-8');
    }
    if (lower.endsWith('.json')) return ContentType.json;
    if (lower.endsWith('.svg')) return ContentType('image', 'svg+xml');
    if (lower.endsWith('.png')) return ContentType('image', 'png');
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      return ContentType('image', 'jpeg');
    }
    if (lower.endsWith('.gif')) return ContentType('image', 'gif');
    if (lower.endsWith('.webp')) return ContentType('image', 'webp');
    if (lower.endsWith('.mp4')) return ContentType('video', 'mp4');
    if (lower.endsWith('.webm')) return ContentType('video', 'webm');
    if (lower.endsWith('.woff2')) return ContentType('font', 'woff2');
    if (lower.endsWith('.woff')) return ContentType('font', 'woff');
    return ContentType.binary;
  }

  Future<void> _injectSafeArea() async {
    final controller = _controller;
    if (controller == null || !mounted) return;
    final padding = MediaQuery.maybeOf(context)?.padding ?? EdgeInsets.zero;
    try {
      await controller.runJavaScript(
        '(function(){var root=document.documentElement;if(!root){return;}'
        "root.style.setProperty('--native-safe-top','${padding.top}px');"
        "root.style.setProperty('--safe-top','var(--native-safe-top)');"
        "root.style.setProperty('--native-safe-bottom','${padding.bottom}px');"
        "root.style.setProperty('--safe-bottom','var(--native-safe-bottom)');"
        '})();',
      );
    } on Object {
      // The next page-finished/metrics event will retry after WebKit is ready.
    }
  }

  Future<void> _retry() async {
    setState(() => _error = null);
    final controller = _controller;
    if (controller != null) {
      await controller.reload();
      return;
    }
    await _server?.close(force: true);
    _server = null;
    await _start();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_server?.close(force: true));
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final error = _error;
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
        systemNavigationBarColor: Colors.transparent,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: const Color(0xFFF2F2F7),
        body: Stack(
          fit: StackFit.expand,
          children: [
            if (controller != null) WebViewWidget(controller: controller),
            if (!_pageReady && error == null)
              const ColoredBox(
                color: Color(0xFFF2F2F7),
                child: Center(
                  child: CircularProgressIndicator(color: Color(0xFFFF3B4A)),
                ),
              ),
            if (error != null)
              ColoredBox(
                color: const Color(0xFFF2F2F7),
                child: SafeArea(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(28),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.cloud_off_rounded,
                            size: 44,
                            color: Color(0xFFFF3B4A),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Airvana 本地首页加载失败',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            error,
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Color(0xFF8E8E93)),
                          ),
                          const SizedBox(height: 20),
                          FilledButton(
                            onPressed: _retry,
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFFFF3B4A),
                            ),
                            child: const Text('重新载入'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
