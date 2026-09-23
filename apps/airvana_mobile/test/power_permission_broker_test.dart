import 'package:airvana_mobile/features/runtime/data/power_permission_broker.dart';
import 'package:airvana_mobile/features/shared/domain/power_capability.dart';
import 'package:flutter_test/flutter_test.dart';

/// 权限代答的白名单必须由 Power 目录推导，不能写死。
///
/// 改成目录驱动之前这里是「只放行纯摄像头请求，其余一律 deny」，
/// 直接后果是 `assets/runner/sensor-interactions-v1.js:192` 那条
/// `getUserMedia({audio})` 永远拿不到授权——吹气类玩法在 Android 上必然失败。
void main() {
  test('可代答范围覆盖容器层能力用到的权限', () {
    expect(brokerablePermissions, contains(PowerPermission.camera));
    expect(
      brokerablePermissions,
      contains(PowerPermission.microphone),
      reason: '吹气/声控玩法要靠它，写死成 camera-only 时这条玩法必然失败',
    );
    expect(brokerablePermissions, contains(PowerPermission.motion));
    expect(brokerablePermissions, contains(PowerPermission.location));
  });

  test('只需宿主推信号的能力，其权限不进可代答范围', () {
    // 计步与近场设备在 WebView 里根本没有对应的 Web API，作品不可能去请求它们；
    // 把它们放进代答白名单只会扩大攻击面。
    expect(brokerablePermissions, isNot(contains(PowerPermission.activityRecognition)));
    expect(brokerablePermissions, isNot(contains(PowerPermission.nearbyDevices)));
  });
}
