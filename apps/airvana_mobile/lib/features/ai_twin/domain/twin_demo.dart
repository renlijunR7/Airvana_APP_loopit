import 'dart:convert';

/// Local-only configuration; never represents model training or publication.
class TwinDemoConfig {
  const TwinDemoConfig({
    this.name = '我的 KOL 分身',
    this.tagline = '陪你发现更有趣的 Agentic Playable。',
    this.role = '游戏伙伴',
    this.style = 'cg',
    this.look = 'game',
    this.motion = 'explain',
    this.language = 'zh',
    this.knowledge = '',
    this.blockedTopics = '投资建议、代币价格预测',
  });

  factory TwinDemoConfig.fromJson(Map<String, dynamic> json) => TwinDemoConfig(
    name: json['name'] as String? ?? '我的 KOL 分身',
    tagline: json['tagline'] as String? ?? '',
    role: json['role'] as String? ?? '游戏伙伴',
    style: json['style'] as String? ?? 'cg',
    look: json['look'] as String? ?? 'game',
    motion: json['motion'] as String? ?? 'explain',
    language: json['language'] as String? ?? 'zh',
    knowledge: json['knowledge'] as String? ?? '',
    blockedTopics: json['blocked_topics'] as String? ?? '',
  );

  final String name, tagline, role, style, look, motion, language;
  final String knowledge, blockedTopics;

  String? get validationError {
    if (name.trim().isEmpty || name.trim().length > 24) return '名称需为 1–24 个字';
    if (tagline.length > 100) return '简介不能超过 100 个字';
    if (knowledge.length > 1000) return '知识内容不能超过 1000 个字';
    if (blockedTopics.length > 200) return '拒答范围不能超过 200 个字';
    if (!const ['游戏伙伴', '品牌讲解', '社区答疑'].contains(role) ||
        !const ['cg', 'anime', 'cyber'].contains(style) ||
        !const ['game', 'professional', 'street'].contains(look) ||
        !const ['explain', 'greet', 'point'].contains(motion) ||
        !const ['zh', 'en', 'ja'].contains(language)) {
      return '请重新选择有效的配置';
    }
    return null;
  }

  TwinDemoConfig copyWith({
    String? name,
    String? tagline,
    String? role,
    String? style,
    String? look,
    String? motion,
    String? language,
    String? knowledge,
    String? blockedTopics,
  }) => TwinDemoConfig(
    name: name ?? this.name,
    tagline: tagline ?? this.tagline,
    role: role ?? this.role,
    style: style ?? this.style,
    look: look ?? this.look,
    motion: motion ?? this.motion,
    language: language ?? this.language,
    knowledge: knowledge ?? this.knowledge,
    blockedTopics: blockedTopics ?? this.blockedTopics,
  );

  Map<String, dynamic> toJson() => {
    'name': name,
    'tagline': tagline,
    'role': role,
    'style': style,
    'look': look,
    'motion': motion,
    'language': language,
    'knowledge': knowledge,
    'blocked_topics': blockedTopics,
  };
  bool sameAs(TwinDemoConfig other) =>
      jsonEncode(toJson()) == jsonEncode(other.toJson());

  /// Deterministic fixture responses, not AI inference or a security classifier.
  String reply(String question, {String? playableTitle}) {
    final normalized = question.toLowerCase();
    final blocked =
        [
              '私钥',
              '助记词',
              '收益保证',
              '投资建议',
              '代币价格预测',
              'private key',
              'seed phrase',
              ...blockedTopics.split(RegExp(r'[、,，;；\n]+')),
            ]
            .map((s) => s.trim().toLowerCase())
            .where((s) => s.isNotEmpty)
            .any(normalized.contains);
    if (blocked) {
      return switch (language) {
        'en' =>
          '[AI · DEMO] This topic is outside my boundaries. Please ask the creator for help.',
        'ja' => '【AI・デモ】この質問には回答できません。クリエイターにご確認ください。',
        _ => '【AI · 模拟拒答】这个话题超出了我的回答范围，请由创作者本人确认。',
      };
    }
    final greeting = switch (language) {
      'en' => '[AI · DEMO] Hi, I am $name, your $role.',
      'ja' => '【AI・デモ】こんにちは、$name です。担当：$role。',
      _ => '【AI · 前端模拟】你好，我是$name，你的$role。',
    };
    if (normalized.contains('知识') ||
        normalized.contains('knowledge') ||
        normalized.contains('知識')) {
      return '$greeting\n${knowledge.trim().isEmpty ? '尚未添加本机知识，请在配置页补充后重新保存。' : knowledge.trim()}';
    }
    if (playableTitle != null) {
      return '$greeting\n${switch (language) {
        'en' => 'Welcome to $playableTitle. Follow the in-game guide and ask the creator about rules. This is a local preview, not a published assistant.',
        'ja' => '「$playableTitle」へようこそ。ゲーム内のガイドをご覧ください。これは公開されていないローカルプレビューです。',
        _ => '欢迎体验「$playableTitle」。可先按游戏内提示试玩，具体规则由创作者确认。此处仅模拟分身接待，不会发布或修改作品。',
      }}';
    }
    return '$greeting\n${tagline.trim()}\n${switch (language) {
      'en' => 'Try asking about my knowledge or test a blocked topic. Replies use local templates, not a live model.',
      'ja' => '知識や回答制限をお試しください。返信はローカルテンプレートで、AI モデルではありません。',
      _ => '你可以问“介绍你的知识”，或输入拒答话题测试边界。回复由本机规则模板模拟，不调用真实模型。',
    }}';
  }
}

