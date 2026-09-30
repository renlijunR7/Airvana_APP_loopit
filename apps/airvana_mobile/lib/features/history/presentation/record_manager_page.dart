import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/history/presentation/experience_history_screen.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/shared/presentation/destructive_confirm.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// 记录管理，对应 Web 的 `overlay:'recordManager'` 四种 kind。
/// 所有删除都走统一确认层，删除的草稿进墓碑而不是直接消失。
class RecordManagerPageBody extends ConsumerStatefulWidget {
  const RecordManagerPageBody({super.key});

  @override
  ConsumerState<RecordManagerPageBody> createState() =>
      _RecordManagerPageBodyState();
}

class _RecordManagerPageBodyState extends ConsumerState<RecordManagerPageBody> {
  static const _kinds = <(String, String, String)>[
    ('saved', '收藏', '收藏夹与备注可按作品维护，仅存在本机。'),
    ('history', '体验记录', '每次完整体验都会留下一条记录，可按作品回溯。'),
    ('draft', '草稿', '草稿保留创作流的阶段状态，可继续编辑或删除。'),
    ('trash', '最近删除', '删除的草稿保留墓碑记录，可以恢复。'),
  ];

  String _kind = 'saved';

  void _toast(String message) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(message)));

  void _refresh() {
    ref.invalidate(profileLocalWorkspaceProvider);
    ref.invalidate(homeProvider);
    ref.invalidate(experienceHistoryProvider);
  }

  @override
  Widget build(BuildContext context) {
    final active = _kinds.firstWhere((item) => item.$1 == _kind);
    final workspace = ref.watch(profileLocalWorkspaceProvider);
    return ListView(
      key: const ValueKey('record-manager-body'),
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final kind in _kinds)
              ChoiceChip(
                key: ValueKey('record-kind-${kind.$1}'),
                label: Text(kind.$2, style: const TextStyle(fontSize: 11)),
                selected: _kind == kind.$1,
                onSelected: (_) => setState(() => _kind = kind.$1),
              ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          active.$3,
          style: const TextStyle(
            fontSize: 10,
            height: 1.6,
            color: AirvanaColors.muted,
          ),
        ),
        const SizedBox(height: 14),
        workspace.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Text('本机记录读取失败：$error'),
          data: (data) => switch (_kind) {
            'saved' => _saved(data),
            'history' => _history(data),
            'draft' => _drafts(data),
            _ => _trash(data),
          },
        ),
      ],
    );
  }

  Widget _saved(LocalWorkspaceSnapshot data) {
    final social = ref.watch(localSocialStateProvider);
    return social.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Text('收藏读取失败：$error'),
      data: (state) {
        if (state.savedPlayableIds.isEmpty) {
          return const _EmptyBlock(
            title: '还没有收藏',
            message: '在发现页或播放页收藏作品后，可以在这里维护收藏夹与备注。',
          );
        }
        return Column(
          children: [
            for (final id in state.savedPlayableIds)
              _SavedRow(
                key: ValueKey('record-saved-$id'),
                playableId: id,
                title: LegacyDemoCatalog.byId(id)?.title ?? id,
                relation: data.savedRelations
                    .where((item) => item.playableId == id)
                    .firstOrNull,
                onSave: (collection, note) async {
                  await ref
                      .read(airvanaRepositoryProvider)
                      .saveLocalSavedRelation(
                        playableId: id,
                        collection: collection,
                        note: note,
                      );
                  _refresh();
                  if (mounted) _toast('收藏信息已保存到本机');
                },
                onRemove: () async {
                  await ref
                      .read(airvanaRepositoryProvider)
                      .setLocalEngagement(
                        playableId: id,
                        eventType: 'save',
                        active: false,
                      );
                  ref.invalidate(localSocialStateProvider);
                  _refresh();
                  if (mounted) _toast('已取消收藏');
                },
              ),
          ],
        );
      },
    );
  }

  Widget _history(LocalWorkspaceSnapshot data) {
    final records = data.experienceRecords.reversed.toList(growable: false);
    if (records.isEmpty) {
      return const _EmptyBlock(title: '暂无详细运行记录', message: '再次体验后会生成完整记录。');
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final record in records)
          _RecordRow(
            key: ValueKey('record-run-${record.recordId}'),
            title: record.title,
            meta: '${record.status} · ${_formatTime(record.startedAt)}',
            onReplay: () => context.push('/runtime/${record.playableId}'),
            onDelete: () async {
              final ok = await confirmDestructiveAction(
                context,
                DestructiveAction.deleteGameRun,
              );
              if (!ok) return;
              await ref
                  .read(airvanaRepositoryProvider)
                  .deleteLocalExperienceRecord(record.recordId);
              _refresh();
              if (mounted) _toast('已删除这条记录');
            },
            onClearContent: () async {
              final ok = await confirmDestructiveAction(
                context,
                DestructiveAction.clearContentRuns,
              );
              if (!ok) return;
              await ref
                  .read(airvanaRepositoryProvider)
                  .clearLocalContentRuns(record.playableId);
              _refresh();
              if (mounted) _toast('已清除该作品的记录');
            },
          ),
        const SizedBox(height: 10),
        OutlinedButton(
          key: const ValueKey('record-clear-all-runs'),
          onPressed: () async {
            final ok = await confirmDestructiveAction(
              context,
              DestructiveAction.clearAllRuns,
            );
            if (!ok) return;
            await ref.read(airvanaRepositoryProvider).clearLocalAllRuns();
            _refresh();
            if (mounted) _toast('已清空全部体验记录');
          },
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFFC62836),
          ),
          child: const Text('清空全部体验记录'),
        ),
      ],
    );
  }

  Widget _drafts(LocalWorkspaceSnapshot data) {
    if (data.drafts.isEmpty) {
      return const _EmptyBlock(title: '还没有草稿', message: '创作流会把阶段状态保存为本机草稿。');
    }
    return Column(
      children: [
        for (final draft in data.drafts)
          _DraftRow(
            key: ValueKey('record-draft-${draft.draftId}'),
            title: draft.idea.isEmpty ? '未命名草稿' : draft.idea,
            meta: '${draft.status.name} · ${_formatTime(draft.updatedAt)}',
            onEdit: () => context.push('/create?draft=${draft.draftId}'),
            onCopy: () async {
              await ref
                  .read(airvanaRepositoryProvider)
                  .duplicateLocalDraft(draft.draftId);
              _refresh();
              if (mounted) _toast('草稿已复制');
            },
            onMoveUp: () async {
              await ref
                  .read(airvanaRepositoryProvider)
                  .moveLocalDraft(draftId: draft.draftId, delta: -1);
              _refresh();
            },
            onMoveDown: () async {
              await ref
                  .read(airvanaRepositoryProvider)
                  .moveLocalDraft(draftId: draft.draftId, delta: 1);
              _refresh();
            },
            onTrash: () async {
              final ok = await confirmDestructiveAction(
                context,
                DestructiveAction.deleteDraft,
              );
              if (!ok) return;
              await ref
                  .read(airvanaRepositoryProvider)
                  .trashLocalDraft(draft.draftId);
              _refresh();
              if (mounted) _toast('已移到最近删除');
            },
          ),
      ],
    );
  }

  Widget _trash(LocalWorkspaceSnapshot data) {
    if (data.draftTrash.isEmpty) {
      return const _EmptyBlock(title: '最近删除是空的', message: '删除的草稿会保留在这里，可以恢复。');
    }
    return Column(
      children: [
        for (final draft in data.draftTrash)
          Container(
            key: ValueKey('record-trash-${draft.draftId}'),
            margin: const EdgeInsets.only(bottom: 9),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AirvanaColors.line),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        draft.idea.isEmpty ? '未命名草稿' : draft.idea,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatTime(draft.updatedAt),
                        style: const TextStyle(
                          fontSize: 9,
                          color: AirvanaColors.muted,
                        ),
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () async {
                    await ref
                        .read(airvanaRepositoryProvider)
                        .restoreLocalDraft(draft.draftId);
                    _refresh();
                    if (mounted) _toast('草稿已恢复');
                  },
                  child: const Text('恢复'),
                ),
              ],
            ),
          ),
      ],
    );
  }

  static String _formatTime(DateTime time) {
    final local = time.toLocal();
    return '${local.year}-${local.month.toString().padLeft(2, '0')}-'
        '${local.day.toString().padLeft(2, '0')} '
        '${local.hour.toString().padLeft(2, '0')}:'
        '${local.minute.toString().padLeft(2, '0')}';
  }
}

