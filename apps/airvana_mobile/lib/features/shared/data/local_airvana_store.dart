import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract interface class LocalAirvanaPersistence {
  Future<String?> readWorkspaceJson();

  Future<void> writeWorkspaceJson(String value);
}

class SecureLocalAirvanaPersistence implements LocalAirvanaPersistence {
  SecureLocalAirvanaPersistence({
    FlutterSecureStorage? storage,
    this.storageKey = 'airvana.local.workspace.v1',
  }) : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  final String storageKey;

  @override
  Future<String?> readWorkspaceJson() => _storage.read(key: storageKey);

  @override
  Future<void> writeWorkspaceJson(String value) =>
      _storage.write(key: storageKey, value: value);
}

class MemoryLocalAirvanaPersistence implements LocalAirvanaPersistence {
  MemoryLocalAirvanaPersistence({String? initialValue}) : _value = initialValue;

  String? _value;

  String? get value => _value;

  @override
  Future<String?> readWorkspaceJson() async => _value;

  @override
  Future<void> writeWorkspaceJson(String value) async => _value = value;
}

abstract interface class LocalIdGenerator {
  String next(String prefix);
}

class TimestampLocalIdGenerator implements LocalIdGenerator {
  TimestampLocalIdGenerator({DateTime Function()? clock, Random? random})
    : _clock = clock ?? DateTime.now,
      _random = random ?? Random.secure();

  final DateTime Function() _clock;
  final Random _random;
  int _sequence = 0;

  @override
  String next(String prefix) {
    _sequence += 1;
    final micros = _clock().toUtc().microsecondsSinceEpoch.toRadixString(36);
    final sequence = _sequence.toRadixString(36).padLeft(2, '0');
    final entropy = _random
        .nextInt(0x7fffffff)
        .toRadixString(36)
        .padLeft(6, '0');
    return '${prefix}_${micros}_${sequence}_$entropy';
  }
}

class LocalReleaseRequest {
  const LocalReleaseRequest({
    required this.generationTaskId,
    required this.title,
    required this.summary,
    required this.contentType,
    required this.authorName,
    required this.visibility,
    required this.remixPolicy,
    required this.localReviewPassed,
    this.playableId,
    this.rollbackVersionId,
  });

  final String generationTaskId;
  final String title;
  final String summary;
  final String contentType;
  final String authorName;
  final LocalVisibility visibility;
  final LocalRemixPolicy remixPolicy;

  /// This records only an in-app LOCAL/DEMO review gate. It does not represent
  /// platform, brand, legal, app-store, marketplace, or server approval.
  final bool localReviewPassed;
  final String? playableId;
  final String? rollbackVersionId;
}

class LocalStoreException implements Exception {
  const LocalStoreException(this.message);

  final String message;

  @override
  String toString() => 'LocalStoreException: $message';
}

class LocalAirvanaStore {
  LocalAirvanaStore({
    required LocalAirvanaPersistence persistence,
    LocalIdGenerator? ids,
    DateTime Function()? clock,
  }) : _persistence = persistence,
       _ids = ids ?? TimestampLocalIdGenerator(clock: clock),
       _clock = clock ?? DateTime.now;

  factory LocalAirvanaStore.secure() =>
      LocalAirvanaStore(persistence: SecureLocalAirvanaPersistence());

  final LocalAirvanaPersistence _persistence;
  final LocalIdGenerator _ids;
  final DateTime Function() _clock;
  Future<void> _gate = Future<void>.value();

  Future<T> _serial<T>(Future<T> Function() operation) async {
    final previous = _gate;
    final release = Completer<void>();
    _gate = release.future;
    await previous;
    try {
      return await operation();
    } finally {
      release.complete();
    }
  }

  Future<LocalWorkspaceSnapshot> loadWorkspace() =>
      _serial(_readWorkspaceUnlocked);