class TwinDemoVersion {
  const TwinDemoVersion(this.number, this.config, this.createdAt);
  factory TwinDemoVersion.fromJson(Map<String, dynamic> json) =>
      TwinDemoVersion(
        (json['number'] as num).toInt(),
        TwinDemoConfig.fromJson(
          Map<String, dynamic>.from(json['config'] as Map),
        ),
        DateTime.parse(json['created_at'] as String),
      );
  final int number;
  final TwinDemoConfig config;
  final DateTime createdAt;
  Map<String, dynamic> toJson() => {
    'number': number,
    'config': config.toJson(),
    'created_at': createdAt.toIso8601String(),
  };
}

class TwinDemoMessage {
  const TwinDemoMessage(this.question, this.answer, this.revision);
  factory TwinDemoMessage.fromJson(Map<String, dynamic> json) =>
      TwinDemoMessage(
        json['question'] as String,
        json['answer'] as String,
        (json['revision'] as num).toInt(),
      );
  final String question, answer;
  final int revision;
  Map<String, dynamic> toJson() => {
    'question': question,
    'answer': answer,
    'revision': revision,
  };
}

class TwinDemoState {
  const TwinDemoState({
    this.config = const TwinDemoConfig(),
    this.versions = const [],
    this.messages = const [],
    this.testedRevision = 0,
    this.consent = false,
    this.enabled = false,
    this.playableIds = const [],
  });
  factory TwinDemoState.fromJson(Map<String, dynamic> json) => TwinDemoState(
    config: TwinDemoConfig.fromJson(
      Map<String, dynamic>.from(json['config'] as Map),
    ),
    versions: (json['versions'] as List? ?? [])
        .map(
          (v) => TwinDemoVersion.fromJson(Map<String, dynamic>.from(v as Map)),
        )
        .toList(),
    messages: (json['messages'] as List? ?? [])
        .map(
          (v) => TwinDemoMessage.fromJson(Map<String, dynamic>.from(v as Map)),
        )
        .toList(),
    testedRevision: (json['tested_revision'] as num?)?.toInt() ?? 0,
    consent: json['consent'] == true,
    enabled: json['enabled'] == true,
    playableIds: (json['playable_ids'] as List? ?? [])
        .whereType<String>()
        .toList(),
  );
  final TwinDemoConfig config;
  final List<TwinDemoVersion> versions;
  final List<TwinDemoMessage> messages;
  final int testedRevision;
  final bool consent, enabled;
  final List<String> playableIds;
  int get revision => versions.isEmpty ? 0 : versions.first.number;
  bool get tested => revision > 0 && testedRevision == revision;
  bool get active =>
      enabled && tested && consent && config.validationError == null;
  String get legacyStatus => revision == 0
      ? 'configuring'
      : active
      ? 'active_demo'
      : tested
      ? 'paused_demo'
      : 'testing';

  TwinDemoState save(
    TwinDemoConfig next,
    DateTime now, {
    bool restoring = false,
  }) {
    final error = next.validationError;
    if (error != null) throw StateError(error);
    if (!restoring && revision > 0 && next.sameAs(config)) return this;
    return TwinDemoState(
      config: next,
      versions: [
        TwinDemoVersion(revision + 1, next, now),
        ...versions,
      ].take(20).toList(),
      messages: messages,
      consent: consent,
      playableIds: playableIds,
    );
  }

  TwinDemoState test(String question) {
    if (revision == 0) throw StateError('请先保存分身');
    if (question.trim().isEmpty || question.trim().length > 300) {
      throw StateError('请输入 1–300 字的测试消息');
    }
    return _copy(
      testedRevision: revision,
      messages: [
        ...messages,
        TwinDemoMessage(
          question.trim(),
          config.reply(question.trim()),
          revision,
        ),
      ].reversed.take(20).toList().reversed.toList(),
    );
  }

  TwinDemoState authorize(bool value) =>
      _copy(consent: value, enabled: value && enabled);
  TwinDemoState activate(bool value) {
    if (value && (!tested || !consent)) throw StateError('请先测试当前版本，并确认本机演示授权');
    return _copy(enabled: value);
  }

  TwinDemoState bind(String id, bool value) {
    if (value && !active) throw StateError('请先启用当前分身');
    return _copy(
      playableIds: value
          ? {...playableIds, id}.toList()
          : playableIds.where((v) => v != id).toList(),
    );
  }

  TwinDemoState clearMessages() => _copy(messages: []);
  TwinDemoState _copy({
    int? testedRevision,
    bool? consent,
    bool? enabled,
    List<TwinDemoMessage>? messages,
    List<String>? playableIds,
  }) => TwinDemoState(
    config: config,
    versions: versions,
    messages: messages ?? this.messages,
    testedRevision: testedRevision ?? this.testedRevision,
    consent: consent ?? this.consent,
    enabled: enabled ?? this.enabled,
    playableIds: playableIds ?? this.playableIds,
  );
  Map<String, dynamic> toJson() => {
    'config': config.toJson(),
    'versions': versions.map((v) => v.toJson()).toList(),
    'messages': messages.map((v) => v.toJson()).toList(),
    'tested_revision': testedRevision,
    'consent': consent,
    'enabled': enabled,
    'playable_ids': playableIds,
  };
}
