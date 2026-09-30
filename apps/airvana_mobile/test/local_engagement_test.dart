import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late MemoryLocalAirvanaPersistence persistence;
  late LocalAirvanaStore store;

  setUp(() {
    persistence = MemoryLocalAirvanaPersistence();
    store = LocalAirvanaStore(persistence: persistence);
  });

  test('本机收藏与点赞落盘，取消后移除', () async {
    var social = await store.setEngagement(
      playableId: 'plb_kol_town',
      eventType: 'save',
      active: true,
    );
    expect(social.hasSaved('plb_kol_town'), isTrue);
    expect(social.hasLiked('plb_kol_town'), isFalse);

    social = await store.setEngagement(
      playableId: 'plb_kol_town',
      eventType: 'like',
      active: true,
    );
    expect(social.hasLiked('plb_kol_town'), isTrue);

    // 换一个 store 实例读同一份持久化：模拟冷启动。
    final reopened = LocalAirvanaStore(persistence: persistence);
    final reloaded = await reopened.loadSocialState();
    expect(reloaded.savedPlayableIds, ['plb_kol_town']);
    expect(reloaded.likedPlayableIds, ['plb_kol_town']);

    social = await store.setEngagement(
      playableId: 'plb_kol_town',
      eventType: 'save',
      active: false,
    );
    expect(social.savedPlayableIds, isEmpty);
    expect(social.hasLiked('plb_kol_town'), isTrue);
  });

  test('重复收藏不产生重复条目，非法互动类型被拒绝', () async {
    await store.setEngagement(
      playableId: 'plb_orchard_merge',
      eventType: 'save',
      active: true,
    );
    final social = await store.setEngagement(
      playableId: 'plb_orchard_merge',
      eventType: 'save',
      active: true,
    );
    expect(social.savedPlayableIds, ['plb_orchard_merge']);

    await expectLater(
      store.setEngagement(
        playableId: 'plb_orchard_merge',
        eventType: 'share',
        active: true,
      ),
      throwsA(isA<LocalStoreException>()),
    );
  });
}
