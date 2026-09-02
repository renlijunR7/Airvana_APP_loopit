import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/design_system/legacy_web_assets.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:airvana_mobile/features/ai_twin/presentation/ai_twin_page_body.dart';
import 'package:airvana_mobile/features/creator_center/presentation/creator_center_page_body.dart';
import 'package:airvana_mobile/features/history/presentation/profile_settings_parity_pages.dart';
import 'package:airvana_mobile/features/wallet/presentation/wallet_page_body.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

final profileLocalWorkspaceProvider = FutureProvider<LocalWorkspaceSnapshot>((
  ref,
) {
  return ref.watch(airvanaRepositoryProvider).loadLocalWorkspace();
});

enum ProfileSecondaryDestination {
  checkIn,
  notifications,
  settings,
  editProfile,
  likes,
  followers,
  following,
  subscription,
  wallet,
  creatorCenter,
  aiTwin,
  identityVerification,
  brandPartnership,
  creatorBenefits,
  publishingGovernance,
  feedback,
  featureCenter,
  language,
  preferences,
  deleteAccount,
  legacyDraft;

  static ProfileSecondaryDestination? fromSlug(String slug) {
    for (final destination in values) {
      if (destination.name == slug) return destination;
    }
    return null;
  }
}

void _openProfileSecondary(
  BuildContext context,
  ProfileSecondaryDestination destination,
) {
  context.push('/profile/secondary/${destination.name}');
}

class ProfileSecondaryScreen extends ConsumerWidget {
  const ProfileSecondaryScreen({required this.destination, super.key});

