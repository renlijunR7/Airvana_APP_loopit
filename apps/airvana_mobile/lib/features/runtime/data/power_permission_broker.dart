/// 容器边界层的权限代答。
///
/// 这是 Power 三层交付里最下面、也是唯一对「不可改动的第三方作品」生效的一层
/// （[PowerDelivery.container]）。它之所以能零改动生效，是因为作品本来就在调
/// `getUserMedia` 这类标准 Web API，宿主只是**换了答复**——作品不需要知道
/// 宿主的存在。
///
/// 代答的唯一硬性契约：**无论走哪条分支、无论出什么错，都必须恰好答复一次。**
/// 漏答一次，网页侧的 `getUserMedia` 就永远不会 settle：既不 resolve 也不
/// reject，catch 分支根本跑不到，作品永久停在「正在连接…」。这不是假设，
/// 是真机上实测到的表现。
library;

import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../../shared/domain/power_capability.dart';
import '../../shared/domain/power_catalog.dart';

/// 等用户回答系统授权弹窗的上限。超时按拒绝处理。
///
/// 宁可误判成拒绝、让作品退回触屏，也不能把请求悬在那里——原生侧的
/// `PermissionRequest` 是 fire-and-forget 的，宿主不答复它就一直挂着。
const _promptTimeout = Duration(seconds: 25);

/// WebView 能请求的资源类型，到 Power 权限模型的映射。
///
/// 插件目前只定义了 camera 与 microphone 两种；出现未知类型时**一律拒绝**，
/// 而不是猜一个最接近的——猜错的代价是把用户没预期的权限弹窗推到脸上。
PowerPermission? _toPowerPermission(WebViewPermissionResourceType type) {
  if (type == WebViewPermissionResourceType.camera) {
    return PowerPermission.camera;
  }
  if (type == WebViewPermissionResourceType.microphone) {
    return PowerPermission.microphone;
  }
  return null;
}

Permission? _toSystemPermission(PowerPermission permission) => switch (permission) {
  PowerPermission.camera => Permission.camera,
  PowerPermission.microphone => Permission.microphone,
  PowerPermission.location => Permission.locationWhenInUse,
  PowerPermission.activityRecognition => Permission.activityRecognition,
  PowerPermission.nearbyDevices => Permission.bluetoothScan,
  PowerPermission.motion => Permission.sensors,
  PowerPermission.notification => Permission.notification,
};

/// 目录里所有「容器层能力」用到的权限集合。
///
/// 代答的白名单由目录推导，而不是写死一串 if。新增一条容器层能力时，
/// 它需要的权限自动进入可代答范围；反之，目录里没有任何能力声明过的权限，
/// 作品请求了也一律拒绝。
///
/// 之前这里写死成「只放行纯摄像头请求，其余一律 deny」，直接后果是
/// `assets/runner/sensor-interactions-v1.js:192` 那条 `getUserMedia({audio})`
/// 永远拿不到授权——吹气类玩法在 Android 上必然失败。
Set<PowerPermission> get brokerablePermissions => {
  for (final power in kPowerCatalog)
    if (power.worksOnSealedGames) ...power.permissions,
};

