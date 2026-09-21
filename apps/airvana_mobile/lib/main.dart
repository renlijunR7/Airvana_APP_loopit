import 'package:airvana_mobile/app/airvana_app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_plugins/url_strategy.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Keep browser refreshes and shared links aligned with the same paths used
  // by Android and iOS instead of maintaining a second hash route.
  usePathUrlStrategy();
  runApp(const ProviderScope(child: AirvanaApp()));
}
