import test from 'node:test';
import assert from 'node:assert/strict';
import {createMobileComponent} from './mobile-component-harness.mjs';

const slideById = (component, id) => {
  let slide=component.renderVals().sessionSlides.find(item=>item.id===id&&item.windowClass==='is-active');
  if (slide) return slide;
  for (let index=0; index<component.state.sessions.length; index+=1) {
    component.setState({playIdx:index});
    slide=component.renderVals().sessionSlides.find(item=>item.id===id&&item.windowClass==='is-active');
    if (slide) return slide;
  }
  return undefined;
};
const creationCategoryKeys = ['content','mechanics','narrative','sensing','social','operations','other'];
const collectCreationPowers = component => {
  const powers = new Map();
  for (const category of creationCategoryKeys) {
    component.setState({createPowerCat:category,powerSearchQuery:''});
    for (const item of component.renderVals().createPowers) powers.set(item.id,item);
  }
  return powers;
};

test('mobile primary navigation follows page hierarchy and returns after secondary work', () => {
  const {component} = createMobileComponent();
  const primaryState = {
    ob:4,
    launchVisible:false,
    panel:null,
    overlay:null,
    drawerOpen:false,
    systemModal:null,
    pendingDeleteAgentId:null
  };

  for (const screen of ['play','discover','world','messages','me']) {
    component.setState({...primaryState,screen});
    assert.equal(component.renderVals().showPrimaryNavigation, true, `${screen} must keep the primary navigation`);
  }

  component.setState({...primaryState,screen:'quests'});
  assert.equal(component.renderVals().showPrimaryNavigation, false, 'Creator Center is a secondary destination');

  for (const layer of [
    {screen:'me',panel:'profile'},
    {screen:'play',overlay:'content'},
    {screen:'me',drawerOpen:true},
    {screen:'play',systemModal:'daily'},
    {screen:'me',pendingDeleteAgentId:1},
    {screen:'play',launchVisible:true},
    {screen:'play',ob:3}
  ]) {
    component.setState({...primaryState,...layer});
    assert.equal(component.renderVals().showPrimaryNavigation, false, `secondary layer must hide navigation: ${JSON.stringify(layer)}`);
  }

  component.setState({...primaryState,screen:'quests'});
  component.renderVals().creatorCenterBack();
  assert.equal(component.state.screen, 'me');
  assert.equal(component.renderVals().showPrimaryNavigation, true);

  component.setState({...primaryState,screen:'world'});
  const worldNavigation = component.renderVals();
  assert.equal(worldNavigation.navWorld.className, 'is-active');
  assert.equal(worldNavigation.navWorld.ariaCurrent, 'page');
  assert.equal(worldNavigation.navPlay.className, '');
  assert.equal(worldNavigation.navPlay.ariaCurrent, 'false');

  component.setState({...primaryState,screen:'discover',playIdx:8,feedMiniGame:{...component.emptyFeedMiniGameState(),contentId:1,status:'playing'}});
  component.renderVals().navPlay.onClick();
  assert.equal(component.state.screen, 'play');
  assert.equal(component.state.playIdx, 0, 'opening Home should return to the featured interactive games');
  assert.equal(component.state.feedMiniGame.status, 'idle');
});

test('mobile My opens on Playables after startup and preserves later in-session tab choices', () => {
  const persistedKey = 'airvana.v5.agentic-positioning.v2';
  const {component, mount} = createMobileComponent({
    stored:{[persistedKey]:JSON.stringify({ob:4,meTab:'history'})}
  });

  mount();
  assert.equal(component.state.meTab, 'playables', 'a tab from the previous app session must not replace the default Works tab');

  component.setState({screen:'me',meTab:'saved'});
  component.setState({screen:'play'});
  component.renderVals().navMe.onClick();
  assert.equal(component.state.screen, 'me');
  assert.equal(component.state.meTab, 'saved', 'returning during the same session should preserve the user selection');
});

test('mobile settings drawer touch fallback scrolls a short viewport without triggering a row action', () => {
  const {component} = createMobileComponent();
  component.setState({ob:4,launchVisible:false,screen:'me',drawerOpen:true,overlay:null,panel:null});
  const values = component.renderVals();
  const target = {
    clientHeight:600,
    scrollHeight:920,
    scrollTop:0,
    setPointerCapture() {},
    releasePointerCapture() {}
  };

  values.drawerScrollStart({pointerType:'touch',pointerId:7,clientY:520,currentTarget:target});
  values.drawerScrollMove({pointerId:7,clientY:330,currentTarget:target,cancelable:true,preventDefault() {}});
  assert.equal(target.scrollTop, 190);
  assert.equal(component._drawerScrollMoved, true);

  let prevented = false;
  values.drawerPrimaryRows[0].onPick({preventDefault() { prevented=true; }});
  assert.equal(prevented, true);
  assert.equal(component.state.drawerOpen, true);
  assert.equal(component.state.overlay, null);

  values.drawerScrollWheel({deltaY:90,currentTarget:target,cancelable:true,preventDefault() {}});
  assert.equal(target.scrollTop, 280);
  values.drawerScrollEnd({pointerId:7,currentTarget:target});
});

test('mobile Home keeps every seeded playable while rendering only the active feed window', () => {
  const additions = [
    [34, '果园合合塔 Orchard Merge', '/assets/game-covers/category-expansion/orchard-merge.jpg'],
    [35, '星尘割草 Star Mower', '/assets/game-covers/category-expansion/star-mower.jpg'],
    [36, '月光奶茶铺 Moonlight Tea Shop', '/assets/game-covers/category-expansion/moonlight-tea-shop.jpg'],
    [37, '微粒竞技场 Microbe Arena', '/assets/game-covers/category-expansion/microbe-arena.jpg'],
    [38, '星轨牌阵 Star Deck Tactics', '/assets/game-covers/category-expansion/star-deck.jpg'],
    [39, '晶核防线 Crystal Bastion', '/assets/game-covers/category-expansion/crystal-bastion.jpg'],
    [40, '冒险者日志 Adventurer Journal', '/assets/game-covers/category-expansion/adventurer-journal.jpg'],
    [41, '成语侦探 Idiom Detective', '/assets/game-covers/category-expansion/idiom-detective.jpg'],
    [42, '六角前线 Hex Frontier', '/assets/game-covers/category-expansion/hex-frontier.jpg'],
    [43, '今日造型师 Studio Wardrobe', '/assets/game-covers/category-expansion/studio-wardrobe.jpg'],
    [44, '花园焕新 Garden Renewal', '/assets/game-covers/category-expansion/garden-renewal.jpg'],
    [24, '霓虹疾跑 Neon Dash', '/assets/game-covers/home-arcade/neon-dash-v2.jpg'],
    [25, '节拍熔炉 Pulse Forge', '/assets/game-covers/home-arcade/pulse-forge-v2.jpg'],
    [26, '天际叠塔 Sky Stack', '/assets/game-covers/home-arcade/sky-stack-v2.jpg'],
    [27, '符文回路 Rune Circuit', '/assets/game-covers/home-arcade/rune-circuit-v2.jpg'],
    [28, '棱镜连击 Prism Match', '/assets/game-covers/home-arcade/prism-match-v2.jpg'],
    [29, '星杯幻术 Star Cups', '/assets/game-covers/home-arcade/star-cups-v2.jpg'],
    [30, '深海寻光 Deep Catch', '/assets/game-covers/home-arcade/deep-catch-v2.jpg'],
    [31, '赤焰防线 Ember Bastion', '/assets/game-covers/home-arcade/ember-bastion-v2.jpg'],
    [32, '新星漂移 Nova Drift', '/assets/game-covers/home-arcade/nova-drift-v2.jpg'],
    [33, '虚空小队 Void Squadron', '/assets/game-covers/home-arcade/void-squadron-v2.jpg'],
    [15, 'I AM CAT 猫咪大逃脱', '/assets/game-covers/i-am-cat.png'],
    [16, '撒币之旅', '/assets/game-covers/coin-journey.png'],
    [17, '潜水员戴夫：丛林探险', '/assets/game-covers/jungle-diver.png'],
    [18, '星际前线：裂隙突击', '/assets/game-covers/rift-frontier.png'],
    [19, '星砂岛', '/assets/game-covers/stardust-island.png'],
    [20, '斗阵骑士', '/assets/game-covers/battle-knights.png'],
    [21, '银河玩具店', '/assets/game-covers/galaxy-toy-shop.png'],
    [22, '狂野飙车：极速传奇', '/assets/game-covers/asphalt-legend.png'],
    [23, '小炮手大战空降恶魔', '/assets/game-covers/sky-demon-defense.png']
  ];
  const {component} = createMobileComponent();
  let slides = component.renderVals().sessionSlides;
  assert.equal(slides.length, 2);
  assert.deepEqual(Array.from(slides, item=>item.id), [34,35]);
  assert.equal(slides[0].windowClass, 'is-active');
  assert.equal(slides[0].ariaHidden, 'false');
  assert.equal(slides[1].windowClass, 'is-buffered');
  assert.equal(slides[1].ariaHidden, 'true');
  component.setState({playIdx:2});
  slides = component.renderVals().sessionSlides;
  assert.deepEqual(Array.from(slides, item=>item.id), [35,36,37]);
  assert.equal(slides[1].windowClass, 'is-active');
  for (const [id, title, cover] of additions) {
    const playable = component.state.sessions.find(item => item.id === id);
    assert.ok(playable, `missing Home playable: ${title}`);
    assert.equal(playable.game, title);
    assert.equal(playable.cover, cover);
  }
  component.setState({playIdx:component.state.sessions.filter(item=>item.status==='published'||item.status==='archived').length-1});
  slides = component.renderVals().sessionSlides;
  assert.deepEqual(Array.from(slides, item=>item.id), [22,23]);
  assert.equal(slides.at(-1).windowClass, 'is-active');
  assert.equal(typeof slides.at(-1).onOpen, 'function');

  const stalePreview={...component.state.sessions.find(item=>item.id===35),stage:'玩法预览',article:'旧版预览',versions:[{id:'35-v1',label:'PREVIEW v1',status:'玩法预览',time:'昨天'}],likes:17};
  const storedState = JSON.stringify({ob:4,playIdx:14,sessions:[component.state.sessions[0],stalePreview]});
  const restored = createMobileComponent({stored:{'airvana.v5.agentic-positioning.v2':storedState}});
  restored.mount();
  assert.equal(restored.component.state.playIdx,0, 'a position from the previous app session must not hide the featured games');
  assert.equal(restored.component.state.sessions.some(item=>item.id===1), true);
  for (const [id] of additions) assert.equal(restored.component.state.sessions.some(item=>item.id===id), true);
  const migratedStarMower=restored.component.state.sessions.find(item=>item.id===35);
  assert.equal(migratedStarMower.stage,'深度试玩');
  assert.equal(migratedStarMower.versions[0].id,'35-v3');
  assert.equal(migratedStarMower.likes,17,'catalog migration should preserve local engagement metrics');
  restored.unmount();
});

test('mobile Home runs safety, farm and cup games through success, failure and replay states', () => {
  const {component, runTimers} = createMobileComponent();

  component.setState({playIdx:10});
  let safety = slideById(component, 1);
  assert.equal(safety.hasMiniGame, true);
  assert.equal(safety.miniGameIdle, true);
  safety.onMiniGameStart();
  for (const answer of [1,0,1]) {
    safety = slideById(component, 1);
    safety.miniGameChoices[answer].onPick();
    assert.equal(component.state.feedMiniGame.status, 'feedback');
    safety = slideById(component, 1);
    safety.onMiniGameAdvance();
  }
  assert.equal(component.state.feedMiniGame.status, 'success');
  assert.equal(component.state.feedMiniGame.score, 3);
  safety = slideById(component, 1);
  safety.onMiniGameReplay();
  assert.equal(component.state.feedMiniGame.status, 'playing');
  assert.equal(component.state.feedMiniGame.score, 0);

  component.setState({playIdx:11,feedMiniGame:component.emptyFeedMiniGameState()});
  let farm = slideById(component, 2);
  farm.onMiniGameStart();
  for (let miss=0; miss<3; miss+=1) {
    const target=component.state.feedMiniGame.target;
    component.actFeedMiniGame(2,(target+1)%9);
  }
  assert.equal(component.state.feedMiniGame.status, 'failure');
  assert.equal(component.state.feedMiniGame.lives, 0);
  farm = slideById(component, 2);
  farm.onMiniGameReplay();
  for (let hit=0; hit<5; hit+=1) component.actFeedMiniGame(2,component.state.feedMiniGame.target);
  assert.equal(component.state.feedMiniGame.status, 'success');
  assert.equal(component.state.feedMiniGame.score, 5);

  component.setState({playIdx:12,feedMiniGame:component.emptyFeedMiniGameState()});
  let cups = slideById(component, 6);
  cups.onMiniGameStart();
  for (let round=0; round<3; round+=1) {
    assert.equal(component.state.feedMiniGame.status, 'preview');
    runTimers(900);
    assert.equal(component.state.feedMiniGame.status, 'playing');
    const game=component.state.feedMiniGame;
    const correctPosition=game.cupOrder.indexOf(game.targetCup);
    component.actFeedMiniGame(6,correctPosition);
    assert.equal(component.state.feedMiniGame.status, 'feedback');
    component.advanceFeedMiniGame(6);
  }
  assert.equal(component.state.feedMiniGame.status, 'success');
  assert.equal(component.state.feedMiniGame.score, 3);

  const events=component.state.localEventLog;
  assert.ok(events.some(event=>event.event_name==='play_complete'&&event.playable_id==='plb_feed_red_cup_shuffle'));
  assert.ok(events.some(event=>event.event_name==='play_fail'&&event.playable_id==='plb_feed_energy_farm'));
  assert.ok(events.every(event=>event.properties.reward_issued!==true));
});

test('mobile Home ships ten original offline arcade games with sound, best scores and complete replay loops', () => {
  const {component, runTimers} = createMobileComponent();
  const arcadeIds=[24,25,26,27,28,29,30,31,32,33];
  const playableIds=new Set();
  const stages=new Set();

  for (const contentId of arcadeIds) {
    const definition=component.getFeedMiniGameDefinition(contentId);
    assert.ok(definition, `missing game definition ${contentId}`);
    playableIds.add(definition.playableId);
    if (definition.stage) stages.add(definition.stage);
    component.startFeedMiniGame(contentId);
    if (definition.type==='cups') {
      for (let round=0; round<definition.rounds; round+=1) {
        runTimers(900);
        const game=component.state.feedMiniGame;
        component.actFeedMiniGame(contentId,game.cupOrder.indexOf(game.targetCup));
        component.advanceFeedMiniGame(contentId);
      }
    } else {
      while (!['success','failure'].includes(component.state.feedMiniGame.status)) {
        component.actFeedMiniGame(contentId,component.state.feedMiniGame.target);
        if (component.state.feedMiniGame.status==='feedback') component.advanceFeedMiniGame(contentId);
      }
    }
    assert.equal(component.state.feedMiniGame.status,'success',`game ${contentId} should complete successfully`);
    assert.ok(component.state.feedMiniGameBestScores[contentId]>=definition.successThreshold);
    component.startFeedMiniGame(contentId,true);
    assert.equal(component.state.feedMiniGame.status,definition.type==='cups'?'preview':'playing');
    component.exitFeedMiniGame();
  }

  assert.equal(playableIds.size,10);
  assert.equal(stages.size,9);
  assert.equal(component.state.sessions.filter(item=>arcadeIds.includes(item.id)&&item.cover?.includes('/home-arcade/')).length,10);
  component.toggleFeedMiniGameSound();
  assert.equal(component.state.feedMiniGameMuted,true);
});

