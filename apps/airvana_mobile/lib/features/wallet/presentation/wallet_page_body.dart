import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_shared_cards.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// 旧版 Web「AIP 与 AIT」钱包页的 Flutter 复刻（本地闭环优先）。
///
/// AIP 侧为完整本地闭环：余额、订阅额度、游戏金币分账与流水账本；
/// AIT 侧展示服务端口径，本机演示模式显示降级说明，不伪造结算能力。
class WalletPageBody extends ConsumerStatefulWidget {
  const WalletPageBody({super.key});

  @override
  ConsumerState<WalletPageBody> createState() => _WalletPageBodyState();
}

class _WalletPageBodyState extends ConsumerState<WalletPageBody> {
  static const _boundaryCopy =
      '游戏金币按 playable_id 独立记账，不能跨游戏转移，也不能固定兑换 AIP。'
      'AIP 是站内行为积分，不可提现、转让或交易；AIT 是 Campaign 权益与收益凭证，'
      '不可转让或交易。游戏金币使用作品独立账本；AIP 与 AIT 分账记录，并与商业结算保持分离。'
      '订阅只增加功能和创作额度，不直接发放 AIP 或 AIT。';

  bool _aitTab = false;

  @override
  Widget build(BuildContext context) {
    final account = ref.watch(accountProvider).value;
    final reward = ref.watch(rewardStateProvider).value;
    final txns = ref.watch(walletTxnsProvider);
    final ledgers = ref.watch(gameCoinLedgersProvider).value ?? const {};
    final localDemo = account == null || account.localDemo;
    final aipBalance = reward?.aipBalance ?? account?.aip ?? 0;

    return ListView(
      key: const ValueKey('wallet-page-scroll'),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 30),
      children: [
        Center(
          child: Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: const Color(0xFFF7F7FA),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: AirvanaColors.line),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _WalletTab(
                  key: const ValueKey('wallet-tab-aip'),
                  label: 'AIP',
                  active: !_aitTab,
                  onTap: () => setState(() => _aitTab = false),
                ),
                _WalletTab(
                  key: const ValueKey('wallet-tab-ait'),
                  label: 'AIT',
                  active: _aitTab,
                  onTap: () => setState(() => _aitTab = true),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        _HeroCard(
          label: _aitTab ? 'AIT 权益总额' : 'AIP 余额',
          value: '${_aitTab ? (account?.ait ?? 0) : aipBalance}',
          description: _aitTab
              ? 'AIT 只来自获批 Campaign Contract，按归因、资格、风控与预算独立审核。'
              : 'AIP 仅记录本地站内互动贡献，不代表现金、收入或已验证商业转化。',
        ),
        const SizedBox(height: 14),
        if (_aitTab)
          ..._aitSections(localDemo, account)
        else ...[
          _subscriptionCard(context, account),
          const SizedBox(height: 14),
          _gameCoinCard(ledgers),
        ],
        const SizedBox(height: 14),
        const BoundaryCard(
          key: ValueKey('wallet-boundary-card'),
          title: '经济模型边界',
          body: _boundaryCopy,
        ),
        const SizedBox(height: 14),
        _Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '账本记录',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 12),
              if (_aitTab)
                const _EmptyLedger(
                  key: ValueKey('wallet-ait-empty'),
                  title: '还没有 AIT 权益记录',
                  description: '通过归因、资格、风控和预算校验的 Campaign 权益会显示在这里。',
                )
              else
                txns.when(
                  loading: () => const Padding(
                    padding: EdgeInsets.symmetric(vertical: 22),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  error: (error, _) => Text(
                    '流水加载失败：$error',
                    style: const TextStyle(
                      color: AirvanaColors.muted,
                      fontSize: 11,
                    ),
                  ),
                  data: (rows) => rows.isEmpty
                      ? const _EmptyLedger(
                          key: ValueKey('wallet-aip-empty'),
                          title: '还没有 AIP 流水',
                          description: '完成签到或有效互动后，入账记录会显示在这里。',
                        )
                      : Column(
                          key: const ValueKey('wallet-txn-list'),
                          children: [
                            for (final txn in rows)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: LedgerRow(
                                  title: txn.title,
                                  subtitle: _formatTime(txn.occurredAt),
                                  trailing:
                                      '${txn.amount >= 0 ? '+' : ''}${txn.amount} AIP',
                                ),
                              ),
                          ],
                        ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  List<Widget> _aitSections(bool localDemo, AccountSnapshot? account) => [
    _Panel(
      child: Row(
        children: [
          _AitStat(label: '有效权益', value: '${account?.ait ?? 0}'),
          _AitStat(label: '可申领', value: '0', accent: true),
          const _AitStat(label: '待处理', value: '0'),
        ],
      ),
    ),
    const SizedBox(height: 14),
    _bindingCard(localDemo),
    const SizedBox(height: 14),
    _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'AIT 权益与结算',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          const Text(
            'AIT 只来自获批 Campaign Contract。每笔权益按归因、资格、风控与预算独立审核；可申领内容及付款方式以该 Contract 为准。',
            style: TextStyle(
              fontSize: 10,
              color: AirvanaColors.muted,
              height: 1.55,
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              key: const ValueKey('wallet-open-settlement'),
              onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('商业结算由服务端 Campaign Contract 驱动，本机演示不可用'),
                ),
              ),
              child: const Text('进入商业结算'),
            ),
          ),
        ],
      ),
    ),
  ];

  /// Campaign 结算钱包绑定：none → pending（候选待验证）→ verified，
  /// 全程只记录本地演示意向，不做真实签名或结算。
  Widget _bindingCard(bool localDemo) {
    final binding =
        ref.watch(walletBindingProvider).value ?? const LocalWalletBinding();

    Future<void> save(LocalWalletBinding next, String toast) async {
      await ref.read(airvanaRepositoryProvider).saveWalletBinding(next);
      ref.invalidate(walletBindingProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(toast)));
    }

    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Campaign 结算钱包（可选）',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                ),
              ),
              StatusPill(
                key: const ValueKey('wallet-binding-pill'),
                label: switch (binding.status) {
                  'verified' => '已验证 · 演示',
                  'pending' => '待验证',
                  _ => localDemo ? '演示模式' : '未绑定',
                },
                tone: switch (binding.status) {
                  'verified' => AirvanaStatusTone.confirmed,
                  'pending' => AirvanaStatusTone.pending,
                  _ => AirvanaStatusTone.demo,
                },
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (binding.status == 'none')
            const Text(
              '绑定数字货币钱包后，可申领的 AIT 权益按获批 Contract 结算到该地址。本机仅记录绑定意向；真实验证与结算需要账号与账本服务。',
              key: ValueKey('wallet-ait-status'),
              style: TextStyle(
                fontSize: 11,
                color: AirvanaColors.muted,
                height: 1.55,
              ),
            )
          else
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF7F7FA),
                borderRadius: BorderRadius.circular(13),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    binding.address,
                    key: const ValueKey('wallet-binding-address'),
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      letterSpacing: .2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${binding.network} · '
                    '${binding.status == 'verified' ? '签名验证已完成（本地演示）' : '等待签名验证（本地演示）'}',
                    style: const TextStyle(
                      fontSize: 10,
                      color: AirvanaColors.muted,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 10),
          if (binding.status == 'none')
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                key: const ValueKey('wallet-bind'),
                onPressed: () => save(
                  const LocalWalletBinding(
                    address: '0xA1RV…4NA7（演示地址）',
                    status: 'pending',
                  ),
                  '已保存候选地址；继续验证以完成绑定（本地演示）',
                ),
                child: const Text('绑定数字货币钱包'),
              ),
            )
          else if (binding.status == 'pending')
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    key: const ValueKey('wallet-binding-verify'),
                    onPressed: () => save(
                      LocalWalletBinding(
                        address: binding.address,
                        network: binding.network,
                        status: 'verified',
                      ),
                      '钱包绑定已通过本地演示验证',
                    ),
                    child: const Text('继续验证'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    key: const ValueKey('wallet-binding-remove'),
                    onPressed: () =>
                        save(const LocalWalletBinding(), '候选地址已移除'),
                    child: const Text('移除'),
                  ),
                ),
              ],
            )
          else
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                key: const ValueKey('wallet-binding-unbind'),
                onPressed: () =>
                    save(const LocalWalletBinding(), '已解除钱包绑定（本地演示）'),
                child: const Text('解除绑定'),
              ),
            ),
          const SizedBox(height: 8),
          const Text(
            '钱包仅使用签名验证；Airvana 不会索取助记词或私钥。',
            style: TextStyle(fontSize: 9, color: AirvanaColors.muted),
          ),
        ],
      ),
    );
  }

  Widget _subscriptionCard(BuildContext context, AccountSnapshot? account) {
    final allowances =
        account?.allowances ??
        const {
          'light_creation': (granted: 3, used: 0, remaining: 3),
          'deep_creation': (granted: 1, used: 0, remaining: 1),
          'remix': (granted: 2, used: 0, remaining: 2),
        };
    const allowanceLabels = {
      'light_creation': '轻度创作',
      'deep_creation': '深度创作',
      'remix': 'Remix',
    };
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  account?.planName ?? 'Free',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const StatusPill(label: '有效', tone: AirvanaStatusTone.confirmed),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final entry in allowances.entries)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7F7FA),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${allowanceLabels[entry.key] ?? entry.key}：剩余 ${entry.value.remaining} / ${entry.value.granted}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            '订阅优先抵扣对应创作额度；额度不足才消耗 AIP。订阅不会直接增加 AIP 或 AIT。',
            style: TextStyle(
              fontSize: 10,
              color: AirvanaColors.muted,
              height: 1.55,
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: FilledButton.tonal(
              key: const ValueKey('wallet-manage-subscription'),
              onPressed: () => context.push('/profile/secondary/subscription'),
              child: const Text('管理订阅与额度'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _gameCoinCard(Map<String, int> ledgers) => _Panel(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Expanded(
              child: Text(
                '游戏金币与 AIP',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
              ),
            ),
            StatusPill(label: '无固定兑换', tone: AirvanaStatusTone.alert),
          ],
        ),
        const SizedBox(height: 8),
        const Text(
          '游戏内行为 → 作品金币 → 有效完成 → AIP 审核记录。每个 Agentic Playable 使用独立金币账本，不能跨游戏转移；同一用户首次有效完成后，本机按「每个作品 24 小时一次」记录 5 AIP。',
          style: TextStyle(
            fontSize: 10,
            color: AirvanaColors.muted,
            height: 1.6,
          ),
        ),
        const SizedBox(height: 10),
        if (ledgers.isEmpty)
          const Text(
            '完成任意游戏后，这里会出现该作品独立的游戏金币余额。',
            key: ValueKey('wallet-coin-empty'),
            style: TextStyle(fontSize: 10, color: AirvanaColors.muted),
          )
        else
          Column(
            children: [
              for (final entry in ledgers.entries)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: LedgerRow(
                    title:
                        LegacyDemoCatalog.byId(entry.key)?.title ?? entry.key,
                    subtitle: '${entry.key} · 仅限本作品',
                    trailing: '${entry.value}',
                    trailingColor: AirvanaColors.ink,
                  ),
                ),
            ],
          ),
      ],
    ),
  );

  static String _formatTime(DateTime time) {
    final local = time.toLocal();
    return '${local.year}-${local.month.toString().padLeft(2, '0')}-'
        '${local.day.toString().padLeft(2, '0')} '
        '${local.hour.toString().padLeft(2, '0')}:'
        '${local.minute.toString().padLeft(2, '0')}';
  }
}

