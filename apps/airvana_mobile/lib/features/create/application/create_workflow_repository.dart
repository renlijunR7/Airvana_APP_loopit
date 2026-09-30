import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';

abstract interface class CreateWorkflowRepository {
  bool get serverPublishingEnabled;

  Future<LocalDraft?> loadDraft(String draftId);

  Future<LocalDraft> saveDraft({
    String? draftId,
    required String idea,
    required bool deepMode,
    required List<String> selectedPowerIds,
    required Map<String, dynamic> workflowState,
    String? sourcePlayableId,
  });

  Future<LocalGenerationTask?> loadGeneration(String taskId);

  Future<LocalGenerationTask> startOrResumeGeneration(
    String draftId, {
    String? taskId,
    bool forceNew = false,
  });

  Future<LocalGenerationTask> updateGeneration(
    String taskId,
    LocalGenerationStatus status,
  );

  Future<LocalGenerationTask> cancelGeneration(String taskId);

  Future<LocalGenerationTask> resumeGeneration(String taskId);

  Future<LocalRelease> publishLocalPlayable(LocalReleaseRequest request);

  Future<LocalRelease?> loadReleaseForTask(String taskId);

  Future<ServerPlayableRelease> publishServerPlayable({
    required String title,
    required String prompt,
    required bool deepMode,
    required String idempotencyKey,
    String? existingTaskId,
    void Function(ServerCreationProgress progress)? onProgress,
  });
}

class AirvanaCreateWorkflowRepository implements CreateWorkflowRepository {
  const AirvanaCreateWorkflowRepository(this.repository);

  final AirvanaRepository repository;

  @override
  bool get serverPublishingEnabled => !repository.environment.preferLocalData;

  @override
  Future<LocalDraft?> loadDraft(String draftId) =>
      repository.loadDraft(draftId);

  @override
  Future<LocalDraft> saveDraft({
    String? draftId,
    required String idea,
    required bool deepMode,
    required List<String> selectedPowerIds,
    required Map<String, dynamic> workflowState,
    String? sourcePlayableId,
  }) => repository.saveDraft(
    draftId: draftId,
    idea: idea,
    deepMode: deepMode,
    selectedPowerIds: selectedPowerIds,
    workflowState: workflowState,
    sourcePlayableId: sourcePlayableId,
  );

  @override
  Future<LocalGenerationTask?> loadGeneration(String taskId) =>
      repository.loadLocalGeneration(taskId);

  @override
  Future<LocalGenerationTask> startOrResumeGeneration(
    String draftId, {
    String? taskId,
    bool forceNew = false,
  }) => repository.startOrResumeGeneration(
    draftId,
    taskId: taskId,
    forceNew: forceNew,
  );

  @override
  Future<LocalGenerationTask> updateGeneration(
    String taskId,
    LocalGenerationStatus status,
  ) => repository.updateLocalGeneration(taskId, status);

  @override
  Future<LocalGenerationTask> cancelGeneration(String taskId) =>
      repository.cancelGeneration(taskId);

  @override
  Future<LocalGenerationTask> resumeGeneration(String taskId) =>
      repository.resumeGeneration(taskId);

  @override
  Future<LocalRelease> publishLocalPlayable(LocalReleaseRequest request) =>
      repository.publishLocalPlayable(request);

  @override
  Future<LocalRelease?> loadReleaseForTask(String taskId) async {
    final workspace = await repository.loadLocalWorkspace();
    for (final release in workspace.releases.reversed) {
      if (release.generationTaskId == taskId) return release;
    }
    return null;
  }

  @override
  Future<ServerPlayableRelease> publishServerPlayable({
    required String title,
    required String prompt,
    required bool deepMode,
    required String idempotencyKey,
    String? existingTaskId,
    void Function(ServerCreationProgress progress)? onProgress,
  }) => repository.publishServerPlayable(
    title: title,
    prompt: prompt,
    deepMode: deepMode,
    idempotencyKey: idempotencyKey,
    existingTaskId: existingTaskId,
    onProgress: onProgress,
  );
}
