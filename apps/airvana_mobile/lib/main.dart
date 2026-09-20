import 'package:airvana_mobile/app/airvana_app.dart';
import 'package:airvana_mobile/features/web_parity/presentation/ios_android_parity_shell.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:flutter_web_plugins/url_strategy.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.iOS) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    runApp(const IosAndroidParityApp());
    return;
  }
  // Keep browser refreshes and shared links aligned with the same paths used
  // by Android and iOS instead of maintaining a second hash route.
  usePathUrlStrategy();
  runApp(const ProviderScope(child: AirvanaApp()));
}