  final ProfileSecondaryDestination destination;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final account = ref.watch(homeProvider).value?.account;
    final spec = _profileSecondarySpec(destination, account);
    final statsDestination = _isProfileStatsDestination(destination);
    return Scaffold(
      key: ValueKey('profile-secondary-${destination.name}'),
      backgroundColor: AirvanaColors.canvas,
      body: SafeArea(
        child: Column(
          children: [
            _ProfileSecondaryHeader(
              title: statsDestination ? '互动关系' : spec.title,
            ),
            Expanded(
              child: destination == ProfileSecondaryDestination.settings
                  ? _ProfileSettingsPage(account: account)
                  : destination == ProfileSecondaryDestination.checkIn
                  ? const SingleChildScrollView(
                      key: ValueKey('profile-secondary-scroll-checkIn'),
                      padding: EdgeInsets.fromLTRB(18, 18, 18, 32),
                      child: _EarnTasksPageBody(),
                    )
                  : destination == ProfileSecondaryDestination.wallet
                  ? const WalletPageBody()
                  : destination == ProfileSecondaryDestination.creatorCenter
                  ? const CreatorCenterPageBody()
                  : destination == ProfileSecondaryDestination.aiTwin
                  ? const AiTwinPageBody()
                  : _isSettingsParityDestination(destination)
                  ? ProfileSettingsParityBody(destination: destination.name)
                  : statsDestination
                  ? _ProfileStatsPage(initialDestination: destination)
                  : destination == ProfileSecondaryDestination.editProfile
                  ? const _ProfileEditPage()
                  : _ProfileSecondaryDetails(
                      destination: destination,
                      spec: spec,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

bool _isProfileStatsDestination(ProfileSecondaryDestination destination) =>
    destination == ProfileSecondaryDestination.likes ||
    destination == ProfileSecondaryDestination.followers ||
    destination == ProfileSecondaryDestination.following;

bool _isSettingsParityDestination(ProfileSecondaryDestination destination) =>
    destination == ProfileSecondaryDestination.subscription ||
    destination == ProfileSecondaryDestination.identityVerification ||
    destination == ProfileSecondaryDestination.brandPartnership ||
    destination == ProfileSecondaryDestination.creatorBenefits ||
    destination == ProfileSecondaryDestination.publishingGovernance ||
    destination == ProfileSecondaryDestination.feedback ||
    destination == ProfileSecondaryDestination.featureCenter ||
    destination == ProfileSecondaryDestination.language ||
    destination == ProfileSecondaryDestination.preferences ||
    destination == ProfileSecondaryDestination.deleteAccount;

class _ProfileSecondaryHeader extends StatelessWidget {
  const _ProfileSecondaryHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    height: 58,
    decoration: const BoxDecoration(
      color: AirvanaColors.canvas,
      border: Border(bottom: BorderSide(color: AirvanaColors.line)),
    ),
    child: Stack(
      alignment: Alignment.center,
      children: [
        Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
        ),
        Positioned(
          left: 8,
          top: 5,
          bottom: 5,
          child: SizedBox(
            key: const ValueKey('profile-secondary-back'),
            width: 48,
            child: IconButton(
              tooltip: '返回我的',
              color: const Color(0xFF1C1C1E),
              padding: EdgeInsets.zero,
              onPressed: () {
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go('/profile');
                }
              },
              icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 22),
            ),
          ),
        ),
      ],
    ),
  );
}

class _ProfileSecondaryDetails extends StatelessWidget {
  const _ProfileSecondaryDetails({
    required this.destination,
    required this.spec,
  });

  final ProfileSecondaryDestination destination;
  final _ProfileSecondarySpec spec;

  @override
  Widget build(BuildContext context) => ListView(
    key: ValueKey('profile-secondary-scroll-${destination.name}'),
    padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
    children: [
      if (destination == ProfileSecondaryDestination.subscription)
        _SubscriptionOverview(spec: spec)
      else
        _ProfileSecondaryCard(spec: spec),
    ],
  );
}

enum _ProfileStatsTab { likes, followers, following }

class _ProfileStatsPage extends ConsumerStatefulWidget {
  const _ProfileStatsPage({required this.initialDestination});

  final ProfileSecondaryDestination initialDestination;

  @override
  ConsumerState<_ProfileStatsPage> createState() => _ProfileStatsPageState();
}

class _ProfileStatsPageState extends ConsumerState<_ProfileStatsPage> {
  late _ProfileStatsTab _tab;

  @override
  void initState() {
    super.initState();
    _tab = switch (widget.initialDestination) {
      ProfileSecondaryDestination.followers => _ProfileStatsTab.followers,
      ProfileSecondaryDestination.following => _ProfileStatsTab.following,
      _ => _ProfileStatsTab.likes,
    };
  }

  @override
  Widget build(BuildContext context) {
    final home = ref.watch(homeProvider);
    final social = ref.watch(localSocialStateProvider);
    return ColoredBox(
      key: const ValueKey('profile-stats-background'),
      color: Colors.white,
      child: ListView(
        key: const ValueKey('profile-stats-scroll'),
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
        children: [
          Container(
            key: const ValueKey('profile-stats-surface'),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                _ProfileStatsTabs(
                  selected: _tab,
                  onChanged: (tab) => setState(() => _tab = tab),
                ),
                const Divider(height: 1, color: Color(0xFFF1F1F6)),
                Padding(
                  padding: const EdgeInsets.all(14),
                  child: switch (_tab) {
                    _ProfileStatsTab.likes => _ProfileLikesGrid(home: home),
                    _ProfileStatsTab.followers => _ProfileRelationsList(
                      owners: social.value?.followerOwners ?? const [],
                      social: social.value ?? const LocalSocialState(),
                      home: home.value,
                      onManage: _setFollowing,
                      onOpen: _openOwner,
                    ),
                    _ProfileStatsTab.following => _ProfileRelationsList(
                      owners: social.value?.followingOwners ?? const [],
                      social: social.value ?? const LocalSocialState(),
                      home: home.value,
                      onManage: _setFollowing,
                      onOpen: _openOwner,
                    ),
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _setFollowing(String owner) async {
    final current = ref.read(localSocialStateProvider).value;
    final active = !(current?.follows(owner) ?? false);
    await ref
        .read(airvanaRepositoryProvider)
        .setLocalFollowing(owner: owner, active: active);
    ref.invalidate(localSocialStateProvider);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(active ? '已关注 $owner' : '已取消关注 $owner')),
    );
  }

  void _openOwner(String owner) {
    final playables =
        ref.read(homeProvider).value?.playables ?? const <Playable>[];
    Playable? match;
    for (final playable in playables) {
      if (playable.ownerHandle == owner) {
        match = playable;
        break;
      }
    }
    if (match == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('该账号暂无公开内容')));
      return;
    }
    context.push('/runtime/${match.id}');
  }
}

class _ProfileStatsTabs extends StatelessWidget {
  const _ProfileStatsTabs({required this.selected, required this.onChanged});

  final _ProfileStatsTab selected;
  final ValueChanged<_ProfileStatsTab> onChanged;

  @override
  Widget build(BuildContext context) => Row(
    children: _ProfileStatsTab.values
        .map((tab) {
          final active = selected == tab;
          final (label, icon) = switch (tab) {
            _ProfileStatsTab.likes => ('获赞', Icons.favorite_outline_rounded),
            _ProfileStatsTab.followers => ('粉丝', Icons.people_outline_rounded),
            _ProfileStatsTab.following => ('关注', Icons.person_add_alt_rounded),
          };
          return Expanded(
            child: Semantics(
              selected: active,
              button: true,
              label: '$label分类',
              child: InkWell(
                key: ValueKey('profile-stats-tab-${tab.name}'),
                onTap: () => onChanged(tab),
                child: SizedBox(
                  height: 58,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            icon,
                            size: 18,
                            color: active
                                ? AirvanaColors.accent
                                : AirvanaColors.muted,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            label,
                            style: TextStyle(
                              color: active
                                  ? AirvanaColors.accent
                                  : AirvanaColors.muted,
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                      Positioned(
                        left: 22,
                        right: 22,
                        bottom: 0,
                        child: Container(
                          height: 2,
                          color: active
                              ? AirvanaColors.accent
                              : Colors.transparent,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        })
        .toList(growable: false),
  );
}

class _ProfileLikesGrid extends StatelessWidget {
  const _ProfileLikesGrid({required this.home});

  final AsyncValue<HomeSnapshot> home;

  @override
  Widget build(BuildContext context) => home.when(
    loading: () => const SizedBox(
      height: 220,
      child: Center(child: CircularProgressIndicator()),
    ),
    error: (error, _) =>
        _ProfileStatsEmpty(title: '获赞作品加载失败', description: '$error'),
    data: (snapshot) {
      final items =
          snapshot.playables
              .where(
                (item) =>
                    item.likes > 0 &&
                    (item.ownerHandle == '@kai.builds' ||
                        item.authorName == snapshot.user.displayName),
              )
              .toList(growable: false)
            ..sort((a, b) => b.likes.compareTo(a.likes));
      if (items.isEmpty) {
        return const _ProfileStatsEmpty(
          title: '还没有作品获赞',
          description: '发布作品并获得互动后，会在这里汇总展示。',
        );
      }
      return GridView.builder(
        key: const ValueKey('profile-liked-playables'),
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: .78,
        ),
        itemCount: items.length,
        itemBuilder: (context, index) => _ProfileLikeCard(item: items[index]),
      );
    },
  );
}

class _ProfileLikeCard extends StatelessWidget {
  const _ProfileLikeCard({required this.item});

  final Playable item;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: '查看 ${item.title}，${item.likes} 次获赞',
    child: Material(
      color: const Color(0xFF111113),
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('profile-like-${item.id}'),
        onTap: () => context.push('/runtime/${item.id}'),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (item.coverAsset.isNotEmpty)
              Image.asset(item.coverAsset, fit: BoxFit.cover)
            else
              const Center(
                child: Icon(Icons.sports_esports, color: Colors.white54),
              ),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Color(0xE6000000)],
                ),
              ),
            ),
            Positioned(
              left: 10,
              top: 10,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xB0000000),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.favorite, size: 12, color: Colors.white),
                    const SizedBox(width: 4),
                    Text(
                      '${item.likes}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              left: 11,
              right: 11,
              bottom: 12,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'v${item.version} · ${item.stage}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white70, fontSize: 9),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _ProfileRelationsList extends StatelessWidget {
  const _ProfileRelationsList({
    required this.owners,
    required this.social,
    required this.home,
    required this.onManage,
    required this.onOpen,
  });

  final List<String> owners;
  final LocalSocialState social;
  final HomeSnapshot? home;
  final ValueChanged<String> onManage;
  final ValueChanged<String> onOpen;

  @override
  Widget build(BuildContext context) {
    if (owners.isEmpty) {
      return const _ProfileStatsEmpty(
        title: '还没有关注账号',
        description: '关注列表由当前设备保存；接入账号服务后跨设备同步。',
      );
    }
    return Column(
      key: const ValueKey('profile-relations-list'),
      children: [
        for (var index = 0; index < owners.length; index++) ...[
          _ProfileRelationCell(
            owner: owners[index],
            name: _profileOwnerName(owners[index], home),
            followsYou: social.followerOwners.contains(owners[index]),
            youFollow: social.followingOwners.contains(owners[index]),
            onOpen: () => onOpen(owners[index]),
            onManage: () => onManage(owners[index]),
          ),
          if (index != owners.length - 1)
            const Divider(height: 1, color: Color(0xFFF1F1F6)),
        ],
      ],
    );
  }
}

String _profileOwnerName(String owner, HomeSnapshot? home) {
  for (final playable in home?.playables ?? const <Playable>[]) {
    if (playable.ownerHandle == owner) return playable.authorName;
  }
  return switch (owner) {
    '@nina' => 'Nina',
    '@leo.art' => 'Leo',
    _ => owner,
  };
}

class _ProfileRelationCell extends StatelessWidget {
  const _ProfileRelationCell({
    required this.owner,
    required this.name,
    required this.followsYou,
    required this.youFollow,
    required this.onOpen,
    required this.onManage,
  });

  final String owner;
  final String name;
  final bool followsYou;
  final bool youFollow;
  final VoidCallback onOpen;
  final VoidCallback onManage;

  @override
  Widget build(BuildContext context) {
    final label = followsYou && youFollow
        ? '相互关注'
        : followsYou
        ? '回关'
        : '关注';
    final highlighted = label == '回关';
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 72),
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              onTap: onOpen,
              borderRadius: BorderRadius.circular(12),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 11),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: const Color(0xFFF1F1F6),
                      backgroundImage: AssetImage(legacyWebAvatarAsset(owner)),
                    ),
                    const SizedBox(width: 11),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 5),
                          Text(
                            '$owner · 演示关系',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AirvanaColors.muted,
                              fontSize: 9,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Container(
            constraints: const BoxConstraints(minWidth: 68),
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 9),
            decoration: BoxDecoration(
              color: highlighted
                  ? const Color(0xFFFF3154)
                  : const Color(0xFFF2F2F3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: highlighted ? Colors.white : AirvanaColors.ink,
                fontSize: 10,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          SizedBox(
            width: 44,
            height: 44,
            child: IconButton(
              tooltip: '编辑与 $name 的关系',
              onPressed: onManage,
              icon: const Icon(Icons.edit_outlined, size: 18),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileStatsEmpty extends StatelessWidget {
  const _ProfileStatsEmpty({required this.title, required this.description});

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 220,
    child: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.view_list_outlined, color: AirvanaColors.muted),
          const SizedBox(height: 10),
          Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 5),
          Text(
            description,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AirvanaColors.muted, fontSize: 10),
          ),
        ],
      ),
    ),
  );
}

class _ProfileEditPage extends ConsumerStatefulWidget {
  const _ProfileEditPage();

  @override
  ConsumerState<_ProfileEditPage> createState() => _ProfileEditPageState();
}

class _ProfileEditPageState extends ConsumerState<_ProfileEditPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _bioController = TextEditingController();
  bool _seeded = false;
  bool _saving = false;
  bool _pickingAvatar = false;
  String? _avatarError;

  @override
  void dispose() {
    _nameController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(localProfileStateProvider);
    final avatarBytes = ref.watch(profileAvatarSessionProvider);
    return profile.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('个人资料加载失败：$error')),
      data: (state) {
        if (!_seeded) {
          _nameController.text = state.displayName;
          _bioController.text = state.bio;
          _seeded = true;
        }
        return ListView(
          key: const ValueKey('profile-edit-scroll'),
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
          children: [
            Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _ProfileAvatarEditor(
                    avatarBytes: avatarBytes,
                    picking: _pickingAvatar,
                    onPick: _pickAvatar,
                  ),
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 13,
                      vertical: 11,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF8F8),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFFFD6DA)),
                    ),
                    child: const Text(
                      '支持 JPG、PNG、WebP，最大 5MB。头像只保留在当前应用会话中，不上传云端。',
                      style: TextStyle(
                        color: Color(0xFF7C5054),
                        fontSize: 9,
                        height: 1.55,
                      ),
                    ),
                  ),
                  if (_avatarError != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      key: const ValueKey('profile-avatar-error'),
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF1F2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        _avatarError!,
                        style: const TextStyle(
                          color: Color(0xFFC62836),
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                  if (avatarBytes != null) ...[
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        key: const ValueKey('profile-avatar-clear'),
                        onPressed: _clearAvatar,
                        icon: const Icon(
                          Icons.delete_outline_rounded,
                          size: 17,
                        ),
                        label: const Text('移除会话头像'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFC62836),
                          side: const BorderSide(color: Color(0xFFFF9DA6)),
                          minimumSize: const Size.fromHeight(44),
                          shape: const StadiumBorder(),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 18),
                  const Text(
                    '显示名称',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    key: const ValueKey('profile-name-field'),
                    controller: _nameController,
                    maxLength: 60,
                    textInputAction: TextInputAction.next,
                    decoration: _profileFieldDecoration(
                      hintText: '请输入显示名称',
                      hideCounter: true,
                    ),
                    validator: (value) =>
                        (value ?? '').trim().length < 2 ? '名称至少需要 2 个字符' : null,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    '个人简介',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    key: const ValueKey('profile-bio-field'),
                    controller: _bioController,
                    minLines: 4,
                    maxLines: 6,
                    maxLength: 180,
                    textInputAction: TextInputAction.done,
                    decoration: _profileFieldDecoration(hintText: '介绍你的创作方向'),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      key: const ValueKey('profile-save'),
                      onPressed: _saving ? null : _save,
                      style: FilledButton.styleFrom(
                        backgroundColor: AirvanaColors.accent,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: const Color(0xFFFFA8B0),
                        minimumSize: const Size.fromHeight(48),
                        shape: const StadiumBorder(),
                        textStyle: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      child: Text(_saving ? '保存中…' : '保存资料'),
                    ),
                  ),
                  const SizedBox(height: 9),
                  const Text(
                    '名称与简介保存在当前设备；头像仅保留在当前应用会话。',
                    style: TextStyle(
                      color: AirvanaColors.muted,
                      fontSize: 9,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Future<void> _pickAvatar() async {
    if (_pickingAvatar) return;
    setState(() {
      _pickingAvatar = true;
      _avatarError = null;
    });
    try {
      final file = await ref.read(profileAvatarPickerProvider)();
      if (file == null) return;
      final name = file.name.toLowerCase();
      final mime = (file.mimeType ?? '').toLowerCase();
      final supported =
          mime == 'image/jpeg' ||
          mime == 'image/png' ||
          mime == 'image/webp' ||
          name.endsWith('.jpg') ||
          name.endsWith('.jpeg') ||
          name.endsWith('.png') ||
          name.endsWith('.webp');
      if (!supported) {
        throw const FormatException('仅支持 JPG、PNG 或 WebP 图片。');
      }
      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) {
        throw const FormatException('图片内容为空，请重新选择。');
      }
      if (bytes.lengthInBytes > 5 * 1024 * 1024) {
        throw const FormatException('图片不能超过 5MB。');
      }
      ref.read(profileAvatarSessionProvider.notifier).setBytes(bytes);
    } on FormatException catch (error) {
      if (mounted) setState(() => _avatarError = error.message);
    } on Object {
      if (mounted) setState(() => _avatarError = '图片读取失败，请重新选择。');
    } finally {
      if (mounted) setState(() => _pickingAvatar = false);
    }
  }

  void _clearAvatar() {
    ref.read(profileAvatarSessionProvider.notifier).setBytes(null);
    setState(() => _avatarError = null);
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(airvanaRepositoryProvider)
          .saveLocalProfile(
            displayName: _nameController.text,
            bio: _bioController.text,
          );
      ref.invalidate(localProfileStateProvider);
      ref.invalidate(profileLocalWorkspaceProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('个人资料已保存')));
      if (context.canPop()) context.pop();
    } on Object catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

InputDecoration _profileFieldDecoration({
  required String hintText,
  bool hideCounter = false,
}) {
  const line = BorderSide(color: AirvanaColors.line);
  const focused = BorderSide(color: AirvanaColors.accent, width: 1.2);
  return InputDecoration(
    hintText: hintText,
    counterText: hideCounter ? '' : null,
    filled: true,
    fillColor: Colors.white,
    contentPadding: const EdgeInsets.symmetric(horizontal: 13, vertical: 12),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: line,
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: line,
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: focused,
    ),
  );
}

class _ProfileAvatarEditor extends StatelessWidget {
  const _ProfileAvatarEditor({
    required this.avatarBytes,
    required this.picking,
    required this.onPick,
  });

  final Uint8List? avatarBytes;
  final bool picking;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const ValueKey('profile-avatar-editor'),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFFF7F8), Colors.white],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFFFD6DA)),
      ),
      child: Row(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(22),
                child: SizedBox(
                  width: 68,
                  height: 68,
                  child: avatarBytes == null
                      ? Image.asset(
                          'assets/legacy/avatars/kai.png',
                          fit: BoxFit.cover,
                        )
                      : Image.memory(
                          avatarBytes!,
                          key: const ValueKey('profile-avatar-preview-memory'),
                          fit: BoxFit.cover,
                          gaplessPlayback: true,
                        ),
                ),
              ),
              Positioned.fill(
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(
                        color: const Color(0xFFFFD6DA),
                        width: 3,
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                right: -4,
                bottom: -4,
                child: Container(
                  width: 26,
                  height: 26,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AirvanaColors.accent,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                  ),
                  child: const Text(
                    'AI',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 7,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '头像与 KOL 分身',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 4),
                const Text(
                  '上传本人有权使用的头像，保持个人资料与 KOL 分身风格统一。',
                  style: TextStyle(
                    color: AirvanaColors.muted,
                    fontSize: 9,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  avatarBytes == null ? '尚未选择新头像' : '已选择 · 当前会话',
                  style: const TextStyle(
                    color: AirvanaColors.success,
                    fontSize: 8,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          TextButton(
            key: const ValueKey('profile-avatar-upload'),
            onPressed: picking ? null : onPick,
            style: TextButton.styleFrom(
              backgroundColor: AirvanaColors.ink,
              foregroundColor: Colors.white,
              disabledBackgroundColor: const Color(0xFF636366),
              minimumSize: const Size(70, 44),
              padding: const EdgeInsets.symmetric(horizontal: 10),
              shape: const StadiumBorder(),
            ),
            child: Text(
              picking
                  ? '读取中…'
                  : avatarBytes == null
                  ? '上传头像'
                  : '更换头像',
              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileSecondaryCard extends StatelessWidget {
  const _ProfileSecondaryCard({required this.spec});

  final _ProfileSecondarySpec spec;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _ShortcutIcon(icon: spec.icon),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                spec.title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        Text(
          spec.description,
          style: const TextStyle(
            color: AirvanaColors.muted,
            fontSize: 12,
            height: 1.6,
          ),
        ),
        if (spec.details.isNotEmpty) ...[
          const SizedBox(height: 18),
          ...spec.details.map((detail) => _ProfileDetailRow(text: detail)),
        ],
      ],
    ),
  );
}

class _ProfileDetailRow extends StatelessWidget {
  const _ProfileDetailRow({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(top: 6),
          child: CircleAvatar(radius: 3, backgroundColor: AirvanaColors.accent),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(text, style: const TextStyle(fontSize: 12, height: 1.45)),
        ),
      ],
    ),
  );
}

class _SubscriptionOverview extends StatelessWidget {
  const _SubscriptionOverview({required this.spec});

  final _ProfileSecondarySpec spec;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AirvanaColors.line),
        ),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'CURRENT PLAN · 本机演示',
              style: TextStyle(
                color: AirvanaColors.muted,
                fontSize: 9,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.4,
              ),
            ),
            SizedBox(height: 14),
            Row(
              children: [
                Text(
                  'Free',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
                ),
                SizedBox(width: 8),
                _SmallStatus(label: '有效'),
                Spacer(),
                Text('0 / 3', style: TextStyle(fontWeight: FontWeight.w800)),
              ],
            ),
            SizedBox(height: 7),
            Text(
              '本周期有效至 2026/09/17',
              style: TextStyle(color: AirvanaColors.muted, fontSize: 10),
            ),
          ],
        ),
      ),
      const SizedBox(height: 14),
      _ProfileSecondaryCard(spec: spec),
    ],
  );
}

