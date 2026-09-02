class AppUser {
  const AppUser({required this.id, required this.displayName});

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
    id: '${json['id'] ?? ''}',
    displayName:
        '${json['displayName'] ?? json['display_name'] ?? 'Airvana 用户'}',
  );

  final String id;
  final String displayName;
}

class Playable {
  const Playable({
    required this.id,
    required this.title,
    required this.authorName,
    required this.contentType,
    required this.version,
    required this.summary,
    this.coverAsset = '',
    this.ownerUserId = '',
    this.stage = '本地 DEMO',
    this.agentName = 'Nova',
    this.ownerHandle = '@airvana.arcade',
    this.category = '原创互动',
    this.instruction = '完成互动目标并保存本机体验记录。',
    this.likes = 0,
    this.comments = 0,
    this.saves = 0,
    this.localDemo = false,
  });

  factory Playable.fromJson(Map<String, dynamic> json) {
    final payload = json['payload'];
    return Playable(
      id: '${json['id'] ?? ''}',
      title: '${json['title'] ?? '未命名作品'}',
      authorName: '${json['authorName'] ?? 'Airvana Arcade'}',
      contentType: '${json['contentType'] ?? 'game'}',
      version: (json['currentVersion'] as num?)?.toInt() ?? 1,
      summary: payload is Map
          ? '${payload['summary'] ?? payload['hook'] ?? ''}'
          : '',
      coverAsset: '',
      ownerUserId: '${json['ownerUserId'] ?? ''}',
      stage: '${json['stage'] ?? 'SERVER VERIFIED'}',
      agentName: '${json['agentName'] ?? 'Nova'}',
      ownerHandle: '${json['ownerHandle'] ?? '@airvana.arcade'}',
      category: '${json['category'] ?? 'Agentic Playable'}',
      instruction: '${json['instruction'] ?? '完成互动目标。'}',
      likes: (json['likes'] as num?)?.toInt() ?? 0,
      comments: (json['comments'] as num?)?.toInt() ?? 0,
      saves: (json['saves'] as num?)?.toInt() ?? 0,
      localDemo: false,
    );
  }

  final String id;
  final String title;
  final String authorName;
  final String contentType;
  final int version;
  final String summary;
  final String coverAsset;
  final String ownerUserId;
  final String stage;
  final String agentName;
  final String ownerHandle;
  final String category;
  final String instruction;
  final int likes;
  final int comments;
  final int saves;
  final bool localDemo;

  String get publicPath => '/content/$id';
}

class HomeSnapshot {
  const HomeSnapshot({
    required this.user,
    required this.playables,
    this.ownedPlayables = const <Playable>[],
    this.localDemo = false,
    this.followingUserIds = const <String>{},
    this.engagementsByContent = const <String, Set<String>>{},
    this.unreadNotifications = 0,
    this.account,
  });

  final AppUser user;
  final List<Playable> playables;
  final List<Playable> ownedPlayables;
  final bool localDemo;
  final Set<String> followingUserIds;
  final Map<String, Set<String>> engagementsByContent;
  final int unreadNotifications;
  final AccountSnapshot? account;
}

class ServerCreationProgress {
  const ServerCreationProgress({
    required this.taskId,
    required this.contentId,
    required this.status,
    required this.progress,
  });

  final String taskId;
  final String contentId;
  final String status;
  final int progress;
}

class ServerPlayableRelease {
  const ServerPlayableRelease({
    required this.taskId,
    required this.contentId,
    required this.version,
    required this.title,
  });

  final String taskId;
  final String contentId;
  final int version;
  final String title;
}

class AccountSnapshot {
  const AccountSnapshot({
    required this.aip,
    required this.ait,
    required this.planName,
    required this.allowances,
    required this.followerCount,
    required this.followingCount,
    required this.likesReceived,
    required this.unreadNotifications,
    this.localDemo = false,
  });

  final int aip;
  final int ait;
  final String planName;
  final Map<String, ({int granted, int used, int remaining})> allowances;
  final int followerCount;
  final int followingCount;
  final int likesReceived;
  final int unreadNotifications;
  final bool localDemo;
}

class GrowthNodeMember {
  const GrowthNodeMember({
    required this.seat,
    required this.role,
    required this.displayName,
  });

  factory GrowthNodeMember.fromJson(Map<String, dynamic> json) =>
      GrowthNodeMember(
        seat: (json['seat'] as num?)?.toInt() ?? 0,
        role: '${json['role'] ?? 'member'}',
        displayName: '${json['displayName'] ?? 'Airvana 用户'}',
      );

  final int seat;
  final String role;
  final String displayName;
}

class GrowthNode {
  const GrowthNode({
    required this.id,
    required this.name,
    required this.inviteCode,
    required this.status,
    required this.mySeat,
    required this.members,
  });

