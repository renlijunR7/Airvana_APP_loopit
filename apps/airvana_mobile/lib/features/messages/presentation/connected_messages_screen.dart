import 'dart:async';

import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/design_system/app_state_view.dart';
import 'package:airvana_mobile/design_system/legacy_web_assets.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ConnectedMessagesScreen extends ConsumerStatefulWidget {
  const ConnectedMessagesScreen({super.key});

  @override
  ConsumerState<ConnectedMessagesScreen> createState() =>
      _ConnectedMessagesScreenState();
}

class _ConnectedMessagesScreenState
    extends ConsumerState<ConnectedMessagesScreen> {
  int _tab = 0;
  bool _legacyReadAll = false;

  @override
  Widget build(BuildContext context) {
    final localDemo = ref.watch(homeProvider).value?.localDemo ?? false;
    if (localDemo) return _legacyBuild();

    final notifications = ref.watch(notificationsProvider);
    final conversations = ref.watch(conversationsProvider);
    final notificationItems =
        notifications.value?.items
            .where((item) => !['engagement', 'message'].contains(item.category))
            .toList(growable: false) ??
        const <AppNotification>[];
    final socialItems =
        notifications.value?.items
            .where((item) => item.category == 'engagement')
            .toList(growable: false) ??
        const <AppNotification>[];
    final directItems = conversations.value ?? const <DmConversation>[];
    final badges = <int>[
      notificationItems.where((item) => item.unread).length,
      socialItems.where((item) => item.unread).length,
      directItems.fold(0, (total, item) => total + item.unread),
    ];

    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          _MessagesHeader(
            showReadAll: _tab != 2 && badges[_tab] > 0,
            onReadAll: _markAllRead,
          ),
          _MessageTabs(
            selected: _tab,
            badges: badges,
            onSelected: (index) => setState(() => _tab = index),
          ),
          Expanded(
            child: switch (_tab) {
              0 => _notificationBody(notifications, notificationItems),
              1 => _notificationBody(notifications, socialItems),
              _ => _conversationBody(conversations, directItems),
            },
          ),
        ],
      ),
    );
  }

  Widget _legacyBuild() {
    final notificationBadges = _legacyReadAll ? 0 : 2;
    final badges = [notificationBadges, 0, 1];
    final items = switch (_tab) {
      0 => _legacyNotifications,
      1 => _legacyInteractions,
      _ => _legacyDirectMessages,
    };
    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          const _LegacyMessagesTitle(),
          _MessageTabs(
            selected: _tab,
            badges: badges,
            onSelected: (index) => setState(() => _tab = index),
          ),
          Expanded(
            child: items.isEmpty
                ? AppStateView(
                    icon: _tab == 1
                        ? Icons.favorite_border_rounded
                        : Icons.forum_outlined,
                    title: _tab == 1 ? '暂时没有互动消息' : '还没有私信',
                    message: _tab == 1
                        ? '点赞、收藏、评论与关注会在这里汇总。'
                        : '从作品创作者入口发起对话后，会话会显示在这里。',
                  )
                : ListView.builder(
                    key: ValueKey('legacy-message-list-$_tab'),
                    padding: const EdgeInsets.only(bottom: 110),
                    itemCount: items.length + (_tab == 0 ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (_tab == 0 && index == 0) {
                        return _LegacyMessageSectionHeader(
                          showReadAll: !_legacyReadAll,
                          onReadAll: () => setState(() {
                            _legacyReadAll = true;
                          }),
                        );
                      }
                      final item = items[index - (_tab == 0 ? 1 : 0)];
                      return _LegacyMessageRow(
                        item: item,
                        forceRead: _legacyReadAll,
                        onTap: () => _openLegacyMessage(item),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Future<void> _openLegacyMessage(
    _LegacyMessage item,
  ) => showModalBottomSheet<void>(
    context: context,
    useRootNavigator: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (context) => Padding(
      padding: const EdgeInsets.fromLTRB(24, 4, 24, 30),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            item.title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 12),
          Text(item.body, style: const TextStyle(fontSize: 13, height: 1.65)),
          const SizedBox(height: 14),
          Text(
            '${item.meta} · 本地演示',
            style: const TextStyle(color: AirvanaColors.muted, fontSize: 10),
          ),
        ],
      ),
    ),
  );

  Future<void> _markAllRead() async {
    try {
      await ref.read(airvanaRepositoryProvider).markAllNotificationsRead();
      ref.invalidate(notificationsProvider);
      ref.invalidate(homeProvider);
    } on Object catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('全部已读未同步：$error')));
    }
  }

  Widget _notificationBody(
    AsyncValue<NotificationSnapshot> state,
    List<AppNotification> items,
  ) {
    if (state.isLoading && !state.hasValue) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.hasError && !state.hasValue) {
      return AppStateView(
        icon: Icons.cloud_off_rounded,
        title: '消息载入失败',
        message: '${state.error}',
        actionLabel: '重试',
        onAction: () => ref.invalidate(notificationsProvider),
      );
    }
    if (items.isEmpty) {
      return const AppStateView(
        icon: Icons.notifications_none_rounded,
        title: '暂时没有消息',
        message: '审核、发布、Campaign 与互动通知会在服务端确认后显示。',
      );
    }
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(notificationsProvider),
      child: ListView.builder(
        key: ValueKey('connected-message-list-$_tab'),
        padding: const EdgeInsets.only(bottom: 100),
        itemCount: items.length,
        itemBuilder: (context, index) {
          final item = items[index];
          return _NotificationRow(
            item: item,
            social: _tab == 1,
            onTap: () => _openNotification(item),
          );
        },
      ),
    );
  }

  Widget _conversationBody(
    AsyncValue<List<DmConversation>> state,
    List<DmConversation> items,
  ) {
    if (state.isLoading && !state.hasValue) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.hasError && !state.hasValue) {
      return AppStateView(
        icon: Icons.cloud_off_rounded,
        title: '私信载入失败',
        message: '${state.error}',
        actionLabel: '重试',
        onAction: () => ref.invalidate(conversationsProvider),
      );
    }
    if (items.isEmpty) {
      return const AppStateView(
        icon: Icons.forum_outlined,
        title: '还没有私信',
        message: '从服务端作品的创作者入口发起对话后，会话与未读状态将在这里同步。',
      );
    }
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(conversationsProvider),
      child: ListView.builder(
        key: const ValueKey('connected-direct-list'),
        padding: const EdgeInsets.only(bottom: 100),
        itemCount: items.length,
        itemBuilder: (context, index) {
          final item = items[index];
          return _ConversationRow(
            conversation: item,
            onTap: () => _openConversation(item),
          );
        },
      ),
    );
  }

  Future<void> _openNotification(AppNotification item) async {
    if (item.unread) {
      try {
        await ref.read(airvanaRepositoryProvider).markNotificationRead(item.id);
        ref.invalidate(notificationsProvider);
        ref.invalidate(homeProvider);
      } on Object catch (error) {
        if (!mounted) return;
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('已读状态未同步：$error')));
      }
    }
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      showDragHandle: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 4, 24, 30),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              item.title,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            Text(item.body, style: const TextStyle(fontSize: 13, height: 1.65)),
            const SizedBox(height: 14),
            Text(
              '${item.category} · ${_timeLabel(item.createdAt)} · 服务端记录',
              style: const TextStyle(color: AirvanaColors.muted, fontSize: 10),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openConversation(DmConversation conversation) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _ServerDirectMessageSheet(
        conversation: conversation,
        repository: ref.read(airvanaRepositoryProvider),
      ),
    );
    ref.invalidate(conversationsProvider);
    ref.invalidate(notificationsProvider);
    ref.invalidate(homeProvider);
  }
}