class _ProfileSecondarySpec {
  const _ProfileSecondarySpec({
    required this.icon,
    required this.title,
    required this.description,
    this.details = const [],
  });

  final IconData icon;
  final String title;
  final String description;
  final List<String> details;
}

_ProfileSecondarySpec _profileSecondarySpec(
  ProfileSecondaryDestination destination,
  AccountSnapshot? account,
) => switch (destination) {
  ProfileSecondaryDestination.checkIn => const _ProfileSecondarySpec(
    icon: Icons.event_available_outlined,
    title: '获取积分',
    description: '完成站内任务，持续获得 AIP。',
  ),
  ProfileSecondaryDestination.notifications => const _ProfileSecondarySpec(
    icon: Icons.notifications_none_rounded,
    title: '通知',
    description: '你有 2 条未读消息。完整消息列表可从底部“消息”模块查看。',
    details: ['运营通知与互动状态仅在本机演示中记录', '不会自动对外发布或回复'],
  ),
  ProfileSecondaryDestination.settings => const _ProfileSecondarySpec(
    icon: Icons.menu_rounded,
    title: '设置与更多',
    description: '个人功能入口',
  ),
  ProfileSecondaryDestination.editProfile => const _ProfileSecondarySpec(
    icon: Icons.edit_outlined,
    title: '编辑个人信息',
    description: '名称与简介将保存在当前设备。服务端接入前不会同步到其他设备。',
    details: ['Kai Chen', '运营可持续创作、互动、归因与转化的 Agentic Playable。'],
  ),
  ProfileSecondaryDestination.likes => _ProfileSecondarySpec(
    icon: Icons.favorite_outline_rounded,
    title: '获赞',
    description: account == null || account.localDemo
        ? '「Crypto City 安全挑战」共获得 892 次点赞。当前展示本机演示统计。'
        : '服务端记录作品共获得 ${account.likesReceived} 次点赞。',
  ),
  ProfileSecondaryDestination.followers => _ProfileSecondarySpec(
    icon: Icons.people_outline_rounded,
    title: '粉丝',
    description: account == null || account.localDemo
        ? 'Nina 和 Leo 已关注你。当前展示本机演示关系。'
        : '服务端记录 ${account.followerCount} 个粉丝。',
  ),
  ProfileSecondaryDestination.following => _ProfileSecondarySpec(
    icon: Icons.person_add_alt_rounded,
    title: '关注',
    description: account == null || account.localDemo
        ? '你已关注 Leo。接入账号服务后再跨设备同步。'
        : '服务端记录已关注 ${account.followingCount} 个账号。',
  ),
  ProfileSecondaryDestination.subscription => _ProfileSecondarySpec(
    icon: Icons.credit_card_rounded,
    title: '订阅与额度',
    description: account == null
        ? 'Free 方案当前有效。以下数据与旧版 Web 本机演示基线一致。'
        : '${account.planName} 订阅和创作额度来自服务端。订阅只提供功能与周期额度，不直接发放 AIP 或 AIT。',
    details: account == null
        ? const [
            '轻度创作：剩余 3 / 3',
            '深度创作：剩余 1 / 1',
            'Remix：剩余 2 / 2',
            '额度不足后才使用 AIP',
          ]
        : account.allowances.entries
              .map(
                (entry) =>
                    '${_allowanceName(entry.key)}：剩余 ${entry.value.remaining} / ${entry.value.granted}',
              )
              .toList(growable: false),
  ),
  ProfileSecondaryDestination.wallet => _ProfileSecondarySpec(
    icon: Icons.account_balance_wallet_outlined,
    title: '钱包',
    description: account == null
        ? 'AIP 2,480 · AIT 0。当前仅本机演示，没有结算或提现能力。'
        : 'AIP ${account.aip} · 当前可用 AIT ${account.ait}。AIT 只是 Campaign 权益与收益凭证，不支持通用提现、转账或固定汇率兑换。',
    details: const ['AIP 用于站内互动与创作消耗', 'AIT 以 Campaign 规则与服务端结算凭证为准'],
  ),
  ProfileSecondaryDestination.creatorCenter => const _ProfileSecondarySpec(
    icon: Icons.auto_awesome_rounded,
    title: '创作者中心',
    description: '管理作品、Campaign、任务和版本。未迁移的深度模块保持明确的本地演示边界。',
    details: ['快速创作与草稿管理', '版本、发布与人工审核状态', 'Campaign 必须具备已批准 Contract'],
  ),
  ProfileSecondaryDestination.aiTwin => const _ProfileSecondarySpec(
    icon: Icons.smart_toy_outlined,
    title: 'KOL AI 分身',
    description: '管理公开人格、作品知识、渠道权限与人工接管。当前是本机演示，不会代表本人自动发布或回复。',
  ),
  ProfileSecondaryDestination.identityVerification =>
    const _ProfileSecondarySpec(
      icon: Icons.verified_user_outlined,
      title: '身份与角色',
      description: '当前只展示本机认证状态，不代表已完成真实身份或商业资质审核。',
    ),
  ProfileSecondaryDestination.brandPartnership => const _ProfileSecondarySpec(
    icon: Icons.fact_check_outlined,
    title: 'Campaign 工作台',
    description: '查看待审核 Campaign、合作范围与交付状态。商业权限以已批准 Campaign Contract 为准。',
  ),
  ProfileSecondaryDestination.creatorBenefits => const _ProfileSecondarySpec(
    icon: Icons.workspace_premium_outlined,
    title: '站内权益中心',
    description: '查看创作工具、运营支持与可用权益。当前页面不代表已获得现金或链上资产。',
  ),
  ProfileSecondaryDestination.publishingGovernance =>
    const _ProfileSecondarySpec(
      icon: Icons.shield_outlined,
      title: '发布与治理',
      description: '发布、下架与高风险操作都需要明确的人工确认和服务端权限。',
    ),
  ProfileSecondaryDestination.feedback => const _ProfileSecondarySpec(
    icon: Icons.chat_bubble_outline_rounded,
    title: '意见反馈',
    description: '记录本机产品反馈。当前演示不会自动发送到外部服务。',
  ),
  ProfileSecondaryDestination.featureCenter => const _ProfileSecondarySpec(
    icon: Icons.grid_view_rounded,
    title: '全项目功能中心',
    description: '集中查看已迁移、演示中与待接入的功能入口。',
    details: ['UI 与交互演示', '本机闭环能力', '服务端或外部依赖能力'],
  ),
  ProfileSecondaryDestination.language => const _ProfileSecondarySpec(
    icon: Icons.language_rounded,
    title: '切换语言',
    description: '当前界面语言为简体中文。语言切换仅作为本地演示入口。',
  ),
  ProfileSecondaryDestination.preferences => const _ProfileSecondarySpec(
    icon: Icons.tune_rounded,
    title: '设置',
    description: '管理当前设备的展示、通知与隐私偏好。账号数据导出与注销需在 Web 账号中心完成。',
  ),
  ProfileSecondaryDestination.deleteAccount => const _ProfileSecondarySpec(
    icon: Icons.delete_outline_rounded,
    title: '删除账号',
    description: '提交申请后进入 30 天冷静期，可随时取消。',
  ),
  ProfileSecondaryDestination.legacyDraft => const _ProfileSecondarySpec(
    icon: Icons.description_outlined,
    title: 'KOL 品牌互动挑战',
    description:
        'LOCAL DEMO：这是旧版 Web 个人页的演示草稿卡，未绑定 draft_id，也未写入本机草稿箱；当前不会伪装为已保存。',
    details: ['请到“草稿箱”打开真实草稿', '也可以从创作入口新建本机草稿'],
  ),
};

String _allowanceName(String key) => switch (key) {
  'light_creation' => '轻度创作',
  'deep_creation' => '深度创作',
  'remix' => 'Remix',
  _ => key,
};

class _EarnTasksPageBody extends ConsumerWidget {
  const _EarnTasksPageBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reward = ref.watch(rewardStateProvider);
    final checkInMeta = reward.when(
      loading: () => '正在读取签到状态…',
      error: (_, _) => '签到状态暂不可用',
      data: (state) {
        final now = DateTime.now();
        final dateKey =
            '${now.year.toString().padLeft(4, '0')}-'
            '${now.month.toString().padLeft(2, '0')}-'
            '${now.day.toString().padLeft(2, '0')}';
        return state.isCheckedInOn(dateKey)
            ? '今日已签到 ✓'
            : '签到领 ${state.nextCheckInReward} AIP';
      },
    );

