/// 数字货币钱包登录面板。
///
/// Web 里点「数字货币钱包登录」是打开 `panel:'walletLogin'`
/// （`public/index.html:1925`）：一张居中的白卡（◇ 图标、「连接 EVM 数字货币
/// 钱包」、一句边界说明），下面一块浅红状态框实时显示连接进度，
/// 再一颗「连接钱包并签名」。
///
/// Flutter 端保留同样的版式，但**不放那颗按钮**：这台设备上没有签名器
/// （需要 WalletConnect 或钱包 App 深链，尚未接入），放一颗点了没结果的
/// 按钮就是假装可用。状态框里如实写清原因；能真做的只有「校验地址格式」——
/// 它不需要签名，也不构成绑定，界面必须把这个区别说明白。
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../design_system/airvana_theme.dart';

Future<void> showWalletLoginSheet(BuildContext context) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: AirvanaColors.canvas,
      builder: (_) => const WalletLoginSheet(),
    );

/// 状态框里的话。单独抽出来是为了让测试能钉住「没有签名器就不给入口」这条边界。
const kWalletSignerUnavailable =
    '当前设备没有可用的签名器：钱包登录需要钱包 App 完成一次性签名'
    '（WalletConnect 或钱包深链），Flutter 端尚未接入，'
    '因此这里不提供「连接钱包并签名」入口，也不会伪造签名结果。';

class WalletLoginSheet extends ConsumerStatefulWidget {
  const WalletLoginSheet({super.key});

  @override
  ConsumerState<WalletLoginSheet> createState() => _WalletLoginSheetState();
}

class _WalletLoginSheetState extends ConsumerState<WalletLoginSheet> {
  final _address = TextEditingController();
  bool _busy = false;
  String? _result;
  String? _error;

  @override
  void dispose() {
    _address.dispose();
    super.dispose();
  }

  Future<void> _validate() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
      _result = null;
    });
    try {
      final checked = await ref
          .read(airvanaRepositoryProvider)
          .validateWalletAddress(address: _address.text);
      if (mounted) {
        setState(() => _result = '地址有效 · 校验和格式 ${checked.address}');
      }
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  static const _meta = TextStyle(
    fontSize: 10,
    height: 1.6,
    color: AirvanaColors.muted,
  );

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      20,
      0,
      20,
      20 + MediaQuery.viewInsetsOf(context).bottom,
    ),
    child: SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Web panelTitle: walletLogin → '数字货币钱包登录'
          const Text(
            '数字货币钱包登录',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: AirvanaColors.ink,
            ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AirvanaColors.line),
            ),
            child: Column(
              children: [
                Container(
                  width: 62,
                  height: 62,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF0F1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    '◇',
                    style: TextStyle(
                      fontSize: 30,
                      color: AirvanaColors.accent,
                      height: 1,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  '连接 EVM 数字货币钱包',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 7),
                const Text(
                  '登录仅请求一次性签名，不会发起链上交易，也不会申请转移资产权限。',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    height: 1.7,
                    color: AirvanaColors.muted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Web 的 loginWalletStatus 状态框：浅红底 + 红边。
          Container(
            key: const ValueKey('wallet-login-status'),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF8F8),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFFD6DA)),
            ),
            child: const Text(
              kWalletSignerUnavailable,
              style: TextStyle(
                fontSize: 11,
                height: 1.6,
                color: Color(0xFF6E5A5D),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerLeft,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F1F6),
                borderRadius: BorderRadius.circular(999),
              ),
              child: const Text(
                '待接入签名器',
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF636366),
                ),
              ),
            ),
          ),
          const SizedBox(height: 18),
          const Text('可以先校验地址格式（不需要签名，也不构成绑定）', style: _meta),
          const SizedBox(height: 8),
          TextField(
            key: const ValueKey('wallet-address-input'),
            controller: _address,
            autocorrect: false,
            enableSuggestions: false,
            onChanged: (_) => setState(() {
              _result = null;
              _error = null;
            }),
            decoration: const InputDecoration(
              labelText: '钱包地址（0x…）',
              isDense: true,
              border: OutlineInputBorder(),
            ),
            style: const TextStyle(fontSize: 12),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            key: const ValueKey('wallet-address-validate'),
            onPressed: _address.text.trim().isEmpty || _busy ? null : _validate,
            child: Text(_busy ? '校验中…' : '校验地址'),
          ),
          if (_result != null) ...[
            const SizedBox(height: 8),
            Text(
              _result!,
              key: const ValueKey('wallet-address-result'),
              style: const TextStyle(
                fontSize: 10,
                color: AirvanaColors.success,
              ),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(
              _error!,
              key: const ValueKey('wallet-address-error'),
              style: const TextStyle(fontSize: 10, color: Color(0xFFC62836)),
            ),
          ],
        ],
      ),
    ),
  );
}
