import 'package:airvana_mobile/features/network/domain/growth_node_state.dart';
import 'dart:typed_data';
import 'package:airvana_mobile/features/account/domain/account_service_models.dart';
import 'package:airvana_mobile/features/account/domain/platform_service_models.dart';
import 'package:airvana_mobile/features/creator_center/domain/creator_center_snapshot.dart';

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

final creatorAssetsProvider = FutureProvider<List<CreatorAsset>>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadAssets();
});

final serverAiTwinProvider = FutureProvider<ServerAiTwin?>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadServerAiTwin();
});

final subscriptionPlansProvider = FutureProvider<List<SubscriptionPlan>>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadSubscriptionPlans();
});

final minorModePolicyProvider = FutureProvider<MinorModePolicy>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadMinorModePolicy();
});

/// 用户是否主动退出了服务端登录。本地演示内容不受影响，
/// 但所有需要服务端身份的能力都应显示「未登录」并给出去登录入口。
final signedOutProvider = FutureProvider<bool>((ref) {
  return ref.watch(airvanaRepositoryProvider).signedOut;
});

final accountDeletionProvider = FutureProvider<AccountDeletionRequest?>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadAccountDeletionRequest();
});

final supportTicketsProvider = FutureProvider<List<SupportTicket>>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadSupportTickets();
});

final accountSessionsProvider = FutureProvider<List<AccountSession>>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadAccountSessions();
});

final creatorCenterProvider = FutureProvider<CreatorCenterSnapshot>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadCreatorCenter();
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

final localMessageThreadsProvider = FutureProvider<List<LocalMessageThread>>((
  ref,
) {
  return ref.watch(airvanaRepositoryProvider).loadLocalMessageThreads();
});

final localGrowthNodeProvider = FutureProvider<LocalGrowthNodeState>((ref) {
  return ref.watch(airvanaRepositoryProvider).loadLocalGrowthNode();
});
