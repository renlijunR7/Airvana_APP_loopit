import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late MemoryLocalAirvanaPersistence persistence;
  late LocalAirvanaStore store;

  setUp(() {
    persistence = MemoryLocalAirvanaPersistence();
    store = LocalAirvanaStore(persistence: persistence);
  });

  test('建立协作组后五席就位，发起人已确认', () async {
    final node = await store.createGrowthNode();
    expect(node.status, 'recruiting');
    expect(node.members, hasLength(5));
    expect(node.acceptedCount, 1);
    expect(node.members.first.role, '发起人 · 创作与运营');
  });

  test('五席全部确认后进入试运行', () async {
    await store.createGrowthNode();
    for (final seat in [2, 3, 4, 5]) {
      await store.inviteGrowthSeat(seat);
    }
    var node = await store.loadGrowthNode();
    expect(node.members[1].status, 'pending');

    for (final seat in [2, 3, 4]) {
      node = await store.resolveGrowthSeat(seat: seat, accepted: true);
    }
    expect(node.status, 'recruiting');

    node = await store.resolveGrowthSeat(seat: 5, accepted: true);
    expect(node.acceptedCount, 5);
    expect(node.status, 'trial');
  });

  test('发起人席位不能撤回，其余席位可撤回', () async {
    await store.createGrowthNode();
    await store.inviteGrowthSeat(3);
    await store.resolveGrowthSeat(seat: 3, accepted: true);

    await expectLater(
      store.removeGrowthMember(1),
      throwsA(isA<LocalStoreException>()),
    );

    final node = await store.removeGrowthMember(3);
    expect(node.members[2].status, 'empty');
    expect(node.members[2].name, '等待成员');
  });

  test('公约、暂停与申诉落盘，邀请码为空时拒绝加入', () async {
    await store.createGrowthNode();
    var node = await store.updateGrowthNode(
      charterAccepted: true,
      paused: true,
      appealSubmitted: true,
    );
    expect(node.charterAccepted, isTrue);
    expect(node.statusLabel, '已暂停（演示）');

    final reopened = LocalAirvanaStore(persistence: persistence);
    node = await reopened.loadGrowthNode();
    expect(node.appealSubmitted, isTrue);

    await expectLater(
      store.joinGrowthNode('   '),
      throwsA(isA<LocalStoreException>()),
    );
  });
}
