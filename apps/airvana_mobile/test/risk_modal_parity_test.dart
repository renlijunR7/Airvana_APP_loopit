import 'package:airvana_mobile/shared/presentation/system_modals.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('三个风险弹窗的文案与按钮与 Web 一致', () {
    final weak = systemModalSpec(AirvanaSystemModal.riskWeakNetwork);
    expect(weak.primaryLabel, '继续使用');
    expect(weak.secondaryLabel, '重新检测');

    final offline = systemModalSpec(AirvanaSystemModal.riskOffline);
    expect(offline.primaryLabel, '使用离线功能');
    // Web 有「重新连接」，缺了就没有重连入口。
    expect(offline.secondaryLabel, '重新连接');

    final region = systemModalSpec(AirvanaSystemModal.riskChinaRegion);
    // 正文必须是 Web 的风控口径原文，不能被降级成 note。
    expect(
      region.body,
      contains('IP 仅作为风险信号，最终权限仍由账号、KYC、Campaign Contract 与服务端策略确认'),
    );
    expect(region.note, contains('非金融模式'));
    expect(region.primaryLabel, '进入非金融模式');
    expect(region.secondaryLabel, '查看限制范围');
  });
}
