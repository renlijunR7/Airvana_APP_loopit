class CreateRouteState {
  const CreateRouteState({
    this.draftId,
    this.taskId,
    this.versionId,
    this.remixSourceId,
  });

  factory CreateRouteState.fromUri(Uri uri) => CreateRouteState(
    draftId: _nonEmpty(uri.queryParameters['draft_id']),
    taskId: _nonEmpty(uri.queryParameters['task_id']),
    versionId: _nonEmpty(uri.queryParameters['version_id']),
    remixSourceId: _nonEmpty(uri.queryParameters['remix']),
  );

  final String? draftId;
  final String? taskId;
  final String? versionId;
  final String? remixSourceId;

  Uri get uri {
    final queryParameters = <String, String>{
      if (draftId != null) 'draft_id': draftId!,
      if (taskId != null) 'task_id': taskId!,
      if (versionId != null) 'version_id': versionId!,
      if (remixSourceId != null) 'remix': remixSourceId!,
    };
    return Uri(
      path: '/create',
      queryParameters: queryParameters.isEmpty ? null : queryParameters,
    );
  }

  CreateRouteState copyWith({
    String? draftId,
    String? taskId,
    String? versionId,
    String? remixSourceId,
  }) => CreateRouteState(
    draftId: _nonEmpty(draftId) ?? this.draftId,
    taskId: _nonEmpty(taskId) ?? this.taskId,
    versionId: _nonEmpty(versionId) ?? this.versionId,
    remixSourceId: _nonEmpty(remixSourceId) ?? this.remixSourceId,
  );

  static String? _nonEmpty(String? value) {
    final normalized = value?.trim();
    return normalized == null || normalized.isEmpty ? null : normalized;
  }

  @override
  bool operator ==(Object other) =>
      other is CreateRouteState &&
      other.draftId == draftId &&
      other.taskId == taskId &&
      other.versionId == versionId &&
      other.remixSourceId == remixSourceId;

  @override
  int get hashCode => Object.hash(draftId, taskId, versionId, remixSourceId);
}
