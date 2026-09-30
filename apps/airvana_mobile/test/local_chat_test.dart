import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late MemoryLocalAirvanaPersistence persistence;
  late LocalAirvanaStore store;

  setUp(() {
    persistence = MemoryLocalAirvanaPersistence();
    store = LocalAirvanaStore(persistence: persistence);
  });

  test('本机私信线程与 Web 的 messageThreads 种子一致', () async {
    final threads = await store.loadMessageThreads();
    expect(threads.map((item) => item.id), [
      'support',
      'ai-twin',
      'nina',
      'leo',
    ]);
    expect(threads[1].unread, 1);
    // 只有 AI 分身线程能转人工，客服线程有自己的边界文案。
    expect(threads[1].canHandoff, isTrue);
    expect(threads[0].canHandoff, isFalse);
    expect(threads[0].isSupport, isTrue);
  });

  test('发送消息落盘并清掉未读，冷启动后仍在', () async {
    await store.appendMessage(threadId: 'ai-twin', text: '我来确认这条访客问题');
    final reopened = LocalAirvanaStore(persistence: persistence);
    final threads = await reopened.loadMessageThreads();
    final aiTwin = threads.firstWhere((item) => item.id == 'ai-twin');
    expect(aiTwin.messages.last.text, '我来确认这条访客问题');
    expect(aiTwin.messages.last.role, 'me');
    expect(aiTwin.unread, 0);
  });

  test('空消息与超长消息被拒绝，未知线程报错', () async {
    await expectLater(
      store.appendMessage(threadId: 'nina', text: '   '),
      throwsA(isA<LocalStoreException>()),
    );
    await expectLater(
      store.appendMessage(threadId: 'nina', text: 'x' * 1001),
      throwsA(isA<LocalStoreException>()),
    );
    await expectLater(
      store.appendMessage(threadId: 'ghost', text: '你好'),
      throwsA(isA<LocalStoreException>()),
    );
  });

  test('转由本人处理只在本机留痕', () async {
    final threads = await store.requestHumanHandoff('ai-twin');
    expect(
      threads.firstWhere((item) => item.id == 'ai-twin').handoffRequested,
      isTrue,
    );
  });
}
