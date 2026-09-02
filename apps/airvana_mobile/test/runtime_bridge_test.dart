import 'dart:convert';

import 'package:airvana_mobile/features/runtime/domain/runtime_bridge.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('RuntimeBridgeMessage', () {
    test('accepts a versioned server-confirmed completion', () {
      final message = RuntimeBridgeMessage.parse(
        jsonEncode({
          'version': 1,
          'type': 'runtime_event_accepted',
          'payload': {
            'eventType': 'playable_complete',
            'sequence': 3,
            'accepted': true,
            'points': 5,
            'rewardStatus': 'posted',
          },
        }),
      );
      expect(message.type, 'runtime_event_accepted');
      expect(message.payload['eventType'], 'playable_complete');
    });

    test('rejects unsupported versions and arbitrary message types', () {
      expect(
        () => RuntimeBridgeMessage.parse(
          jsonEncode({'version': 2, 'type': 'runtime_ready', 'payload': {}}),
        ),
        throwsFormatException,
      );
      expect(
        () => RuntimeBridgeMessage.parse(
          jsonEncode({'version': 1, 'type': 'execute_js', 'payload': {}}),
        ),
        throwsFormatException,
      );
    });

    test('rejects oversized messages and unconfirmed events', () {
      expect(
        () => RuntimeBridgeMessage.parse('x' * 4097),
        throwsFormatException,
      );
      expect(
        () => RuntimeBridgeMessage.parse(
          jsonEncode({
            'version': 1,
            'type': 'runtime_event_accepted',
            'payload': {
              'eventType': 'playable_complete',
              'sequence': 3,
              'accepted': false,
            },
          }),
        ),
        throwsFormatException,
      );
      expect(
        () => RuntimeBridgeMessage.parse(
          jsonEncode({
            'version': 1,
            'type': 'runtime_event_accepted',
            'payload': {
              'eventType': 'playable_complete',
              'sequence': 2,
              'accepted': true,
            },
          }),
        ),
        throwsFormatException,
      );
    });

    test('requires runtime ready content identity', () {
      expect(
        () => RuntimeBridgeMessage.parse(
          jsonEncode({
            'version': 1,
            'type': 'runtime_ready',
            'payload': <String, dynamic>{},
          }),
        ),
        throwsFormatException,
      );
    });
  });

  group('runtime origin policy', () {
    final base = Uri.parse('http://127.0.0.1:8082');

    test('allows only the exact configured HTTP origin', () {
      expect(
        isAllowedRuntimeUri(
          Uri.parse('http://127.0.0.1:8082/content/demo'),
          base,
        ),
        isTrue,
      );
      expect(
        isAllowedRuntimeUri(
          Uri.parse('http://127.0.0.1:8083/content/demo'),
          base,
        ),
        isFalse,
      );
      expect(
        isAllowedRuntimeUri(Uri.parse('https://example.com'), base),
        isFalse,
      );
      expect(
        isAllowedRuntimeUri(Uri.parse('javascript:alert(1)'), base),
        isFalse,
      );
    });
  });
}
