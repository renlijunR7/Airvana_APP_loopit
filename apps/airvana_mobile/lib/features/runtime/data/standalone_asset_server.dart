import 'dart:async';
import 'dart:io';

import 'package:flutter/services.dart';

/// 独立打包游戏是 Vite 产物，入口脚本带 `type="module"`。
/// Chromium 禁止从 `file://` 加载 ES 模块（不透明源过不了 CORS 检查），
/// 所以这些游戏不能用 `loadFlutterAsset`，必须有一个真实的 http 源。
/// 这里把安装包里的资产通过本机回环端口提供出去，流量不出设备。
class StandaloneAssetServer {
  StandaloneAssetServer._();

  static final StandaloneAssetServer instance = StandaloneAssetServer._();

  HttpServer? _server;
  Future<Uri>? _pending;

  /// 站点根地址，例如 http://127.0.0.1:53124/ 。多次调用复用同一个服务。
  Future<Uri> ensureRunning() {
    final server = _server;
    if (server != null) {
      return Future.value(
        Uri.parse('http://${server.address.address}:${server.port}/'),
      );
    }
    return _pending ??= _start();
  }

  Future<Uri> _start() async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    _server = server;
    unawaited(_serve(server));
    return Uri.parse('http://${server.address.address}:${server.port}/');
  }

  Future<void> _serve(HttpServer server) async {
    await for (final request in server) {
      unawaited(_respond(request));
    }
  }

  Future<void> _respond(HttpRequest request) async {
    try {
      if (request.method != 'GET' && request.method != 'HEAD') {
        request.response.statusCode = HttpStatus.methodNotAllowed;
        await request.response.close();
        return;
      }
      // 只暴露 assets/arcade 子树；`..` 已被 Uri 解析规范化掉。
      final relative = request.uri.path.replaceFirst(RegExp(r'^/+'), '');
      if (!relative.startsWith('arcade/')) {
        request.response.statusCode = HttpStatus.notFound;
        await request.response.close();
        return;
      }
      final data = await rootBundle.load('assets/$relative');
      request.response.headers.contentType = _contentTypeFor(relative);
      request.response.headers.set('Cache-Control', 'no-store');
      if (request.method == 'GET') {
        request.response.add(
          data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes),
        );
      }
      await request.response.close();
    } on Object {
      try {
        request.response.statusCode = HttpStatus.notFound;
        await request.response.close();
      } on Object {
        // 连接已断开：忽略。
      }
    }
  }

  ContentType _contentTypeFor(String path) {
    final dot = path.lastIndexOf('.');
    final extension = dot < 0 ? '' : path.substring(dot + 1).toLowerCase();
    return switch (extension) {
      'html' || 'htm' => ContentType.html,
      'js' || 'mjs' => ContentType('text', 'javascript', charset: 'utf-8'),
      'css' => ContentType('text', 'css', charset: 'utf-8'),
      'json' => ContentType.json,
      'svg' => ContentType('image', 'svg+xml'),
      'png' => ContentType('image', 'png'),
      'jpg' || 'jpeg' => ContentType('image', 'jpeg'),
      'webp' => ContentType('image', 'webp'),
      'gif' => ContentType('image', 'gif'),
      'mp3' => ContentType('audio', 'mpeg'),
      'ogg' => ContentType('audio', 'ogg'),
      'wav' => ContentType('audio', 'wav'),
      'mp4' => ContentType('video', 'mp4'),
      'glb' || 'gltf' => ContentType('model', 'gltf-binary'),
      'wasm' => ContentType('application', 'wasm'),
      'ttf' => ContentType('font', 'ttf'),
      'woff' => ContentType('font', 'woff'),
      'woff2' => ContentType('font', 'woff2'),
      _ => ContentType.binary,
    };
  }
}