    return Column(
      key: const ValueKey('earn-tasks-list'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFFFEFF1), Colors.white],
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFFFD6DA)),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '完成任务，持续获得 AIP',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
              ),
              SizedBox(height: 6),
              Text(
                'AIP 仅记录本地站内互动贡献，不代表现金、收入或已验证商业转化。',
                style: TextStyle(
                  color: AirvanaColors.muted,
                  fontSize: 11,
                  height: 1.6,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AirvanaColors.line),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              _EarnTaskRow(
                key: const ValueKey('earn-task-check-in'),
                icon: Icons.event_available_outlined,
                label: '每日签到',
                meta: checkInMeta,
                onTap: () => _showCheckInSheet(context),
              ),
              _EarnTaskRow(
                key: const ValueKey('earn-task-create'),
                icon: Icons.add_rounded,
                label: '创作 Agentic Playable',
                meta: '发布游戏即可获得 AIP',
                onTap: () => context.push('/create'),
              ),
              _EarnTaskRow(
                key: const ValueKey('earn-task-invite'),
                icon: Icons.person_add_alt_1_outlined,
                label: '邀请好友',
                meta: '好友完成注册并配置 Agent 后领取奖励',
                showDivider: false,
                onTap: () => _showInviteTaskSheet(context),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _EarnTaskRow extends StatelessWidget {
  const _EarnTaskRow({
    required this.icon,
    required this.label,
    required this.meta,
    required this.onTap,
    this.showDivider = true,
    super.key,
  });

  final IconData icon;
  final String label;
  final String meta;
  final VoidCallback onTap;
  final bool showDivider;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: '$label，$meta',
    child: InkWell(
      onTap: onTap,
      child: Container(
        height: 66,
        padding: const EdgeInsets.symmetric(horizontal: 15),
        decoration: BoxDecoration(
          border: showDivider
              ? const Border(
                  bottom: BorderSide(color: Color(0xFFF1F1F6), width: 1),
                )
              : null,
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: const Color(0xFFFFF0F1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: AirvanaColors.accent, size: 19),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    meta,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AirvanaColors.muted,
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(
              Icons.chevron_right_rounded,
              color: Color(0xFFC7C7CC),
              size: 24,
            ),
          ],
        ),
      ),
    ),
  );
}

Future<void> _showCheckInSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: AirvanaColors.canvas,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    ),
    builder: (context) => DraggableScrollableSheet(
      key: const ValueKey('earn-task-check-in-sheet'),
      expand: false,
      initialChildSize: .74,
      minChildSize: .58,
      maxChildSize: .92,
      builder: (context, scrollController) {
        final safeBottom = MediaQuery.viewPaddingOf(context).bottom;
        return Column(
          children: [
            const SizedBox(height: 10),
            Container(
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFF4A4447),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                key: const ValueKey('earn-task-check-in-scroll'),
                controller: scrollController,
                padding: EdgeInsets.fromLTRB(18, 14, 18, 24 + safeBottom),
                child: const _CheckInPageBody(),
              ),
            ),
          ],
        );
      },
    ),
  );
}

Future<void> _showInviteTaskSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (context) => DraggableScrollableSheet(
      key: const ValueKey('earn-task-invite-bottom-sheet'),
      expand: false,
      initialChildSize: .9,
      minChildSize: .72,
      maxChildSize: .95,
      builder: (context, scrollController) =>
          _InviteTaskSheet(scrollController: scrollController),
    ),
  );
}

class _InviteTaskSheet extends StatefulWidget {
  const _InviteTaskSheet({required this.scrollController});

  final ScrollController scrollController;

  @override
  State<_InviteTaskSheet> createState() => _InviteTaskSheetState();
}

class _InviteTaskSheetState extends State<_InviteTaskSheet> {
  bool _completed = false;

  @override
  Widget build(BuildContext context) {
    final safeBottom = MediaQuery.viewPaddingOf(context).bottom;
    return Material(
      key: const ValueKey('earn-task-invite-sheet'),
      color: Colors.white,
      clipBehavior: Clip.antiAlias,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      child: CustomScrollView(
        controller: widget.scrollController,
        slivers: [
          SliverToBoxAdapter(
            child: _InviteHero(onClose: () => Navigator.of(context).pop()),
          ),
          SliverPadding(
            key: const ValueKey('earn-task-invite-content'),
            padding: EdgeInsets.fromLTRB(18, 18, 18, 24 + safeBottom),
            sliver: SliverList.list(
              children: [
                const _InviteCodeCard(),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: FilledButton.icon(
                    key: const ValueKey('copy-invite-link'),
                    style: _earnPrimaryActionStyle(),
                    onPressed: () => _copyInvite(
                      context,
                      'https://airvana.ai/?invite=AIR-KAI-4821',
                      '邀请链接已复制',
                    ),
                    icon: const Icon(Icons.link_rounded, size: 18),
                    label: const Text('复制邀请链接'),
                  ),
                ),
                const SizedBox(height: 12),
                _InviteStats(completed: _completed),
                const SizedBox(height: 18),
                const _InviteSteps(),
                const SizedBox(height: 16),
                const _InviteBoundaryNote(),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton(
                    key: const ValueKey('simulate-invite-complete'),
                    style: _earnSecondaryActionStyle(),
                    onPressed: _completed
                        ? null
                        : () {
                            setState(() => _completed = true);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('已记录本机邀请任务演示')),
                            );
                          },
                    child: Text(_completed ? '邀请任务已完成' : '模拟完成（本机）'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _copyInvite(
    BuildContext context,
    String value,
    String notice,
  ) async {
    await Clipboard.setData(ClipboardData(text: value));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(notice)));
  }
}

class _InviteHero extends StatelessWidget {
  const _InviteHero({required this.onClose});

  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) => Container(
    key: const ValueKey('invite-hero'),
    height: 238,
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFFF3B4A), Color(0xFFFF7180)],
      ),
    ),
    child: Stack(
      children: [
        const Positioned(
          top: -68,
          right: -34,
          child: _InviteGlow(size: 174, opacity: .12),
        ),
        const Positioned(
          bottom: -82,
          left: -52,
          child: _InviteGlow(size: 190, opacity: .08),
        ),
        Positioned(
          top: 12,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: .76),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
        ),
        Positioned(
          top: 18,
          right: 14,
          child: IconButton.filled(
            tooltip: '关闭邀请好友',
            onPressed: onClose,
            style: IconButton.styleFrom(
              backgroundColor: Colors.white.withValues(alpha: .14),
              foregroundColor: Colors.white,
            ),
            icon: const Icon(Icons.close_rounded),
          ),
        ),
        const Positioned.fill(
          child: Padding(
            padding: EdgeInsets.fromLTRB(24, 36, 24, 20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _InviteGiftIcon(),
                SizedBox(height: 12),
                Text(
                  '邀请好友，双方各得',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                SizedBox(height: 3),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '1,000',
                      key: ValueKey('invite-reward-value'),
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 36,
                        height: 1.1,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -.8,
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.only(bottom: 4, left: 5),
                      child: Text(
                        'AIP',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 9),
                Text(
                  '好友完成外部 KYC 状态确认后，本地演示记账',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Color(0xFFFFF1F2),
                    fontSize: 11,
                    height: 1.4,
                    fontWeight: FontWeight.w700,
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

class _InviteGlow extends StatelessWidget {
  const _InviteGlow({required this.size, required this.opacity});

  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: Colors.white.withValues(alpha: opacity),
    ),
  );
}

class _InviteGiftIcon extends StatelessWidget {
  const _InviteGiftIcon();

  @override
  Widget build(BuildContext context) => Container(
    width: 48,
    height: 48,
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: .18),
      borderRadius: BorderRadius.circular(15),
      border: Border.all(color: Colors.white.withValues(alpha: .16)),
    ),
    child: const Icon(
      Icons.card_giftcard_rounded,
      color: Colors.white,
      size: 27,
    ),
  );
}

class _InviteCodeCard extends StatelessWidget {
  const _InviteCodeCard();

  @override
  Widget build(BuildContext context) => CustomPaint(
    key: const ValueKey('invite-code-card'),
    painter: const _InviteDashedBorderPainter(),
    child: Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
      child: Row(
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '我的邀请码',
                  style: TextStyle(color: AirvanaColors.muted, fontSize: 10),
                ),
                SizedBox(height: 3),
                Text(
                  'AIR-KAI-4821',
                  style: TextStyle(
                    color: AirvanaColors.ink,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
          ),
          OutlinedButton.icon(
            key: const ValueKey('copy-invite-code'),
            onPressed: () async {
              await Clipboard.setData(
                const ClipboardData(text: 'AIR-KAI-4821'),
              );
              if (!context.mounted) return;
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(const SnackBar(content: Text('邀请码已复制')));
            },
            style: OutlinedButton.styleFrom(
              foregroundColor: AirvanaColors.ink,
              minimumSize: const Size(82, 42),
              side: const BorderSide(color: AirvanaColors.line),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              textStyle: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w900,
              ),
            ),
            icon: const Icon(Icons.content_copy_rounded, size: 16),
            label: const Text('复制'),
          ),
        ],
      ),
    ),
  );
}

class _InviteStats extends StatelessWidget {
  const _InviteStats({required this.completed});

  final bool completed;

  @override
  Widget build(BuildContext context) => Row(
    key: const ValueKey('invite-stats'),
    children: [
      Expanded(
        child: _InviteStatCard(value: completed ? '1' : '0', label: '已邀请好友'),
      ),
      const SizedBox(width: 10),
      Expanded(
        child: _InviteStatCard(
          value: completed ? '1,000' : '0',
          label: '本机演示 AIP',
        ),
      ),
    ],
  );
}

class _InviteStatCard extends StatelessWidget {
  const _InviteStatCard({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) => Container(
    height: 82,
    decoration: BoxDecoration(
      color: const Color(0xFFFFF7F8),
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: const Color(0xFFFFD6DA)),
    ),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          value,
          style: const TextStyle(
            color: AirvanaColors.accent,
            fontSize: 20,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 5),
        Text(
          label,
          style: const TextStyle(color: AirvanaColors.muted, fontSize: 10),
        ),
      ],
    ),
  );
}

class _InviteSteps extends StatelessWidget {
  const _InviteSteps();

  @override
  Widget build(BuildContext context) => const Column(
    children: [
      _InviteStep(
        key: ValueKey('invite-step-1'),
        number: '1',
        icon: Icons.send_outlined,
        label: '分享邀请码或链接给好友',
      ),
      SizedBox(height: 10),
      _InviteStep(
        key: ValueKey('invite-step-2'),
        number: '2',
        icon: Icons.person_add_alt_1_outlined,
        label: '好友注册并填写你的邀请码',
      ),
      SizedBox(height: 10),
      _InviteStep(
        key: ValueKey('invite-step-3'),
        number: '3',
        icon: Icons.verified_user_outlined,
        label: '外部 KYC 状态确认后显示演示奖励',
      ),
    ],
  );
}

class _InviteStep extends StatelessWidget {
  const _InviteStep({
    required this.number,
    required this.icon,
    required this.label,
    super.key,
  });

  final String number;
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: const Color(0xFFFFEFF1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: AirvanaColors.accent, size: 19),
      ),
      const SizedBox(width: 10),
      Text(
        number,
        style: const TextStyle(
          color: AirvanaColors.accent,
          fontSize: 15,
          fontWeight: FontWeight.w900,
        ),
      ),
      const SizedBox(width: 8),
      Expanded(
        child: Text(
          label,
          style: const TextStyle(
            color: AirvanaColors.ink,
            fontSize: 12,
            height: 1.4,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    ],
  );
}

class _InviteBoundaryNote extends StatelessWidget {
  const _InviteBoundaryNote();

  @override
  Widget build(BuildContext context) => Container(
    key: const ValueKey('invite-boundary-note'),
    padding: const EdgeInsets.all(13),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF7F8),
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: const Color(0xFFFFD6DA)),
    ),
    child: const Text(
      'DEMO · 奖励仅记录为本机 AIP，不代表现金、收入或已验证转化。'
      'KYC 由合规第三方完成，App 不采集证件原始数据；'
      '正式奖励、资格与地区以 Campaign Contract 为准。',
      style: TextStyle(color: AirvanaColors.muted, fontSize: 10, height: 1.55),
    ),
  );
}

