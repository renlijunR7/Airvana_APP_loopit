import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 本机私信会话，对应 Web 的 `panel:'chat'`。
/// 边界与 Web 一致：消息只保存在本机，AI 只提供建议、不代表本人发送。
class LocalChatScreen extends ConsumerStatefulWidget {
  const LocalChatScreen({super.key, required this.threadId});

  final String threadId;

  @override
  ConsumerState<LocalChatScreen> createState() => _LocalChatScreenState();
}

class _LocalChatScreenState extends ConsumerState<LocalChatScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await ref
          .read(airvanaRepositoryProvider)
          .markLocalThreadRead(widget.threadId);
      if (mounted) ref.invalidate(localMessageThreadsProvider);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await ref
          .read(airvanaRepositoryProvider)
          .sendLocalMessage(threadId: widget.threadId, text: text);
      _controller.clear();
      ref.invalidate(localMessageThreadsProvider);
      if (mounted) _toast('已保存到本地对话演示');
    } on Object catch (error) {
      if (mounted) _toast('$error');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _handoff() async {
    await ref
        .read(airvanaRepositoryProvider)
        .requestLocalHumanHandoff(widget.threadId);
    ref.invalidate(localMessageThreadsProvider);
    if (mounted) _toast('已标记为需要本人处理');
  }

  void _toast(String message) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(message)));

  @override
  Widget build(BuildContext context) {
    final threads = ref.watch(localMessageThreadsProvider);
    return Scaffold(
      backgroundColor: AirvanaColors.canvas,
      body: SafeArea(
        child: threads.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(child: Text('对话读取失败：$error')),
          data: (items) {
            final thread = items
                .where((item) => item.id == widget.threadId)
                .firstOrNull;
            if (thread == null) {
              return const Center(child: Text('找不到这个对话'));
            }
            return Column(
              children: [
                _ChatHeader(thread: thread),
                if (thread.id == 'ai-twin') const _AiAssistBanner(),
                Expanded(child: _messages(thread)),
                _composer(thread),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _messages(LocalMessageThread thread) {
    if (thread.messages.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '开始一段新对话',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
              ),
              SizedBox(height: 6),
              Text(
                '当前仅保存在本机演示环境',
                style: TextStyle(fontSize: 11, color: AirvanaColors.muted),
              ),
            ],
          ),
        ),
      );
    }
    return ListView(
      key: const ValueKey('local-chat-messages'),
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      children: [
        const Center(
          child: Padding(
            padding: EdgeInsets.only(bottom: 10),
            child: Text(
              '今天',
              style: TextStyle(fontSize: 10, color: AirvanaColors.muted),
            ),
          ),
        ),
        for (final message in thread.messages)
          _MessageBubble(
            key: ValueKey('chat-msg-${message.id}'),
            entry: message,
          ),
      ],
    );
  }

  Widget _composer(LocalMessageThread thread) => Container(
    padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
    decoration: const BoxDecoration(
      color: Colors.white,
      border: Border(top: BorderSide(color: AirvanaColors.line)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                key: const ValueKey('local-chat-input'),
                controller: _controller,
                maxLength: 1000,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: const InputDecoration(
                  hintText: '输入回复内容',
                  counterText: '',
                  isDense: true,
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              key: const ValueKey('local-chat-send'),
              onPressed: _sending ? null : _send,
              icon: const Icon(Icons.send_rounded, size: 18),
              style: IconButton.styleFrom(
                backgroundColor: AirvanaColors.accent,
              ),
            ),
          ],
        ),
        if (thread.canHandoff)
          TextButton.icon(
            key: const ValueKey('local-chat-handoff'),
            onPressed: thread.handoffRequested ? null : _handoff,
            icon: const Icon(Icons.person_outline_rounded, size: 16),
            label: Text(thread.handoffRequested ? '已标记本人处理' : '转由本人处理'),
          ),
        Text(
          thread.isSupport ? '当前消息仅保存在本机，不会发送到真实客服。' : 'AI 只提供回复建议，不会自动代表本人发送。',
          key: const ValueKey('local-chat-boundary'),
          style: const TextStyle(fontSize: 10, color: AirvanaColors.muted),
        ),
      ],
    ),
  );
}

class _ChatHeader extends StatelessWidget {
  const _ChatHeader({required this.thread});

  final LocalMessageThread thread;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(6, 6, 16, 10),
    decoration: const BoxDecoration(
      color: Colors.white,
      border: Border(bottom: BorderSide(color: AirvanaColors.line)),
    ),
    child: Row(
      children: [
        IconButton(
          tooltip: '返回消息',
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                thread.name,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                thread.handle,
                style: const TextStyle(
                  fontSize: 10,
                  color: AirvanaColors.muted,
                ),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
          decoration: BoxDecoration(
            color: AirvanaColors.canvas,
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            thread.id == 'ai-twin' ? 'AI 辅助' : '本地对话',
            style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900),
          ),
        ),
      ],
    ),
  );
}

class _AiAssistBanner extends StatelessWidget {
  const _AiAssistBanner();

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
    padding: const EdgeInsets.all(11),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF0F1),
      borderRadius: BorderRadius.circular(13),
    ),
    child: const Text(
      'AI 辅助回复 · 内容发送前需本人确认，必要时可随时接管',
      style: TextStyle(
        fontSize: 10,
        fontWeight: FontWeight.w900,
        color: AirvanaColors.accent,
      ),
    ),
  );
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({super.key, required this.entry});

  final LocalMessageEntry entry;

  @override
  Widget build(BuildContext context) {
    final mine = entry.mine;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: mine
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
              decoration: BoxDecoration(
                color: mine ? AirvanaColors.accent : Colors.white,
                borderRadius: BorderRadius.circular(15),
                border: Border.all(
                  color: mine ? AirvanaColors.accent : AirvanaColors.line,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.text,
                    style: TextStyle(
                      fontSize: 12,
                      height: 1.6,
                      color: mine ? Colors.white : null,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    entry.time,
                    style: TextStyle(
                      fontSize: 9,
                      color: mine ? Colors.white70 : AirvanaColors.muted,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