  Future<LocalWorkspaceSnapshot> _readWorkspaceUnlocked() async {
    final raw = await _persistence.readWorkspaceJson();
    if (raw == null || raw.trim().isEmpty) {
      return const LocalWorkspaceSnapshot();
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) {
        throw const FormatException('workspace root is not an object');
      }
      final json = Map<String, dynamic>.from(decoded);
      final version = (json['schema_version'] as num?)?.toInt() ?? 1;
      if (version != 1) {
        throw FormatException('unsupported schema_version: $version');
      }
      return LocalWorkspaceSnapshot.fromJson(json);
    } on FormatException catch (error) {
      throw LocalStoreException('本地工作区数据无法解析：${error.message}');
    }
  }

  Future<void> _writeWorkspaceUnlocked(LocalWorkspaceSnapshot snapshot) =>
      _persistence.writeWorkspaceJson(jsonEncode(snapshot.toJson()));

  Future<LocalDraft> saveDraft({
    String? draftId,
    required String ownerId,
    required String idea,
    required bool deepMode,
    required List<String> selectedPowerIds,
    Map<String, dynamic>? workflowState,
    LocalDraftStatus status = LocalDraftStatus.editing,
    LocalDataMode dataMode = LocalDataMode.local,
    String? sourcePlayableId,
  }) => _serial(() async {
    final snapshot = await _readWorkspaceUnlocked();
    final now = _clock().toUtc();
    final normalizedId = draftId?.trim();
    final existing = normalizedId == null || normalizedId.isEmpty
        ? null
        : _firstWhereOrNull(
            snapshot.drafts,
            (item) => item.draftId == normalizedId,
          );
    if (normalizedId != null && normalizedId.isNotEmpty && existing == null) {
      throw LocalStoreException('草稿不存在：$normalizedId');
    }
    if (existing?.status == LocalDraftStatus.archived) {
      throw LocalStoreException('已归档草稿不可覆盖：${existing!.draftId}');
    }
    final saved = LocalDraft(
      draftId: existing?.draftId ?? _ids.next('draft_local'),
      ownerId: ownerId,
      idea: idea,
      deepMode: deepMode,
      selectedPowerIds: selectedPowerIds.toSet().toList(growable: false),
      workflowState: Map.unmodifiable(
        workflowState ?? existing?.workflowState ?? const {},
      ),
      status: status,
      dataMode: dataMode,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      playableId: existing?.playableId,
      sourcePlayableId: sourcePlayableId ?? existing?.sourcePlayableId,
    );
    final drafts = [...snapshot.drafts];
    final index = drafts.indexWhere((item) => item.draftId == saved.draftId);
    if (index < 0) {
      drafts.add(saved);
    } else {
      drafts[index] = saved;
    }
    await _writeWorkspaceUnlocked(snapshot.copyWith(drafts: drafts));
    return saved;
  });

  Future<LocalDraft?> loadDraft(String draftId) async {
    final snapshot = await loadWorkspace();
    return _firstWhereOrNull(
      snapshot.drafts,
      (item) => item.draftId == draftId,
    );
  }

  Future<LocalGenerationTask> startGeneration(String draftId) =>
      _serial(() async {
        final snapshot = await _readWorkspaceUnlocked();
        return _createGenerationUnlocked(
          snapshot,
          _requireDraftForGeneration(snapshot, draftId),
        );
      });

  /// Atomically reuses the URL-referenced task, or the latest recoverable task
  /// for this draft, before creating a new task/version pair.
  Future<LocalGenerationTask> startOrResumeGeneration(
    String draftId, {
    String? taskId,
    bool forceNew = false,
  }) => _serial(() async {
    final snapshot = await _readWorkspaceUnlocked();
    final draft = _requireDraftForGeneration(snapshot, draftId);
    if (taskId != null && taskId.trim().isNotEmpty) {
      final referenced = _firstWhereOrNull(
        snapshot.generationTasks,
        (item) => item.taskId == taskId,
      );
      if (referenced == null) {
        throw LocalStoreException('生成任务不存在：$taskId');
      }
      if (referenced.draftId != draftId) {
        throw LocalStoreException('生成任务不属于当前草稿：$taskId');
      }
      return referenced;
    }
    if (!forceNew) {
      final recoverable = snapshot.generationTasks.reversed.where(
        (item) =>
            item.draftId == draftId &&
            _recoverableGenerationStatuses.contains(item.status),
      );
      if (recoverable.isNotEmpty) return recoverable.first;
    }
    return _createGenerationUnlocked(snapshot, draft);
  });

  LocalDraft _requireDraftForGeneration(
    LocalWorkspaceSnapshot snapshot,
    String draftId,
  ) {
    final draft = _firstWhereOrNull(
      snapshot.drafts,
      (item) => item.draftId == draftId,
    );
    if (draft == null) throw LocalStoreException('草稿不存在：$draftId');
    if (draft.status == LocalDraftStatus.archived) {
      throw LocalStoreException('已归档草稿不能生成：$draftId');
    }
    return draft;
  }

  Future<LocalGenerationTask> _createGenerationUnlocked(
    LocalWorkspaceSnapshot snapshot,
    LocalDraft draft,
  ) async {
    final now = _clock().toUtc();
    final task = LocalGenerationTask(
      taskId: _ids.next('task_local'),
      draftId: draft.draftId,
      versionId: _ids.next('version_local'),
      status: LocalGenerationStatus.queued,
      dataMode: draft.dataMode,
      createdAt: now,
      updatedAt: now,
    );
    await _writeWorkspaceUnlocked(
      snapshot.copyWith(generationTasks: [...snapshot.generationTasks, task]),
    );
    return task;
  }

  Future<LocalGenerationTask?> loadGeneration(String taskId) async {
    final snapshot = await loadWorkspace();
    return _firstWhereOrNull(
      snapshot.generationTasks,
      (item) => item.taskId == taskId,
    );
  }

  Future<LocalGenerationTask> updateGeneration(
    String taskId,
    LocalGenerationStatus status, {
    String? failureCode,
  }) => _serial(() async {
    final snapshot = await _readWorkspaceUnlocked();
    final tasks = [...snapshot.generationTasks];
    final index = tasks.indexWhere((item) => item.taskId == taskId);
    if (index < 0) throw LocalStoreException('生成任务不存在：$taskId');
    final existing = tasks[index];
    if (_terminalGenerationStatuses.contains(existing.status) &&
        existing.status != status) {
      throw LocalStoreException('终态生成任务不可改写：$taskId');
    }
    if (status == LocalGenerationStatus.failed &&
        (failureCode == null || failureCode.trim().isEmpty)) {
      throw const LocalStoreException('失败任务必须提供本地 failureCode');
    }
    final now = _clock().toUtc();
    if (!_allowedGenerationTransitions[existing.status]!.contains(status)) {
      throw LocalStoreException(
        '不允许的生成状态迁移：${existing.status.name} -> ${status.name}',
      );
    }
    final updated = LocalGenerationTask(
      taskId: existing.taskId,
      draftId: existing.draftId,
      versionId: existing.versionId,
      status: status,
      dataMode: existing.dataMode,
      createdAt: existing.createdAt,
      updatedAt: now,
      completedAt: status == LocalGenerationStatus.completed
          ? existing.completedAt ?? now
          : existing.completedAt,
      failureCode: status == LocalGenerationStatus.failed
          ? failureCode
          : existing.failureCode,
    );
    tasks[index] = updated;
    await _writeWorkspaceUnlocked(snapshot.copyWith(generationTasks: tasks));
    return updated;
  });

  Future<LocalRelease> publishRelease(LocalReleaseRequest request) =>
      _serial(() async {
        final snapshot = await _readWorkspaceUnlocked();
        final existingRelease = _firstWhereOrNull(
          snapshot.releases,
          (item) => item.generationTaskId == request.generationTaskId,
        );
        if (existingRelease != null) return existingRelease;
        if (!request.localReviewPassed) {
          throw const LocalStoreException('LOCAL/DEMO 审核未通过，不能创建本地 Release');
        }
        final task = _firstWhereOrNull(
          snapshot.generationTasks,
          (item) => item.taskId == request.generationTaskId,
        );
        if (task == null) {
          throw LocalStoreException('生成任务不存在：${request.generationTaskId}');
        }
        if (task.status != LocalGenerationStatus.completed) {
          throw LocalStoreException('生成任务尚未在本机完成：${task.taskId}');
        }
        final draft = _firstWhereOrNull(
          snapshot.drafts,
          (item) => item.draftId == task.draftId,
        );
        if (draft == null) throw LocalStoreException('草稿不存在：${task.draftId}');

        final requestedPlayableId = request.playableId?.trim();
        final linkedPlayableId = draft.playableId;
        if (requestedPlayableId != null &&
            requestedPlayableId.isNotEmpty &&
            linkedPlayableId != null &&
            linkedPlayableId != requestedPlayableId) {
          throw const LocalStoreException('草稿已绑定其他 playable_id');
        }
        final playableId = requestedPlayableId?.isNotEmpty == true
            ? requestedPlayableId!
            : linkedPlayableId ?? _ids.next('playable_local');
        final existingPlayable = _firstWhereOrNull(
          snapshot.playables,
          (item) => item.playableId == playableId,
        );
        if (requestedPlayableId?.isNotEmpty == true &&
            existingPlayable == null &&
            linkedPlayableId != requestedPlayableId) {
          throw LocalStoreException('指定的 playable_id 不存在：$playableId');
        }
        final nextVersion = (existingPlayable?.currentVersionNumber ?? 0) + 1;
        final rollbackVersionId =
            request.rollbackVersionId ?? existingPlayable?.currentVersionId;
        if (rollbackVersionId != null) {
          final rollbackRelease = _firstWhereOrNull(
            snapshot.releases,
            (item) =>
                item.playableId == playableId &&
                item.versionId == rollbackVersionId,
          );
          if (rollbackRelease == null) {
            throw LocalStoreException('rollback_version_id 不属于当前 Playable');
          }
        }
        final now = _clock().toUtc();
        final release = LocalRelease(
          releaseId: _ids.next('release_local'),
          playableId: playableId,
          versionId: task.versionId,
          versionNumber: nextVersion,
          buildId: _ids.next('build_local'),
          reviewId: _ids.next('review_local'),
          publishedAt: now,
          visibility: request.visibility,
          remixPolicy: request.remixPolicy,
          rollbackVersionId: rollbackVersionId,
          draftId: draft.draftId,
          generationTaskId: task.taskId,
          title: request.title,
          summary: request.summary,
          contentType: request.contentType,
          authorName: request.authorName,
          dataMode: task.dataMode,
        );
        final playable = LocalPlayable(
          playableId: playableId,
          ownerId: draft.ownerId,
          title: request.title,
          summary: request.summary,
          contentType: request.contentType,
          authorName: request.authorName,
          currentReleaseId: release.releaseId,
          currentVersionId: release.versionId,
          currentVersionNumber: release.versionNumber,
          status: LocalPlayableStatus.publishedLocal,
          dataMode: task.dataMode,
          createdAt: existingPlayable?.createdAt ?? now,
          updatedAt: now,
        );
        final playables = [...snapshot.playables];
        final playableIndex = playables.indexWhere(
          (item) => item.playableId == playableId,
        );
        if (playableIndex < 0) {
          playables.add(playable);
        } else {
          playables[playableIndex] = playable;
        }
        final drafts = [...snapshot.drafts];
        final draftIndex = drafts.indexWhere(
          (item) => item.draftId == draft.draftId,
        );
        drafts[draftIndex] = LocalDraft(
          draftId: draft.draftId,
          ownerId: draft.ownerId,
          idea: draft.idea,
          deepMode: draft.deepMode,
          selectedPowerIds: draft.selectedPowerIds,
          workflowState: draft.workflowState,
          status: LocalDraftStatus.publishedLocal,
          dataMode: draft.dataMode,
          createdAt: draft.createdAt,
          updatedAt: now,
          playableId: playableId,
          sourcePlayableId: draft.sourcePlayableId,
        );
        await _writeWorkspaceUnlocked(
          snapshot.copyWith(
            drafts: drafts,
            releases: [...snapshot.releases, release],
            playables: playables,
          ),
        );
        return release;
      });

  Future<LocalPlayable?> loadPlayable(String playableId) async {
    final snapshot = await loadWorkspace();
    return _firstWhereOrNull(
      snapshot.playables,
      (item) => item.playableId == playableId,
    );
  }

  Future<List<LocalRelease>> loadReleases(String playableId) async {
    final snapshot = await loadWorkspace();
    return snapshot.releases
        .where((item) => item.playableId == playableId)
        .toList(growable: false);
  }

  Future<LocalExperienceRecord> recordExperience({
    required String playableId,
    required String versionId,
    required String title,
    required String status,
    DateTime? completedAt,
    LocalDataMode dataMode = LocalDataMode.local,
    bool allowLegacyDemo = false,
  }) => _serial(() async {
    final snapshot = await _readWorkspaceUnlocked();
    if (!_localExperienceStatuses.contains(status)) {
      throw LocalStoreException('不支持的本地体验状态：$status');
    }
    final playable = _firstWhereOrNull(
      snapshot.playables,
      (item) => item.playableId == playableId,
    );
    final matchingRelease = _firstWhereOrNull(
      snapshot.releases,
      (item) => item.playableId == playableId && item.versionId == versionId,
    );
    if (playable == null || matchingRelease == null) {
      final legacyVersionPrefix = 'legacy_${playableId}_v';
      final legacyVersion = versionId.startsWith(legacyVersionPrefix)
          ? int.tryParse(versionId.substring(legacyVersionPrefix.length))
          : null;
      final validLegacyIdentity =
          playable == null &&
          allowLegacyDemo &&
          dataMode == LocalDataMode.demo &&
          legacyVersion != null &&
          legacyVersion > 0;
      if (!validLegacyIdentity) {
        throw const LocalStoreException(
          'playable_id 不存在，或 version_id 不属于该 Playable',
        );
      }
    }
    final now = _clock().toUtc();
    final record = LocalExperienceRecord(
      recordId: _ids.next('experience_local'),
      playableId: playableId,
      versionId: versionId,
      title: title,
      status: status,
      startedAt: now,
      completedAt: completedAt?.toUtc(),
      dataMode: dataMode,
    );
    await _writeWorkspaceUnlocked(
      snapshot.copyWith(
        experienceRecords: [...snapshot.experienceRecords, record],
      ),
    );
    return record;
  });

  Future<LocalRewardState> loadRewardState() async {
    final snapshot = await loadWorkspace();
    return snapshot.rewardState;
  }

  Future<LocalProfileState> loadProfileState() async {
    final snapshot = await loadWorkspace();
    return snapshot.profileState;
  }

  Future<LocalProfileFeatureState> loadProfileFeatureState() async {
    final snapshot = await loadWorkspace();
    return snapshot.profileFeatureState;
  }

  Future<LocalProfileFeatureState> saveProfileFeatureState(
    LocalProfileFeatureState state,
  ) => _serial(() async {
    final snapshot = await _readWorkspaceUnlocked();
    await _writeWorkspaceUnlocked(
      snapshot.copyWith(profileFeatureState: state),
    );
    return state;
  });

  /// 兑换站内权益：AIP 扣减、权益状态和流水必须在同一次本地写入中完成。
  Future<LocalProfileFeatureState> redeemProfileRight({
    required String rightId,
    required String title,
    required int cost,
  }) => _serial(() async {
    if (rightId.trim().isEmpty || cost <= 0) {
      throw const LocalStoreException('权益参数无效');
    }
    final snapshot = await _readWorkspaceUnlocked();
    final current = snapshot.profileFeatureState;
    if (current.activeRightIds.contains(rightId)) return current;
    if (snapshot.rewardState.aipBalance < cost) {
      throw const LocalStoreException('AIP 余额不足');
    }
    final now = _clock().toUtc();
    final nextReward = LocalRewardState(
      aipBalance: snapshot.rewardState.aipBalance - cost,
      checkInStreak: snapshot.rewardState.checkInStreak,
      lastCheckInDate: snapshot.rewardState.lastCheckInDate,
    );
    final nextFeature = current.copyWith(
      activeRightIds: [...current.activeRightIds, rightId],
      rightsOrders: [
        {
          'id': _ids.next('right_order_local'),
          'right_id': rightId,
          'title': title,
          'cost': cost,
          'created_at': now.toIso8601String(),
          'status': 'active_demo',
        },
        ...current.rightsOrders,
      ],
    );
    final txn = LocalWalletTxn(
      txnId: _ids.next('txn_local'),
      title: '兑换权益 · $title',
      amount: -cost,
      occurredAt: now,
    );
    await _writeWorkspaceUnlocked(
      snapshot.copyWith(
        rewardState: nextReward,
        walletTxns: [...snapshot.walletTxns, txn],
        profileFeatureState: nextFeature,
      ),
    );
    return nextFeature;
  });

  Future<LocalProfileState> saveProfile({
    required String displayName,
    required String bio,
  }) => _serial(() async {
    final name = displayName.trim();
    if (name.length < 2) {
      throw const LocalStoreException('名称至少需要 2 个字符');
    }
    final snapshot = await _readWorkspaceUnlocked();
    final profile = LocalProfileState(displayName: name, bio: bio.trim());
    await _writeWorkspaceUnlocked(snapshot.copyWith(profileState: profile));
    return profile;
  });

  Future<LocalSocialState> loadSocialState() async {
    final snapshot = await loadWorkspace();
    return snapshot.socialState;
  }

  Future<LocalSocialState> setFollowing({
    required String owner,
    required bool active,
  }) => _serial(() async {
    final normalized = owner.trim();
    if (normalized.isEmpty || normalized == '@kai.builds') {
      throw const LocalStoreException('不能修改自己的关注关系');
    }
    final snapshot = await _readWorkspaceUnlocked();
    final current = snapshot.socialState;
    final following = [...current.followingOwners];
    following.remove(normalized);
    if (active) following.add(normalized);
    final social = LocalSocialState(
      followerOwners: current.followerOwners,
      followingOwners: following,
    );
    await _writeWorkspaceUnlocked(snapshot.copyWith(socialState: social));
    return social;
  });

  /// 每日签到：同一天重复调用保持幂等（earned 为 0）。
  Future<LocalCheckInResult> checkInDaily() => _serial(() async {
    final snapshot = await _readWorkspaceUnlocked();
    final now = _clock();
    final dateKey =
        '${now.year.toString().padLeft(4, '0')}-'
        '${now.month.toString().padLeft(2, '0')}-'
        '${now.day.toString().padLeft(2, '0')}';
    final current = snapshot.rewardState;
    if (current.isCheckedInOn(dateKey)) {
      return LocalCheckInResult(state: current, earned: 0, idempotent: true);
    }
    final earned = current.nextCheckInReward;
    final next = LocalRewardState(
      aipBalance: current.aipBalance + earned,
      checkInStreak: current.checkInStreak + 1,
      lastCheckInDate: dateKey,
    );
    final txn = LocalWalletTxn(
      txnId: _ids.next('txn_local'),
      title: '每日签到',
      amount: earned,
      occurredAt: now.toUtc(),
    );
    await _writeWorkspaceUnlocked(
      snapshot.copyWith(
        rewardState: next,
        walletTxns: [...snapshot.walletTxns, txn],
      ),
    );
    return LocalCheckInResult(state: next, earned: earned, idempotent: false);
  });

  /// AIP 流水，新到旧排序。
  Future<List<LocalWalletTxn>> loadWalletTxns() async {
    final snapshot = await loadWorkspace();
    final txns = [...snapshot.walletTxns]
      ..sort((a, b) => b.occurredAt.compareTo(a.occurredAt));
    return txns;
  }

  /// 游戏金币账本（按 playable_id 隔离）。
  Future<Map<String, int>> loadGameCoinLedgers() async {
    final snapshot = await loadWorkspace();
    return Map.unmodifiable(snapshot.gameCoinLedgers);
  }

  Future<LocalAiTwinState> loadAiTwinState() async {
    final snapshot = await loadWorkspace();
    return snapshot.aiTwinState;
  }

  /// 保存 AI 分身状态；[auditTitle] 非空时同步追加一条审计记录。
  Future<LocalAiTwinState> saveAiTwinState(
    LocalAiTwinState state, {
    String? auditTitle,
  }) => _serial(() async {
    final snapshot = await _readWorkspaceUnlocked();
    final now = _clock();
    final stamped = auditTitle == null
        ? state
        : state.copyWith(
            audit: [
              (
                title: auditTitle,
                time:
                    '${now.year}-${now.month.toString().padLeft(2, '0')}-'
                    '${now.day.toString().padLeft(2, '0')} '
                    '${now.hour.toString().padLeft(2, '0')}:'
                    '${now.minute.toString().padLeft(2, '0')}',
                status: '本地状态',
              ),
              ...state.audit,
            ],
          );
    await _writeWorkspaceUnlocked(snapshot.copyWith(aiTwinState: stamped));
    return stamped;
  });

  Future<LocalWalletBinding> loadWalletBinding() async {
    final snapshot = await loadWorkspace();
    return snapshot.walletBinding;
  }

  /// 保存钱包绑定意向（none → pending → verified，全部为本地演示状态）。
  Future<LocalWalletBinding> saveWalletBinding(LocalWalletBinding binding) =>
      _serial(() async {
        final snapshot = await _readWorkspaceUnlocked();
        await _writeWorkspaceUnlocked(
          snapshot.copyWith(walletBinding: binding),
        );
        return binding;
      });

  Future<LocalIdentityState> loadIdentityState() async {
    final snapshot = await loadWorkspace();
    return snapshot.identityState;
  }

  Future<LocalIdentityState> saveIdentityState(LocalIdentityState state) =>
      _serial(() async {
        final snapshot = await _readWorkspaceUnlocked();
        await _writeWorkspaceUnlocked(snapshot.copyWith(identityState: state));
        return state;
      });

  /// 一次有效完成的完整闭环记账（对齐旧版 Web 口径）：
  /// 游戏金币记入该作品独立账本；同一作品每个自然日首次有效完成发放 5 AIP
  /// 并写入钱包流水；点赞、启动、失败或刷金币均不发放。
  Future<({int coinBalance, int earnedAip, int aipBalance})>
  recordGameCompletion({
    required String playableId,
    required String title,
    required int coins,
  }) => _serial(() async {
    final snapshot = await _readWorkspaceUnlocked();
    final now = _clock();
    final dateKey =
        '${now.year.toString().padLeft(4, '0')}-'
        '${now.month.toString().padLeft(2, '0')}-'
        '${now.day.toString().padLeft(2, '0')}';
    final ledgers = Map<String, int>.from(snapshot.gameCoinLedgers);
    ledgers[playableId] = (ledgers[playableId] ?? 0) + (coins > 0 ? coins : 0);

    final alreadyRewarded =
        snapshot.lastGameRewardDates[playableId] == dateKey;
    const playReward = 5;
    var reward = snapshot.rewardState;
    var txns = snapshot.walletTxns;
    var rewardDates = snapshot.lastGameRewardDates;
    if (!alreadyRewarded) {
      reward = LocalRewardState(
        aipBalance: reward.aipBalance + playReward,
        checkInStreak: reward.checkInStreak,
        lastCheckInDate: reward.lastCheckInDate,
      );
      txns = [
        ...txns,
        LocalWalletTxn(
          txnId: _ids.next('txn_local'),
          title: '有效完成 · $title',
          amount: playReward,
          occurredAt: now.toUtc(),
        ),
      ];
      rewardDates = {...rewardDates, playableId: dateKey};
    }
    await _writeWorkspaceUnlocked(
      snapshot.copyWith(
        gameCoinLedgers: ledgers,
        rewardState: reward,
        walletTxns: txns,
        lastGameRewardDates: rewardDates,
      ),
    );
    return (
      coinBalance: ledgers[playableId] ?? 0,
      earnedAip: alreadyRewarded ? 0 : playReward,
      aipBalance: reward.aipBalance,
    );
  });
}