class _InviteDashedBorderPainter extends CustomPainter {
  const _InviteDashedBorderPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(18)),
      );
    final paint = Paint()
      ..color = const Color(0xFFD8D8DE)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      while (distance < metric.length) {
        canvas.drawPath(metric.extractPath(distance, distance + 5), paint);
        distance += 9;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _CheckInPageBody extends ConsumerWidget {
  const _CheckInPageBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reward = ref.watch(rewardStateProvider);
    final localMode = ref
        .watch(airvanaRepositoryProvider)
        .environment
        .preferLocalData;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AirvanaColors.line),
      ),
      child: reward.when(
        loading: () => const SizedBox(
          height: 180,
          child: Center(child: CircularProgressIndicator()),
        ),
        error: (error, _) => SizedBox(
          height: 180,
          child: Center(
            child: Text(
              '签到状态加载失败：$error',
              style: const TextStyle(color: AirvanaColors.muted),
            ),
          ),
        ),
        data: (state) {
          final now = DateTime.now();
          final dateKey =
              '${now.year.toString().padLeft(4, '0')}-'
              '${now.month.toString().padLeft(2, '0')}-'
              '${now.day.toString().padLeft(2, '0')}';
          final checkedIn = state.isCheckedInOn(dateKey);
          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'AIP 与每日签到',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 6),
              const Text(
                'AIP 仅记录本地站内互动贡献，不代表现金、收入或已验证商业转化。',
                style: TextStyle(
                  color: AirvanaColors.muted,
                  fontSize: 11,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _CheckInStat(
                      label: 'AIP 余额',
                      value: '${state.aipBalance}',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _CheckInStat(
                      label: '连续签到',
                      value: '${state.checkInStreak} 天',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              const Text(
                '连续签到，AIP 越领越多',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 10),
              _CheckInDaysGrid(
                streak: state.checkInStreak,
                checkedInToday: checkedIn,
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton(
                  key: const ValueKey('daily-check-in'),
                  style: _earnPrimaryActionStyle(),
                  onPressed: checkedIn
                      ? null
                      : () async {
                          final result = await ref
                              .read(airvanaRepositoryProvider)
                              .checkInDaily();
                          ref.invalidate(rewardStateProvider);
                          ref.invalidate(walletTxnsProvider);
                          ref.invalidate(accountProvider);
                          ref.invalidate(homeProvider);
                          if (!context.mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                result.idempotent
                                    ? '今日已签到'
                                    : '签到成功 +${result.earned} AIP',
                              ),
                            ),
                          );
                        },
                  child: Text(
                    checkedIn
                        ? '今日已签到 ✓'
                        : localMode
                        ? '签到领 ${state.nextCheckInReward} AIP'
                        : '签到并由服务端结算 AIP',
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

ButtonStyle _earnPrimaryActionStyle() => AirvanaButtonStyles.primary();

ButtonStyle _earnSecondaryActionStyle() => OutlinedButton.styleFrom(
  backgroundColor: Colors.white,
  foregroundColor: AirvanaColors.ink,
  disabledBackgroundColor: Colors.white,
  disabledForegroundColor: AirvanaColors.muted,
  overlayColor: AirvanaColors.accent.withValues(alpha: .06),
  side: const BorderSide(color: AirvanaColors.line, width: 1),
  shape: const StadiumBorder(),
  textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
);

class _CheckInDaysGrid extends StatelessWidget {
  const _CheckInDaysGrid({required this.streak, required this.checkedInToday});

  final int streak;
  final bool checkedInToday;

  @override
  Widget build(BuildContext context) {
    final completed = streak.clamp(0, 7);
    return GridView.builder(
      key: const ValueKey('check-in-days'),
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: .94,
      ),
      itemCount: 7,
      itemBuilder: (context, index) {
        final past = index < completed;
        final next = index == completed && completed < 7;
        return Container(
          decoration: BoxDecoration(
            color: past || (next && checkedInToday)
                ? const Color(0x1FFF3B4A)
                : const Color(0xFFF7F7FA),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: next && !checkedInToday
                  ? const Color(0xFFFFD6DA)
                  : Colors.transparent,
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 9),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '第${index + 1}天',
                style: TextStyle(
                  color: past || next
                      ? AirvanaColors.accent
                      : AirvanaColors.muted,
                  fontSize: 9,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 7),
              CircleAvatar(
                radius: 14,
                backgroundColor: Colors.white,
                child: Text(
                  past ? '✓' : '+${20 + index * 10}',
                  style: TextStyle(
                    color: past ? AirvanaColors.accent : AirvanaColors.ink,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _CheckInStat extends StatelessWidget {
  const _CheckInStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7FA),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: AirvanaColors.muted, fontSize: 10),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
        ],
      ),
    );
  }
}

List<List<_ProfileDrawerItem>> _profileSettingsGroups(
  AccountSnapshot? account,
  LocalProfileFeatureState featureState,
  LocalAiTwinState aiTwinState,
  LocalIdentityState identityState,
) {
  final planName = switch (featureState.subscriptionPlanKey) {
    'creator_pro' => 'Creator Pro',
    'brand_campaign' => 'Brand Campaign',
    _ => account?.planName ?? 'Free',
  };
  final twinMeta = switch (aiTwinState.status) {
    'active_demo' => '已启用',
    'paused_demo' => '已暂停',
    'configuring' => '配置中',
    'testing' => '测试中',
    _ => '待配置',
  };
  final campaignMeta = featureState.campaignPaused
      ? '已暂停'
      : featureState.campaignStage == 0
      ? '1 个待审核'
      : '阶段 ${featureState.campaignStage + 1}/7';
  final primary = <_ProfileDrawerItem>[
    _ProfileDrawerItem(
      icon: Icons.account_balance_wallet_outlined,
      label: '我的钱包',
      meta: '${account?.aip ?? 2480} AIP',
      destination: ProfileSecondaryDestination.wallet,
    ),
    _ProfileDrawerItem(
      icon: Icons.star_border_rounded,
      label: '订阅与额度',
      meta: planName,
      destination: ProfileSecondaryDestination.subscription,
    ),
    _ProfileDrawerItem(
      icon: Icons.person_add_alt_rounded,
      label: 'KOL AI 分身',
      meta: twinMeta,
      destination: ProfileSecondaryDestination.aiTwin,
    ),
    _ProfileDrawerItem(
      icon: Icons.auto_awesome_outlined,
      label: '创作者中心',
      meta: identityState.creatorEntitled ? '已开通' : '待认证',
      destination: ProfileSecondaryDestination.creatorCenter,
    ),
    _ProfileDrawerItem(
      icon: Icons.verified_user_outlined,
      label: '身份认证',
      meta: identityState.kycStatus == 'verified_demo' ? '已认证' : '待认证',
      destination: ProfileSecondaryDestination.identityVerification,
    ),
  ];
  final creator = <_ProfileDrawerItem>[
    _ProfileDrawerItem(
      icon: Icons.fact_check_outlined,
      label: '品牌合作',
      meta: campaignMeta,
      destination: ProfileSecondaryDestination.brandPartnership,
    ),
    _ProfileDrawerItem(
      icon: Icons.workspace_premium_outlined,
      label: '创作者权益',
      meta: featureState.activeRightIds.isEmpty
          ? '运营与交付'
          : '已激活 ${featureState.activeRightIds.length} 项',
      destination: ProfileSecondaryDestination.creatorBenefits,
    ),
    _ProfileDrawerItem(
      icon: Icons.shield_outlined,
      label: '发布与治理',
      meta: featureState.governanceKillSwitch ? '已暂停' : '人工确认',
      destination: ProfileSecondaryDestination.publishingGovernance,
    ),
    _ProfileDrawerItem(
      icon: Icons.chat_bubble_outline_rounded,
      label: '意见反馈',
      meta: featureState.feedbackTickets.isEmpty
          ? ''
          : '${featureState.feedbackTickets.length} 条记录',
      destination: ProfileSecondaryDestination.feedback,
    ),
  ];
  final system = <_ProfileDrawerItem>[
    const _ProfileDrawerItem(
      icon: Icons.grid_view_rounded,
      label: '全项目功能中心',
      meta: '26 项需求',
      destination: ProfileSecondaryDestination.featureCenter,
    ),
    _ProfileDrawerItem(
      icon: Icons.language_rounded,
      label: '切换语言',
      meta: featureState.uiLanguage == 'en' ? 'English' : '简体中文',
      destination: ProfileSecondaryDestination.language,
    ),
    const _ProfileDrawerItem(
      icon: Icons.tune_rounded,
      label: '设置',
      meta: '',
      destination: ProfileSecondaryDestination.preferences,
    ),
  ];
  return [primary, creator, system];
}

class _ProfileDrawerItem {
  const _ProfileDrawerItem({
    required this.icon,
    required this.label,
    required this.meta,
    required this.destination,
  });

  final IconData icon;
  final String label;
  final String meta;
  final ProfileSecondaryDestination destination;
}

class _ProfileSettingsPage extends ConsumerWidget {
  const _ProfileSettingsPage({this.account});

  final AccountSnapshot? account;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final featureState =
        ref.watch(profileFeatureStateProvider).value ??
        const LocalProfileFeatureState();
    final aiTwinState =
        ref.watch(aiTwinStateProvider).value ?? const LocalAiTwinState();
    final identityState =
        ref.watch(identityStateProvider).value ?? const LocalIdentityState();
    final groups = _profileSettingsGroups(
      account,
      featureState,
      aiTwinState,
      identityState,
    );
    return ListView(
      key: const ValueKey('profile-settings-scroll'),
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
      children: [
        _ProfileDrawerGroup(
          items: groups[0],
          onPick: (item) => _openProfileSecondary(context, item.destination),
        ),
        const SizedBox(height: 10),
        _ProfileDrawerGroup(
          items: groups[1],
          onPick: (item) => _openProfileSecondary(context, item.destination),
        ),
        const SizedBox(height: 10),
        _ProfileDrawerGroup(
          items: groups[2],
          onPick: (item) => _openProfileSecondary(context, item.destination),
        ),
        const SizedBox(height: 14),
        Material(
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFFFD6DA)),
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => _confirmLocalLogout(context, ref),
            child: const SizedBox(
              height: 52,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.logout_rounded,
                    size: 19,
                    color: Color(0xFFC62836),
                  ),
                  SizedBox(width: 8),
                  Text(
                    '退出登录',
                    style: TextStyle(
                      color: Color(0xFFC62836),
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _confirmLocalLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showGeneralDialog<bool>(
      context: context,
      barrierDismissible: false,
      barrierLabel: '退出登录确认',
      barrierColor: const Color(0x800D0D0F),
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (dialogContext, _, _) => _WebLogoutDialog(
        onCancel: () => Navigator.pop(dialogContext, false),
        onConfirm: () => Navigator.pop(dialogContext, true),
      ),
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        final curve = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
          reverseCurve: Curves.easeInCubic,
        );
        return FadeTransition(
          opacity: animation,
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, .08),
              end: Offset.zero,
            ).animate(curve),
            child: child,
          ),
        );
      },
    );
    if (confirmed != true || !context.mounted) return;
    ref.read(profileAvatarSessionProvider.notifier).setBytes(null);
    context.go('/');
  }
}

class _WebLogoutDialog extends StatelessWidget {
  const _WebLogoutDialog({required this.onCancel, required this.onConfirm});

  final VoidCallback onCancel;
  final VoidCallback onConfirm;

  @override
  Widget build(BuildContext context) {
    final compactHeight = MediaQuery.sizeOf(context).height <= 700;
    return SafeArea(
      top: false,
      minimum: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      child: Align(
        alignment: compactHeight ? Alignment.center : Alignment.bottomCenter,
        child: Material(
          key: const ValueKey('logout-confirm-dialog'),
          color: Colors.white,
          elevation: 24,
          shadowColor: const Color(0x73000000),
          clipBehavior: Clip.antiAlias,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: const BorderSide(color: AirvanaColors.line, width: 1),
          ),
          child: Container(
            width: double.infinity,
            padding: EdgeInsets.all(compactHeight ? 16 : 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      key: const ValueKey('logout-confirm-icon'),
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF0F0),
                        borderRadius: BorderRadius.circular(15),
                      ),
                      child: const Icon(
                        Icons.logout_rounded,
                        size: 21,
                        color: Color(0xFFC62836),
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        '退出登录？',
                        style: TextStyle(
                          color: AirvanaColors.ink,
                          fontSize: 18,
                          height: 1.25,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Container(
                  key: const ValueKey('logout-confirm-copy'),
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7F7FA),
                    borderRadius: BorderRadius.circular(15),
                  ),
                  child: const Text(
                    '退出后将返回首页；重新登录后才能查看创作、消息与钱包信息。本机保存的草稿、AIP 流水和功能状态不会丢失；服务端账号退出需接入认证服务后生效。',
                    style: TextStyle(
                      color: Color(0xFF3A3A3C),
                      fontSize: 12,
                      height: 1.7,
                    ),
                  ),
                ),
                const SizedBox(height: 17),
                Row(
                  children: [
                    Expanded(
                      flex: 100,
                      child: _WebLogoutAction(
                        key: const ValueKey('logout-confirm-cancel'),
                        label: '取消',
                        onTap: onCancel,
                      ),
                    ),
                    const SizedBox(width: 9),
                    Expanded(
                      flex: 135,
                      child: _WebLogoutAction(
                        key: const ValueKey('logout-confirm-submit'),
                        label: '确认退出',
                        danger: true,
                        onTap: onConfirm,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _WebLogoutAction extends StatelessWidget {
  const _WebLogoutAction({
    required this.label,
    required this.onTap,
    this.danger = false,
    super.key,
  });

  final String label;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) => Material(
    color: danger ? const Color(0xFFC62836) : const Color(0xFFF7F7FA),
    shape: StadiumBorder(
      side: danger
          ? const BorderSide(color: Color(0xFFC62836))
          : const BorderSide(color: AirvanaColors.line),
    ),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: SizedBox(
        height: 42,
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              color: danger ? Colors.white : AirvanaColors.ink,
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ),
    ),
  );
}

class _ProfileDrawerGroup extends StatelessWidget {
  const _ProfileDrawerGroup({required this.items, required this.onPick});

  final List<_ProfileDrawerItem> items;
  final ValueChanged<_ProfileDrawerItem> onPick;

  @override
  Widget build(BuildContext context) => Material(
    color: Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: const BorderSide(color: AirvanaColors.line),
    ),
    clipBehavior: Clip.antiAlias,
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var index = 0; index < items.length; index++)
          InkWell(
            onTap: () => onPick(items[index]),
            child: Container(
              height: 54,
              padding: const EdgeInsets.symmetric(horizontal: 13),
              decoration: BoxDecoration(
                border: index == items.length - 1
                    ? null
                    : const Border(
                        bottom: BorderSide(color: Color(0xFFF1F1F5)),
                      ),
              ),
              child: Row(
                children: [
                  Icon(
                    items[index].icon,
                    size: 20,
                    color: const Color(0xFF3A3A3C),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      items[index].label,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -.05,
                      ),
                    ),
                  ),
                  if (items[index].meta.isNotEmpty)
                    Text(
                      items[index].meta,
                      style: const TextStyle(
                        color: AirvanaColors.muted,
                        fontSize: 10,
                      ),
                    ),
                  const SizedBox(width: 3),
                  const Icon(
                    Icons.chevron_right_rounded,
                    size: 20,
                    color: Color(0xFFC7C7CC),
                  ),
                ],
              ),
            ),
          ),
      ],
    ),
  );
}

class ProfileAndHistoryScreen extends ConsumerStatefulWidget {
  const ProfileAndHistoryScreen({super.key});

  @override
  ConsumerState<ProfileAndHistoryScreen> createState() =>
      _ProfileAndHistoryScreenState();
}

class _ProfileAndHistoryScreenState
    extends ConsumerState<ProfileAndHistoryScreen> {
  int _selectedTab = 0;

  @override
  Widget build(BuildContext context) {
    final home = ref.watch(homeProvider);
    final history = ref.watch(experienceHistoryProvider);
    final workspace = ref.watch(profileLocalWorkspaceProvider);
    final profile = ref.watch(localProfileStateProvider);
    final avatarBytes = ref.watch(profileAvatarSessionProvider);
    final social = ref.watch(localSocialStateProvider);
    final account = home.value?.account;

    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(homeProvider);
          ref.invalidate(experienceHistoryProvider);
          ref.invalidate(profileLocalWorkspaceProvider);
          ref.invalidate(localProfileStateProvider);
          ref.invalidate(localSocialStateProvider);
          ref.invalidate(accountProvider);
          await Future.wait([
            ref.read(homeProvider.future),
            ref.read(experienceHistoryProvider.future),
            ref.read(profileLocalWorkspaceProvider.future),
            ref.read(localProfileStateProvider.future),
            ref.read(localSocialStateProvider.future),
          ]);
        },
        child: ListView(
          key: const ValueKey('profile-scroll'),
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(top: 12),
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  _TopActions(account: account),
                  const SizedBox(height: 12),
                  home.when(
                    loading: () => const _ProfileCard.loading(),
                    error: (_, __) => const _ProfileCard(
                      displayName: '本机体验账号',
                      localDemo: true,
                    ),
                    data: (snapshot) => _ProfileCard(
                      displayName: snapshot.localDemo
                          ? profile.value?.displayName ??
                                snapshot.user.displayName
                          : snapshot.user.displayName,
                      bio: snapshot.localDemo
                          ? profile.value?.bio ?? const LocalProfileState().bio
                          : const LocalProfileState().bio,
                      localDemo: snapshot.localDemo,
                      avatarBytes: avatarBytes,
                      account: account,
                      likesReceived: snapshot.localDemo
                          ? snapshot.playables
                                .where(
                                  (item) => item.ownerHandle == '@kai.builds',
                                )
                                .fold<int>(
                                  0,
                                  (total, item) => total + item.likes,
                                )
                          : account?.likesReceived ?? 0,
                      followerCount: snapshot.localDemo
                          ? social.value?.followerOwners.length ?? 2
                          : account?.followerCount ?? 0,
                      followingCount: snapshot.localDemo
                          ? social.value?.followingOwners.length ?? 1
                          : account?.followingCount ?? 0,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const _CreatorShortcuts(),
                ],
              ),
            ),
            const SizedBox(height: 12),
            _ProfileContentSurface(
              selectedIndex: _selectedTab,
              onChanged: (index) => setState(() => _selectedTab = index),
              home: home,
              history: history,
              workspace: workspace,
              onOpenPlayable: _openPlayable,
              onOpenDraft: _openDraft,
            ),
          ],
        ),
      ),
    );
  }

  void _openPlayable(String playableId) {
    ref.invalidate(homeProvider);
    context.push('/runtime/$playableId');
  }

  void _openDraft(String draftId) {
    context.push('/create?draft_id=${Uri.encodeQueryComponent(draftId)}');
  }
}

