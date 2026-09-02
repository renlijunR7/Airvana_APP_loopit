class AppEnvironment {
  AppEnvironment({
    required this.apiBaseUri,
    required this.demoLoginEnabled,
    this.localFallbackEnabled = true,
    this.preferLocalData = true,
  });

  factory AppEnvironment.fromDartDefines() {
    const rawBaseUrl = String.fromEnvironment(
      'AIRVANA_API_BASE_URL',
      defaultValue: 'http://127.0.0.1:8082',
    );
    const demoLogin = bool.fromEnvironment(
      'AIRVANA_DEMO_LOGIN',
      defaultValue: true,
    );
    const localFallback = bool.fromEnvironment(
      'AIRVANA_LOCAL_FALLBACK',
      defaultValue: true,
    );
    const preferLocal = bool.fromEnvironment(
      'AIRVANA_PREFER_LOCAL_DATA',
      defaultValue: true,
    );
    final uri = Uri.parse(rawBaseUrl);
    if (!uri.hasScheme || uri.host.isEmpty) {
      throw StateError('AIRVANA_API_BASE_URL 必须是完整的 HTTP(S) 地址');
    }
    return AppEnvironment(
      apiBaseUri: uri,
      demoLoginEnabled: demoLogin,
      localFallbackEnabled: localFallback,
      preferLocalData: preferLocal,
    );
  }

  final Uri apiBaseUri;
  final bool demoLoginEnabled;
  final bool localFallbackEnabled;
  final bool preferLocalData;

  Uri resolve(String path) => apiBaseUri.resolve(path);

  String get origin {
    final defaultPort = apiBaseUri.scheme == 'https' ? 443 : 80;
    final port = apiBaseUri.hasPort && apiBaseUri.port != defaultPort
        ? ':${apiBaseUri.port}'
        : '';
    return '${apiBaseUri.scheme}://${apiBaseUri.host}$port';
  }
}
