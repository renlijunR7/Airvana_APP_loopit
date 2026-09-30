import 'dart:convert';

class RuntimeBridgeMessage {
  const RuntimeBridgeMessage({
    required this.version,
    required this.type,
    required this.payload,
  });

  static const maxMessageLength = 4096;
  static const allowedTypes = {'runtime_ready', 'runtime_event_accepted'};
  static const allowedEventTypes = {
    'playable_start',
    'step_complete',
    'playable_complete',
  };

  final int version;
  final String type;
  final Map<String, dynamic> payload;

  factory RuntimeBridgeMessage.parse(String raw) {
    if (raw.length > maxMessageLength) {
      throw const FormatException('Bridge 消息超过大小限制');
    }
    final decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Bridge 消息必须是 JSON 对象');
    }
    if (decoded['version'] != 1) {
      throw const FormatException('Bridge 版本不受支持');
    }
    final type = decoded['type'];
    if (type is! String || !allowedTypes.contains(type)) {
      throw const FormatException('Bridge 消息类型不在白名单');
    }
    final rawPayload = decoded['payload'];
    if (rawPayload is! Map<String, dynamic>) {
      throw const FormatException('Bridge payload 无效');
    }
    if (type == 'runtime_event_accepted') {
      final eventType = rawPayload['eventType'];
      if (eventType is! String || !allowedEventTypes.contains(eventType)) {
        throw const FormatException('Runtime 事件类型不在白名单');
      }
      final sequence = rawPayload['sequence'];
      final expectedSequence = {
        'playable_start': 1,
        'step_complete': 2,
        'playable_complete': 3,
      }[eventType];
      if (sequence is! int || sequence != expectedSequence) {
        throw const FormatException('Runtime 事件序号与类型不匹配');
      }
      if (rawPayload['accepted'] != true) {
        throw const FormatException('Runtime 事件未被服务端接受');
      }
    } else {
      final contentId = rawPayload['contentId'];
      if (contentId is! String || contentId.isEmpty) {
        throw const FormatException('Runtime ready 缺少内容标识');
      }
    }
    return RuntimeBridgeMessage(version: 1, type: type, payload: rawPayload);
  }
}

bool isAllowedRuntimeUri(Uri candidate, Uri apiBaseUri) {
  if (candidate.scheme != 'http' && candidate.scheme != 'https') return false;
  return candidate.scheme == apiBaseUri.scheme &&
      candidate.host == apiBaseUri.host &&
      candidate.port == apiBaseUri.port;
}
