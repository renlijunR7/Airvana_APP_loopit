// Original game MP3s; source URLs are listed in assets/audio/manifest.json.
const TRACKS={build:'tower_buliding_common',upgrade:'tower_star_upgrade',kill:'tower_enemy_dead',leak:'game_lose',win:'game_win',lost:'game_lose',sell:'tower_sale_common',fire:'tower_environment_thunder',reinforcements:'player_skill_zhaomu',archer:'tower_arrow_attack_one',mage:'tower_mage_attack_one',cannon:'tower_bullet_bomb'};
export class BattleAudio {
 constructor(){this.enabled=false;this.musicEnabled=true;this.voices=new Set();this.lastPlayed={};this.music=new Audio('assets/audio/bgm_chapter01.mp3');this.music.loop=true;this.music.volume=.16;}
 setEnabled(enabled){this.enabled=enabled;if(enabled&&this.musicEnabled)this.music.play().catch(()=>{});else{this.music.pause();for(const audio of this.voices)audio.pause();this.voices.clear();}}
 pause(paused){if(paused||!this.musicEnabled)this.music.pause();else if(this.enabled)this.music.play().catch(()=>{});}
 play(kind){const file=TRACKS[kind];if(!this.enabled||!file)return;const now=performance.now();if(now-(this.lastPlayed[kind]??-1000)<100)return;this.lastPlayed[kind]=now;
  if(this.voices.size>=10){const oldest=this.voices.values().next().value;oldest.pause();this.voices.delete(oldest);}
  const audio=new Audio('assets/audio/'+file+'.mp3');audio.volume=['archer','mage','cannon','kill'].includes(kind)?.18:.45;this.voices.add(audio);audio.onended=()=>this.voices.delete(audio);audio.onerror=()=>this.voices.delete(audio);audio.play().catch(()=>this.voices.delete(audio));
 }
}
