import 'package:flutter/material.dart';

import '../../../design_system/airvana_theme.dart';
import '../data/airvana_repository.dart';
import '../domain/airvana_models.dart';
import '../domain/comment_report.dart';

Future<CommentReportReceipt?> showCommentReportSheet(
  BuildContext context, {
  required AirvanaRepository repository,
  required Playable playable,
  required String author,
  required String body,
  String? commentId,
  String? demoCommentKey,
}) {
  FocusScope.of(context).unfocus();
  return showModalBottomSheet<CommentReportReceipt>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    isDismissible: false,
    enableDrag: false,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    ),
    builder: (_) => _CommentReportSheet(
      repository: repository,
      playable: playable,
      author: author,
      body: body,
      commentId: commentId,
      demoCommentKey: demoCommentKey,
    ),
  );
}

class _CommentReportSheet extends StatefulWidget {
  const _CommentReportSheet({
    required this.repository,
    required this.playable,
    required this.author,
    required this.body,
    this.commentId,
    this.demoCommentKey,
  });

  final AirvanaRepository repository;
  final Playable playable;
  final String author;
  final String body;
  final String? commentId;
  final String? demoCommentKey;

  @override
  State<_CommentReportSheet> createState() => _CommentReportSheetState();
}

class _CommentReportSheetState extends State<_CommentReportSheet> {
  final _details = TextEditingController();
  final _errorAnchor = GlobalKey();
  CommentReportReason? _reason;
  CommentReportReceipt? _receipt;
  String? _error;
  bool _submitting = false;

  bool get _canSubmit =>
      !_submitting &&
      _reason != null &&
      (_reason != CommentReportReason.other || _details.text.trim().isNotEmpty);

  @override
  void dispose() {
    _details.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final receipt = await widget.repository.reportComment(
        playableKey: widget.playable.id,
        title: widget.playable.title,
        commentId: widget.commentId,
        demoCommentKey: widget.demoCommentKey,
        reason: _reason!,
        details: _details.text,
      );
      if (mounted) setState(() => _receipt = receipt);
    } catch (error) {
      if (mounted) {
        setState(() => _error = '举报未提交成功：$error');
        WidgetsBinding.instance.addPostFrameCallback((_) {
          final errorContext = _errorAnchor.currentContext;
          if (mounted && errorContext != null) {
            Scrollable.ensureVisible(errorContext);
          }
        });
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _close() => Navigator.pop(context, _receipt);

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    return PopScope(
      canPop: !_submitting,
      child: Padding(
        padding: EdgeInsets.only(bottom: media.viewInsets.bottom),
        child: SafeArea(
          top: false,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: (media.size.height - media.viewInsets.bottom) * .9,
            ),
            child: Column(
              key: const ValueKey('comment-report-sheet'),
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 12, 4),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Text(
                          '举报评论',
                          style: TextStyle(
                            color: AirvanaColors.ink,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      IconButton(
                        key: const ValueKey('comment-report-close'),
                        tooltip: '关闭举报',
                        onPressed: _submitting ? null : _close,
                        icon: const Icon(Icons.close_rounded),
                      ),
                    ],
                  ),
                ),
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                    child: _receipt == null ? _form() : _confirmation(),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: FilledButton(
                      key: ValueKey(
                        _receipt == null
                            ? 'comment-report-submit'
                            : 'comment-report-done',
                      ),
                      style: FilledButton.styleFrom(
                        backgroundColor: AirvanaColors.accent,
                        shape: const StadiumBorder(),
                      ),
                      onPressed: _receipt != null
                          ? _close
                          : (_canSubmit ? _submit : null),
                      child: _submitting
                          ? const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                SizedBox.square(
                                  dimension: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                ),
                                SizedBox(width: 10),
                                Text('提交中…'),
                              ],
                            )
                          : Text(
                              _receipt != null
                                  ? '完成'
                                  : (_error != null ? '重试提交' : '提交举报'),
                            ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _form() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AirvanaColors.canvas,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.author,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: AirvanaColors.ink,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              widget.body,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AirvanaColors.muted, height: 1.5),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      const Text(
        '请选择举报原因',
        style: TextStyle(fontWeight: FontWeight.w700, color: AirvanaColors.ink),
      ),
      const SizedBox(height: 6),
      for (final reason in CommentReportReason.values)
        RadioListTile<CommentReportReason>(
          key: ValueKey('comment-report-reason-${reason.name}'),
          value: reason,
          groupValue: _reason,
          onChanged: _submitting
              ? null
              : (value) => setState(() => _reason = value),
          contentPadding: EdgeInsets.zero,
          activeColor: AirvanaColors.accent,
          title: Text(reason.label, style: const TextStyle(fontSize: 14)),
        ),
      const SizedBox(height: 8),
      TextField(
        key: const ValueKey('comment-report-details'),
        controller: _details,
        enabled: !_submitting,
        minLines: 2,
        maxLines: 4,
        maxLength: 500,
        onChanged: (_) => setState(() {}),
        decoration: InputDecoration(
          hintText: _reason == CommentReportReason.other
              ? '请说明举报原因（必填）'
              : '补充说明（选填）',
          filled: true,
          fillColor: AirvanaColors.canvas,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
        ),
      ),
      Text(
        widget.demoCommentKey != null
            ? '当前为本地演示评论。提交后保存至本地服务端的演示举报队列，不代表生产平台已受理。'
            : '请如实反馈。举报提交后待平台复核，不会自动删除评论；同一评论不会重复记录。',
        style: const TextStyle(
          fontSize: 12,
          color: AirvanaColors.muted,
          height: 1.5,
        ),
      ),
      if (_error != null) ...[
        const SizedBox(height: 12),
        Semantics(
          key: _errorAnchor,
          liveRegion: true,
          child: Text(
            _error!,
            key: const ValueKey('comment-report-error'),
            style: const TextStyle(color: AirvanaColors.accent, height: 1.5),
          ),
        ),
      ],
    ],
  );

  Widget _confirmation() {
    final receipt = _receipt!;
    return Semantics(
      liveRegion: true,
      child: Column(
        key: const ValueKey('comment-report-success'),
        children: [
          const SizedBox(height: 16),
          const Icon(
            Icons.check_circle_outline_rounded,
            color: AirvanaColors.accent,
            size: 52,
          ),
          const SizedBox(height: 16),
          Text(
            receipt.alreadyReported
                ? '这条评论已举报'
                : (receipt.demo ? '演示举报已记录' : '举报已提交'),
            style: const TextStyle(
              color: AirvanaColors.ink,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            receipt.status == 'resolved'
                ? '该举报已有处理结果，本次未重复提交。'
                : '已收到服务端回执，当前状态：待复核。',
            textAlign: TextAlign.center,
          ),
          if (receipt.demo) ...[
            const SizedBox(height: 8),
            const Text(
              '仅用于本地演示，不代表生产平台已受理。',
              textAlign: TextAlign.center,
              style: TextStyle(color: AirvanaColors.muted),
            ),
          ],
          const SizedBox(height: 16),
          SelectableText(
            '回执编号：${receipt.id}',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: AirvanaColors.muted),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
