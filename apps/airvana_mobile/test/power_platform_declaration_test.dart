import 'dart:io';

import 'package:airvana_mobile/features/shared/domain/power_capability.dart';
import 'package:airvana_mobile/features/shared/domain/power_catalog.dart';
import 'package:flutter_test/flutter_test.dart';

/// Power 目录与两端平台声明的对齐。
///
/// 这一层的失败**不会编译报错**，只会在真机上静默失效，所以必须用测试兜住：
///
/// * Android：申请未在 `AndroidManifest.xml` 声明的权限，系统直接否决且不弹窗。
///   吹气玩法长期失效就是因为少了一行 `RECORD_AUDIO` —— 权限代答的代码是对的，
///   但申请的是一个没声明过的权限。
/// * iOS：`permission_handler` 用 `PERMISSION_*` 宏把每种权限的实现包起来
///   （为了不引用没有 UsageDescription 的能力而被退审 ITMS-90683）。
///   CocoaPods 下这些宏得自己在 Podfile 里给，不给等于全部关闭，
///   表现是申请直接返回 permanentlyDenied 且不弹窗——极易被误判成「用户拒绝过」。
/// * iOS 还要求每种权限有对应的 `NS*UsageDescription`，缺了会直接崩。
void main() {
  final androidManifest = File(
    'android/app/src/main/AndroidManifest.xml',
  ).readAsStringSync();
  final infoPlist = File('ios/Runner/Info.plist').readAsStringSync();
  final podfile = File('ios/Podfile').readAsStringSync();

  /// 每种权限在三处需要的声明。
  const androidPermissions = <PowerPermission, List<String>>{
    PowerPermission.camera: ['android.permission.CAMERA'],
    PowerPermission.microphone: [
      'android.permission.RECORD_AUDIO',
      // Chromium 的音频管理器要求两条齐全，只有 RECORD_AUDIO 时直接放弃采集：
      // `cr_media: Requires MODIFY_AUDIO_SETTINGS and RECORD_AUDIO.`
      // 现象是「已授权却没有声音」，从表现反推极难。
      'android.permission.MODIFY_AUDIO_SETTINGS',
    ],
    // 加速度计与陀螺仪在 Android 上不需要运行时权限，只需 uses-feature
    // 声明硬件可选，避免应用被从缺少传感器的设备上筛掉。
    PowerPermission.motion: [],
    PowerPermission.location: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
    PowerPermission.activityRecognition: [
      'android.permission.ACTIVITY_RECOGNITION',
    ],
    PowerPermission.nearbyDevices: ['android.permission.BLUETOOTH_SCAN'],
  };

  const iosUsageKeys = <PowerPermission, String>{
    PowerPermission.camera: 'NSCameraUsageDescription',
    PowerPermission.microphone: 'NSMicrophoneUsageDescription',
    PowerPermission.motion: 'NSMotionUsageDescription',
    PowerPermission.location: 'NSLocationWhenInUseUsageDescription',
    // iOS 的计步来自 CoreMotion，与体感共用同一条描述。
    PowerPermission.activityRecognition: 'NSMotionUsageDescription',
    PowerPermission.nearbyDevices: 'NSBluetoothAlwaysUsageDescription',
  };

  const iosMacros = <PowerPermission, String>{
    PowerPermission.camera: 'PERMISSION_CAMERA',
    PowerPermission.microphone: 'PERMISSION_MICROPHONE',
    PowerPermission.motion: 'PERMISSION_SENSORS',
    PowerPermission.location: 'PERMISSION_LOCATION_WHENINUSE',
    PowerPermission.activityRecognition: 'PERMISSION_SENSORS',
    PowerPermission.nearbyDevices: 'PERMISSION_BLUETOOTH',
  };

  /// 目录里真正被用到的权限。没有能力用到的权限不必声明——
  /// 多要一个权限就是多一分被应用商店问询、被用户拒绝的理由。
  final used = <PowerPermission>{
    for (final power in kPowerCatalog) ...power.permissions,
  };

  test('目录用到的权限不超出已知映射范围', () {
    for (final permission in used) {
      expect(
        androidPermissions.containsKey(permission),
        isTrue,
        reason: '$permission 没有 Android 侧映射，新增权限时要同步补这张表',
      );
      expect(iosUsageKeys.containsKey(permission), isTrue);
      expect(iosMacros.containsKey(permission), isTrue);
    }
  });

  test('Android：每条用到的权限都已在 manifest 声明', () {
    for (final permission in used) {
      for (final name in androidPermissions[permission]!) {
        expect(
          androidManifest.contains('android:name="$name"'),
          isTrue,
          reason: '$permission 需要 $name，但 AndroidManifest.xml 里没有。'
              '后果是运行期申请被系统静默否决，且不弹任何窗。',
        );
      }
    }
  });

  test('Android：传感器硬件一律 required="false"，不因缺件被商店筛掉', () {
    final featurePattern = RegExp(
      r'<uses-feature[^>]*android:name="([^"]+)"[^>]*?/>',
      dotAll: true,
    );
    final features = featurePattern.allMatches(androidManifest);
    expect(features, isNotEmpty);
    for (final match in features) {
      final block = match.group(0)!;
      expect(
        block.contains('android:required="false"'),
        isTrue,
        reason: '${match.group(1)} 没有标成可选，缺少该硬件的设备将无法安装',
      );
    }
  });

  test('Android：不申请后台定位', () {
    // 玩法只需要「使用期间」的位置。后台定位会触发应用商店的额外审查，
    // 而且没有任何一条能力需要它。
    expect(
      androidManifest.contains('ACCESS_BACKGROUND_LOCATION'),
      isFalse,
      reason: '没有能力需要后台定位',
    );
  });

  test('Android：蓝牙扫描声明 neverForLocation，避免连带索要定位权限', () {
    expect(
      androidManifest.contains('android:usesPermissionFlags="neverForLocation"'),
      isTrue,
    );
  });

  test('iOS：每条用到的权限都有 UsageDescription，且文案说明了用途与边界', () {
    for (final permission in used) {
      final key = iosUsageKeys[permission]!;
      expect(
        infoPlist.contains('<key>$key</key>'),
        isTrue,
        reason: '$permission 需要 $key，缺失会导致 iOS 上直接崩溃',
      );
      // 取出该键后面的第一段 string，确认不是占位符。
      final index = infoPlist.indexOf('<key>$key</key>');
      final tail = infoPlist.substring(index);
      final value = RegExp(r'<string>([^<]*)</string>').firstMatch(tail)?.group(1) ?? '';
      expect(
        value.trim().length,
        greaterThan(10),
        reason: '$key 的说明太短，审核与用户都需要知道为什么要这个权限',
      );
    }
  });

  test('iOS：Podfile 给足了 permission_handler 的编译开关', () {
    for (final permission in used) {
      final macro = iosMacros[permission]!;
      expect(
        podfile.contains('$macro=1'),
        isTrue,
        reason: '$permission 需要 Podfile 里的 $macro=1。'
            '缺了不会报错，只会让申请直接返回 permanentlyDenied 且不弹窗。',
      );
    }
  });

  test('震动执行器需要 VIBRATE 权限', () {
    final hasHaptics = kPowerCatalog.any(
      (power) => power.actuators.any((a) => a.name.startsWith('haptic.')),
    );
    if (!hasHaptics) return;
    expect(
      androidManifest.contains('android.permission.VIBRATE'),
      isTrue,
      reason: '目录里有 haptic 执行器，Android 上需要 VIBRATE',
    );
  });

  test('每条需要权限的能力都有降级方案，权限被拒时作品仍可玩', () {
    for (final power in kPowerCatalog) {
      if (power.permissions.isEmpty) continue;
      expect(power.fallback, isNotNull, reason: '${power.id} 缺降级方案');
      expect(
        power.fallback!.timeout.inSeconds,
        inInclusiveRange(1, 60),
        reason: '${power.id} 的等待上限不合理——没有上限就会悬挂',
      );
    }
  });
}
