import 'package:flutter/material.dart';

abstract final class AirvanaColors {
  static const accent = Color(0xFFFF3B4A);
  static const canvas = Color(0xFFF2F2F7);
  static const surface = Color(0xFFFFFFFF);
  static const ink = Color(0xFF1C1C1E);
  static const muted = Color(0xFF8E8E93);
  static const line = Color(0xFFE5E5EA);
  static const success = Color(0xFF17B968);
}

/// Frozen layout values from the legacy Web shell. Flutter uses logical pixels,
/// which map directly to the CSS pixel values used by the mobile Web baseline.
abstract final class AirvanaMetrics {
  static const referenceWidth = 430.0;
  static const referenceHeight = 932.0;
  static const pageGutter = 20.0;
  static const compactGutter = 16.0;
  // 与旧版 Web bottom-nav 完全一致的原值：
  // 外层宽 85%×430、条目 36、图标 23、胶囊 padding 8×6 + 1px 边框、加号 39。
  static const navDockWidth = 365.5;
  static const navCapsuleHeight = 54.0;
  static const navItemSize = 36.0;
  static const navIconSize = 23.0;
  static const navLensWidth = 46.0;
  static const navLensHeight = 38.0;
  static const createButtonSize = 39.0;
  static const feedFooterHeight = 210.0;
  static const cardRadius = 18.0;
}

/// Shared style for ordinary primary actions on Airvana's light surfaces.
/// Inverse buttons on dark game artwork and compact icon actions intentionally
/// keep their local styles.
abstract final class AirvanaButtonStyles {
  static ButtonStyle primary({
    Size minimumSize = const Size(64, 48),
    EdgeInsetsGeometry padding = const EdgeInsets.symmetric(horizontal: 24),
  }) => FilledButton.styleFrom(
    minimumSize: minimumSize,
    padding: padding,
    backgroundColor: AirvanaColors.accent,
    foregroundColor: Colors.white,
    disabledBackgroundColor: const Color(0xFFD1D1D6),
    disabledForegroundColor: Colors.white,
    overlayColor: Colors.white.withValues(alpha: .12),
    elevation: 0,
    shape: const StadiumBorder(),
    textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
  );
}

ThemeData buildAirvanaTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: AirvanaColors.accent,
    brightness: Brightness.light,
    surface: AirvanaColors.surface,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: AirvanaColors.canvas,
    textTheme: const TextTheme(
      headlineMedium: TextStyle(
        color: AirvanaColors.ink,
        fontSize: 22,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.4,
      ),
      titleLarge: TextStyle(
        color: AirvanaColors.ink,
        fontSize: 18,
        fontWeight: FontWeight.w800,
      ),
      bodyMedium: TextStyle(
        color: AirvanaColors.ink,
        fontSize: 12,
        height: 1.5,
      ),
    ),
    cardTheme: const CardThemeData(
      color: AirvanaColors.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: AirvanaButtonStyles.primary(),
    ),
    snackBarTheme: const SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      width: 320,
      backgroundColor: AirvanaColors.ink,
      contentTextStyle: TextStyle(
        color: AirvanaColors.canvas,
        fontSize: 13,
        fontWeight: FontWeight.w800,
        height: 1.25,
      ),
      elevation: 10,
      shape: StadiumBorder(),
      actionTextColor: AirvanaColors.accent,
      disabledActionTextColor: AirvanaColors.muted,
      showCloseIcon: false,
      dismissDirection: DismissDirection.horizontal,
    ),
    dividerColor: AirvanaColors.line,
  );
}