/// 处理一次 WebView 权限请求。
///
/// [allowed] 限定本次运行允许代答的范围。调用方通常传作品声明需要的权限；
/// 留空表示用目录推导出的全量容器层权限。
Future<void> handlePowerPermissionRequest(
  WebViewPermissionRequest request, {
  Set<PowerPermission>? allowed,
}) async {
  var answered = false;
  Future<void> answer({required bool allow}) async {
    if (answered) return;
    answered = true;
    try {
      await (allow ? request.grant() : request.deny());
    } on Object catch (error, stack) {
      // grant/deny 是跨端调用。它抛出的异常在这个 async 回调里无人接管，
      // release 下会被静默吞掉，表现就是「没有答复」。
      debugPrint('答复 WebView 权限请求失败(allow=$allow): $error\n$stack');
    }
  }

  try {
    final types = request.types;
    if (types.isEmpty) {
      // `every` 对空集合返回 true，会把「没说要什么资源」误判成「什么都要」。
      await answer(allow: false);
      return;
    }

    final wanted = <PowerPermission>{};
    for (final type in types) {
      final permission = _toPowerPermission(type);
      if (permission == null) {
        // 不认识的资源类型：拒绝，并且到此为止。
        await answer(allow: false);
        return;
      }
      wanted.add(permission);
    }

    final whitelist = allowed ?? brokerablePermissions;
    if (!wanted.every(whitelist.contains)) {
      await answer(allow: false);
      return;
    }

    if (defaultTargetPlatform == TargetPlatform.android) {
      // Android 上 WebView 的 grant() 只放行「网页层」，Chromium 随后仍要用
      // 宿主 App 的身份去打开设备。App 自己没拿到运行时授权时那一步会被系统
      // 挡掉（logcat: `Permission Denial: can't use the camera`），而这个失败
      // 不一定回流成 getUserMedia 的 reject。所以必须先把系统授权拿到手。
      //
      // iOS 不需要：WKWebView 会自己弹 Info.plist 里那几条描述的系统授权框。
      for (final permission in wanted) {
        if (!await _ensureSystemPermission(permission)) {
          await answer(allow: false);
          return;
        }
      }
    }

    await answer(allow: true);
  } on Object catch (error, stack) {
    debugPrint('处理 WebView 权限请求时出错: $error\n$stack');
    await answer(allow: false);
  }
}

Future<bool> _ensureSystemPermission(PowerPermission permission) async {
  final system = _toSystemPermission(permission);
  if (system == null) return false;
  try {
    final status = await system.status.timeout(_promptTimeout);
    if (status.isGranted) return true;
    // 已被「永久拒绝」时再 request 不会弹窗，直接返回同样的状态。
    // 这里不强拉用户去设置页，交给作品侧的降级方案。
    if (status.isPermanentlyDenied) return false;
    // 用户可能一直不点弹窗，或者 Activity 在等待期间被重建，
    // 那样这个 Future 就永远不完成——必须有上限。
    return (await system.request().timeout(_promptTimeout)).isGranted;
  } on Object catch (error, stack) {
    debugPrint('申请 $permission 失败: $error\n$stack');
    return false;
  }
}


/// 接上 Android WebView 的定位授权回调。
///
/// 定位和摄像头/麦克风走的**不是同一条路**：后者经 `onPermissionRequest`，
/// 定位走的是 `WebChromeClient.onGeolocationPermissionsShowPrompt`。
/// 插件在应用没有注册这个回调时的行为写得很明确
/// （`android_webview_controller.dart:187` 的 `// default don't allow`）——
/// 直接 `callback.invoke(origin, false, false)`。
///
/// 也就是说：不接这个回调，`navigator.geolocation` 在 Android 上**恒被拒绝**，
/// 定位类玩法一行代码都不用写就注定失败，而且失败得很安静。
Future<void> attachGeolocationBroker(
  WebViewController controller, {
  Set<PowerPermission>? allowed,
}) async {
  if (defaultTargetPlatform != TargetPlatform.android) return;
  final platform = controller.platform;
  if (platform is! AndroidWebViewController) return;

  final whitelist = allowed ?? brokerablePermissions;
  if (!whitelist.contains(PowerPermission.location)) {
    // 作品没声明要定位就不接回调，保持插件的默认拒绝——
    // 少一个能弹窗的入口就少一分被滥用的可能。
    return;
  }

  await platform.setGeolocationPermissionsPromptCallbacks(
    onShowPrompt: (request) async {
      final granted = await _ensureSystemPermission(PowerPermission.location);
      // retain: false —— 不为某个 origin 长期记住授权。本机回环服务每次
      // 启动端口都不同，记住了也没用，反而会在存储里留下一堆过期条目。
      return GeolocationPermissionsResponse(allow: granted, retain: false);
    },
    onHidePrompt: () {},
  );
}
