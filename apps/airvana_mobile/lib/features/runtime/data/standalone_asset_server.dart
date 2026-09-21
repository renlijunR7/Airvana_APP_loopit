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
      final bytes = data.buffer.asUint8List(
        data.offsetInBytes,
        data.lengthInBytes,
      );
      request.response.headers.contentType = _contentTypeFor(relative);
      request.response.headers.set('Cache-Control', 'no-store');
      // iOS 的 <audio>/<video> 走 AVFoundation，会先发 Range 探测并要求 206；
      // 拿到 200 + chunked 时常判定为不可播放。Android 的 Chromium 不挑，
      // 所以这一段在只跑 Android 时看不出问题。
      request.response.headers.set('Accept-Ranges', 'bytes');
      final range = _parseRange(request.headers.value('range'), bytes.length);
      if (range == null) {
        request.response.headers.contentLength = bytes.length;
        if (request.method == 'GET') request.response.add(bytes);
        await request.response.close();
        return;
      }
      final (start, end) = range;
      request.response.statusCode = HttpStatus.partialContent;
      request.response.headers.set(
        'Content-Range',
        'bytes $start-$end/${bytes.length}',
      );
      request.response.headers.contentLength = end - start + 1;
      if (request.method == 'GET') {
        request.response.add(Uint8List.sublistView(bytes, start, end + 1));
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

  /// 解析 `bytes=start-end`。只支持单段；解析不出或越界时返回 null 走整文件 200。
  (int, int)? _parseRange(String? header, int length) {
    if (header == null || length == 0) return null;
    final match = RegExp(r'^bytes=(\d*)-(\d*)$').firstMatch(header.trim());
    if (match == null) return null;
    final rawStart = match.group(1) ?? '';
    final rawEnd = match.group(2) ?? '';
    if (rawStart.isEmpty && rawEnd.isEmpty) return null;
    int start;
    int end;
    if (rawStart.isEmpty) {
      // `bytes=-N`：最后 N 字节。
      final suffix = int.parse(rawEnd);
      if (suffix <= 0) return null;
      start = suffix >= length ? 0 : length - suffix;
      end = length - 1;
    } else {
      start = int.parse(rawStart);
      end = rawEnd.isEmpty ? length - 1 : int.parse(rawEnd);
    }
    if (start < 0 || start >= length) return null;
    if (end >= length) end = length - 1;
    if (end < start) return null;
    return (start, end);
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