class _LegacyMessage {
  const _LegacyMessage({
    required this.title,
    required this.body,
    required this.meta,
    required this.avatarSeed,
    this.unread = false,
    this.icon = Icons.notifications_none_rounded,
  });

  final String title;
  final String body;
  final String meta;
  final String avatarSeed;
  final bool unread;
  final IconData icon;
}

const _legacyNotifications = <_LegacyMessage>[
  _LegacyMessage(
    title: 'Crypto City v2 待复核',
    body: '素材授权、CTA 与归因字段需要在提交发布前确认。',
    meta: '运营 · 本地演示',
    avatarSeed: 'notification-kol-review',
    unread: true,
    icon: Icons.rule_folder_outlined,
  ),
  _LegacyMessage(
    title: 'Campaign Contract 待确认',
    body: '品牌目标、成功事件、地区和结算字段仍保持锁定。',
    meta: 'Campaign · 本地演示',
    avatarSeed: 'notification-kol-contract',
    unread: true,
    icon: Icons.description_outlined,
  ),
  _LegacyMessage(
    title: '发布连接器等待服务接入',
    body: '获批作品可进入渠道确认页，当前不会自动对外发布。',
    meta: '发布 · 服务端待接',
    avatarSeed: 'notification-kol-publish',
    icon: Icons.hub_outlined,
  ),
  _LegacyMessage(
    title: '本地 Playable 预览已生成',
    body: '真实前端构建阶段已完成，可试玩成功、失败、重试与退出路径。',
    meta: '未读',
    avatarSeed: 'notification-preview-generated-unread-1',
    unread: true,
    icon: Icons.sports_esports_outlined,
  ),
  _LegacyMessage(
    title: '本地 Playable 预览已生成',
    body: '真实前端构建阶段已完成，可试玩成功、失败、重试与退出路径。',
    meta: '已读',
    avatarSeed: 'notification-preview-generated-read-1',
    icon: Icons.sports_esports_outlined,
  ),
  _LegacyMessage(
    title: '本地 Playable 预览已生成',
    body: '已生成可试玩版本并保存 Campaign 结构化产物，等待人工审核。',
    meta: '未读',
    avatarSeed: 'notification-preview-campaign-unread',
    unread: true,
    icon: Icons.auto_awesome_outlined,
  ),
  _LegacyMessage(
    title: '本地 Playable 预览已生成',
    body: '已生成可试玩版本并保存 Campaign 结构化产物，等待人工审核。',
    meta: '已读',
    avatarSeed: 'notification-preview-campaign-read',
    icon: Icons.auto_awesome_outlined,
  ),
  _LegacyMessage(
    title: 'AIT 结算审核已通过',
    body: '10 AIT 对应权益已通过结算复核，已进入待付款队列；实际到账以付款凭证为准。',
    meta: '已读',
    avatarSeed: 'notification-ait-settlement-approved',
    icon: Icons.verified_outlined,
  ),
  _LegacyMessage(
    title: 'Playable v2 等待审核',
    body: '「Crypto City 安全挑战」正在核对互动、CTA 与归因节点。',
    meta: '已读',
    avatarSeed: 'notification-review',
    icon: Icons.fact_check_outlined,
  ),
  _LegacyMessage(
    title: '归因证据已更新',
    body: '只有通过服务器确认、去重与风控的成功事件才进入结算证据。',
    meta: '已读',
    avatarSeed: 'notification-attribution',
    icon: Icons.analytics_outlined,
  ),
  _LegacyMessage(
    title: '欢迎使用 Airvana',
    body: '开始创作并运营属于你的 Agentic Playable。',
    meta: '已读',
    avatarSeed: 'notification-welcome',
    icon: Icons.waving_hand_outlined,
  ),
];