test('mobile Home runs all eleven category demos through complete local replay loops', () => {
  const {component}=createMobileComponent();
  const completeIds=[34,35,36,37,38,39,40,41,42,43,44];
  const deepIds=new Set([35,38,40,41,42,44]);

  for (const contentId of completeIds) {
    const definition=component.getFeedMiniGameDefinition(contentId);
    assert.ok(definition, `missing complete category game ${contentId}`);
    if (deepIds.has(contentId)) {
      assert.equal(definition.type,'deep');
      assert.equal(definition.stages,3);
      assert.match(definition.deepAsset,/^\.\/assets\/deep-games\/v2\/.+-gameplay-v2\.png$/);
      assert.ok(definition.deepGameKey);
      continue;
    }
    component.startFeedMiniGame(contentId);
    while (!['success','failure'].includes(component.state.feedMiniGame.status)) {
      const game=component.state.feedMiniGame;
      const choice=definition.type==='safety'?definition.rounds[game.round].correct:game.target;
      component.actFeedMiniGame(contentId,choice);
      if (component.state.feedMiniGame.status==='feedback') component.advanceFeedMiniGame(contentId);
    }
    assert.equal(component.state.feedMiniGame.status,'success');
    assert.ok(component.state.feedMiniGameBestScores[contentId]>=definition.successThreshold);
    const event=component.state.localEventLog.find(entry=>entry.event_name==='play_complete'&&entry.playable_id===definition.playableId);
    assert.equal(event?.campaign_id,'cmp_category_expansion_demo_20260814');
    assert.equal(event?.contract_version,'2.0.0');
    assert.equal(event?.properties.playable_config_version,'2.0.0');
    assert.equal(event?.properties.reward_issued,false);
    assert.equal(component.state.sessions.find(item=>item.id===contentId)?.stage,'完整试玩');
  }
  assert.deepEqual(completeIds.filter(contentId=>component.getFeedMiniGameDefinition(contentId).type==='deep'),[35,38,40,41,42,44]);
  assert.match(component.state.sessions.find(item=>item.id===37).article,/本地机器人，不代表真人或实时多人联机/);
  assert.match(component.state.sessions.find(item=>item.id===42).article,/确定性本地逻辑，不是真人联机/);
});