class _WalletTab extends StatelessWidget {
  const _WalletTab({
    super.key,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(999),
    child: Container(
      constraints: const BoxConstraints(minWidth: 96),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
      decoration: BoxDecoration(
        color: active ? Colors.white : Colors.transparent,
        borderRadius: BorderRadius.circular(999),
        boxShadow: active
            ? const [BoxShadow(color: Color(0x14000000), blurRadius: 8)]
            : null,
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w900,
          color: active ? AirvanaColors.ink : AirvanaColors.muted,
        ),
      ),
    ),
  );
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.label,
    required this.value,
    required this.description,
  });

  final String label;
  final String value;
  final String description;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 26),
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFFFE4E7), Color(0xFFFFEFF1), Color(0xFFF2F2F7)],
      ),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: const Color(0xFFFFD6DA)),
    ),
    child: Column(
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            letterSpacing: 1,
            color: Color(0xFF8E8E93),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              value,
              key: const ValueKey('wallet-hero-value'),
              style: const TextStyle(
                fontSize: 38,
                fontWeight: FontWeight.w900,
                color: AirvanaColors.accent,
              ),
            ),
            const SizedBox(width: 9),
            Container(
              width: 26,
              height: 26,
              decoration: const BoxDecoration(
                color: AirvanaColors.accent,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: const Text(
                '◆',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          description,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 11,
            color: Color(0xFF8E8E93),
            height: 1.5,
          ),
        ),
      ],
    ),
  );
}

class _AitStat extends StatelessWidget {
  const _AitStat({
    required this.label,
    required this.value,
    this.accent = false,
  });

  final String label;
  final String value;
  final bool accent;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            color: accent ? AirvanaColors.accent : AirvanaColors.ink,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          label,
          style: const TextStyle(fontSize: 9, color: Color(0xFF8E8E93)),
        ),
      ],
    ),
  );
}

class _Panel extends StatelessWidget {
  const _Panel({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: child,
  );
}

class _EmptyLedger extends StatelessWidget {
  const _EmptyLedger({
    super.key,
    required this.title,
    required this.description,
  });

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 14),
    child: Column(
      children: [
        Container(
          width: 54,
          height: 54,
          decoration: BoxDecoration(
            color: const Color(0xFFFFF1F2),
            borderRadius: BorderRadius.circular(18),
          ),
          child: const Icon(
            Icons.receipt_long_outlined,
            color: AirvanaColors.accent,
            size: 27,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          title,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        Text(
          description,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 10,
            color: AirvanaColors.muted,
            height: 1.6,
          ),
        ),
      ],
    ),
  );
}