const _legacyInteractions = <_LegacyMessage>[
  _LegacyMessage(
    title: 'Nina 收藏了你的作品',
    body: '「Crypto City 安全挑战」新增一次本地收藏意图。',
    meta: '互动 · 本地演示',
    avatarSeed: '@nina',
    icon: Icons.bookmark_border_rounded,
  ),
  _LegacyMessage(
    title: 'Leo 关注了你的创作',
    body: '关注关系仅用于推荐演示，不代表服务端商业授权。',
    meta: '互动 · 本地演示',
    avatarSeed: '@leo.art',
    icon: Icons.person_add_alt_rounded,
  ),
];

const _legacyDirectMessages = <_LegacyMessage>[
  _LegacyMessage(
    title: 'Nina',
    body: '想了解 Crypto City 下一版 Campaign 的合作方式。',
    meta: '私信 · 1 条未读',
    avatarSeed: '@nina',
    unread: true,
    icon: Icons.forum_outlined,
  ),
];

class _LegacyMessagesTitle extends StatelessWidget {
  const _LegacyMessagesTitle();

  @override
  Widget build(BuildContext context) => const SizedBox(
    height: 52,
    child: Padding(
      padding: EdgeInsets.symmetric(horizontal: 16),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          '消息',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
        ),
      ),
    ),
  );
}

class _LegacyMessageSectionHeader extends StatelessWidget {
  const _LegacyMessageSectionHeader({
    required this.showReadAll,
    required this.onReadAll,
  });

  final bool showReadAll;
  final VoidCallback onReadAll;