const _terminalGenerationStatuses = {
  LocalGenerationStatus.completed,
  LocalGenerationStatus.cancelled,
  LocalGenerationStatus.failed,
};

const _recoverableGenerationStatuses = {
  LocalGenerationStatus.queued,
  LocalGenerationStatus.running,
  LocalGenerationStatus.paused,
  LocalGenerationStatus.completed,
};

const _allowedGenerationTransitions = {
  LocalGenerationStatus.queued: {
    LocalGenerationStatus.queued,
    LocalGenerationStatus.running,
    LocalGenerationStatus.paused,
    LocalGenerationStatus.completed,
    LocalGenerationStatus.cancelled,
    LocalGenerationStatus.failed,
  },
  LocalGenerationStatus.running: {
    LocalGenerationStatus.running,
    LocalGenerationStatus.paused,
    LocalGenerationStatus.completed,
    LocalGenerationStatus.cancelled,
    LocalGenerationStatus.failed,
  },
  LocalGenerationStatus.paused: {
    LocalGenerationStatus.paused,
    LocalGenerationStatus.running,
    LocalGenerationStatus.cancelled,
    LocalGenerationStatus.failed,
  },
  LocalGenerationStatus.completed: {LocalGenerationStatus.completed},
  LocalGenerationStatus.cancelled: {LocalGenerationStatus.cancelled},
  LocalGenerationStatus.failed: {LocalGenerationStatus.failed},
};

const _localExperienceStatuses = {
  'started',
  'completed',
  'abandoned',
  'failed',
};

T? _firstWhereOrNull<T>(Iterable<T> values, bool Function(T) predicate) {
  for (final value in values) {
    if (predicate(value)) return value;
  }
  return null;
}
