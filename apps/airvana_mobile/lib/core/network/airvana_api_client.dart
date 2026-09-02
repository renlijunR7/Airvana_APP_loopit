import 'dart:async';
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import 'http_client_factory.dart';

abstract interface class SessionStore {
  Future<String?> readCookie();
  Future<void> writeCookie(String value);
  Future<void> clear();
}

class SecureSessionStore implements SessionStore {
  SecureSessionStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'airvana_session_cookie';
  final FlutterSecureStorage _storage;

  @override
  Future<String?> readCookie() => _storage.read(key: _key);

  @override
  Future<void> writeCookie(String value) =>
      _storage.write(key: _key, value: value);

  @override
  Future<void> clear() => _storage.delete(key: _key);
}

class MemorySessionStore implements SessionStore {
  String? value;

  @override
  Future<String?> readCookie() async => value;

  @override
  Future<void> writeCookie(String nextValue) async => value = nextValue;

  @override
  Future<void> clear() async => value = null;
}

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.code});

  final String message;
  final int? statusCode;
  final String? code;

  @override
  String toString() => message;
}

class AirvanaApiClient {
  AirvanaApiClient({
    required this.baseUri,
    required SessionStore sessionStore,
    http.Client? httpClient,
    this.requestTimeout = const Duration(seconds: 8),
  }) : _sessionStore = sessionStore,
       _http = httpClient ?? createAirvanaHttpClient();

  final Uri baseUri;
  final SessionStore _sessionStore;
  final http.Client _http;
  final Duration requestTimeout;

  Future<String?> get sessionCookie => _sessionStore.readCookie();

  Future<Map<String, dynamic>> getJson(String path) => _request('GET', path);

  Future<Map<String, dynamic>> postJson(
    String path,
    Map<String, dynamic> body,
  ) => _request('POST', path, body: body);

  Future<Map<String, dynamic>> patchJson(
    String path,
    Map<String, dynamic> body,
  ) => _request('PATCH', path, body: body);

  Future<Map<String, dynamic>> deleteJson(
    String path, [
    Map<String, dynamic>? body,
  ]) => _request('DELETE', path, body: body);

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final cookie = await _sessionStore.readCookie();
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Airvana-Device': 'flutter-local-device',
      if (cookie != null) 'Cookie': cookie,
    };
    late http.Response response;
    try {
      final uri = baseUri.resolve(path);
      response = switch (method) {
        'GET' => await _http.get(uri, headers: headers).timeout(requestTimeout),
        'PATCH' =>
          await _http
              .patch(uri, headers: headers, body: jsonEncode(body))
              .timeout(requestTimeout),
        'DELETE' =>
          await _http
              .delete(
                uri,
                headers: headers,
                body: body == null ? null : jsonEncode(body),
              )
              .timeout(requestTimeout),
        _ =>
          await _http
              .post(uri, headers: headers, body: jsonEncode(body))
              .timeout(requestTimeout),
      };
    } on TimeoutException {
      throw ApiException('连接 Airvana 服务超时，请检查真机网络与服务地址');
    } catch (_) {
      throw ApiException('无法连接 Airvana 本地服务，请确认服务已启动');
    }

    final setCookie = response.headers['set-cookie'];
    if (setCookie != null && setCookie.isNotEmpty) {
      await _sessionStore.writeCookie(setCookie.split(';').first);
    }

    Map<String, dynamic> decoded = const {};
    if (response.body.isNotEmpty) {
      try {
        final value = jsonDecode(response.body);
        if (value is Map<String, dynamic>) decoded = value;
      } on FormatException {
        throw ApiException('服务返回了无法识别的数据', statusCode: response.statusCode);
      }
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = decoded['error'];
      throw ApiException(
        error is Map ? '${error['message'] ?? '请求失败'}' : '请求失败',
        statusCode: response.statusCode,
        code: error is Map ? '${error['code'] ?? ''}' : null,
      );
    }
    return decoded;
  }
}