  @override
  Widget build(BuildContext context) => Container(
    height: 40,
    padding: const EdgeInsets.symmetric(horizontal: 20),
    color: AirvanaColors.canvas,
    child: Row(
      children: [
        const Text(
          '运营待处理',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
        ),
        const Spacer(),
        if (showReadAll)
          TextButton(
            onPressed: onReadAll,
            style: TextButton.styleFrom(
              minimumSize: const Size(64, 40),
              padding: EdgeInsets.zero,
              textStyle: const TextStyle(fontSize: 11),
            ),
            child: const Text('全部已读'),
          ),
      ],
    ),
  );
}

class _LegacyMessageRow extends StatelessWidget {
  const _LegacyMessageRow({
    required this.item,
    required this.forceRead,
    required this.onTap,
  });

  final _LegacyMessage item;
  final bool forceRead;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final unread = item.unread && !forceRead;
    return InkWell(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        constraints: const BoxConstraints(minHeight: 82),
        padding: const EdgeInsets.fromLTRB(20, 15, 14, 15),
        decoration: BoxDecoration(
          color: unread ? const Color(0xFFFFF8F8) : Colors.white,
          border: Border(
            bottom: BorderSide(
              color: unread ? const Color(0xFFFFD6DA) : AirvanaColors.line,
            ),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            ClipOval(
              child: Image.asset(
                legacyWebAvatarAsset(item.avatarSeed),
                width: 42,
                height: 42,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.body,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AirvanaColors.muted,
                      fontSize: 11,
                      height: 1.55,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    unread && !item.meta.contains('本地演示') ? '未读' : item.meta,
                    style: const TextStyle(
                      color: Color(0xFFA0A0A6),
                      fontSize: 9,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              color: Color(0xFF8E8E93),
              size: 18,
            ),
          ],
        ),
      ),
    );
  }
}

class _MessagesHeader extends StatelessWidget {
  const _MessagesHeader({required this.showReadAll, required this.onReadAll});

  final bool showReadAll;
  final VoidCallback onReadAll;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 52,
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          const Text(
            '消息',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
          ),
          const Spacer(),
          if (showReadAll)
            TextButton(onPressed: onReadAll, child: const Text('全部已读')),
        ],
      ),
    ),
  );
}

class _MessageTabs extends StatelessWidget {
  const _MessageTabs({
    required this.selected,
    required this.badges,
    required this.onSelected,
  });