class _EmptyBlock extends StatelessWidget {
  const _EmptyBlock({required this.title, required this.message});

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(15),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 5),
        Text(
          message,
          style: const TextStyle(
            fontSize: 10,
            height: 1.6,
            color: AirvanaColors.muted,
          ),
        ),
      ],
    ),
  );
}

class _SavedRow extends StatefulWidget {
  const _SavedRow({
    super.key,
    required this.playableId,
    required this.title,
    required this.relation,
    required this.onSave,
    required this.onRemove,
  });

  final String playableId;
  final String title;
  final LocalSavedRelation? relation;
  final Future<void> Function(String collection, String note) onSave;
  final Future<void> Function() onRemove;

  @override
  State<_SavedRow> createState() => _SavedRowState();
}

class _SavedRowState extends State<_SavedRow> {
  late final TextEditingController _collection = TextEditingController(
    text: widget.relation?.collection ?? '默认收藏',
  );
  late final TextEditingController _note = TextEditingController(
    text: widget.relation?.note ?? '',
  );

  @override
  void dispose() {
    _collection.dispose();
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(13),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(15),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.title,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 9),
        TextField(
          controller: _collection,
          decoration: const InputDecoration(labelText: '收藏夹', isDense: true),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _note,
          maxLines: 2,
          decoration: const InputDecoration(labelText: '我的备注', isDense: true),
        ),
        const SizedBox(height: 9),
        Row(
          children: [
            Expanded(
              child: FilledButton(
                key: ValueKey('record-saved-save-${widget.playableId}'),
                onPressed: () => widget.onSave(_collection.text, _note.text),
                child: const Text('保存收藏信息'),
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: OutlinedButton(
                key: ValueKey('record-saved-remove-${widget.playableId}'),
                onPressed: widget.onRemove,
                child: const Text('取消收藏'),
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

class _RecordRow extends StatelessWidget {
  const _RecordRow({
    super.key,
    required this.title,
    required this.meta,
    required this.onReplay,
    required this.onDelete,
    required this.onClearContent,
  });

  final String title;
  final String meta;
  final VoidCallback onReplay;
  final Future<void> Function() onDelete;
  final Future<void> Function() onClearContent;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 9),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 3),
        Text(
          meta,
          style: const TextStyle(fontSize: 9, color: AirvanaColors.muted),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            TextButton(onPressed: onReplay, child: const Text('再次体验')),
            TextButton(onPressed: onClearContent, child: const Text('清除此作品')),
            const Spacer(),
            IconButton(
              tooltip: '删除这条记录',
              onPressed: onDelete,
              icon: const Icon(Icons.close_rounded, size: 16),
            ),
          ],
        ),
      ],
    ),
  );
}

class _DraftRow extends StatelessWidget {
  const _DraftRow({
    super.key,
    required this.title,
    required this.meta,
    required this.onEdit,
    required this.onCopy,
    required this.onMoveUp,
    required this.onMoveDown,
    required this.onTrash,
  });

  final String title;
  final String meta;
  final VoidCallback onEdit;
  final Future<void> Function() onCopy;
  final Future<void> Function() onMoveUp;
  final Future<void> Function() onMoveDown;
  final Future<void> Function() onTrash;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 9),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 3),
        Text(
          meta,
          style: const TextStyle(fontSize: 9, color: AirvanaColors.muted),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            FilledButton(onPressed: onEdit, child: const Text('继续编辑')),
            OutlinedButton(onPressed: onCopy, child: const Text('复制草稿')),
            OutlinedButton(onPressed: onMoveUp, child: const Text('向前排序')),
            OutlinedButton(onPressed: onMoveDown, child: const Text('向后排序')),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: onTrash,
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFFC62836),
            ),
            child: const Text('移到最近删除'),
          ),
        ),
      ],
    ),
  );
}
