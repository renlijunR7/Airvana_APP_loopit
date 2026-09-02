import 'dart:typed_data';

import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/features/create/application/create_workflow_repository.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

final appEnvironmentProvider = Provider<AppEnvironment>(
  (ref) => AppEnvironment.fromDartDefines(),
);

final apiClientProvider = Provider<AirvanaApiClient>((ref) {
  final environment = ref.watch(appEnvironmentProvider);
  return AirvanaApiClient(
    baseUri: environment.apiBaseUri,
    sessionStore: SecureSessionStore(),
    requestTimeout: Duration(seconds: environment.localFallbackEnabled ? 3 : 8),
  );
});

final airvanaRepositoryProvider = Provider<AirvanaRepository>((ref) {
  return AirvanaRepository(
    api: ref.watch(apiClientProvider),
    environment: ref.watch(appEnvironmentProvider),
  );
});

final createWorkflowRepositoryProvider = Provider<CreateWorkflowRepository>((
  ref,
) {
  return AirvanaCreateWorkflowRepository(ref.watch(airvanaRepositoryProvider));
});

final homeProvider = FutureProvider<HomeSnapshot>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadHome();
});

final localPlayableByIdProvider = FutureProvider.family<LocalPlayable?, String>(
  (ref, playableId) {
    return ref.watch(airvanaRepositoryProvider).findPlayableById(playableId);
  },
);

final experienceHistoryProvider = FutureProvider<List<ExperienceRecord>>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadExperienceHistory();
});

final discoverProvider = FutureProvider<List<Playable>>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadDiscover();
});

final notificationsProvider = FutureProvider<NotificationSnapshot>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadNotifications();
});

final conversationsProvider = FutureProvider<List<DmConversation>>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadConversations();
});

final accountProvider = FutureProvider<AccountSnapshot>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadAccount();
});

final growthNodesProvider = FutureProvider<List<GrowthNode>>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadGrowthNodes();
});

final rewardStateProvider = FutureProvider<LocalRewardState>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadRewardState();
});

final walletTxnsProvider = FutureProvider<List<LocalWalletTxn>>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadWalletTxns();
});

final gameCoinLedgersProvider = FutureProvider<Map<String, int>>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadGameCoinLedgers();
});

final aiTwinStateProvider = FutureProvider<LocalAiTwinState>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadAiTwinState();
});

final walletBindingProvider = FutureProvider<LocalWalletBinding>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadWalletBinding();
});

final identityStateProvider = FutureProvider<LocalIdentityState>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadIdentityState();
});

final localProfileStateProvider = FutureProvider<LocalProfileState>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadLocalProfileState();
});

final profileFeatureStateProvider = FutureProvider<LocalProfileFeatureState>((
  ref,
) {
  return ref.watch(airvanaRepositoryProvider).loadLocalProfileFeatureState();
});

class ProfileAvatarSession extends Notifier<Uint8List?> {
  @override
  Uint8List? build() => null;

  void setBytes(Uint8List? bytes) => state = bytes;
}

/// 与旧 Web 基线一致：用户选择的头像只保留在当前应用会话中。
final profileAvatarSessionProvider =
    NotifierProvider<ProfileAvatarSession, Uint8List?>(
      ProfileAvatarSession.new,
    );

typedef ProfileAvatarPicker = Future<XFile?> Function();

final profileAvatarPickerProvider = Provider<ProfileAvatarPicker>((ref) {
  final picker = ImagePicker();
  return () => picker.pickImage(
    source: ImageSource.gallery,
    maxWidth: 1024,
    maxHeight: 1024,
    imageQuality: 88,
    requestFullMetadata: false,
  );
});

final localSocialStateProvider = FutureProvider<LocalSocialState>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadLocalSocialState();
});