  final int selected;
  final List<int> badges;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    const labels = ['通知', '互动', '私信'];
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AirvanaColors.line)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: List.generate(labels.length, (index) {
          final active = selected == index;
          return Padding(
            padding: EdgeInsets.only(right: index == labels.length - 1 ? 0 : 8),
            child: SizedBox(
              width: 84,
              child: InkWell(
                onTap: () => onSelected(index),
                borderRadius: BorderRadius.circular(10),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          labels[index],
                          style: TextStyle(
                            fontSize: 12,
                            color: active
                                ? AirvanaColors.ink
                                : AirvanaColors.muted,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        if (badges[index] > 0) ...[
                          const SizedBox(width: 4),
                          _CountBadge(count: badges[index]),
                        ],
                      ],
                    ),
                    AnimatedPositioned(
                      duration: const Duration(milliseconds: 180),
                      curve: Curves.easeOutCubic,
                      left: active ? 25 : 42,
                      right: active ? 25 : 42,
                      bottom: 0,
                      height: 3,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: active
                              ? AirvanaColors.accent
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _CountBadge extends StatelessWidget {
  const _CountBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) => Container(
    width: 18,
    height: 18,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: AirvanaColors.accent,
      borderRadius: BorderRadius.circular(999),
    ),
    child: Text(
      count > 99 ? '99+' : '$count',
      style: const TextStyle(
        color: Colors.white,
        fontSize: 10,
        fontWeight: FontWeight.w900,
      ),
    ),
  );
}

class _NotificationRow extends StatelessWidget {
  const _NotificationRow({
    required this.item,
    required this.social,
    required this.onTap,
  });

  final AppNotification item;
  final bool social;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    child: Container(
      constraints: const BoxConstraints(minHeight: 82),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: item.unread ? const Color(0xFFFFF8F8) : Colors.white,
        border: const Border(bottom: BorderSide(color: AirvanaColors.line)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 21,
            backgroundColor: const Color(0xFFFFEFF1),
            child: Icon(
              social
                  ? Icons.favorite_border_rounded
                  : Icons.notifications_none_rounded,
              color: AirvanaColors.accent,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  item.body,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AirvanaColors.muted,
                    fontSize: 11,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  '${item.unread ? '未读' : '已读'} · ${_timeLabel(item.createdAt)}',
                  style: const TextStyle(color: Color(0xFFA0A0A6), fontSize: 9),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: Color(0xFFC7C7CC)),
        ],
      ),
    ),
  );
}

class _ConversationRow extends StatelessWidget {
  const _ConversationRow({required this.conversation, required this.onTap});

  final DmConversation conversation;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    child: Container(
      constraints: const BoxConstraints(minHeight: 82),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: conversation.unread > 0 ? const Color(0xFFFFF8F8) : Colors.white,
        border: const Border(bottom: BorderSide(color: AirvanaColors.line)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: const Color(0xFFFFEFF1),
            child: Text(
              conversation.peerName.characters.firstOrNull ?? 'A',
              style: const TextStyle(
                color: AirvanaColors.accent,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  conversation.peerName,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 5),
                Text(
                  conversation.lastBody.isEmpty
                      ? '会话已建立，发送第一条消息吧。'
                      : conversation.lastBody,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AirvanaColors.muted,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          if (conversation.unread > 0)
            _CountBadge(count: conversation.unread)
          else
            const Icon(Icons.chevron_right_rounded, color: Color(0xFFC7C7CC)),
        ],
      ),
    ),
  );
}

class _ServerDirectMessageSheet extends StatefulWidget {
  const _ServerDirectMessageSheet({
    required this.conversation,
    required this.repository,
  });

  final DmConversation conversation;
  final AirvanaRepository repository;

  @override
  State<_ServerDirectMessageSheet> createState() =>
      _ServerDirectMessageSheetState();
}

class _ServerDirectMessageSheetState extends State<_ServerDirectMessageSheet> {
  final _controller = TextEditingController();
  late Future<List<DmMessage>> _messages;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _messages = widget.repository.loadMessages(widget.conversation.id);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final body = _controller.text.trim();
    if (body.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await widget.repository.sendMessage(widget.conversation.id, body);
      _controller.clear();
      setState(() {
        _sending = false;
        _messages = widget.repository.loadMessages(widget.conversation.id);
      });
    } on Object catch (error) {
      if (!mounted) return;
      setState(() => _sending = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('消息未发送：$error')));
    }
  }

  Future<void> _recall(DmMessage message) async {
    if (!message.fromMe || message.recalled) return;
    try {
      await widget.repository.recallMessage(message.id);
      setState(() {
        _messages = widget.repository.loadMessages(widget.conversation.id);
      });
    } on Object catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('消息未撤回：$error')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final keyboard = MediaQuery.viewInsetsOf(context).bottom;
    return Material(
      color: const Color(0xFFF7F7FA),
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * .82,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 8, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.conversation.peerName,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: '关闭私信',
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: FutureBuilder<List<DmMessage>>(
                future: _messages,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(child: Text('会话载入失败：${snapshot.error}'));
                  }
                  final items = snapshot.data ?? const <DmMessage>[];
                  if (items.isEmpty) {
                    return const Center(child: Text('发送第一条消息开始对话。'));
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    itemBuilder: (context, index) {
                      final message = items[index];
                      return Align(
                        alignment: message.fromMe
                            ? Alignment.centerRight
                            : Alignment.centerLeft,
                        child: GestureDetector(
                          onLongPress: message.fromMe && !message.recalled
                              ? () => _recall(message)
                              : null,
                          child: Container(
                            constraints: const BoxConstraints(maxWidth: 290),
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 13,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: message.fromMe
                                  ? AirvanaColors.accent
                                  : Colors.white,
                              borderRadius: BorderRadius.circular(15),
                            ),
                            child: Text(
                              message.recalled ? '消息已撤回' : message.body,
                              style: TextStyle(
                                color: message.fromMe
                                    ? Colors.white
                                    : AirvanaColors.ink,
                                fontStyle: message.recalled
                                    ? FontStyle.italic
                                    : FontStyle.normal,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(12, 10, 12, 12 + keyboard),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      enabled: !_sending,
                      maxLength: 1000,
                      minLines: 1,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        hintText: '输入消息…',
                        counterText: '',
                      ),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    tooltip: '发送消息',
                    onPressed: _sending ? null : _send,
                    icon: _sending
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _timeLabel(DateTime value) {
  final local = value.toLocal();
  final now = DateTime.now();
  if (local.year == now.year &&
      local.month == now.month &&
      local.day == now.day) {
    return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }
  return '${local.month}/${local.day}';
}