  factory GrowthNode.fromJson(Map<String, dynamic> json) {
    final rawMembers = json['members'];
    return GrowthNode(
      id: '${json['id'] ?? ''}',
      name: '${json['name'] ?? '五人协作节点'}',
      inviteCode: '${json['inviteCode'] ?? ''}',
      status: '${json['status'] ?? 'forming'}',
      mySeat: (json['mySeat'] as num?)?.toInt() ?? 0,
      members: rawMembers is List
          ? rawMembers
                .whereType<Map<String, dynamic>>()
                .map(GrowthNodeMember.fromJson)
                .toList(growable: false)
          : const <GrowthNodeMember>[],
    );
  }

  final String id;
  final String name;
  final String inviteCode;
  final String status;
  final int mySeat;
  final List<GrowthNodeMember> members;
}

class ContentComment {
  const ContentComment({
    required this.id,
    required this.body,
    required this.authorName,
    required this.createdAt,
  });

  factory ContentComment.fromJson(Map<String, dynamic> json) => ContentComment(
    id: '${json['id'] ?? ''}',
    body: '${json['body'] ?? ''}',
    authorName: '${json['authorName'] ?? 'Airvana 用户'}',
    createdAt:
        DateTime.tryParse('${json['createdAt'] ?? ''}') ??
        DateTime.fromMillisecondsSinceEpoch(0),
  );

  final String id;
  final String body;
  final String authorName;
  final DateTime createdAt;
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.category,
    required this.title,
    required this.body,
    required this.createdAt,
    this.readAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: '${json['id'] ?? ''}',
        category: '${json['category'] ?? 'system'}',
        title: '${json['title'] ?? 'Airvana 通知'}',
        body: '${json['body'] ?? ''}',
        createdAt:
            DateTime.tryParse('${json['createdAt'] ?? ''}') ??
            DateTime.fromMillisecondsSinceEpoch(0),
        readAt: DateTime.tryParse('${json['readAt'] ?? ''}'),
      );

  final String id;
  final String category;
  final String title;
  final String body;
  final DateTime createdAt;
  final DateTime? readAt;

  bool get unread => readAt == null;
}

class NotificationSnapshot {
  const NotificationSnapshot({required this.items, required this.unread});

  final List<AppNotification> items;
  final int unread;
}

class DmConversation {
  const DmConversation({
    required this.id,
    required this.peerId,
    required this.peerName,
    required this.unread,
    required this.updatedAt,
    this.lastBody = '',
  });

  factory DmConversation.fromJson(Map<String, dynamic> json) => DmConversation(
    id: '${json['id'] ?? ''}',
    peerId: '${json['peerId'] ?? ''}',
    peerName: '${json['peerName'] ?? 'Airvana 用户'}',
    unread: (json['unread'] as num?)?.toInt() ?? 0,
    updatedAt:
        DateTime.tryParse('${json['updatedAt'] ?? ''}') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    lastBody: '${json['lastBody'] ?? json['lastMessage'] ?? ''}',
  );

  final String id;
  final String peerId;
  final String peerName;
  final int unread;
  final DateTime updatedAt;
  final String lastBody;
}

class DmMessage {
  const DmMessage({
    required this.id,
    required this.senderName,
    required this.body,
    required this.fromMe,
    required this.recalled,
    required this.createdAt,
  });

  factory DmMessage.fromJson(Map<String, dynamic> json) => DmMessage(
    id: '${json['id'] ?? ''}',
    senderName: '${json['senderName'] ?? ''}',
    body: '${json['body'] ?? ''}',
    fromMe: json['fromMe'] == true,
    recalled: json['recalled'] == true,
    createdAt:
        DateTime.tryParse('${json['createdAt'] ?? ''}') ??
        DateTime.fromMillisecondsSinceEpoch(0),
  );

  final String id;
  final String senderName;
  final String body;
  final bool fromMe;
  final bool recalled;
  final DateTime createdAt;
}

class ExperienceRecord {
  const ExperienceRecord({
    required this.id,
    required this.contentId,
    required this.title,
    required this.status,
    required this.version,
    required this.createdAt,
    this.completedAt,
    this.localDemo = false,
  });

  factory ExperienceRecord.fromJson(Map<String, dynamic> json) =>
      ExperienceRecord(
        id: '${json['id'] ?? ''}',
        contentId: '${json['contentId'] ?? ''}',
        title: '${json['title'] ?? '未命名作品'}',
        status: '${json['status'] ?? 'created'}',
        version: (json['version'] as num?)?.toInt() ?? 1,
        createdAt:
            DateTime.tryParse('${json['createdAt'] ?? ''}') ??
            DateTime.fromMillisecondsSinceEpoch(0),
        completedAt: DateTime.tryParse('${json['completedAt'] ?? ''}'),
        localDemo: false,
      );

  final String id;
  final String contentId;
  final String title;
  final String status;
  final int version;
  final DateTime createdAt;
  final DateTime? completedAt;
  final bool localDemo;

  bool get completed => status == 'completed';
}