class _ProfileContentSurface extends StatelessWidget {
  const _ProfileContentSurface({
    required this.selectedIndex,
    required this.onChanged,
    required this.home,
    required this.history,
    required this.workspace,
    required this.onOpenPlayable,
    required this.onOpenDraft,
  });

  final int selectedIndex;
  final ValueChanged<int> onChanged;
  final AsyncValue<HomeSnapshot> home;
  final AsyncValue<List<ExperienceRecord>> history;
  final AsyncValue<LocalWorkspaceSnapshot> workspace;
  final ValueChanged<String> onOpenPlayable;
  final ValueChanged<String> onOpenDraft;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const ValueKey('profile-content-surface'),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
        border: Border(top: BorderSide(color: AirvanaColors.line)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          _ProfileTabs(selectedIndex: selectedIndex, onChanged: onChanged),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AirvanaMetrics.pageGutter,
              10,
              AirvanaMetrics.pageGutter,
              10,
            ),
            child: _TabBody(
              index: selectedIndex,
              home: home,
              history: history,
              workspace: workspace,
              onOpenPlayable: onOpenPlayable,
              onOpenDraft: onOpenDraft,
            ),
          ),
          const SizedBox(height: 74),
        ],
      ),
    );
  }
}

class _TopActions extends StatelessWidget {
  const _TopActions({this.account});