test('mobile Discover synchronizes all 21 original games into the first gallery section', () => {
  const {component}=createMobileComponent();
  component.setState({screen:'discover',discoverCat:'recommend'});
  const values=component.renderVals();
  assert.equal(values.discoverSections[0].tag,'原创新游');
  assert.deepEqual(Array.from(values.discoverSections[0].items,item=>item.id),[34,35,36,37,38,39,40,41,42,43,44,24,25,26,27,28,29,30,31,32,33]);
  assert.ok(values.discoverSections[0].items.every(item=>item.hasCover&&/\/(?:category-expansion|home-arcade)\//.test(item.cover)));
  assert.ok(values.discoverSections[0].items.every(item=>typeof item.onOpen==='function'));
});

test('mobile Home clears active mini-game state when the feed moves to another work', () => {
  const {component} = createMobileComponent();
  component.setState({playIdx:10});
  slideById(component,1).onMiniGameStart();
  const activeIndex=component.state.playIdx;
  const values=component.renderVals();
  values.feedDown({clientY:620,pointerId:4,currentTarget:{setPointerCapture(){}}});
  values.feedMove({clientY:500});
  values.feedUp();
  assert.equal(component.state.playIdx,activeIndex+1);
  assert.equal(component.state.feedMiniGame.status,'idle');
  assert.equal(component.state.feedMiniGame.contentId,null);
});

test('mobile Home lower info area switches games vertically without firing a social action', () => {
  const {component} = createMobileComponent();
  const contentId = 1;
  const beforeLikes = component.state.sessions.find(item => item.id === contentId).likes;
  let values = component.renderVals();
  values.feedInfoDown({clientY:700,pointerId:14,currentTarget:{setPointerCapture(){}}});
  values.feedInfoMove({clientY:560});
  values.feedInfoUp({pointerId:14,currentTarget:{releasePointerCapture(){}}});
  assert.equal(component.state.playIdx,1,'an upward gesture on the info rail must show the next game');

  values = component.renderVals();
  slideById(component,contentId).rail[0].onClick({preventDefault(){},stopPropagation(){}});
  assert.equal(component.state.sessions.find(item => item.id === contentId).likes,beforeLikes,'the click synthesized after a swipe must be ignored');

  slideById(component,contentId).rail[0].onClick({stopPropagation(){}});
  assert.equal(component.state.sessions.find(item => item.id === contentId).likes,beforeLikes+1,'a later deliberate tap must still work');
});

test('mobile Home action buttons keep pointer ownership and remain tappable', () => {
  const {component} = createMobileComponent();
  const contentId = 1;
  const beforeLikes = component.state.sessions.find(item => item.id === contentId).likes;
  let pointerCaptured = false;
  let propagationStopped = false;
  const actionTarget = {closest(selector){return selector.includes('[role="button"]') ? this : null;}};
  const values = component.renderVals();

  values.feedInfoDown({
    clientY:700,
    pointerId:15,
    target:actionTarget,
    currentTarget:{setPointerCapture(){pointerCaptured=true;}},
    stopPropagation(){propagationStopped=true;}
  });

  assert.equal(propagationStopped,true,'the outer feed must not start a competing drag');
  assert.equal(pointerCaptured,false,'the info rail must not capture a pointer that started on an action button');
  assert.equal(component._fdrag,false);
  slideById(component,contentId).rail[0].onClick({stopPropagation(){}});
  assert.equal(component.state.sessions.find(item => item.id === contentId).likes,beforeLikes+1);
});

test('mobile Home game exit restores feed swipe and keeps a compact replay launcher', () => {
  const {component} = createMobileComponent();
  slideById(component,1).onMiniGameExit();
  const activeIndex=component.state.playIdx;
  let safety = slideById(component,1);
  assert.equal(safety.hasMiniGame,false);
  assert.equal(safety.hasMiniGameLauncher,true);

  const values=component.renderVals();
  values.feedDown({clientY:620,pointerId:5,currentTarget:{setPointerCapture(){}}});
  values.feedMove({clientY:500});
  values.feedUp();
  assert.equal(component.state.playIdx,activeIndex+1);
  assert.equal(component.state.feedMiniGameDismissedContentId,null);
});

test('mobile Component toggles one like idempotently and keeps the feed count in sync', () => {
  const {component} = createMobileComponent();
  const contentId = 2;
  const before = component.state.sessions.find(item => item.id === contentId).likes;

  slideById(component, contentId).rail[0].onClick({stopPropagation() {}});
  assert.equal(component.state.sessions.find(item => item.id === contentId).likes, before + 1);
  assert.deepEqual(Array.from(component.state.likedContentIds), [contentId]);

  slideById(component, contentId).rail[0].onClick({stopPropagation() {}});
  assert.equal(component.state.sessions.find(item => item.id === contentId).likes, before);
  assert.deepEqual(Array.from(component.state.likedContentIds), []);
});

test('mobile Component gives the visible like control feedback on the current users own work', () => {
  const {component} = createMobileComponent();
  const contentId = 1;
  const before = component.state.sessions.find(item => item.id === contentId).likes;

  slideById(component, contentId).rail[0].onClick({stopPropagation() {}});
  assert.equal(component.state.sessions.find(item => item.id === contentId).likes, before + 1);
  assert.equal(component.state.likedContentIds.includes(contentId), true);
  assert.equal(component.state.localEventLog[0].event_name, 'playable_like_toggle');
});

test('mobile Component follows directly, confirms unfollow and toggles saves without duplicates', () => {
  const {component} = createMobileComponent();
  const contentId = 2;
  const owner = component.state.sessions.find(item => item.id === contentId).owner;
  const beforeSaves = component.state.sessions.find(item => item.id === contentId).saves;

  assert.equal(slideById(component, 1).showFollow, false);
  assert.equal(slideById(component, contentId).showFollow, true);
  assert.equal(slideById(component, contentId).followIcon, '+');
  slideById(component, contentId).onFollow({stopPropagation() {}});
  assert.equal(component.state.followingOwners.filter(item => item === owner).length, 1);
  assert.equal(slideById(component, contentId).followIcon, '✓');
  slideById(component, contentId).onFollow({stopPropagation() {}});
  assert.equal(component.state.overlay, 'unfollow');
  assert.equal(component.state.pendingFollowOwner, owner);
  assert.equal(component.state.followingOwners.includes(owner), true);
  component.renderVals().confirmUnfollow();
  assert.equal(component.state.followingOwners.includes(owner), false);
  assert.equal(component.state.overlay, null);

  slideById(component, contentId).rail[2].onClick({stopPropagation() {}});
  assert.equal(component.state.savedContentIds.filter(id => id === contentId).length, 1);
  assert.equal(component.state.sessions.find(item => item.id === contentId).saves, beforeSaves + 1);
  slideById(component, contentId).rail[2].onClick({stopPropagation() {}});
  assert.equal(component.state.savedContentIds.includes(contentId), false);
  assert.equal(component.state.sessions.find(item => item.id === contentId).saves, beforeSaves);
});

test('mobile Component separates share intent from link copy and resolves the attributed deep link', () => {
  const {component, setLocationHash, clipboardWrites} = createMobileComponent();
  const contentId = 2;

  slideById(component, contentId).rail[3].onClick({stopPropagation() {}});
  assert.equal(component.state.shareEvents.length, 1);
  assert.equal(component.state.shareEvents[0].contentId, contentId);
  assert.equal(component.state.shareEvents[0].kind, 'intent');
  assert.equal(component.state.overlay, 'share');
  assert.equal(clipboardWrites.length, 0);

  component.renderVals().copyShareLink();
  assert.equal(component.state.shareEvents[0].kind, 'copy');
  assert.match(clipboardWrites.at(-1), new RegExp(`^http://127\\.0\\.0\\.1:8082/\\?playable_id=${contentId}&version_id=`));
  assert.match(clipboardWrites.at(-1), /&kol_id=%40/);
  assert.match(clipboardWrites.at(-1), /&channel_id=share&link_id=local-link-/);
  assert.match(clipboardWrites.at(-1), new RegExp(`#playable-${contentId}$`));
  assert.equal(component.state.shareEvents.some(event => event.kind === 'confirmed'), false);

  component.setState({ob:4});
  setLocationHash(`#playable-${contentId}`);
  component.resolveSharedHash();
  assert.equal(component.state.selectedContentId, contentId);
  assert.equal(component.state.overlay, 'content');
  assert.equal(component.state.detailMode, 'detail');
});

test('Playable detail starts the selected complete local game on the Home feed', () => {
  const {component} = createMobileComponent();

  component.openContent(35, 'detail');
  const values = component.renderVals();
  assert.equal(values.detailTitle, '星尘割草 Star Mower');
  assert.equal(values.detailPrimaryActionLabel, '开始互动');

  values.detailPrimaryAction();

  assert.equal(component.state.screen, 'play');
  assert.equal(component.state.overlay, null);
  assert.equal(component.state.playIdx, 1);
  assert.equal(component.state.feedMiniGame.contentId, 35);
  assert.equal(component.state.feedMiniGame.status, 'playing');
});

test('mobile Component clears a stale playable hash and opens the home feed on normal startup', () => {
  const {component, setLocationHash, location, mount} = createMobileComponent();

  setLocationHash('#playable-1');
  mount();

  assert.equal(location.hash, '');
  assert.equal(component.state.screen, 'play');
  assert.equal(component.state.overlay, null);
});

test('mobile Component preserves a complete attributed playable deep link on startup', () => {
  const {component, setLocationHash, location, mount} = createMobileComponent();

  location.search = '?playable_id=2&version_id=v2&kol_id=%40sora&channel_id=share&link_id=local-link-2';
  setLocationHash('#playable-2');
  mount();

  assert.equal(location.hash, '#playable-2');
  assert.equal(component.state.selectedContentId, 2);
  assert.equal(component.state.overlay, 'content');
});

test('creation capability catalog exposes recommendation plus seven atomic categories and 47/44 role filtering', () => {
  const {component} = createMobileComponent();
  component.setState({overlay:'create',createStep:'home',createHomeTab:'create',createRoleScope:'kol',createPowerCat:'popular',powerSearchQuery:''});

  let values = component.renderVals();
  assert.equal(values.powerCategories.map(item=>item.key).join(','), ['popular',...creationCategoryKeys].join(','));
  assert.equal(values.powerCategories.map(item=>item.label).join(','), ['推荐','内容素材','玩法系统','角色剧情','感知设备','社交共创','智能运营','其他'].join(','));

  const kolPowers = collectCreationPowers(component);
  assert.equal(kolPowers.size, 47);
  assert.deepEqual(
    Object.fromEntries(creationCategoryKeys.map(category=>[category,[...kolPowers.values()].filter(item=>item.cat===category).length])),
    {content:7,mechanics:7,narrative:6,sensing:5,social:6,operations:8,other:8}
  );
  assert.deepEqual(new Set([...kolPowers.values()].map(item=>item.statusLabel)), new Set(['可生成原型','前端原型','需设备授权','需实时服务','需审批']));
  assert.equal([...kolPowers.values()].filter(item=>item.itemKind==='flow').length, 0);
  assert.equal([...kolPowers.values()].filter(item=>item.itemKind==='capability').length, 47);
  assert.equal([...kolPowers.values()].every(item=>typeof item.iconPath==='string'&&item.iconPath.startsWith('M')), true);
  assert.equal([...kolPowers.values()].every(item=>item.hasIconImage&&item.iconImage.startsWith('./assets/capability-icons/')), true);
  assert.equal([...kolPowers.values()].every(item=>!item.hasIconVector), true);
  assert.equal(new Set([...kolPowers.values()].map(item=>item.iconImage)).size, 47);
  assert.equal(kolPowers.has('remixFlow'), false);

  component.setState({createRoleScope:'player',composerMode:'quick',createPowerCat:'popular',selectedPowerIds:[],powerSearchQuery:''});
  const playerPowers = collectCreationPowers(component);
  assert.equal(playerPowers.size, 44);
  assert.deepEqual(
    Object.fromEntries(creationCategoryKeys.map(category=>[category,[...playerPowers.values()].filter(item=>item.cat===category).length])),
    {content:7,mechanics:7,narrative:6,sensing:5,social:6,operations:5,other:8}
  );
  for (const kolOnlyId of ['externalConnectors','campaignAttribution','campaignExperimentsKillSwitch']) {
    assert.equal(playerPowers.has(kolOnlyId), false, `${kolOnlyId} must remain hidden from the player role`);
    assert.equal(kolPowers.has(kolOnlyId), true, `${kolOnlyId} must remain available in the KOL catalog`);
  }
});

test('other capability category filters shared experimental powers and selection preserves the prompt and mode', () => {
  const {component} = createMobileComponent();
  const prompt = '创建一个轻量 3D 世界探索游戏，并为移动端提供降级体验。';
  component.setState({
    overlay:'create',createStep:'home',createHomeTab:'create',createRoleScope:'player',composerMode:'deep',
    createPowerCat:'other',gamePrompt:prompt,contentType:2,contentGoal:2,selectedPowerIds:[],recentPowerIds:[],powerSearchQuery:''
  });

  let values = component.renderVals();
  assert.equal(values.powerCategories.at(-1).key, 'other');
  assert.equal(values.powerCategories.at(-1).label, '其他');
  assert.equal(values.createPowers.length, 8);
  assert.deepEqual(
    Array.from(values.createPowers, item=>item.id),
    ['proceduralAnimation','mirrorDrawing','vrExperience','threeDScene','touchscreenSimulation','proceduralWorld','softBodyPhysics','guidedCreator']
  );
  assert.equal(values.createPowers.every(item=>item.cat==='other'), true);
  assert.equal(values.createPowers.every(item=>typeof item.iconPath==='string'&&item.iconPath.startsWith('M')), true);
  assert.equal(new Set(values.createPowers.map(item=>item.iconPath)).size, 8);
  assert.equal(values.createPowers.every(item=>item.hasIconImage&&item.iconImage.startsWith('./assets/capability-icons/')), true);
  assert.equal(values.createPowers.every(item=>!item.hasIconVector), true);
  assert.equal(new Set(values.createPowers.map(item=>item.iconImage)).size, 8);
  assert.match(values.powerCategoryHint, /实验型.*跨媒介.*专用创作能力/);

  const threeDScene = values.createPowers.find(item=>item.id==='threeDScene');
  assert.ok(threeDScene);
  threeDScene.onUse();
  assert.deepEqual(Array.from(component.state.selectedPowerIds), ['threeDScene']);
  assert.equal(component.state.gamePrompt, prompt);
  assert.equal(component.state.composerMode, 'deep');
  assert.equal(component.state.createPowerCat, 'other');
  assert.equal(component.state.contentType, 2);
  assert.equal(component.state.contentGoal, 2);

  values = component.renderVals();
  assert.equal(values.selectedPowers[0].id, 'threeDScene');
  assert.equal(values.createPowers.find(item=>item.id==='threeDScene').selected, true);
});

test('creation recommendations combine prompt goals, missing categories and truthful status metadata', () => {
  const {component} = createMobileComponent();
  component.setState({
    overlay:'create',createStep:'home',createHomeTab:'create',createRoleScope:'kol',createPowerCat:'popular',
    gamePrompt:'创建一个摄像头 AR 互动挑战，并通过 Telegram 外部渠道发布。',
    composerGoalObjective:'记录归因转化',recentPowerIds:[],selectedPowerIds:[],powerSearchQuery:''
  });

  const values = component.renderVals();
  const recommendations = new Map(values.createPowers.map(item=>[item.id,item]));
  for (const id of ['cameraAr','challenge','externalConnectors','campaignAttribution']) {
    assert.equal(recommendations.has(id), true, `${id} should be recommended from the prompt or goal`);
    assert.equal(recommendations.get(id).recommendationReason, '按目标推荐');
  }
  assert.equal(recommendations.get('cameraAr').statusLabel, '需设备授权');
  assert.equal(recommendations.get('externalConnectors').statusLabel, '需审批');
  assert.match(values.powerCategoryHint, /最近使用.*热门组合.*按目标推荐.*缺失能力补全/);
  assert.doesNotMatch(values.powerCategoryHint, /Remix/);
  assert.equal(Object.hasOwn(values, 'showControlledRemix'), false);
  assert.equal(values.powerResultMeta, `动态推荐 ${values.createPowers.length} 项`);
});

test('creation recommendations disclose four relevant capabilities before the full catalog', () => {
  const {component} = createMobileComponent();
  component.setState({
    overlay:'create',createStep:'home',createHomeTab:'create',createRoleScope:'kol',createPowerCat:'popular',
    gamePrompt:'创建一个摄像头 AR 互动挑战，并通过 Telegram 外部渠道发布。',
    composerGoalObjective:'记录归因转化',recentPowerIds:[],selectedPowerIds:[],powerSearchQuery:'',powerCatalogExpanded:false
  });

  let values = component.renderVals();
  assert.equal(values.createPowers.length, 4);
  assert.equal(values.showPowerCatalogToggle, true);
  assert.match(values.powerCatalogToggleLabel, /查看全部/);
  values.togglePowerCatalog();

  values = component.renderVals();
  assert.ok(values.createPowers.length > 4);
  assert.equal(component.state.powerCatalogExpanded, true);
  assert.match(values.powerCatalogToggleLabel, /收起/);
  values.togglePowerCatalog();
  assert.equal(component.state.powerCatalogExpanded, false);
});

test('selecting a capability preserves the prompt and mode while updating the selected tray', () => {
  const {component} = createMobileComponent();
  const prompt = '制作一个使用摄像头识别姿势的安全教育互动挑战。';
  component.setState({
    overlay:'create',createStep:'home',createHomeTab:'create',createRoleScope:'player',composerMode:'quick',
    createPowerCat:'sensing',gamePrompt:prompt,contentType:2,contentGoal:1,selectedPowerIds:[],recentPowerIds:[]
  });

  let camera = component.renderVals().createPowers.find(item=>item.id==='cameraAr');
  assert.ok(camera);
  camera.onUse();
  assert.equal(component.state.selectedPowerIds.join(','), 'cameraAr');
  assert.equal(component.state.gamePrompt, prompt);
  assert.equal(component.state.composerMode, 'quick');
  assert.equal(component.state.contentType, 2);
  assert.equal(component.state.contentGoal, 1);
  let values = component.renderVals();
  assert.equal(values.showSelectedPowers, true);
  assert.equal(values.selectedPowerCount, 1);
  assert.equal(values.selectedPowers[0].id, 'cameraAr');

  camera = values.createPowers.find(item=>item.id==='cameraAr');
  assert.equal(camera.selected, true);
  assert.equal(camera.actionClass, 'is-selected');
  assert.equal(camera.actionLabel, '✓');
  assert.equal(camera.border, '#FF5A70');
  assert.equal(Object.hasOwn(camera, 'shadow'), false);

  component.setState({composerMode:'deep'});
  camera = component.renderVals().createPowers.find(item=>item.id==='cameraAr');
  assert.equal(camera.border, '#18D8DE');
  assert.equal(Object.hasOwn(camera, 'shadow'), false);

  component.setState({composerMode:'quick'});
  camera = component.renderVals().createPowers.find(item=>item.id==='cameraAr');
  camera.onUse();
  assert.equal(component.state.selectedPowerIds.length, 0);
  assert.equal(component.state.gamePrompt, prompt);
  assert.equal(component.state.composerMode, 'quick');
});

test('templates restore valid atomic abilities while Remix stays outside the atomic catalog', () => {
  const {component} = createMobileComponent();
  component.setState({overlay:'create',screen:'play',createStep:'home',createHomeTab:'templates',createRoleScope:'kol',createPowerCat:'popular',selectedPowerIds:[],recentPowerIds:[]});

  const template = component.renderVals().templateCards[0];
  assert.equal(component.renderVals().templateHomeTabs.map(item=>item.label).join(','), '能力组合,模板');
  assert.ok(template);
  assert.ok(creationCategoryKeys.includes(template.powerCat));
  assert.ok(template.capabilityIds.length > 0);
  template.onUse();
  assert.equal(component.state.createHomeTab, 'create');
  assert.equal(component.state.createPowerCat, template.powerCat);
  assert.equal(component.state.selectedPowerIds.join(','), template.capabilityIds.join(','));
  assert.equal(component.state.recentPowerIds.join(','), template.capabilityIds.join(','));
  assert.equal(component.state.gamePrompt, template.prompt);

  component.setState({overlay:'create',screen:'play',createPowerCat:'popular',powerSearchQuery:''});
  const values = component.renderVals();
  assert.equal(values.createPowers.some(item=>item.id==='remixFlow'), false);
  assert.equal(component.state.selectedPowerIds.includes('remixFlow'), false);
  assert.match(values.createCapabilityBoundary, /Remix：独立受控流程/);
  assert.equal(Object.hasOwn(values, 'openControlledRemix'), false);
});

test('bottom template tab changes views without mutating the selected capability tray', () => {
  const {component} = createMobileComponent();
  component.setState({
    overlay:'create',createStep:'home',createHomeTab:'create',createRoleScope:'kol',
    createPowerCat:'popular',powerSearchOpen:false,powerSearchQuery:'',
    selectedPowerIds:['challenge','video'],recentPowerIds:['video']
  });

  let values = component.renderVals();
  const selectedBefore = [...component.state.selectedPowerIds];
  const recentBefore = [...component.state.recentPowerIds];
  assert.equal(Object.hasOwn(values, 'showTemplateShortcut'), false);
  assert.equal(Object.hasOwn(values, 'openTemplateLibrary'), false);
  assert.equal(values.createPowers.some(item=>item.id==='templateLibrary'), false);
  assert.equal(values.powerResultMeta, `动态推荐 ${values.createPowers.length} 项`);

  values.createHomeTabs.find(item=>item.key==='templates').onPick();
  assert.equal(component.state.createHomeTab, 'templates');
  assert.equal(component.state.createPowerCat, 'popular');
  assert.equal(component.state.overlay, 'create');
  assert.equal(component.state.createStep, 'home');
  assert.deepEqual(component.state.selectedPowerIds, selectedBefore);
  assert.deepEqual(component.state.recentPowerIds, recentBefore);
  assert.equal(component.state.powerSearchOpen, false);
  assert.equal(component.state.powerSearchQuery, '');

  component.renderVals().templateHomeTabs.find(item=>item.key==='create').onPick();
  assert.equal(component.state.createHomeTab, 'create');
  assert.deepEqual(component.state.selectedPowerIds, selectedBefore);
});

test('player capability state drops KOL-only, unknown and duplicate entries across role boundaries', () => {
  const {component} = createMobileComponent();

  assert.deepEqual(
    Array.from(component.sanitizeCapabilityIds(
      ['challenge','externalConnectors','challenge','campaignAttribution','remixFlow','unknown','textTypography'],
      'player'
    )),
    ['challenge','textTypography']
  );
  assert.deepEqual(
    Array.from(component.sanitizeCapabilityIds(
      ['challenge','externalConnectors','campaignAttribution','campaignExperimentsKillSwitch'],
      'kol'
    )),
    ['challenge','externalConnectors','campaignAttribution','campaignExperimentsKillSwitch']
  );
});

test('content-library asset copies keep player and KOL role scopes isolated', () => {
  const {component} = createMobileComponent();
  const base = component.state.sessions[0];
  component.setState({
    productCenterRoleView:'player',
    libraryFilter:'all',
    sessions:[
      {...base,id:'kol-archive',status:'archived',createdByRole:'kol',publishScope:'campaign_and_connectors'},
      {...base,id:'player-archive',status:'archived',createdByRole:'player',publishScope:'app_only',campaignId:null,contract:null,assetSnapshot:null,capabilityIds:['challenge','externalConnectors','campaignAttribution','remixFlow']}
    ],
    drafts:[]
  });

  const values = component.renderVals();
  assert.equal(values.libraryItems.length, 1);
  assert.equal(values.libraryItems[0].title, base.game);
  values.libraryItems[0].onArchive();

  const copied = component.state.drafts[0];
  assert.equal(copied.createdByRole, 'player');
  assert.equal(copied.publishScope, 'app_only');
  assert.equal(copied.campaignId, null);
  assert.equal(copied.contract, null);
  assert.deepEqual(Array.from(copied.capabilityIds), ['challenge']);
  assert.equal(component.state.createRoleScope, 'player');
  assert.deepEqual(Array.from(component.state.composerConnectors), []);
});

test('mobile Component share sheet channel and content actions remain truthful local intents', () => {
  const {component, clipboardWrites} = createMobileComponent();
  const contentId = 2;

  slideById(component, contentId).rail[3].onClick({stopPropagation() {}});
  component.renderVals().shareToTikTok();
  assert.equal(component.state.overlay, null);
  assert.equal(component.state.shareEvents[0].kind, 'channel-intent');
  assert.equal(component.state.shareEvents[0].channel, 'TikTok');
  assert.match(clipboardWrites.at(-1), /channel_id=share/);
  assert.equal(component.state.localEventLog[0].event_name, 'share_channel_intent');
  assert.equal(component.state.localEventLog[0].properties.channel, 'TikTok');
  assert.equal(component.state.localEventLog[0].properties.server_confirmed, false);

  slideById(component, contentId).rail[3].onClick({stopPropagation() {}});
  component.renderVals().markSharedDislike();
  assert.equal(component.state.localEventLog[0].event_name, 'content_not_interested');

  slideById(component, contentId).rail[3].onClick({stopPropagation() {}});
  component.renderVals().reportSharedContent();
  assert.equal(component.state.localEventLog[0].event_name, 'content_report_intent');

  slideById(component, contentId).rail[3].onClick({stopPropagation() {}});
  component.renderVals().blockSharedCreator();
  assert.equal(component.state.localEventLog[0].event_name, 'creator_block_intent');
  assert.equal(component.state.localEventLog[0].properties.allowed, true);

  slideById(component, contentId).rail[3].onClick({stopPropagation() {}});
  component.renderVals().restartSharedPlayable();
  assert.equal(component.state.localEventLog[0].event_name, 'replay_intent');
});

test('mobile Component unlocks approved distribution connectors and preserves channel attribution', () => {
  const {component, openedUrls} = createMobileComponent();
  const contentId = 1;
  component.setState({sessions:component.state.sessions.map(item=>item.id===contentId?{
    ...item,
    status:'published',
    contract:{version:'local-connector-contract',status:'reviewed-local-demo',distributionConnectors:['telegram','facebook','x','discord']}
  }:item)});

  component.openConnectorPublisher(contentId);
  assert.equal(component.state.overlay, 'connectorPublish');
  const values = component.renderVals();
  assert.deepEqual(Array.from(values.connectorPublishRows, row=>row.key), ['telegram','facebook','x','discord']);

  values.connectorPublishRows.find(row=>row.key==='telegram').onPublish();
  assert.match(openedUrls.at(-1).url, /^https:\/\/t\.me\/share\/url\?/);
  assert.match(decodeURIComponent(openedUrls.at(-1).url), /channel_id=telegram/);
  assert.match(decodeURIComponent(openedUrls.at(-1).url), /link_id=connector-telegram-/);
  assert.equal(component.state.distributionEvents[0].kind, 'connector-publish-intent');
  assert.equal(component.state.distributionEvents[0].channel, 'telegram');
  assert.equal(component.state.distributionEvents[0].serverConfirmed, false);
  assert.equal(component.state.localEventLog[0].event_name, 'connector_publish_intent');
  assert.equal(component.state.localEventLog[0].properties.channel, 'telegram');
});

test('mobile Component copies before Discord handoff and blocks unapproved connector scope', () => {
  const {component, openedUrls, clipboardWrites} = createMobileComponent();
  const contentId = 1;
  component.setState({sessions:component.state.sessions.map(item=>item.id===contentId?{
    ...item,
    status:'published',
    contract:{version:'local-discord-contract',status:'reviewed-local-demo',distributionConnectors:['discord']}
  }:item)});

  component.openConnectorPublisher(contentId);
  component.renderVals().connectorPublishRows[0].onPublish();
  assert.match(clipboardWrites.at(-1), /channel_id=discord/);
  assert.equal(openedUrls.at(-1).url, 'https://discord.com/channels/@me');

  const eventCount = component.state.distributionEvents.length;
  component.publishToConnector('telegram', contentId);
  assert.equal(component.state.distributionEvents.length, eventCount);
  assert.match(component.state.toast, /不在当前获批 Contract 范围内/);
});

test('mobile content library keeps the approved connector re-entry available', () => {
  const {component} = createMobileComponent();
  const contentId = 1;
  component.setState({panel:'library',sessions:component.state.sessions.map(item=>item.id===contentId?{
    ...item,
    status:'published',
    contract:{version:'local-library-contract',status:'reviewed-local-demo',distributionConnectors:['telegram','x']}
  }:item)});

  const libraryItem = component.renderVals().libraryItems.find(item=>item.title==='Crypto City 安全挑战');
  assert.equal(libraryItem.connectorReady, true);
  assert.equal(libraryItem.connectorCount, 2);
  libraryItem.onConnect();
  assert.equal(component.state.panel, null);
  assert.equal(component.state.overlay, 'connectorPublish');
  assert.equal(component.renderVals().connectorPublishRows.length, 2);
});

test('mobile Component comment submission appends the local item and increments the feed total', () => {
  const {component} = createMobileComponent();
  const contentId = 2;
  const beforeTotal = component.state.sessions.find(item => item.id === contentId).comments;
  const beforeItems = component.state.commentsByContent[contentId].length;

  slideById(component, contentId).rail[1].onClick({stopPropagation() {}});
  assert.equal(component.state.overlay, 'comments');
  component.renderVals().setCommentInput({target:{value:'本地行为测试反馈'}});
  component.renderVals().submitSocialComment();

  assert.equal(component.state.sessions.find(item => item.id === contentId).comments, beforeTotal + 1);
  assert.equal(component.state.commentsByContent[contentId].length, beforeItems + 1);
  assert.equal(component.state.commentsByContent[contentId].at(-1).text, '本地行为测试反馈');
  assert.equal(component.state.commentInput, '');
  assert.equal(component.state.localEventLog[0].event_name, 'comment_submit');
  assert.equal(component.state.localEventLog[0].properties.server_confirmed, false);
});

test('mobile Component creates controlled cross-creator Remix drafts without locked campaign fields', () => {
  const {component} = createMobileComponent();
  const contentId = 2;

  slideById(component, contentId).onRemix({stopPropagation() {}});
  let values = component.renderVals();
  assert.equal(component.state.overlay, 'remix');
  assert.equal(values.remixSheetTitle, '创建 Remix 草稿');
  values.remixScopeOptions.find(option => option.key === 'structure_visual').onPick();
  component.renderVals().confirmRemix();

  const draft = component.state.drafts[0];
  assert.equal(component.state.overlay, 'create');
  assert.equal(component.state.createStep, 'edit');
  assert.equal(draft.sourcePlayableId, contentId);
  assert.equal(draft.remixKind, 'new-playable');
  assert.equal(draft.remixScope, 'structure_visual');
  assert.equal(draft.campaignId, null);
  assert.equal(draft.contract, null);
  assert.equal(draft.lockedFieldsInherited, false);
  assert.equal(draft.assetLicenseStatus, 'unverified-local-demo');
  assert.equal(component.state.campaignBrand, '');
  assert.equal(component.state.campaignCTA, '');
  assert.equal(component.state.campaignRewardRule, '');
  assert.equal(component.state.campaignSettlementBasis, '');
  assert.equal(component.state.localEventLog[0].event_name, 'remix_draft_created');
});

test('mobile Component presents own work as Remix and creates a separate governed draft', () => {
  const {component} = createMobileComponent();
  const contentId = 1;
  const slide = slideById(component, contentId);

  assert.equal(slide.remixLabel, 'Remix');
  slide.onRemix({stopPropagation() {}});
  assert.equal(component.renderVals().remixSheetTitle, '创建 Remix 草稿');
  component.renderVals().confirmRemix();

  const draft = component.state.drafts[0];
  assert.notEqual(draft.id, contentId);
  assert.equal(draft.sourcePlayableId, contentId);
  assert.equal(draft.remixKind, 'new-playable');
  assert.equal(draft.campaignId, null);
  assert.equal(draft.contract, null);
  assert.equal(draft.lockedFieldsInherited, false);
  assert.equal(draft.assetLicenseStatus, 'same-owner-local-demo');
});

test('mobile Component emits truthful local product-event envelopes for feed actions', () => {
  const {component} = createMobileComponent();
  const contentId = 2;
  const owner = component.state.sessions.find(item => item.id === contentId).owner;

  slideById(component, contentId).rail[0].onClick({stopPropagation() {}});
  slideById(component, contentId).rail[2].onClick({stopPropagation() {}});
  slideById(component, contentId).onFollow({stopPropagation() {}});

  assert.deepEqual(
    Array.from(component.state.localEventLog.slice(0, 3), event => event.event_name),
    ['kol_follow_toggle', 'playable_save_toggle', 'playable_like_toggle']
  );
  for (const event of component.state.localEventLog.slice(0, 3)) {
    assert.equal(event.playable_id, `local-playable-${contentId}`);
    assert.equal(event.kol_id, owner);
    assert.equal(event.consent_state, 'local-demo');
    assert.equal(event.properties.server_confirmed, false);
  }
});

test('mobile Component records a first experience only once', () => {
  const {component} = createMobileComponent();
  const contentId = 2;
  const beforeAip = component.state.aip;
  const beforeViews = component.state.sessions.find(item => item.id === contentId).viewers;

  slideById(component, contentId).onDispatch({stopPropagation() {}});
  component.renderVals().detailChoices[0].onPick();
  assert.equal(component.state.experiencedContentIds.filter(id => id === contentId).length, 1);
  assert.equal(component.state.aip, beforeAip + 5);
  assert.equal(component.state.sessions.find(item => item.id === contentId).viewers, beforeViews + 1);

  component.renderVals().detailChoices[0].onPick();
  assert.equal(component.state.experiencedContentIds.filter(id => id === contentId).length, 1);
  assert.equal(component.state.aip, beforeAip + 5);
  assert.equal(component.state.sessions.find(item => item.id === contentId).viewers, beforeViews + 1);
});

test('mobile Component daily recommendation reward can be claimed only once per local date', () => {
  const {component} = createMobileComponent();
  const contentId = component.state.dailyTaskContentId;
  const beforeAip = component.state.aip;

  component.recordExperience(contentId, 'daily-recommendation');
  assert.equal(component.state.dailyTaskStatus, 'completed');
  assert.equal(component.state.systemModal, 'daily');

  component.runDailyTaskAction();
  assert.equal(component.state.dailyTaskStatus, 'claimed');
  assert.equal(component.state.aip, beforeAip + 5 + 20);
  const claimedDate = component.state.dailyTaskClaimedDate;

  component.setState({systemModal:'daily'});
  component.runDailyTaskAction();
  assert.equal(component.state.dailyTaskClaimedDate, claimedDate);
  assert.equal(component.state.aip, beforeAip + 5 + 20);
  assert.equal(component.state.txns.filter(item => item.title === '每日推荐任务').length, 1);
});

test('mobile Component resets a stale check-in by date and prevents a second same-day reward', () => {
  const {component} = createMobileComponent();
  const beforeAip = component.state.aip;
  const beforeStreak = component.state.streak;
  component.setState({checkedIn:true,lastCheckInDate:'2000-01-01'});

  let values = component.renderVals();
  assert.match(values.checkBtnLabel, /^签到领 /);
  values.checkIn();
  const today = component.localDateKey();
  const firstAip = component.state.aip;
  assert.equal(component.state.lastCheckInDate, today);
  assert.equal(component.state.checkedIn, true);
  assert.equal(component.state.streak, beforeStreak + 1);
  assert.ok(firstAip > beforeAip);

  values = component.renderVals();
  assert.equal(values.checkBtnLabel, '今日已签到 ✓');
  values.checkIn();
  assert.equal(component.state.aip, firstAip);
  assert.equal(component.state.streak, beforeStreak + 1);
});

test('mobile Component publishes due scheduled content locally and emits one notification', () => {
  const {component} = createMobileComponent();
  const contentId = 99;
  const scheduled = {
    ...component.state.sessions[1],
    id:contentId,
    game:'预约发布行为测试',
    status:'scheduled',
    stage:'已预约',
    scheduledAt:'2000-01-01T00:00:00.000Z',
    versions:[{id:'99-v1',label:'v1',status:'已预约',time:'明天'}]
  };
  const beforeNotifications = component.state.notifications.length;
  component.setState({sessions:[...component.state.sessions, scheduled]});

  component.processScheduledContent();
  const published = component.state.sessions.find(item => item.id === contentId);
  assert.equal(published.status, 'published');
  assert.equal(published.stage, '运行中');
  assert.equal(published.scheduledAt, null);
  assert.equal(published.versions.at(-1).status, '运行中');
  assert.equal(component.state.notifications.length, beforeNotifications + 1);
  assert.match(component.state.notifications[0].title, /预约内容已开始运营/);
});

test('mobile Component advances version, push and daily startup popups in order', () => {
  const {component} = createMobileComponent();
  component.setState({
    appVersion:'5.3.0', latestVersion:'5.4.0', versionPromptSeen:'',
    pushEnabled:true, pushPromptDate:'', dailyTaskPromptDate:'', dailyTaskClaimedDate:'',
    systemModal:null, systemModalQueue:[]
  });

  component.queueStartupPopups();
  assert.equal(component.state.systemModal, 'version');
  assert.deepEqual(Array.from(component.state.systemModalQueue), ['push', 'daily']);

  component.installLocalUpdate();
  assert.equal(component.state.appVersion, '5.4.0');
  assert.equal(component.state.systemModal, 'push');

  component.openPushMessage();
  assert.equal(component.state.screen, 'messages');
  assert.equal(component.state.systemModal, 'daily');
  assert.ok(component.state.notifications.some(item => item.read));

  component.dismissSystemModal();
  assert.equal(component.state.systemModal, null);
});

test('mobile Component dismisses each startup popup without executing its positive action', () => {
  const {component} = createMobileComponent();
  component.setState({
    appVersion:'5.3.0', latestVersion:'5.4.0', versionPromptSeen:'',
    pushEnabled:true, pushPromptDate:'', dailyTaskPromptDate:'', dailyTaskClaimedDate:'',
    systemModal:null, systemModalQueue:[]
  });
  const initialScreen = component.state.screen;

  component.queueStartupPopups();
  component.dismissSystemModal();
  assert.equal(component.state.appVersion, '5.3.0');
  assert.equal(component.state.versionPromptSeen, '5.4.0');
  assert.equal(component.state.systemModal, 'push');

  component.dismissSystemModal();
  assert.equal(component.state.screen, initialScreen);
  assert.equal(component.state.pushPromptDate, component.localDateKey());
  assert.equal(component.state.systemModal, 'daily');

  component.dismissSystemModal();
  assert.equal(component.state.dailyTaskStatus, 'available');
  assert.equal(component.state.dailyTaskPromptDate, component.localDateKey());
  assert.equal(component.state.systemModal, null);
});

test('full project center controls each startup demo popup from one test-environment panel', () => {
  const {component} = createMobileComponent();
  component.setState({
    panel:'productCenter', productCenterTab:'demo', frontendEnvironment:'test',
    demoPopupVersionEnabled:true, demoPopupMessageEnabled:true, demoPopupOperationsEnabled:true,
    appVersion:'5.3.0', latestVersion:'5.4.0', versionPromptSeen:'',
    pushEnabled:true, pushPromptDate:'', dailyTaskPromptDate:'', dailyTaskClaimedDate:'',
    systemModal:null, systemModalQueue:[]
  });

  let values = component.renderVals();
  assert.equal(values.productCenterIsDemo, true);
  assert.equal(values.demoEnvironmentLabel, '测试环境');
  assert.deepEqual(Array.from(values.demoPopupRows, row => row.key), ['version', 'operations', 'message']);
  assert.equal(values.demoPopupRows.every(row => row.ariaChecked === 'true'), true);

  values.demoPopupRows.find(row => row.key === 'version').onToggle();
  component.renderVals().demoPopupRows.find(row => row.key === 'operations').onToggle();
  component.queueStartupPopups();
  assert.equal(component.state.systemModal, 'push');
  assert.deepEqual(Array.from(component.state.systemModalQueue), []);

  component.dismissSystemModal();
  values = component.renderVals();
  values.demoPopupRows.find(row => row.key === 'message').onPreview();
  assert.equal(component.state.systemModal, 'push');
  assert.equal(component.state.localEventLog[0].event_name, 'demo_popup_preview_opened');
});

test('production display environment suppresses demo popups without changing account permissions', () => {
  const {component} = createMobileComponent();
  component.setState({
    frontendEnvironment:'test', demoPopupVersionEnabled:true, demoPopupMessageEnabled:true, demoPopupOperationsEnabled:true,
    appVersion:'5.3.0', latestVersion:'5.4.0', versionPromptSeen:'', pushEnabled:true, pushPromptDate:'',
    dailyTaskPromptDate:'', dailyTaskClaimedDate:'', systemModal:'version', systemModalQueue:['push','daily']
  });

  component.setFrontendEnvironment('production');
  assert.equal(component.state.frontendEnvironment, 'production');
  assert.equal(component.state.systemModal, null);
  assert.deepEqual(Array.from(component.state.systemModalQueue), []);
  assert.equal(component.state.demoPopupVersionEnabled, true, 'test preferences should remain available when returning to test');
  assert.equal(component.state.localEventLog[0].properties.permission_changed, false);

  component.queueStartupPopups();
  assert.equal(component.state.systemModal, null);
  const values = component.renderVals();
  assert.equal(values.demoEnvironmentLabel, '生产环境');
  assert.equal(values.demoPopupRows.every(row => row.disabled && row.ariaChecked === 'false'), true);
  values.demoPopupRows[0].onPreview();
  assert.equal(component.state.systemModal, null);
  assert.match(component.state.toast, /生产环境不展示演示弹窗/);
});

test('mobile Component saves categorized feedback locally, opens support chat, and exposes truthful profile-stat panels', () => {
  const {component} = createMobileComponent();

  let values = component.renderVals();
  assert.equal(values.supportSubmitDisabled, true);
  values.supportCategoryRows.find(row => row.key === 'bug').onPick();
  values = component.renderVals();
  values.setSupportContact({target:{value:'feedback@example.com'}});
  values.setSupportDraft({target:{value:'这是一个需要继续跟进的本地问题描述'}});
  values = component.renderVals();
  assert.equal(values.supportSubmitDisabled, false);
  values.submitSupportTicket();

  assert.equal(component.state.supportTickets.length, 1);
  assert.equal(component.state.supportTickets[0].status, 'local-record');
  assert.equal(component.state.supportTickets[0].category, 'bug');
  assert.equal(component.state.supportTickets[0].contact, 'feedback@example.com');
  assert.equal(component.state.supportDraft, '');
  assert.equal(component.state.supportContact, '');
  values = component.renderVals();
  assert.equal(values.supportTicketRows[0].categoryLabel, '功能异常');
  assert.equal(values.supportTicketRows[0].hasContact, true);
  values.contactSupport();
  assert.equal(component.state.panel, 'chat');
  assert.equal(component.state.panelReturn, 'support');
  assert.equal(component.state.messageThreadId, 'support');

  component.renderVals().openLikesStat();
  values = component.renderVals();
  assert.equal(component.state.panel, 'profileStats');
  assert.equal(values.panelProfileStats, true);
  assert.ok(values.profileLikeItems.length >= 1);
  assert.match(values.profileLikeItems[0].likeLabel, /次获赞/);

  component.renderVals().openFollowersStat();
  values = component.renderVals();
  assert.equal(values.profileStatEmpty, false);
  assert.ok(values.profileRelationItems.length >= 2);
  assert.ok(values.profileRelationItems.some(item => item.relationLabel === '回关'));
  assert.ok(values.profileRelationItems.some(item => item.relationLabel === '相互关注'));
  assert.match(values.profileRelationItems[0].meta, /演示关系/);
});

test('mobile identity center fails closed and completes the local KYC, node and super-node demo hierarchy', () => {
  const {component} = createMobileComponent();

  let values = component.renderVals();
  const identityRow = values.drawerPrimaryRows.find(row => row.label === '身份认证');
  assert.ok(identityRow);
  identityRow.onPick();
  values = component.renderVals();
  assert.equal(component.state.panel, 'identity');
  assert.equal(values.panelIdentity, true);
  assert.equal(values.identityPanelHome, true);
  assert.equal(values.identityCards.length, 4);
  assert.equal(values.identityValidCount, 1);

  values.identityCards.find(item => item.role === 'node').onOpen();
  component.renderVals().advanceIdentity();
  assert.equal(component.state.identityDetailRole, 'kyc');
  assert.equal(component.state.identityNodeStatus, 'locked');

  values = component.renderVals();
  values.advanceIdentity();
  assert.equal(component.state.identityKycStatus, 'consent');
  values = component.renderVals();
  assert.equal(values.identityShowConsent, true);
  assert.equal(values.identityPrimaryDisabled, true);
  values.advanceIdentity();
  assert.equal(component.state.identityKycStatus, 'consent');
  component.renderVals().toggleIdentityKycConsent();
  values = component.renderVals();
  assert.equal(values.identityPrimaryDisabled, false);
  values.advanceIdentity();
  assert.equal(component.state.identityKycStatus, 'document_demo');
  values = component.renderVals();
  assert.equal(values.identityShowDocumentUpload, true);
  assert.equal(values.identityKycUploadSlots.length, 2);
  assert.equal(values.identityPrimaryDisabled, true);
  values.identityKycUploadSlots[0].onFile({target:{files:[{name:'front-secret.jpg',type:'image/jpeg',size:900 * 1024}],value:'front-secret.jpg'}});
  values = component.renderVals();
  values.identityKycUploadSlots[1].onFile({target:{files:[{name:'back-secret.jpg',type:'image/jpeg',size:700 * 1024}],value:'back-secret.jpg'}});
  values = component.renderVals();
  assert.equal(values.identityPrimaryDisabled, false);
  assert.equal(component.state.identityKycUploads.id_front.sizeLabel, '900 KB');
  assert.equal('name' in component.state.identityKycUploads.id_front, false);
  values.advanceIdentity();
  assert.equal(component.state.identityKycStatus, 'pending_demo');
  assert.equal(Object.keys(component.state.identityKycUploads).length, 0);
  component.renderVals().advanceIdentity();
  assert.equal(component.state.identityKycStatus, 'verified_demo');
  assert.equal(component.state.identityNodeStatus, 'eligible');

  component.setState({identityDetailRole:'node'});
  component.renderVals().advanceIdentity();
  assert.equal(component.state.identityNodeStatus, 'pending_demo');
  component.renderVals().advanceIdentity();
  assert.equal(component.state.identityNodeStatus, 'active_demo');
  assert.equal(component.state.identitySuperNodeStatus, 'eligible');

  component.setState({identityDetailRole:'super_node'});
  component.renderVals().advanceIdentity();
  assert.equal(component.state.identitySuperNodeStatus, 'pending_demo');
  component.renderVals().advanceIdentity();
  assert.equal(component.state.identitySuperNodeStatus, 'active_demo');
  assert.ok(component.state.identityAuditLog.length >= 7);
  assert.ok(component.state.identityAuditLog.every(event => event.source === 'local-demo' && event.serverConfirmed === false));

  component.renderVals().closePanel();
  assert.equal(component.state.panel, 'identity');
  assert.equal(component.state.identityDetailRole, null);
  component.renderVals().resetIdentityDemo();
  assert.equal(component.state.identityKycStatus, 'verified_demo');
  assert.equal(component.state.destructiveAction.type, 'reset-identity');
  component.renderVals().confirmDestructiveAction();
  assert.equal(component.state.identityKycStatus, 'unverified');
  assert.equal(component.state.identityNodeStatus, 'locked');
  assert.equal(component.state.identitySuperNodeStatus, 'locked');
  assert.deepEqual(Array.from(component.state.identityAuditLog), []);
});

test('mobile KYC document step supports passport and rejects unsafe files without retaining raw documents', () => {
  const {component} = createMobileComponent();
  component.setState({panel:'identity',identityDetailRole:'kyc',identityKycStatus:'document_demo',identityKycDocumentType:'id_card',identityKycUploads:{},identityKycFileError:''});

  let values = component.renderVals();
  values.identityKycDocumentTypes.find(item => item.label === '护照').onPick();
  values = component.renderVals();
  assert.equal(component.state.identityKycDocumentType, 'passport');
  assert.equal(values.identityKycUploadSlots.length, 1);
  assert.equal(values.identityKycUploadSlots[0].label, '护照资料页');

  values.identityKycUploadSlots[0].onFile({target:{files:[{name:'passport.pdf',type:'application/pdf',size:400 * 1024}],value:'passport.pdf'}});
  values = component.renderVals();
  assert.match(values.identityKycFileError, /JPG、PNG 或 WebP/);
  assert.equal(values.identityPrimaryDisabled, true);

  values.identityKycUploadSlots[0].onFile({target:{files:[{name:'passport-private.png',type:'image/png',size:2 * 1024 * 1024}],value:'passport-private.png'}});
  values = component.renderVals();
  assert.equal(values.identityPrimaryDisabled, false);
  assert.deepEqual(Object.keys(component.state.identityKycUploads.passport).sort(), ['selected','sizeLabel','type']);
  assert.equal(JSON.stringify(component.state.identityKycUploads).includes('passport-private'), false);

  values.advanceIdentity();
  assert.equal(component.state.identityKycStatus, 'pending_demo');
  assert.equal(Object.keys(component.state.identityKycUploads).length, 0);
  assert.equal(component.state.identityAuditLog[0].action, 'kyc_document_submission_demo');
  assert.equal(JSON.stringify(component.state.identityAuditLog).includes('passport-private'), false);
});

test('mobile KYC country picker searches and selects a global country or region in-app', () => {
  const {component} = createMobileComponent();
  component.setState({panel:'identity',identityDetailRole:'kyc',identityKycStatus:'document_demo',identityKycCountry:'HK',identityCountryPickerOpen:false,identityCountryQuery:''});

  let values = component.renderVals();
  assert.ok(values.identityCountryTotal >= 240);
  assert.equal(values.identityKycCountryLabel, '中国香港');
  values.openIdentityCountryPicker();
  values = component.renderVals();
  assert.equal(values.showIdentityCountryPicker, true);
  values.setIdentityCountryQuery({target:{value:'法国'}});
  values = component.renderVals();
  assert.equal(values.identityKycCountryOptions.length, 1);
  assert.equal(values.identityKycCountryOptions[0].value, 'FR');
  values.identityKycCountryOptions[0].onPick();
  values = component.renderVals();
  assert.equal(component.state.identityKycCountry, 'FR');
  assert.equal(values.identityKycCountryLabel, '法国');
  assert.equal(values.showIdentityCountryPicker, false);
});

test('mobile email login validates, sends, expires and verifies the local one-time code', () => {
  const {component} = createMobileComponent();
  component.setState({ob:3,panel:'emailLogin',loginEmailValue:'',loginEmailCodeSent:false,loginEmailCooldown:0});

  let values = component.renderVals();
  values.setLoginEmailValue({target:{value:'红红火火'}});
  values = component.renderVals();
  assert.equal(values.emailLoginActionDisabled, true);
  values.setLoginEmailValue({target:{value:'Creator@Example.com'}});
  values = component.renderVals();
  assert.equal(values.emailLoginActionDisabled, false);
  values.confirmEmailLogin();
  values = component.renderVals();
  assert.equal(values.emailCodeSent, true);
  assert.equal(component.state.loginEmailSentTo, 'creator@example.com');
  assert.match(component.state.loginEmailDemoCode, /^\d{6}$/);
  values.setLoginEmailOtpValue({target:{value:component.state.loginEmailDemoCode}});
  values = component.renderVals();
  assert.equal(values.emailLoginActionDisabled, false);
  values.confirmEmailLogin();
  assert.equal(component.state.loginProvider, 'email');
  assert.equal(component.state.ob, 4);
  assert.equal(component.state.panel, null);
});

test('mobile destructive actions keep data until the shared confirmation is accepted', () => {
  const {component} = createMobileComponent();
  component.setState({playerPostMediaPreview:'data:image/png;base64,preview',playerPostMediaType:'image',playerPostMediaName:'preview.png'});

  let values = component.renderVals();
  values.clearPlayerPostMedia();
  values = component.renderVals();
  assert.equal(values.showDestructiveConfirm, true);
  assert.equal(component.state.playerPostMediaName, 'preview.png');
  values.cancelDestructiveAction();
  assert.equal(component.state.playerPostMediaName, 'preview.png');
  component.renderVals().clearPlayerPostMedia();
  component.renderVals().confirmDestructiveAction();
  assert.equal(component.state.playerPostMediaPreview, '');
  assert.equal(component.state.destructiveAction, null);
});

test('mobile creator identity application stays a local demo and opens creator center only after activation', () => {
  const {component} = createMobileComponent();
  component.setState({panel:'identity',identityDetailRole:'creator',identityCreatorStatus:'not_applied'});

  component.renderVals().advanceIdentity();
  assert.equal(component.state.identityCreatorStatus, 'pending_demo');
  assert.equal(component.state.identityAuditLog[0].serverConfirmed, false);
  component.renderVals().advanceIdentity();
  assert.equal(component.state.identityCreatorStatus, 'active_demo');
  component.renderVals().advanceIdentity();
  assert.equal(component.state.screen, 'quests');
  assert.equal(component.state.panel, null);
});

test('mobile inspiration guides an empty theme without losing selected suggestions', () => {
  const {component} = createMobileComponent();
  const theme = '创建一个帮助新用户理解品牌核心价值的三步互动挑战';
  component.setState({
    overlay:'create',createStep:'home',createHomeTab:'create',composerSheet:'inspiration',gamePrompt:'',
    composerPromptHistory:[],composerSuggestionBatch:0,composerInspirationSelectedIds:[],
    composerInspirationMode:'merge',composerInspirationPreviewOpen:false,validationError:''
  });

  let values = component.renderVals();
  values.composerSuggestions[0].onToggle();
  values = component.renderVals();
  assert.equal(values.composerInspirationSelectedCount, 1);
  assert.equal(values.composerInspirationPrimaryLabel, '先填写创意主题');
  assert.equal(values.composerInspirationPreviewClass.includes('action-disabled'), false);
  assert.equal(values.composerInspirationPreviewAriaDisabled, 'false');

  values.composerInspirationPrimaryAction();
  assert.equal(component.state.composerSheet, null);
  assert.equal(component.state.gamePrompt, '');
  assert.equal(component.state.composerInspirationPreviewOpen, false);
  assert.equal(component.state.composerInspirationSelectedIds.length, 1);
  assert.match(component.state.validationError, /已保留 1 条灵感建议/);

  values = component.renderVals();
  values.setGamePrompt({target:{value:theme}});
  assert.equal(component.state.composerInspirationSelectedIds.length, 1);
  component.renderVals().composerTools.find(item=>item.label==='AI 灵感').onPick();
  values = component.renderVals();
  assert.equal(component.state.composerSheet, 'inspiration');
  assert.equal(values.composerInspirationSelectedCount, 1);
  assert.equal(values.composerInspirationPrimaryLabel, '预览改动（1）');

  values.composerInspirationPrimaryAction();
  values = component.renderVals();
  assert.equal(values.composerInspirationPreviewOpen, true);
  assert.equal(component.state.gamePrompt, theme);
  assert.ok(values.composerInspirationPreviewText.startsWith(theme));
});

test('mobile composer previews and atomically applies selected inspiration without changing locked fields', () => {
  const {component} = createMobileComponent();
  const original = '创建一个帮助新用户理解品牌核心价值的三步互动挑战';
  const locked = {
    campaignBrand:'Airvana Demo Brand',campaignAudience:'18+ 钱包新用户',campaignRegion:'中国香港',campaignChannel:'KOL 专属链接',
    campaignSuccessEvent:'playable_complete',campaignCTA:'查看安全指南',campaignCTAUrl:'airvana-demo://approved-cta/safety',campaignRewardRule:'无现金奖励',
    campaignAttributionWindow:'点击后 7 天；完成后 24 小时',campaignAttributionModel:'KOL 专属链接优先',campaignSettlementBasis:'仅获批成功事件',
    campaignCompliance:'不得索取助记词',composerConnectors:['telegram'],campaignWorkflowStage:2
  };
  component.setState({overlay:'create',createStep:'home',createHomeTab:'create',gamePrompt:original,composerPromptHistory:[],composerSuggestionBatch:0,composerInspirationSelectedIds:[],composerInspirationMode:'merge',composerInspirationPreviewOpen:false,...locked});

  let values = component.renderVals();
  assert.equal(values.composerTools.map(item=>item.label).join(','), 'AI 灵感,项目素材,目标');
  assert.equal(values.composerTools.find(item=>item.label==='AI 灵感').meta, '可选');
  assert.equal(values.composerTools.find(item=>item.label==='AI 灵感').showBadge, false);
  assert.equal(values.composerTools.find(item=>item.label==='项目素材').meta, '待添加');
  assert.equal(values.composerTools.find(item=>item.label==='项目素材').showBadge, false);
  assert.equal(values.composerTools.find(item=>item.label==='目标').meta, '0/4');
  assert.equal(values.composerTools.find(item=>item.label==='目标').showBadge, false);
  values.composerTools.find(item=>item.label==='AI 灵感').onPick();
  values = component.renderVals();
  assert.equal(component.state.composerSheet, 'inspiration');
  assert.equal(values.composerSuggestions.length, 3);
  assert.equal(values.composerSheetSubtitle, '主题保持不变 · 选择建议，预览后再应用');
  values.composerSuggestions[0].onToggle();
  values = component.renderVals();
  values.composerSuggestions[1].onToggle();
  values = component.renderVals();
  assert.equal(values.composerInspirationSelectedCount, 2);
  assert.equal(component.state.gamePrompt, original, 'selecting suggestions must not mutate the prompt');
  assert.equal(component.state.composerPromptHistory.length, 0);

  values.previewComposerInspiration();
  values = component.renderVals();
  assert.equal(values.composerInspirationPreviewOpen, true);
  assert.equal(component.state.gamePrompt, original, 'preview must not mutate the prompt');
  assert.equal(values.composerInspirationBaseText, original);
  assert.match(values.composerInspirationPreviewText, /主题保持不变/);
  assert.equal(values.composerInspirationValidationRows.every(row=>row.state==='通过'), true);
  values.composerInspirationModes.find(mode=>mode.key==='append').onPick();
  values = component.renderVals();
  assert.equal(component.state.composerInspirationMode, 'append');
  assert.equal(component.state.gamePrompt, original);

  const lockedBefore=Object.fromEntries(Object.keys(locked).map(key=>[key,component.state[key]]));
  values.applyComposerInspiration();
  values = component.renderVals();
  assert.ok(component.state.gamePrompt.startsWith(original));
  assert.match(component.state.gamePrompt, /情境选择/);
  assert.equal(component.state.composerPromptHistory[0].before, original);
  assert.equal(component.state.composerPromptHistory[0].after, component.state.gamePrompt);
  assert.equal(JSON.stringify(Object.fromEntries(Object.keys(locked).map(key=>[key,component.state[key]]))),JSON.stringify(lockedBefore));
  assert.equal(component.state.composerInspirationPreviewOpen, false);
  assert.equal(component.state.composerInspirationSelectedIds.length, 0);
  assert.equal(component.renderVals().composerTools.find(item=>item.label==='AI 灵感').meta, '1 次');
  assert.equal(component.renderVals().composerTools.find(item=>item.label==='AI 灵感').badge, '1');

  component.renderVals().undoComposerSuggestion();
  assert.equal(component.state.gamePrompt, original);
  assert.equal(JSON.stringify(Object.fromEntries(Object.keys(locked).map(key=>[key,component.state[key]]))),JSON.stringify(lockedBefore));

  values = component.renderVals();
  values.composerSuggestions[2].onToggle();
  const batch = component.state.composerSuggestionBatch;
  component.renderVals().refreshComposerSuggestions();
  assert.equal(component.state.composerSuggestionBatch, batch + 1);
  assert.equal(component.state.composerInspirationSelectedIds.length, 0);
  assert.equal(component.state.gamePrompt, original);
  assert.equal(component.state.composerPromptHistory.length, 0);

  values = component.renderVals();
  values.composerSuggestions[0].onToggle();
  component.renderVals().previewComposerInspiration();
  component.setState({gamePrompt:original+'（用户刚刚更新）'});
  values = component.renderVals();
  assert.equal(values.composerInspirationPreviewStale, true);
  const stalePrompt=component.state.gamePrompt;
  const staleHistory=[...component.state.composerPromptHistory];
  values.applyComposerInspiration();
  assert.equal(component.state.gamePrompt, stalePrompt);
  assert.equal(JSON.stringify(component.state.composerPromptHistory),JSON.stringify(staleHistory));
  assert.match(component.state.composerInspirationError, /当前创意或 Campaign Contract 已更新/);
});

test('mobile inspiration blocks risky source copy before application', () => {
  const {component} = createMobileComponent();
  const risky='创建一个保证固定收益的 Web3 游戏挑战';
  component.setState({overlay:'create',createStep:'home',createHomeTab:'create',composerSheet:'inspiration',gamePrompt:risky,composerPromptHistory:[],composerSuggestionBatch:0,composerInspirationSelectedIds:[],composerInspirationMode:'merge',composerInspirationPreviewOpen:false});

  let values=component.renderVals();
  values.composerSuggestions[0].onToggle();
  component.renderVals().previewComposerInspiration();
  values=component.renderVals();
  assert.equal(values.composerInspirationHasConflict,true);
  assert.equal(values.composerInspirationApplyDisabled,true);
  assert.equal(values.composerInspirationValidationRows.some(row=>row.state==='阻断'),true);
  values.applyComposerInspiration();
  assert.equal(component.state.gamePrompt,risky);
  assert.equal(component.state.composerPromptHistory.length,0);
  assert.match(component.state.composerInspirationError,/锁定字段或高风险表达/);
});

test('mobile inspiration invalidates previews after Contract edits and never undoes manual copy', () => {
  const {component} = createMobileComponent();
  const original='创建一个保持品牌主题不变的三步互动挑战';
  component.setState({overlay:'create',createStep:'home',createHomeTab:'create',composerSheet:'inspiration',gamePrompt:original,composerPromptHistory:[],composerSuggestionBatch:0,composerInspirationSelectedIds:[],composerInspirationMode:'merge',composerInspirationPreviewOpen:false,campaignRegion:'中国香港'});

  let values=component.renderVals();
  values.composerSuggestions[0].onToggle();
  component.renderVals().previewComposerInspiration();
  component.setState({campaignRegion:'新加坡'});
  values=component.renderVals();
  assert.equal(values.composerInspirationPreviewStale,true);
  assert.equal(values.composerInspirationValidationRows.find(row=>row.label==='权限检查').state,'阻断');
  values.applyComposerInspiration();
  assert.equal(component.state.gamePrompt,original);

  component.setState({campaignRegion:'中国香港',composerInspirationPreviewOpen:false,composerInspirationPreviewText:'',composerInspirationBasePrompt:'',composerInspirationBaseContractVersion:'',composerInspirationSelectedIds:[],composerInspirationError:''});
  values=component.renderVals();
  values.composerSuggestions[0].onToggle();
  component.renderVals().previewComposerInspiration();
  component.renderVals().applyComposerInspiration();
  values=component.renderVals();
  assert.equal(values.composerCanUndo,true);
  values.setGamePrompt({target:{value:'用户手工修改后的文案'}});
  values=component.renderVals();
  assert.equal(component.state.composerPromptHistory.length,0);
  assert.equal(values.composerCanUndo,false);
  values.undoComposerSuggestion();
  assert.equal(component.state.gamePrompt,'用户手工修改后的文案');
});

test('mobile composer manages a local Asset Manifest without a separate authorization step', () => {
  const {component} = createMobileComponent();
  component.setState({overlay:'create',createStep:'home',createHomeTab:'create',composerMode:'quick',gamePrompt:'创建一个面向新用户的三步安全教育互动挑战，并展示获批行动',composerAssets:[],composerGoalObjective:'品牌认知',composerGoalAudience:'18+ 新用户（本地演示）',composerGoalSuccessEvent:'playable_complete（需服务器确认）',composerGoalCTAType:'了解更多',composerGoalSaved:true});

  let values = component.renderVals();
  assert.ok(values.composerAssetLibrary.length >= 2);
  values.composerAssetLibrary[0].onPick();
  values = component.renderVals();
  assert.equal(values.composerAssetRows.length, 1);
  assert.equal(values.composerTools.find(item=>item.label==='项目素材').badge, '1');
  assert.equal(values.composerAssetRows[0].onNextAuthorization, undefined);
  assert.doesNotMatch(component.state.campaignAssets, /授权/);
  assert.equal(values.composerPreflightIssues.some(issue => issue.id === 'pending-assets' || issue.id === 'blocked-assets'), false);
  assert.equal(values.composerSendLabel, '生成预览');
  values.composerSend();
  assert.equal(component.state.composerSheet, 'confirm');

  component.setState({composerSheet:'assets'});
  values = component.renderVals();
  values.composerAssetRows[0].onNextPurpose();
  values = component.renderVals();
  assert.equal(values.composerAssetRows[0].purposeLabel, '背景');
  values.composerAssetRows[0].onNextFocus();
  values = component.renderVals();
  assert.equal(values.composerAssetRows[0].focusLabel, '顶部');

  values.composerAssetLibrary[1].onPick();
  values = component.renderVals();
  const secondName = values.composerAssetRows[1].name;
  values.composerAssetRows[1].onMoveUp();
  assert.equal(component.renderVals().composerAssetRows[0].name, secondName);
  component.renderVals().composerAssetRows[0].onRemove();
  assert.equal(component.renderVals().composerAssetRows.length, 2);
  assert.equal(component.state.destructiveAction.type, 'remove-composer-asset');
  component.renderVals().confirmDestructiveAction();
  assert.equal(component.renderVals().composerAssetRows.length, 1);
});

test('mobile quick composer saves four goals, confirms the scheme and only starts local generation', () => {
  const {component} = createMobileComponent();
  component.setState({overlay:'create',createStep:'home',createHomeTab:'create',composerMode:'quick',gamePrompt:'创建一个帮助新用户理解品牌核心价值的三步互动挑战',composerAssets:[],composerGoalObjective:'',composerGoalAudience:'',composerGoalSuccessEvent:'',composerGoalCTAType:'',composerGoalSaved:false});

  let values = component.renderVals();
  assert.equal(values.composerSendLabel, '完善 2 项');
  values.composerTools.find(item=>item.label==='目标').onPick();
  values = component.renderVals();
  values.composerObjectiveOptions[0].onPick();
  component.renderVals().composerAudienceOptions[0].onPick();
  component.renderVals().composerSuccessOptions[0].onPick();
  component.renderVals().composerCTAOptions[0].onPick();
  values = component.renderVals();
  assert.equal(values.composerGoalCompleteCount, 4);
  values.saveComposerGoals();
  assert.equal(component.state.composerGoalSaved, true);

  values = component.renderVals();
  values.composerAssetLibrary[0].onPick();
  values = component.renderVals();
  assert.equal(values.composerSendLabel, '生成预览');
  assert.equal(values.composerSendClass, 'is-ready');
  values.composerSend();
  assert.equal(component.state.composerSheet, 'confirm');
  values = component.renderVals();
  assert.ok(values.composerSchemeRows.some(row => row.label === '成功事件'));
  assert.equal(values.composerHasAssumptions, true);
  values.confirmComposerGeneration();
  assert.equal(component.state.composerSheet, null);
  assert.equal(component.state.createStep, 'generating');
  assert.equal(component.state.generating, true);
  assert.equal(component.state.lastPublishedId, null);
  component.componentWillUnmount();
});

test('new creation starts with an isolated empty project asset manifest', () => {
  const {component} = createMobileComponent();
  component.setState({composerAssets:[{id:'old-asset',name:'上一项目素材',authorization:'confirmed'}],campaignAssets:'上一项目素材'});

  component.renderVals().openCreate();

  assert.equal(component.state.composerAssets.length, 0);
  assert.equal(component.state.campaignAssets, '');
  const values = component.renderVals();
  assert.equal(values.composerTools.find(item=>item.label==='项目素材').meta, '待添加');
  assert.ok(values.composerPreflightIssues.some(issue=>issue.id==='assets'));
});

test('mobile composer blocks risky promises before local preview generation', () => {
  const {component} = createMobileComponent();
  component.setState({overlay:'create',createStep:'home',composerMode:'quick',gamePrompt:'创建一个保证固定收益且无风险的互动挑战，完成后保证获批',composerGoalObjective:'品牌认知',composerGoalAudience:'18+ 新用户（本地演示）',composerGoalSuccessEvent:'playable_complete（需服务器确认）',composerGoalCTAType:'了解更多',composerGoalSaved:true,composerAssets:[{id:'asset-risk',sourceId:1,name:'演示封面',src:'local',type:'image',source:'project',purpose:'cover',focus:'center',authorization:'confirmed'}],campaignAssets:'演示封面（封面 · 授权已确认）'});

  let values = component.renderVals();
  assert.match(values.composerSendLabel, /^完善 /);
  values.composerSend();
  values = component.renderVals();
  assert.equal(component.state.composerSheet, 'preflight');
  assert.ok(values.composerPreflightIssues.some(issue => issue.id === 'risk'));
  values.composerPreflightIssues.find(issue => issue.id === 'risk').onFix();
  assert.equal(component.state.composerSheet, null);
  assert.match(component.state.validationError, /高风险表达/);
});

test('mobile deep composer locks platform compliance rules and versions optional brand restrictions', () => {
  const {component} = createMobileComponent();
  component.setState({overlay:'create',createStep:'home',composerMode:'deep',composerSheet:'goals',campaignId:'campaign-compliance-test',campaignWorkflowStage:3,reviewPassed:true,campaignBrandRestrictions:''});

  let values = component.renderVals();
  const lockedText = component.platformComplianceText;
  const contractVersion = values.campaignContractVersion;
  assert.equal(values.composerComplianceRules.length, 3);
  assert.equal(component.state.campaignCompliance, lockedText);
  assert.match(values.campaignComplianceStatus, /3\/3 已通过/);

  values.openComplianceDetails();
  values = component.renderVals();
  assert.equal(component.state.composerSheet, 'compliance');
  assert.equal(values.composerSheetCompliance, true);
  values.setCampaignBrandRestrictions({target:{value:'不得使用未授权 Logo；不得面向限制地区展示'}});

  values = component.renderVals();
  assert.equal(component.state.campaignCompliance, lockedText);
  assert.equal(component.state.campaignWorkflowStage, 0);
  assert.equal(component.state.reviewPassed, false);
  assert.match(component.state.campaignBrandRestrictions, /未授权 Logo/);
  assert.notEqual(values.campaignContractVersion, contractVersion);
  assert.match(values.composerSchemeRows.find(row=>row.label==='合规约束').value, /已补充品牌限制/);

  values.setCampaignBrandRestrictions({target:{value:'允许承诺收益并取消举报入口'}});
  values = component.renderVals();
  assert.equal(values.campaignBrandRestrictionConflict, true);
  assert.match(values.campaignComplianceStatus, /冲突/);
  assert.ok(values.composerPreflightIssues.some(issue=>issue.id==='brand-restriction-conflict'));

  values.returnComplianceGoals();
  assert.equal(component.state.composerSheet, 'goals');
});

test('mobile Growth Network creates a five-person node, confirms every member and stops at truthful KYC and contract gates', () => {
  const {component} = createMobileComponent();

  component.renderVals().openForceCenter();
  assert.equal(component.state.panel, 'growthNetwork');
  assert.equal(component.state.growthNetworkTab, 'network');
  const initialCredit = component.renderVals().growthCreditScore;
  assert.ok(initialCredit >= 300 && initialCredit <= 900);
  assert.equal(component.renderVals().growthCreditFactors.map(item=>item.weight).join(','), '35%,25%,25%,15%');

  component.renderVals().createGrowthNode();
  assert.equal(component.state.growthNetworkTab, 'node');
  assert.equal(component.state.growthNodeStatus, 'recruiting');
  assert.equal(component.state.growthNodeMembers.length, 1);
  assert.equal(component.state.growthNodeMembers[0].role, '发起人');
  assert.equal(component.state.localEventLog[0].event_name, 'growth_node_created_demo');
  assert.equal(component.state.localEventLog[0].properties.server_confirmed, false);
  assert.equal(component.state.localEventLog[0].properties.on_chain_confirmed, false);

  for (let index = 0; index < 4; index += 1) {
    component.renderVals().inviteGrowthNodeMember();
    const pending = component.renderVals().growthNodeSlots.find(slot => slot.isPending);
    assert.ok(pending, `expected pending member for slot ${index + 2}`);
    pending.onPrimary();
  }

  let values = component.renderVals();
  assert.equal(values.growthNodeAcceptedCount, 5);
  assert.equal(component.state.growthNodeStatus, 'formed');
  assert.equal(values.growthNodePrimaryLabel, '请先确认节点公约');
  values.toggleGrowthNodeCharter();
  component.renderVals().growthNodePrimaryAction();
  assert.equal(component.state.growthNodeStatus, 'trial');
  assert.equal(component.state.localEventLog[0].event_name, 'growth_node_trial_started_demo');

  component.renderVals().growthNodePrimaryAction();
  assert.equal(component.state.panel, 'identity');
  assert.equal(component.state.panelReturn, 'growthNetwork');
  assert.equal(component.state.identityDetailRole, 'kyc');
  assert.equal(component.state.growthNodeStatus, 'trial');

  component.setState({identityKycStatus:'verified_demo',panel:'growthNetwork',identityDetailRole:null});
  values = component.renderVals();
  assert.ok(values.growthCreditScore > initialCredit);
  assert.equal(values.growthCreditEligible, true);
  assert.ok(values.growthNodeQualificationRows.some(row=>row.label==='节点信用分达到门槛'&&row.ok));
  component.renderVals().growthNodePrimaryAction();
  assert.equal(component.state.growthNodeStatus, 'economic_review_demo');
  assert.equal(component.state.localEventLog[0].event_name, 'growth_economic_node_application_demo');
  assert.equal(component.state.localEventLog[0].properties.server_confirmed, false);
  assert.equal(component.state.localEventLog[0].properties.on_chain_confirmed, false);
  assert.ok(component.state.localEventLog[0].properties.credit_score >= 650);
  assert.equal(component.state.localEventLog[0].properties.credit_threshold, 650);

  const runningCredit = component.renderVals().growthCreditScore;
  component.renderVals().pauseGrowthNode();
  assert.equal(component.state.growthNodeStatus, 'paused');
  assert.ok(component.renderVals().growthCreditScore < runningCredit);
});

test('mobile Growth Network invite-code path forms one primary node without issuing rewards', () => {
  const {component} = createMobileComponent();
  const beforeAip = component.state.aip;
  const beforeAit = component.state.ait;

  component.renderVals().openGrowthNodeJoin();
  assert.equal(component.state.growthNetworkTab, 'node');
  assert.equal(component.state.growthNodeJoinMode, true);
  component.renderVals().setGrowthNodeJoinCode({target:{value:'AIR-NINA-2050'}});
  component.renderVals().submitGrowthNodeJoin();

  assert.equal(component.state.growthNodeStatus, 'formed');
  assert.equal(component.state.growthNodeMembers.length, 5);
  assert.equal(component.state.growthNodeMembers.filter(member=>member.status==='accepted').length, 5);
  assert.equal(component.state.aip, beforeAip);
  assert.equal(component.state.ait, beforeAit);
  assert.equal(component.state.localEventLog[0].event_name, 'growth_node_joined_demo');

  component.renderVals().openGrowthNodeJoin();
  assert.match(component.state.toast, /只能加入一个主要经济节点/);
  assert.equal(component.state.growthNodeMembers.length, 5);
});

test('mobile AI Twin completes consent, persona, sandbox and channel demo without external automation', () => {
  const {component} = createMobileComponent();

  component.renderVals().openAiTwin();
  assert.equal(component.state.panel, 'aiTwin');
  assert.equal(component.state.aiTwinStatus, 'not_created');
  component.renderVals().advanceAiTwin();
  assert.match(component.state.toast, /确认 AI 分身授权/);

  component.renderVals().toggleAiTwinConsent();
  component.renderVals().advanceAiTwin();
  assert.equal(component.state.aiTwinStatus, 'configuring');
  component.renderVals().advanceAiTwin();
  assert.equal(component.state.aiTwinStatus, 'testing');
  component.renderVals().setAiTwinInput({target:{value:'我可以向用户承诺收益吗？'}});
  component.renderVals().sendAiTwinTest();
  assert.equal(component.state.aiTwinChat.at(-1).role, 'assistant');
  assert.match(component.state.aiTwinChat.at(-1).text, /投资建议|未审批/);
  component.renderVals().advanceAiTwin();
  assert.equal(component.state.aiTwinStatus, 'active_demo');
  assert.equal(component.state.localEventLog[0].event_name, 'ai_twin_activated_demo');

  const beforeExternal = component.state.aiTwinChannels.external;
  component.renderVals().aiTwinChannelRows.find(row=>row.key==='external').onToggle();
  assert.equal(component.state.aiTwinChannels.external, beforeExternal);
  assert.match(component.state.toast, /服务端授权/);
});

test('mobile AI Twin copies public profile once, then keeps profile and twin identity independent', () => {
  const {component} = createMobileComponent();
  const originalProfile = {...component.state.profile};
  let values = component.renderVals();

  assert.equal(values.aiTwinNeedsCreation, true);
  assert.equal(values.aiTwinCopyProfileAria, 'true');
  values.createPrimaryAiTwin();
  values = component.renderVals();
  assert.equal(component.state.aiTwinStatus, 'configuring');
  assert.equal(component.state.aiTwinProfileCopyConsumed, true);
  assert.equal(values.aiTwinCreated, true);
  assert.equal(component.state.aiTwinAuthorizations.find(item=>item.id==='profile-copy').status, 'used');
  assert.match(component.state.aiTwinName, new RegExp(originalProfile.name));

  values.setAiTwinName({target:{value:'Kai 的独立主分身'}});
  values.setAiTwinTagline({target:{value:'只服务于 AI 分身公开场景'}});
  component.renderVals().saveAiTwinIdentity();
  assert.equal(component.state.profile.name, originalProfile.name);
  assert.equal(component.state.profile.bio, originalProfile.bio);
  assert.equal(component.state.aiTwinScenes.find(scene=>scene.id==='main').personaName, 'Kai 的独立主分身');
  assert.equal(component.state.aiTwinVersions[0].status, 'draft');
  assert.equal(component.state.localEventLog[0].event_name, 'ai_twin_identity_saved');

  const countBefore = component.state.aiTwinScenes.filter(scene=>scene.kind==='primary').length;
  component.renderVals().createPrimaryAiTwin();
  assert.equal(component.state.aiTwinScenes.filter(scene=>scene.kind==='primary').length, countBefore);
  assert.match(component.state.toast, /已经创建/);
});

test('mobile AI Twin isolates scene locales and Campaign knowledge, then reviews, pauses and rolls back versions', () => {
  const {component} = createMobileComponent();
  component.renderVals().createPrimaryAiTwin();
  let values = component.renderVals();

  assert.equal(values.aiTwinSceneRows.length, 3);
  values.aiTwinSceneRows.find(scene=>scene.id==='wallet-guide').onPick();
  values = component.renderVals();
  assert.equal(values.aiTwinActiveSceneName, '钱包安全讲解分身');
  assert.equal(values.aiTwinLanguageOptions.length, 3);
  values.aiTwinLanguageOptions.find(locale=>locale.key==='en').onPick();
  values = component.renderVals();
  values.setAiTwinLanguageVoice({target:{value:'Wallet Safety English Voice'}});
  values.setAiTwinLanguageScript({target:{value:'Explain wallet permissions and the approved next step.'}});
  component.renderVals().saveAiTwinLanguagePack();
  assert.equal(component.state.aiTwinLanguagePacks['wallet-guide'].en.status, 'ready');
  assert.equal(component.state.aiTwinLanguagePacks['wallet-guide'].en.voice, 'Wallet Safety English Voice');
  assert.notEqual(component.state.aiTwinLanguagePacks.main.en.voice, 'Wallet Safety English Voice');

  values = component.renderVals();
  assert.equal(values.aiTwinCampaignRows.filter(row=>row.className==='is-active').length, 1);
  assert.equal(values.aiTwinCampaignRows.find(row=>row.className==='is-active').campaignId, 'campaign-crypto-city');
  assert.ok(values.aiTwinCampaignRows.filter(row=>row.className==='is-isolated').length >= 2);

  const sceneCount = component.state.aiTwinScenes.length;
  values.createAiTwinScene();
  const newSceneId = component.state.aiTwinSceneId;
  assert.equal(component.state.aiTwinScenes.length, sceneCount + 1);
  assert.equal(component.state.aiTwinCampaignScopes.some(scope=>scope.sceneId===newSceneId), false);
  assert.equal(component.state.aiTwinVersions.find(version=>version.sceneId===newSceneId).status, 'draft');

  values = component.renderVals();
  values.advanceAiTwinVersionReview();
  assert.equal(component.state.aiTwinVersions.find(version=>version.sceneId===newSceneId).status, 'reviewing');
  component.renderVals().advanceAiTwinVersionReview();
  assert.equal(component.state.aiTwinVersions.find(version=>version.sceneId===newSceneId).status, 'approved');
  component.renderVals().advanceAiTwinVersionReview();
  assert.equal(component.state.aiTwinVersions.find(version=>version.sceneId===newSceneId).status, 'running');
  component.renderVals().toggleActiveAiTwinScenePause();
  assert.equal(component.state.aiTwinScenes.find(scene=>scene.id===newSceneId).status, 'paused_demo');
  component.renderVals().toggleActiveAiTwinScenePause();
  assert.equal(component.state.aiTwinScenes.find(scene=>scene.id===newSceneId).status, 'active_demo');

  component.renderVals().aiTwinSceneRows.find(scene=>scene.id==='wallet-guide').onPick();
  values = component.renderVals();
  const rollback = values.aiTwinVersionRows.find(version=>version.id==='wallet-v1-0');
  assert.equal(rollback.canRollback, true);
  rollback.onRollback();
  assert.equal(component.state.aiTwinVersions.find(version=>version.id==='wallet-v1-0').status, 'running');
  assert.equal(component.state.aiTwinVersions.find(version=>version.id==='wallet-v1-1').status, 'approved');
  assert.equal(component.state.localEventLog[0].event_name, 'ai_twin_version_rolled_back');
});

test('mobile AI Twin runs a controlled full-body action, voice, interruption and fallback loop', () => {
  const {component, runTimers} = createMobileComponent();
  let values = component.renderVals();

  assert.equal(values.aiTwinActionFrames.length, 6);
  assert.equal(values.aiTwinActionOptions.length, 6);
  values.aiTwinActionOptions.find(item=>item.key==='point').onPick();
  assert.equal(component.state.aiTwinAction, 'point');
  assert.match(component.state.aiTwinSubtitle, /指向作品或按钮/);

  values = component.renderVals();
  assert.equal(values.aiTwinOutputModes.length, 3);
  values.aiTwinOutputModes.find(item=>item.key==='captions').onPick();
  assert.equal(component.state.aiTwinOutputMode, 'captions');
  assert.equal(component.state.aiTwinVoiceMuted, true);
  component.renderVals().toggleAiTwinSpeechDemo();
  assert.equal(component.state.aiTwinVoiceState, 'listening');
  assert.equal(component.state.aiTwinAction, 'nod');
  runTimers(400);
  assert.equal(component.state.aiTwinVoiceState, 'thinking');
  runTimers(700);
  assert.equal(component.state.aiTwinVoiceState, 'speaking');
  assert.equal(component.state.localEventLog[0].event_name, 'ai_twin_speech_preview');
  assert.equal(component.state.localEventLog[0].properties.server_confirmed, false);
  assert.ok(component.state.localEventLog[0].properties.segment_count > 1);

  component.renderVals().toggleAiTwinSpeechDemo();
  assert.equal(component.state.aiTwinVoiceState, 'listening');
  assert.match(component.state.aiTwinSubtitle, /已停止/);

  component.renderVals().demoAiTwinSafetyBlock();
  assert.equal(component.state.aiTwinVoiceState, 'blocked');
  assert.match(component.state.aiTwinSubtitle, /不能代替本人回答/);
  component.renderVals().toggleAiTwinFallback();
  assert.equal(component.state.aiTwinVoiceState, 'fallback');
  assert.equal(component.state.aiTwinVisualFallback, true);
  component.renderVals().toggleAiTwinFallback();
  assert.equal(component.state.aiTwinVoiceState, 'idle');
  assert.equal(component.state.aiTwinVisualFallback, false);
});

test('mobile AI Twin combines positioning and visual style then completes the seven-step game introduction', () => {
  const {component} = createMobileComponent();
  let values = component.renderVals();

  assert.equal(values.aiTwinPositionOptions.length, 4);
  assert.equal(values.aiTwinStyleOptions.length, 5);
  assert.equal(values.aiTwinPersonaAsset, '/ai-twin/heygen/web3-game-kol-poster.webp');
  assert.equal(values.aiTwinHeyGenReady, true);
  assert.equal(values.aiTwinHeyGenVideoSrc, '/ai-twin/heygen/web3-game-kol-zh-intro.mp4');
  assert.equal(values.aiTwinExperienceOptions.length, 3);
  values.aiTwinExperienceOptions.find(item=>item.key==='en-gameplay').onPick();
  values = component.renderVals();
  assert.equal(component.state.aiTwinExperience, 'en-gameplay');
  assert.equal(values.aiTwinHeyGenVideoSrc, '/ai-twin/heygen/web3-game-kol-en-gameplay.mp4');
  assert.equal(values.aiTwinTourSteps.length, 6);
  assert.match(values.aiTwinTourCurrentText, /English walkthrough/);
  values.aiTwinExperienceOptions.find(item=>item.key==='ko-community').onPick();
  values = component.renderVals();
  assert.equal(values.aiTwinHeyGenVideoSrc, '/ai-twin/heygen/web3-game-kol-ko-community.mp4');
  assert.match(values.aiTwinExperienceLanguage, /한국어/);
  values.aiTwinExperienceOptions.find(item=>item.key==='zh-intro').onPick();
  values = component.renderVals();
  assert.match(values.aiTwinVisualStyleLabel, /Web3 游戏 KOL/);
  values.aiTwinPositionOptions.find(item=>item.key==='advisor').onPick();
  assert.equal(component.state.aiTwinPosition, 'advisor');
  assert.match(component.state.aiTwinTagline, /专业顾问/);

  values = component.renderVals();
  values.aiTwinStyleOptions.find(item=>item.key==='cyber').onPick();
  assert.equal(component.state.aiTwinVisualStyle, 'cyber');
  values = component.renderVals();
  assert.equal(component.state.aiTwinExperience, 'ko-community');
  assert.equal(values.aiTwinPersonaAsset, '/ai-twin/heygen/showcase/cyber-tech-kol-poster.jpg');
  assert.equal(values.aiTwinHeyGenVideoSrc, '/ai-twin/heygen/showcase/cyber-tech-kol-motion.mp4');
  assert.equal(values.aiTwinHeyGenReady, true);
  assert.equal(values.aiTwinMotionEnabled, false);
  assert.equal(values.aiTwinStaticVisualReady, false);
  assert.equal(values.aiTwinExperienceLanguage, '角色动态样片');
  assert.match(values.aiTwinStageNote, /生成额度为 0/);
  assert.equal(values.aiTwinTourSteps.length, 6);

  values.aiTwinStyleOptions.find(item=>item.key==='anime').onPick();
  values = component.renderVals();
  assert.equal(component.state.aiTwinVisualStyle, 'anime');
  assert.equal(values.aiTwinPersonaAsset, '/ai-twin/personas/anime-game.png');
  assert.match(values.aiTwinVisualStyleLabel, /二次元 3D KOL/);
  assert.equal(values.aiTwinStyleOptions.find(item=>item.key==='anime').videoStatus, '角色保留 · 待口型');
  assert.equal(values.aiTwinHeyGenReady, false);
  assert.equal(values.aiTwinStaticVisualReady, true);
  assert.equal(values.aiTwinMotionBadgeLabel, '角色固定保留');
  assert.match(values.aiTwinStageNote, /不使用真人样片替换/);

  values.aiTwinStyleOptions.find(item=>item.key==='hyperreal').onPick();
  values = component.renderVals();
  values.aiTwinExperienceOptions.find(item=>item.key==='zh-intro').onPick();
  values = component.renderVals();
  assert.equal(values.aiTwinTourSteps.length, 7);

  values.toggleAiTwinTour();
  assert.equal(component.state.aiTwinTourStatus, 'running');
  assert.equal(component.state.aiTwinTourStep, 0);
  assert.match(component.renderVals().aiTwinTourCurrentText, /Airvana/);
  assert.equal(component.state.localEventLog[0].event_name, 'ai_twin_full_intro_start');

  for (let index = 1; index < 7; index += 1) component.renderVals().advanceAiTwinTour();
  assert.equal(component.state.aiTwinTourStep, 6);
  assert.match(component.renderVals().aiTwinTourCurrentText, /开始体验/);
  component.renderVals().advanceAiTwinTour();
  assert.equal(component.state.aiTwinTourStatus, 'completed');
  assert.equal(component.state.aiTwinVoiceState, 'waiting');
  assert.match(component.state.aiTwinSubtitle, /当前语言场景介绍已完成/);
  assert.equal(component.state.localEventLog[0].event_name, 'ai_twin_full_intro_complete');
});

test('mobile profile upload creates a session-only custom KOL twin in the existing role library', () => {
  const {component, storage} = createMobileComponent();
  component.setState({panel:'profile'});

  let values = component.renderVals();
  assert.equal(values.profileAvatarHasPreview, false);
  values.uploadProfileAvatar({target:{files:[{name:'kai-portrait.png',type:'image/png',size:640 * 1024}],value:'kai-portrait.png'}});
  values = component.renderVals();
  assert.equal(values.profileAvatarHasPreview, true);
  assert.match(component.state.profileAvatarPreview, /^data:image\/png;base64,/);
  assert.equal(component.state.aiTwinVisualStyle, 'custom');
  assert.equal(values.profileAvatarUploadStatus, '已选择 · 当前会话');

  values.openCustomAiTwinBuilder();
  values = component.renderVals();
  assert.equal(component.state.panel, 'aiTwin');
  assert.equal(values.aiTwinStyleOptions.length, 5);
  assert.equal(values.aiTwinStyleOptions[0].key, 'custom');
  assert.equal(values.aiTwinCustomSelected, true);
  assert.equal(values.aiTwinCustomStageReady, true);
  assert.equal(values.aiTwinHeyGenReady, false);
  assert.equal(values.aiTwinStaticVisualReady, false);
  assert.match(values.aiTwinStageNote, /真实 3D 网格、面部绑定、精准口型和身体动作需接入专用生成服务/);

  values.aiTwinCustomStyleOptions.find(item=>item.key==='anime').onPick();
  component.renderVals().aiTwinCustomLookOptions.find(item=>item.key==='street').onPick();
  component.renderVals().aiTwinCustomMotionOptions.find(item=>item.key==='greet').onPick();
  values = component.renderVals();
  assert.match(values.aiTwinCustomStageClass, /ai-twin-custom-style--anime/);
  assert.match(values.aiTwinCustomStageClass, /ai-twin-custom-look--street/);
  assert.match(values.aiTwinCustomStageClass, /ai-twin-custom-motion--greet/);
  values.saveCustomAiTwinRole();
  values = component.renderVals();
  assert.equal(component.state.aiTwinCustomSaved, true);
  assert.equal(component.state.aiTwinStatus, 'configuring');
  assert.equal(values.aiTwinStyleOptions[0].videoStatus, '当前会话 · 已保存');
  assert.equal(component.state.localEventLog[0].event_name, 'ai_twin_custom_role_saved');
  assert.equal(component.state.localEventLog[0].properties.server_confirmed, false);
  assert.equal(storage.has('profileAvatarPreview'), false);
});

test('mobile messaging, rights and governance stay local and expose truthful service boundaries', () => {
  const {component} = createMobileComponent();

  component.setState({screen:'messages',messageTab:'direct'});
  let values = component.renderVals();
  assert.match(values.profileRoleMeta, /KOL/);
  assert.equal(values.roleMainActionLabel, '创作游戏');
  assert.equal(values.meTabs.map(tab=>tab.key).join(','), 'playables,drafts,saved,history');
  assert.equal(values.profileShortcuts.map(item=>item.label).join(','), '钱包,创作者中心,KOL AI 分身');
  assert.equal(values.profileShortcuts.find(item=>item.label==='钱包').meta, 'AIP 与 AIT');
  values.profileShortcuts.find(item=>item.label==='钱包').onPick();
  assert.equal(component.state.overlay, 'wallet');
  component.setState({overlay:null,screen:'messages'});
  assert.equal(values.showProfileShortcuts, true);
  assert.equal(values.messageCards.find(card=>card.id==='ai-twin').bg, 'var(--message-unread-bg,#FFF8F8)');
  assert.equal(values.messageCards.find(card=>card.id==='ai-twin').border, 'var(--message-unread-border,#FFD6DA)');
  assert.equal(values.messageCards.find(card=>card.id==='nina').bg, 'var(--message-read-bg,#FFFFFF)');
  assert.equal(values.messageCards.find(card=>card.id==='nina').border, 'var(--message-read-border,#E5E5EA)');
  component.setState({messageTab:'social'});
  values = component.renderVals();
  assert.ok(values.messageCards.every(card=>card.bg==='var(--message-read-bg,#FFFFFF)'));
  assert.ok(values.messageCards.every(card=>card.border==='var(--message-read-border,#E5E5EA)'));
  component.setState({messageTab:'direct'});
  values = component.renderVals();
  values.messageCards.find(card=>card.id==='nina').onOpen();
  assert.equal(component.state.panel, 'chat');
  values = component.renderVals();
  assert.equal(values.activeThreadBadge, '本地对话');
  assert.equal(values.activeThreadMessages[0].rowClassName, 'direct-message-row--other');
  assert.equal(values.activeThreadMessages[0].showAvatar, true);
  values.setMessageDraft({target:{value:'收到，我会先检查版本。'}});
  values = component.renderVals();
  assert.equal(values.messageSendClass, 'direct-chat-send direct-chat-send--ready');
  let prevented = false;
  values.onMessageKeyDown({key:'Enter',isComposing:false,preventDefault:()=>{prevented=true;}});
  assert.equal(prevented, true);
  assert.equal(component.state.messageThreads.find(thread=>thread.id==='nina').messages.at(-1).role, 'me');
  assert.equal(component.state.localEventLog[0].event_name, 'direct_message_demo');
  values = component.renderVals();
  assert.equal(values.activeThreadMessages.at(-1).rowClassName, 'direct-message-row--me');
  assert.equal(values.activeThreadMessages.at(-1).showAvatar, false);

  component.setState({panel:'rightsHub'});
  values = component.renderVals();
  const beforeAip = component.state.aip;
  const right = values.rightItems.find(item=>item.id==='badge');
  right.onOpen();
  assert.equal(component.state.rightRedeemId, 'badge');
  values = component.renderVals();
  assert.equal(values.rightsRedeemOpen, true);
  assert.equal(values.rightsSelectedTitle, '贡献徽章');
  assert.equal(values.rightsSelectedBalanceAfter, (beforeAip-right.cost).toLocaleString());
  values.confirmRightRedeem();
  assert.equal(component.state.aip, beforeAip-right.cost);
  assert.equal(component.state.rightsOrders[0].status, 'active-local-demo');
  assert.equal(component.state.rightsOrders[0].statusLabel, '已生效 · 本地演示');
  assert.equal(component.state.localEventLog[0].properties.server_confirmed, false);
  values = component.renderVals();
  assert.equal(values.rightItems.find(item=>item.id==='badge').actionLabel, '已生效');
  assert.equal(values.rightsActiveCount, 1);

  component.setState({panel:'governance',governanceTab:'control'});
  values = component.renderVals();
  values.toggleGovernanceKillSwitch();
  assert.equal(component.state.governanceKillSwitch, true);
  assert.equal(component.state.localEventLog[0].event_name, 'kill_switch_demo_toggle');
  component.setState({panel:'productCenter',productCenterTab:'map'});
  values = component.renderVals();
  assert.equal(values.productCapabilityGroups.flatMap(group=>group.items).length, 26);
  const creatorStatusBeforeViewSwitch = component.state.identityCreatorStatus;
  values.productRoleOptions.find(role=>role.key==='player').onPick();
  values = component.renderVals();
  const playerCapabilityIds = values.productCapabilityGroups.flatMap(group=>group.items).map(item=>item.id);
  assert.equal(values.productCenterRoleLabel, '玩家');
  assert.equal(values.productCenterVisibleCount, 17);
  assert.equal(playerCapabilityIds.includes('R05'), true);
  assert.equal(playerCapabilityIds.includes('R11'), true);
  assert.equal(playerCapabilityIds.includes('R21'), true);
  assert.equal(playerCapabilityIds.includes('R23'), true);
  assert.match(values.profileRoleMeta, /玩家/);
  assert.equal(values.roleMainActionLabel, '创作游戏');
  assert.equal(values.meTabs.map(tab=>tab.key).join(','), 'playables,drafts,saved,history');
  assert.equal(values.profileShortcuts.length, 0);
  assert.equal(values.showProfileShortcuts, false);
  assert.equal(values.drawerPrimaryRows.map(row=>row.label).join(','), '我的游戏,身份与安全');
  assert.equal(values.drawerPrimaryRows.some(row=>row.label==='站内权益'||row.label==='互动关系'), false);
  assert.equal(component.state.identityCreatorStatus, creatorStatusBeforeViewSwitch);
  assert.equal(component.state.localEventLog[0].event_name, 'product_center_role_view_change');
  assert.equal(component.state.localEventLog[0].properties.permission_changed, false);
  values.roleMainAction();
  assert.equal(component.state.overlay, 'create');
  assert.equal(component.state.createRoleScope, 'player');
  assert.equal(component.state.campaignId, null);
  values = component.renderVals();
  assert.equal(values.composerModes.map(mode=>mode.key).join(','), 'quick');
  assert.equal(values.composerConnectorOptions.length, 0);
  assert.equal(values.createScopeBadge, undefined);
  assert.equal(component.state.localEventLog[0].event_name, 'game_create_open');
  assert.equal(component.state.localEventLog[0].properties.publish_scope, 'app_only');
  assert.equal(component.state.localEventLog[0].properties.brand_campaign, false);
  assert.equal(component.state.localEventLog[0].properties.external_connectors, false);
  const memberCountBeforePlayerCreate = component.state.growthNodeMembers.length;
  values = component.renderVals();
  values.createGrowthNode();
  assert.equal(component.state.growthNodeMembers.length, memberCountBeforePlayerCreate);
  assert.equal(component.state.growthNodeJoinMode, true);
  assert.equal(component.state.localEventLog[0].event_name, 'growth_node_create_blocked_by_role_view');

  component.setState({overlay:null,panel:'productCenter'});
  values = component.renderVals();
  values.productRoleOptions.find(role=>role.key==='kol').onPick();
  values = component.renderVals();
  assert.equal(values.meTabs.map(tab=>tab.key).join(','), 'playables,drafts,saved,history');
  assert.equal(values.showProfileShortcuts, true);
  values.roleMainAction();
  assert.equal(component.state.overlay, 'create');
  assert.equal(component.state.createRoleScope, 'kol');
  assert.ok(String(component.state.campaignId).startsWith('campaign-'));
  values = component.renderVals();
  assert.equal(values.composerModes.map(mode=>mode.key).join(','), 'quick,deep');
  assert.equal(values.createScopeBadge, undefined);
  assert.equal(component.state.localEventLog[0].properties.publish_scope, 'campaign_and_connectors');
  component.setState({overlay:null,panel:'productCenter'});
  component.renderVals().productRoleOptions.find(role=>role.key==='player').onPick();

  component.setState({identityCreatorStatus:'not_applied',panel:'productCenter',productCenterTab:'map'});
  values = component.renderVals();
  values.productRoleOptions.find(role=>role.key==='kol').onPick();
  values = component.renderVals();
  assert.equal(values.productCenterVisibleCount, 26);
  values.productCapabilityGroups.flatMap(group=>group.items).find(item=>item.id==='R11').onOpen();
  assert.equal(component.state.panel, 'identity');
  assert.equal(component.state.identityDetailRole, 'creator');
  assert.equal(component.state.identityCreatorStatus, 'not_applied');
});