  final AccountSnapshot? account;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: SizedBox(
        height: 40,
        child: Row(
          children: [
            _TopIcon(
              key: const ValueKey('profile-rewards-action'),
              icon: Icons.event_available_outlined,
              iconWidget: const CustomPaint(
                size: Size.square(24),
                painter: _WebProfileCalendarPainter(),
              ),
              label: '获取积分',
              accent: true,
              onTap: () => _openProfileSecondary(
                context,
                ProfileSecondaryDestination.checkIn,
              ),
            ),
            const Spacer(),
            _TopIcon(
              icon: Icons.notifications_none_rounded,
              label: '通知',
              hasBadge: (account?.unreadNotifications ?? 2) > 0,
              onTap: () => _openProfileSecondary(
                context,
                ProfileSecondaryDestination.notifications,
              ),
            ),
            const SizedBox(width: 10),
            _TopIcon(
              icon: Icons.menu_rounded,
              label: '设置与更多',
              onTap: () => _openProfileSecondary(
                context,
                ProfileSecondaryDestination.settings,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TopIcon extends StatelessWidget {
  const _TopIcon({
    required this.icon,
    required this.label,
    required this.onTap,
    this.accent = false,
    this.hasBadge = false,
    this.iconWidget,
    super.key,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool accent;
  final bool hasBadge;
  final Widget? iconWidget;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 40,
      height: 40,
      child: Stack(
        alignment: Alignment.center,
        children: [
          IconButton(
            tooltip: label,
            onPressed: onTap,
            padding: EdgeInsets.zero,
            style: IconButton.styleFrom(
              minimumSize: const Size.square(40),
              maximumSize: const Size.square(40),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            icon: iconWidget == null
                ? Icon(
                    icon,
                    semanticLabel: label,
                    size: 24,
                    color: accent ? AirvanaColors.accent : AirvanaColors.ink,
                  )
                : Semantics(label: label, child: iconWidget),
          ),
          if (hasBadge)
            const Positioned(
              top: 6,
              right: 7,
              child: CircleAvatar(
                radius: 3.5,
                backgroundColor: AirvanaColors.accent,
              ),
            ),
        ],
      ),
    );
  }
}

class _WebProfileCalendarPainter extends CustomPainter {
  const _WebProfileCalendarPainter();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 24, size.height / 24);
    final stroke = Paint()
      ..color = AirvanaColors.accent
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(4, 5.5, 16, 15),
        const Radius.circular(3),
      ),
      stroke,
    );
    canvas.drawLine(const Offset(8, 3.5), const Offset(8, 7.5), stroke);
    canvas.drawLine(const Offset(16, 3.5), const Offset(16, 7.5), stroke);
    canvas.drawLine(const Offset(4, 10), const Offset(20, 10), stroke);
    final check = Path()
      ..moveTo(8.5, 15)
      ..lineTo(10.5, 17)
      ..lineTo(15, 12.5);
    canvas.drawPath(check, stroke);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _WebProfileCalendarPainter oldDelegate) => false;
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({
    required this.displayName,
    required this.localDemo,
    this.avatarBytes,
    this.account,
    this.bio = '运营可持续创作、互动、归因与转化的 Agentic Playable。',
    this.likesReceived = 0,
    this.followerCount = 0,
    this.followingCount = 0,
  }) : loading = false;

  const _ProfileCard.loading()
    : displayName = '',
      localDemo = false,
      avatarBytes = null,
      account = null,
      bio = '',
      likesReceived = 0,
      followerCount = 0,
      followingCount = 0,
      loading = true;

  final String displayName;
  final bool localDemo;
  final Uint8List? avatarBytes;
  final AccountSnapshot? account;
  final String bio;
  final int likesReceived;
  final int followerCount;
  final int followingCount;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: ValueKey(loading ? 'profile-loading-card' : 'profile-card'),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE1E1E8), width: 1),
      ),
      child: loading ? const _ProfileSkeleton() : _content(context),
    );
  }

  Widget _content(BuildContext context) {
    void openAiTwin() =>
        _openProfileSecondary(context, ProfileSecondaryDestination.aiTwin);

    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Semantics(
              button: true,
              label: '进入 KOL AI 分身',
              excludeSemantics: true,
              onTap: openAiTwin,
              child: GestureDetector(
                onTap: openAiTwin,
                child: ExcludeSemantics(
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        key: const ValueKey('profile-avatar'),
                        width: 76,
                        height: 76,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          image: DecorationImage(
                            image: avatarBytes == null
                                ? const AssetImage(
                                    'assets/legacy/avatars/kai.png',
                                  )
                                : MemoryImage(avatarBytes!),
                            fit: BoxFit.cover,
                          ),
                          border: Border.all(
                            color: const Color(0xFFFFD6DA),
                            width: 3,
                          ),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x1A1E1E22),
                              blurRadius: 22,
                              offset: Offset(0, 8),
                            ),
                          ],
                        ),
                      ),
                      Positioned(
                        right: -2,
                        bottom: -2,
                        child: Container(
                          key: const ValueKey('profile-ai-badge'),
                          width: 30,
                          height: 30,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AirvanaColors.success,
                              width: 3,
                            ),
                            boxShadow: const [
                              BoxShadow(color: Colors.white, spreadRadius: 3),
                            ],
                          ),
                          child: const Text(
                            'AI',
                            style: TextStyle(
                              color: AirvanaColors.success,
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -.6,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          key: const ValueKey('profile-display-name'),
                          displayName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textScaler: TextScaler.noScaling,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      const SizedBox(width: 7),
                      const _LevelChip(),
                      SizedBox(
                        width: 44,
                        height: 44,
                        child: IconButton(
                          key: const ValueKey('profile-edit-action'),
                          tooltip: '编辑个人信息',
                          onPressed: () => _openProfileSecondary(
                            context,
                            ProfileSecondaryDestination.editProfile,
                          ),
                          padding: EdgeInsets.zero,
                          icon: const CustomPaint(
                            size: Size.square(17),
                            painter: _WebProfileEditPainter(),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  const Text(
                    '@kai.builds · KOL 运营者 · 创作与持续经营',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: AirvanaColors.muted, fontSize: 11),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    bio,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 10, height: 1.45),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 13),
        const Divider(
          key: ValueKey('profile-metrics-divider'),
          height: .7,
          thickness: .7,
          color: Color(0xFFEDEDF3),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _ProfileMetric(
              value: '$likesReceived',
              label: '获赞',
              onTap: () => _openProfileSecondary(
                context,
                ProfileSecondaryDestination.likes,
              ),
            ),
            const _MetricDivider(),
            _ProfileMetric(
              value: '$followerCount',
              label: '粉丝',
              onTap: () => _openProfileSecondary(
                context,
                ProfileSecondaryDestination.followers,
              ),
            ),
            const _MetricDivider(),
            _ProfileMetric(
              value: '$followingCount',
              label: '关注',
              onTap: () => _openProfileSecondary(
                context,
                ProfileSecondaryDestination.following,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _WebProfileEditPainter extends CustomPainter {
  const _WebProfileEditPainter();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 24, size.height / 24);
    final stroke = Paint()
      ..color = const Color(0xFF505057)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.9
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final pencil = Path()
      ..moveTo(17, 3.5)
      ..quadraticBezierTo(19.1, 2.7, 20, 4.2)
      ..quadraticBezierTo(20.7, 5.4, 20, 6.5)
      ..lineTo(8.5, 18)
      ..lineTo(4, 19.5)
      ..lineTo(5.5, 15)
      ..close();
    canvas.drawPath(pencil, stroke);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _WebProfileEditPainter oldDelegate) => false;
}

class _LevelChip extends StatelessWidget {
  const _LevelChip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF0F2),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFFFCDD2)),
      ),
      child: const Text(
        'L3',
        style: TextStyle(
          color: AirvanaColors.accent,
          fontSize: 9,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _ProfileMetric extends StatelessWidget {
  const _ProfileMetric({
    required this.value,
    required this.label,
    required this.onTap,
  });

  final String value;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Semantics(
        button: true,
        label: '查看$label详情',
        excludeSemantics: true,
        onTap: onTap,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: ExcludeSemantics(
            child: SizedBox(
              height: 44,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    label,
                    style: const TextStyle(
                      color: AirvanaColors.muted,
                      fontSize: 9,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MetricDivider extends StatelessWidget {
  const _MetricDivider();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 44,
      child: VerticalDivider(
        key: ValueKey('profile-metric-divider'),
        width: 1,
        thickness: 1,
        color: Color(0xFFEDEDF3),
      ),
    );
  }
}

class _SmallStatus extends StatelessWidget {
  const _SmallStatus({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F0F4),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 8, color: AirvanaColors.muted),
      ),
    );
  }
}

class _CreatorShortcuts extends StatelessWidget {
  const _CreatorShortcuts();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(4, 12, 4, 11),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AirvanaColors.line),
      ),
      child: Row(
        children: [
          _Shortcut(
            icon: Icons.account_balance_wallet_outlined,
            title: '钱包',
            meta: 'AIP 与 AIT',
            onTap: () => _openProfileSecondary(
              context,
              ProfileSecondaryDestination.wallet,
            ),
          ),
          _Shortcut(
            icon: Icons.auto_awesome_rounded,
            title: '创作者中心',
            meta: '创作与运营',
            onTap: () => _openProfileSecondary(
              context,
              ProfileSecondaryDestination.creatorCenter,
            ),
          ),
          _Shortcut(
            icon: Icons.smart_toy_outlined,
            title: 'KOL AI 分身',
            meta: '人格与渠道',
            onTap: () => _openProfileSecondary(
              context,
              ProfileSecondaryDestination.aiTwin,
            ),
          ),
        ],
      ),
    );
  }
}

class _Shortcut extends StatelessWidget {
  const _Shortcut({
    required this.icon,
    required this.title,
    required this.meta,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String meta;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Semantics(
        button: true,
        label: title,
        excludeSemantics: true,
        onTap: onTap,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: ExcludeSemantics(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Column(
                children: [
                  SizedBox(
                    height: 28,
                    child: Icon(icon, color: AirvanaColors.accent, size: 20),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    meta,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AirvanaColors.muted,
                      fontSize: 6.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ShortcutIcon extends StatelessWidget {
  const _ShortcutIcon({required this.icon});
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: const Color(0xFFFFF0F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFFD2D7)),
      ),
      child: Icon(icon, size: 20, color: AirvanaColors.accent),
    );
  }
}

class _ProfileTabs extends StatelessWidget {
  const _ProfileTabs({required this.selectedIndex, required this.onChanged});

  final int selectedIndex;
  final ValueChanged<int> onChanged;

  static const _tabs = [
    (Icons.grid_view_rounded, '作品'),
    (Icons.description_outlined, '草稿箱'),
    (Icons.favorite_border_rounded, '收藏'),
    (Icons.schedule_rounded, '体验记录'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AirvanaColors.line)),
      ),
      child: Row(
        children: List.generate(_tabs.length, (index) {
          final tab = _tabs[index];
          final selected = index == selectedIndex;
          return Expanded(
            child: Semantics(
              selected: selected,
              child: InkWell(
                key: ValueKey('profile-tab-$index'),
                onTap: () => onChanged(index),
                child: Stack(
                  children: [
                    Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            height: 19,
                            child: Icon(
                              tab.$1,
                              size: 18,
                              color: selected
                                  ? AirvanaColors.accent
                                  : AirvanaColors.muted,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            tab.$2,
                            style: TextStyle(
                              color: selected
                                  ? AirvanaColors.accent
                                  : AirvanaColors.muted,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (selected)
                      const Positioned(
                        key: ValueKey('profile-tab-indicator'),
                        left: 20,
                        right: 20,
                        bottom: 0,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: AirvanaColors.accent,
                            borderRadius: BorderRadius.all(Radius.circular(99)),
                          ),
                          child: SizedBox(height: 3),
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

class _TabBody extends StatelessWidget {
  const _TabBody({
    required this.index,
    required this.home,
    required this.history,
    required this.workspace,
    required this.onOpenPlayable,
    required this.onOpenDraft,
  });

  final int index;
  final AsyncValue<HomeSnapshot> home;
  final AsyncValue<List<ExperienceRecord>> history;
  final AsyncValue<LocalWorkspaceSnapshot> workspace;
  final ValueChanged<String> onOpenPlayable;
  final ValueChanged<String> onOpenDraft;

  @override
  Widget build(BuildContext context) {
    if (index == 3) return _history(context);
    if (index == 0) return _works(context);
    if (index == 1) return _drafts(context);
    return _InlineHistoryState(
      icon: Icons.favorite_border_rounded,
      title: '还没有收藏',
      message: '在发现页收藏喜欢的 Agentic Playable。',
      actionLabel: '去发现',
      onAction: () => context.go('/discover'),
    );
  }

  Widget _works(BuildContext context) {
    return home.when(
      loading: () => const _HistoryLoadingList(),
      error: (error, _) => _InlineHistoryState(
        icon: Icons.sync_problem_rounded,
        title: '作品读取失败',
        message: '$error',
      ),
      data: (snapshot) {
        final serverConnected =
            snapshot.account != null && !snapshot.account!.localDemo;
        if (serverConnected) {
          final items = snapshot.ownedPlayables
              .map(
                (playable) => _GridEntry(
                  playableId: playable.id,
                  title: playable.title,
                  subtitle: '${playable.authorName} · v${playable.version}',
                  statusLabel: '已发布',
                  localDemo: false,
                  coverAsset: playable.coverAsset,
                  onTap: () => onOpenPlayable(playable.id),
                ),
              )
              .toList(growable: false);
          if (items.isEmpty) {
            return _InlineHistoryState(
              icon: Icons.rocket_launch_outlined,
              title: '还没有已发布作品',
              message: '服务端没有当前账号已发布的 Agentic Playable。',
              actionLabel: '去创作',
              onAction: () => context.go('/create'),
            );
          }
          return _PlayableGrid(items: items);
        }
        return workspace.when(
          loading: () => const _HistoryLoadingList(),
          error: (error, _) => _InlineHistoryState(
            icon: Icons.sync_problem_rounded,
            title: '本机作品读取失败',
            message: '$error',
          ),
          data: (localWorkspace) {
            final safety = LegacyDemoCatalog.byId('plb_safety_workshop')!;
            void openLegacyDraftDemo() => _openProfileSecondary(
              context,
              ProfileSecondaryDestination.legacyDraft,
            );

            final items = <_GridEntry>[
              _GridEntry(
                playableId: safety.id,
                title: safety.title,
                subtitle: '${safety.agentName} · v${safety.version}',
                statusLabel: safety.stage,
                localDemo: safety.localDemo,
                coverAsset: safety.coverAsset,
                onTap: () => onOpenPlayable(safety.id),
              ),
              _GridEntry(
                playableId: 'profile_demo_kol_brand_draft_1',
                title: 'KOL 品牌互动挑战',
                subtitle: 'Nova · 未发布',
                statusLabel: '草稿',
                localDemo: false,
                onTap: openLegacyDraftDemo,
              ),
              _GridEntry(
                playableId: 'profile_demo_kol_brand_draft_2',
                title: 'KOL 品牌互动挑战',
                subtitle: 'Nova · 未发布',
                statusLabel: '草稿',
                localDemo: false,
                onTap: openLegacyDraftDemo,
              ),
            ];
            final seenIds = items.map((item) => item.playableId).toSet();
            for (final playable in localWorkspace.playables.where(
              (item) =>
                  item.ownerId == snapshot.user.id &&
                  item.status == LocalPlayableStatus.publishedLocal,
            )) {
              if (!seenIds.add(playable.playableId)) continue;
              items.add(
                _GridEntry(
                  playableId: playable.playableId,
                  title: playable.title,
                  subtitle:
                      '${playable.authorName} · v${playable.currentVersionNumber}',
                  statusLabel: '本机已发布',
                  localDemo: true,
                  onTap: () => onOpenPlayable(playable.playableId),
                ),
              );
            }
            return _PlayableGrid(items: items);
          },
        );
      },
    );
  }

  Widget _drafts(BuildContext context) {
    return home.when(
      loading: () => const _HistoryLoadingList(),
      error: (error, _) => _InlineHistoryState(
        icon: Icons.sync_problem_rounded,
        title: '草稿读取失败',
        message: '$error',
      ),
      data: (snapshot) => workspace.when(
        loading: () => const _HistoryLoadingList(),
        error: (error, _) => _InlineHistoryState(
          icon: Icons.sync_problem_rounded,
          title: '本机草稿读取失败',
          message: '$error',
        ),
        data: (localWorkspace) {
          final drafts =
              localWorkspace.drafts
                  .where(
                    (draft) =>
                        draft.ownerId == snapshot.user.id &&
                        (draft.status == LocalDraftStatus.editing ||
                            draft.status ==
                                LocalDraftStatus.readyForGeneration),
                  )
                  .toList(growable: false)
                ..sort(
                  (left, right) => right.updatedAt.compareTo(left.updatedAt),
                );
          if (drafts.isEmpty) {
            return _InlineHistoryState(
              icon: Icons.description_outlined,
              title: '草稿箱是空的',
              message: '创建中未发布的作品会自动保存到这里。',
              actionLabel: '开始创建',
              onAction: () => context.push('/create'),
            );
          }
          return _DraftGrid(drafts: drafts, onOpenDraft: onOpenDraft);
        },
      ),
    );
  }

  Widget _history(BuildContext context) {
    return history.when(
      loading: () => const _HistoryLoadingList(),
      error: (error, _) => _InlineHistoryState(
        icon: Icons.sync_problem_rounded,
        title: '体验记录读取失败',
        message: '$error',
      ),
      data: (records) => records.isEmpty
          ? _InlineHistoryState(
              icon: Icons.history_toggle_off_rounded,
              title: '还没有体验记录',
              message: '完成一次互动后会在这里留下记录。',
              actionLabel: '去体验',
              onAction: () => context.go('/'),
            )
          : _PlayableGrid(
              items: records
                  .take(9)
                  .map(
                    (record) => _GridEntry(
                      playableId: record.contentId,
                      title: record.title,
                      subtitle:
                          '${record.completed ? '体验过' : '挑战失败'} · v${record.version}',
                      statusLabel: record.completed ? '已体验' : '未完成',
                      localDemo: record.localDemo,
                      completed: record.completed,
                      coverAsset:
                          LegacyDemoCatalog.byId(
                            record.contentId,
                          )?.coverAsset ??
                          '',
                      onTap: () => onOpenPlayable(record.contentId),
                    ),
                  )
                  .toList(growable: false),
            ),
    );
  }
}

class _DraftGrid extends StatelessWidget {
  const _DraftGrid({required this.drafts, required this.onOpenDraft});

  final List<LocalDraft> drafts;
  final ValueChanged<String> onOpenDraft;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      key: const ValueKey('profile-draft-grid'),
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 7,
        mainAxisSpacing: 7,
        childAspectRatio: .68,
      ),
      itemCount: drafts.length,
      itemBuilder: (context, index) {
        final draft = drafts[index];
        return _DraftCard(
          draft: draft,
          onTap: () => onOpenDraft(draft.draftId),
        );
      },
    );
  }
}

class _DraftCard extends StatelessWidget {
  const _DraftCard({required this.draft, required this.onTap});

  final LocalDraft draft;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final title = draft.idea.trim().isEmpty
        ? '未命名本机草稿'
        : draft.idea.trim().split('\n').first;
    final status = draft.status == LocalDraftStatus.readyForGeneration
        ? '可继续生成'
        : '编辑中';
    return Semantics(
      button: true,
      label: '继续编辑 $title · ${draft.draftId}',
      child: Material(
        key: ValueKey('profile-draft-${draft.draftId}'),
        color: const Color(0xFF19191C),
        borderRadius: BorderRadius.circular(12),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Stack(
            fit: StackFit.expand,
            children: [
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF44353A), Color(0xFF171719)],
                  ),
                ),
              ),
              const Positioned(
                top: 9,
                left: 9,
                child: Icon(
                  Icons.description_outlined,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              Positioned(
                top: 9,
                right: 9,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 5,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0x7A000000),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    status,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 7,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 9,
                right: 9,
                bottom: 9,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        height: 1.3,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${draft.deepMode ? '深度模式' : '快速模式'} · 本机草稿',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 7,
                      ),
                    ),
                  ],
                ),
              ),
              const Positioned(
                right: 7,
                bottom: 4,
                child: Text(
                  '…',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GridEntry {
  const _GridEntry({
    required this.playableId,
    required this.title,
    required this.subtitle,
    required this.statusLabel,
    required this.localDemo,
    this.coverAsset = '',
    this.completed = true,
    this.onTap,
  });

  final String playableId;
  final String title;
  final String subtitle;
  final String statusLabel;
  final bool localDemo;
  final String coverAsset;
  final bool completed;
  final VoidCallback? onTap;
}

class _PlayableGrid extends StatelessWidget {
  const _PlayableGrid({required this.items});

  final List<_GridEntry> items;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      key: const ValueKey('history-grid'),
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 7,
        mainAxisSpacing: 7,
        childAspectRatio: 0.68,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final entry = items[index];
        return Semantics(
          key: ValueKey('profile-playable-${entry.playableId}'),
          button: entry.onTap != null,
          label: '打开 ${entry.title} · ${entry.playableId}',
          excludeSemantics: true,
          onTap: entry.onTap,
          child: GestureDetector(
            onTap: entry.onTap,
            child: ExcludeSemantics(
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF080B0F),
                  borderRadius: BorderRadius.circular(12),
                  image: entry.coverAsset.isEmpty
                      ? null
                      : DecorationImage(
                          image: AssetImage(entry.coverAsset),
                          fit: BoxFit.cover,
                        ),
                ),
                clipBehavior: Clip.antiAlias,
                child: Stack(
                  children: [
                    if (entry.coverAsset.isEmpty)
                      const Positioned.fill(
                        child: Center(
                          child: Text('🎮', style: TextStyle(fontSize: 25)),
                        ),
                      ),
                    const Positioned.fill(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Colors.transparent, Color(0xEE05070A)],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            stops: [0.44, 1],
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      top: 8,
                      left: 8,
                      child: entry.localDemo
                          ? const _DarkLocalBadge(label: '本机')
                          : const SizedBox.shrink(),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 5,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0x7A000000),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          entry.statusLabel,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 7,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                    const Positioned(
                      right: 8,
                      bottom: 8,
                      child: Text(
                        '…',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    Positioned(
                      left: 9,
                      right: 26,
                      bottom: 9,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            entry.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              height: 1.12,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            entry.subtitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 7,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _DarkLocalBadge extends StatelessWidget {
  const _DarkLocalBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0x66000000),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 8,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _ProfileSkeleton extends StatelessWidget {
  const _ProfileSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Row(
      key: ValueKey('profile-skeleton'),
      children: [
        _SkeletonLine(width: 76, height: 76, radius: 38),
        SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _SkeletonLine(width: 118, height: 15),
              SizedBox(height: 9),
              _SkeletonLine(width: 176, height: 10),
              SizedBox(height: 9),
              _SkeletonLine(width: 145, height: 10),
            ],
          ),
        ),
      ],
    );
  }
}

class _HistoryLoadingList extends StatelessWidget {
  const _HistoryLoadingList();

  @override
  Widget build(BuildContext context) {
    return const Column(
      key: ValueKey('history-loading-list'),
      children: [
        _HistorySkeletonTile(),
        SizedBox(height: 9),
        _HistorySkeletonTile(),
        SizedBox(height: 9),
        _HistorySkeletonTile(),
      ],
    );
  }
}

class _HistorySkeletonTile extends StatelessWidget {
  const _HistorySkeletonTile();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 70,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AirvanaColors.line),
      ),
      child: const Row(
        children: [
          _SkeletonLine(width: 42, height: 42, radius: 13),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SkeletonLine(width: 152, height: 12),
                SizedBox(height: 8),
                _SkeletonLine(width: 104, height: 9),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SkeletonLine extends StatelessWidget {
  const _SkeletonLine({
    required this.width,
    required this.height,
    this.radius = 99,
  });

  final double width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFF0F0F5),
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

class _InlineHistoryState extends StatelessWidget {
  const _InlineHistoryState({
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const ValueKey('history-inline-state'),
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 24, 18, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: const Color(0xFFFFF0F2),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(icon, size: 27, color: AirvanaColors.accent),
          ),
          const SizedBox(height: 10),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AirvanaColors.muted,
              fontSize: 10,
              height: 1.65,
            ),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 11),
            SizedBox(
              height: 36,
              child: FilledButton(
                onPressed: onAction,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  backgroundColor: AirvanaColors.accent,
                ),
                child: Text(
                  actionLabel!,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
