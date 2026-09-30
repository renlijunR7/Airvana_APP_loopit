/* Original, deterministic tower-defense simulation. All positions use a 750×1334 field. */
export const TOWER_TYPES = {
  archer: { name: '弓箭塔', cost: 70, upgradeCost: [90, 135], range: 234, damage: 20, interval: 0.8, description: '箭无虚发，快速攻击单个敌人' },
  barracks: { name: '兵营', cost: 70, upgradeCost: [90, 135], range: 234, damage: 10, interval: 0.85, description: '派出三名士兵，在道路上拦截敌人' },
  mage: { name: '术士塔', cost: 100, upgradeCost: [115, 165], range: 234, damage: 52, interval: 1.5, description: '法术穿透重甲，并使敌人减速' },
  cannon: { name: '投石塔', cost: 125, upgradeCost: [140, 195], range: 258, damage: 40, interval: 2.5, description: '投掷巨石，对范围内敌人造成伤害' },
};

// Map geometry and spawn schedules transcribed from the three reference levels.
const GEOMETRY = [{"id":1,"map":"map_9991","startingGold":400,"paths":[[{"x":350.39,"y":-20.89},{"x":371.48,"y":106.84},{"x":404.3,"y":228.72},{"x":404.3,"y":357.63},{"x":358.59,"y":484.19},{"x":311.72,"y":602.55},{"x":268.36,"y":731.45},{"x":227.34,"y":856.84},{"x":196.88,"y":995.13},{"x":217.97,"y":1134.58},{"x":342.19,"y":1218.95}],[{"x":385.55,"y":-18.55},{"x":407.81,"y":110.36},{"x":442.97,"y":227.55},{"x":440.63,"y":357.63},{"x":400.78,"y":481.84},{"x":356.25,"y":599.03},{"x":310.55,"y":717.39},{"x":273.05,"y":841.61},{"x":237.89,"y":979.89},{"x":247.27,"y":1105.28},{"x":342.19,"y":1218.95}],[{"x":424.22,"y":-18.55},{"x":445.31,"y":106.84},{"x":485.16,"y":225.2},{"x":474.61,"y":354.11},{"x":439.45,"y":473.64},{"x":399.61,"y":593.17},{"x":359.77,"y":715.05},{"x":314.06,"y":835.75},{"x":276.56,"y":968.17},{"x":280.08,"y":1097.08},{"x":342.19,"y":1218.95}]],"slots":[{"x":530.86,"y":467.78},{"x":461.72,"y":799.42},{"x":159.38,"y":615.44},{"x":356.25,"y":997.47},{"x":127.73,"y":936.53},{"x":296.48,"y":418.56}]},{"id":2,"map":"map_9992","startingGold":500,"paths":[[{"x":350.39,"y":-20.89},{"x":363.28,"y":119.73},{"x":366.8,"y":261.53},{"x":289.45,"y":382.23},{"x":147.66,"y":433.8},{"x":147.66,"y":586.14},{"x":167.58,"y":730.28},{"x":192.19,"y":869.73},{"x":333.98,"y":920.13},{"x":447.66,"y":1036.14},{"x":520.31,"y":1177.94}],[{"x":385.55,"y":-18.55},{"x":392.58,"y":119.73},{"x":411.33,"y":267.39},{"x":328.13,"y":404.5},{"x":182.81,"y":449.03},{"x":187.5,"y":589.66},{"x":210.94,"y":740.83},{"x":287.11,"y":872.08},{"x":438.28,"y":910.75},{"x":489.84,"y":1050.2},{"x":515.63,"y":1175.59}],[{"x":424.22,"y":-18.55},{"x":428.91,"y":122.08},{"x":446.48,"y":263.88},{"x":392.58,"y":419.73},{"x":230.86,"y":454.89},{"x":232.03,"y":597.86},{"x":250.78,"y":746.69},{"x":336.33,"y":850.98},{"x":479.3,"y":894.34},{"x":522.66,"y":1024.42},{"x":516.8,"y":1174.42}],[{"x":350.39,"y":-20.89},{"x":358.59,"y":118.56},{"x":363.28,"y":260.36},{"x":426.56,"y":379.89},{"x":544.92,"y":447.86},{"x":535.55,"y":588.48},{"x":485.16,"y":708.02},{"x":495.7,"y":839.27},{"x":446.48,"y":942.39},{"x":453.52,"y":1074.81},{"x":520.31,"y":1177.94}],[{"x":384.38,"y":-19.72},{"x":391.41,"y":118.56},{"x":403.13,"y":249.81},{"x":472.27,"y":361.14},{"x":578.91,"y":431.45},{"x":581.25,"y":570.91},{"x":530.86,"y":691.61},{"x":542.58,"y":813.48},{"x":493.36,"y":927.16},{"x":488.67,"y":1063.09},{"x":520.31,"y":1177.94}],[{"x":419.53,"y":-22.06},{"x":428.91,"y":116.22},{"x":439.45,"y":248.64},{"x":510.94,"y":341.22},{"x":625.78,"y":419.73},{"x":621.09,"y":558.02},{"x":569.53,"y":678.72},{"x":580.08,"y":807.63},{"x":528.52,"y":922.47},{"x":523.83,"y":1058.41},{"x":520.31,"y":1177.94}]],"slots":[{"x":533.2,"y":272.08},{"x":351.56,"y":716.22},{"x":380.86,"y":520.52},{"x":90.23,"y":678.72},{"x":629.3,"y":733.8},{"x":336.33,"y":1008.02},{"x":594.14,"y":983.41},{"x":176.95,"y":328.33},{"x":104.3,"y":882.63},{"x":290.63,"y":316.61}]},{"id":3,"map":"map_9993","startingGold":300,"paths":[[{"x":331.64,"y":-19.72},{"x":343.36,"y":119.73},{"x":304.69,"y":252.16},{"x":152.34,"y":284.97},{"x":135.94,"y":432.63},{"x":195.7,"y":559.19},{"x":363.28,"y":597.86},{"x":485.16,"y":695.13},{"x":410.16,"y":824.03},{"x":260.16,"y":813.48},{"x":147.66,"y":899.03},{"x":137.11,"y":1022.08},{"x":210.94,"y":1131.06},{"x":353.91,"y":1163.88},{"x":505.08,"y":1140.44},{"x":643.36,"y":1154.5}],[{"x":371.48,"y":-18.55},{"x":372.66,"y":116.22},{"x":351.56,"y":265.05},{"x":206.25,"y":296.69},{"x":169.92,"y":422.08},{"x":230.86,"y":533.41},{"x":385.55,"y":553.33},{"x":510.94,"y":658.8},{"x":508.59,"y":814.66},{"x":349.22,"y":850.98},{"x":199.22,"y":887.31},{"x":172.27,"y":1015.05},{"x":246.09,"y":1109.97},{"x":390.23,"y":1134.58},{"x":526.17,"y":1113.48},{"x":643.36,"y":1154.5}],[{"x":404.3,"y":-17.38},{"x":411.33,"y":117.39},{"x":416.02,"y":262.7},{"x":273.05,"y":315.44},{"x":213.28,"y":430.28},{"x":300,"y":511.14},{"x":435.94,"y":532.23},{"x":534.38,"y":616.61},{"x":568.36,"y":766.61},{"x":481.64,"y":890.83},{"x":338.67,"y":886.14},{"x":203.91,"y":959.97},{"x":246.09,"y":1073.64},{"x":389.06,"y":1094.73},{"x":539.06,"y":1080.67},{"x":643.36,"y":1154.5}],[{"x":330.47,"y":-19.72},{"x":346.88,"y":117.39},{"x":407.81,"y":241.61},{"x":526.17,"y":282.63},{"x":585.94,"y":417.39},{"x":485.16,"y":538.09},{"x":478.13,"y":690.44},{"x":437.11,"y":827.55},{"x":296.48,"y":808.8},{"x":161.72,"y":867.39},{"x":135.94,"y":1000.98},{"x":189.84,"y":1112.31},{"x":311.72,"y":1165.05},{"x":473.44,"y":1142.78},{"x":642.19,"y":1153.33}],[{"x":367.97,"y":-19.72},{"x":376.17,"y":117.39},{"x":444.14,"y":218.17},{"x":567.19,"y":260.36},{"x":618.75,"y":388.09},{"x":550.78,"y":515.83},{"x":507.42,"y":649.42},{"x":520.31,"y":797.08},{"x":387.89,"y":858.02},{"x":215.63,"y":870.91},{"x":171.09,"y":1003.33},{"x":236.72,"y":1101.77},{"x":370.31,"y":1133.41},{"x":516.8,"y":1107.63},{"x":642.19,"y":1153.33}],[{"x":399.61,"y":-19.72},{"x":408.98,"y":109.19},{"x":474.61,"y":201.77},{"x":602.34,"y":249.81},{"x":652.73,"y":371.69},{"x":614.06,"y":501.77},{"x":541.41,"y":614.27},{"x":561.33,"y":765.44},{"x":489.84,"y":889.66},{"x":339.84,"y":890.83},{"x":210.94,"y":954.11},{"x":246.09,"y":1072.47},{"x":389.06,"y":1094.73},{"x":535.55,"y":1075.98},{"x":642.19,"y":1153.33}]],"slots":[{"x":535.55,"y":154.89},{"x":400.78,"y":700.98},{"x":421.88,"y":385.75},{"x":282.42,"y":178.33},{"x":618.75,"y":635.36},{"x":341.02,"y":975.2},{"x":626.95,"y":1038.48},{"x":471.09,"y":1223.64}]}];
const WAVE_SCHEDULES = [[{"spawns":[{"time":0,"route":1,"enemyId":31013},{"time":0.0167,"route":3,"enemyId":31013},{"time":1.0167,"route":2,"enemyId":31013},{"time":3,"route":1,"enemyId":31013},{"time":3.0167,"route":3,"enemyId":31013},{"time":4.0167,"route":2,"enemyId":31013}],"hpRate":1,"attackRate":1,"ironRate":4,"supply":30},{"spawns":[{"time":0,"route":2,"enemyId":31013},{"time":1,"route":1,"enemyId":31013},{"time":1.0167,"route":3,"enemyId":31013},{"time":3,"route":2,"enemyId":31013},{"time":4,"route":1,"enemyId":31013},{"time":4.0167,"route":3,"enemyId":31013}],"hpRate":1,"attackRate":1,"ironRate":4,"supply":30},{"spawns":[{"time":0,"route":3,"enemyId":31013},{"time":1,"route":2,"enemyId":31013},{"time":2,"route":1,"enemyId":31013},{"time":3,"route":3,"enemyId":31013},{"time":4,"route":2,"enemyId":31013},{"time":5,"route":1,"enemyId":31013}],"hpRate":1,"attackRate":1,"ironRate":4,"supply":40}],[{"spawns":[{"time":0,"route":5,"enemyId":31006},{"time":1,"route":4,"enemyId":31006},{"time":1.0167,"route":6,"enemyId":31006},{"time":2,"route":5,"enemyId":31006},{"time":5,"route":4,"enemyId":31006},{"time":6,"route":4,"enemyId":31006},{"time":6.0167,"route":6,"enemyId":31006},{"time":7,"route":5,"enemyId":31006}],"hpRate":1,"attackRate":1,"ironRate":4,"supply":30},{"spawns":[{"time":0,"route":1,"enemyId":31001},{"time":1,"route":1,"enemyId":31001},{"time":1.0167,"route":2,"enemyId":31001},{"time":1.0333,"route":3,"enemyId":31001},{"time":2,"route":3,"enemyId":31001},{"time":4,"route":1,"enemyId":31013},{"time":4.0167,"route":3,"enemyId":31013},{"time":5,"route":2,"enemyId":31013},{"time":6,"route":1,"enemyId":31013},{"time":6.0167,"route":3,"enemyId":31013},{"time":8,"route":1,"enemyId":31001},{"time":8.0167,"route":3,"enemyId":31001},{"time":9,"route":1,"enemyId":31001},{"time":9.0167,"route":3,"enemyId":31001},{"time":10,"route":2,"enemyId":31013},{"time":10.0167,"route":3,"enemyId":31001}],"hpRate":1,"attackRate":1,"ironRate":4,"supply":30},{"spawns":[{"time":0,"route":1,"enemyId":31001},{"time":1,"route":1,"enemyId":31001},{"time":1.0167,"route":2,"enemyId":31001},{"time":1.0333,"route":3,"enemyId":31001},{"time":2,"route":3,"enemyId":31001},{"time":4,"route":1,"enemyId":31013},{"time":4.0167,"route":3,"enemyId":31013},{"time":5,"route":2,"enemyId":31013},{"time":6,"route":1,"enemyId":31013},{"time":6.0167,"route":3,"enemyId":31013},{"time":8,"route":1,"enemyId":31001},{"time":8.0167,"route":3,"enemyId":31001},{"time":9,"route":1,"enemyId":31001},{"time":9.0167,"route":3,"enemyId":31001},{"time":10,"route":2,"enemyId":31013},{"time":10.0167,"route":3,"enemyId":31001}],"hpRate":1,"attackRate":1,"ironRate":4,"supply":40},{"spawns":[{"time":0,"route":4,"enemyId":31001},{"time":1,"route":4,"enemyId":31001},{"time":1.0167,"route":5,"enemyId":31001},{"time":1.0333,"route":6,"enemyId":31001},{"time":2,"route":6,"enemyId":31001},{"time":4,"route":4,"enemyId":31013},{"time":4.0167,"route":6,"enemyId":31013},{"time":5,"route":5,"enemyId":31013},{"time":6,"route":4,"enemyId":31013},{"time":6.0167,"route":6,"enemyId":31013},{"time":8,"route":4,"enemyId":31001},{"time":8.0167,"route":6,"enemyId":31001},{"time":9,"route":4,"enemyId":31001},{"time":9.0167,"route":6,"enemyId":31001},{"time":10,"route":5,"enemyId":31013},{"time":10.0167,"route":6,"enemyId":31001}],"hpRate":1,"attackRate":1,"ironRate":4,"supply":50},{"spawns":[{"time":0,"route":1,"enemyId":31006},{"time":1,"route":2,"enemyId":31013},{"time":2,"route":1,"enemyId":31006},{"time":3,"route":2,"enemyId":31006},{"time":5,"route":5,"enemyId":31001},{"time":6,"route":1,"enemyId":31001},{"time":6,"route":4,"enemyId":31001},{"time":6.0167,"route":2,"enemyId":31006},{"time":6.0167,"route":6,"enemyId":31001},{"time":6.0333,"route":3,"enemyId":31001},{"time":7,"route":5,"enemyId":31013},{"time":7.5,"route":1,"enemyId":31001},{"time":7.5167,"route":3,"enemyId":31001},{"time":10,"route":2,"enemyId":31006},{"time":11,"route":1,"enemyId":31006},{"time":11.0167,"route":3,"enemyId":31006},{"time":12,"route":2,"enemyId":31006},{"time":13,"route":2,"enemyId":31006}],"hpRate":1,"attackRate":1,"ironRate":4,"supply":40}],[{"spawns":[{"time":0,"route":1,"enemyId":31014},{"time":0.0167,"route":2,"enemyId":31014},{"time":0.0333,"route":3,"enemyId":31014},{"time":1,"route":2,"enemyId":31014},{"time":3,"route":2,"enemyId":31001},{"time":6,"route":1,"enemyId":31001},{"time":7,"route":1,"enemyId":31001},{"time":7.0167,"route":3,"enemyId":31001},{"time":8,"route":2,"enemyId":31014},{"time":11,"route":1,"enemyId":31001},{"time":11.0167,"route":3,"enemyId":31001},{"time":12,"route":2,"enemyId":31001},{"time":13,"route":2,"enemyId":31014}],"hpRate":0.255,"attackRate":0.9923,"ironRate":4,"supply":30},{"spawns":[{"time":0,"route":4,"enemyId":31001},{"time":0.0167,"route":5,"enemyId":31013},{"time":0.0333,"route":6,"enemyId":31001},{"time":1.5,"route":4,"enemyId":31001},{"time":1.5167,"route":6,"enemyId":31001},{"time":4,"route":4,"enemyId":31001},{"time":5,"route":4,"enemyId":31001},{"time":5.0167,"route":5,"enemyId":31001},{"time":5.0333,"route":6,"enemyId":31001},{"time":6,"route":6,"enemyId":31001},{"time":7,"route":4,"enemyId":31014},{"time":7.0167,"route":5,"enemyId":31014},{"time":7.0333,"route":6,"enemyId":31014},{"time":8.5,"route":4,"enemyId":31014},{"time":8.5167,"route":6,"enemyId":31014}],"hpRate":0.3825,"attackRate":1.0143,"ironRate":4,"supply":30},{"spawns":[{"time":0,"route":1,"enemyId":31014},{"time":0.0167,"route":3,"enemyId":31014},{"time":1,"route":1,"enemyId":31014},{"time":1.0167,"route":2,"enemyId":31013},{"time":1.0333,"route":3,"enemyId":31014},{"time":2,"route":1,"enemyId":31014},{"time":2.0167,"route":3,"enemyId":31014},{"time":5,"route":1,"enemyId":31014},{"time":5.0167,"route":2,"enemyId":31014},{"time":5.0333,"route":3,"enemyId":31014},{"time":6,"route":4,"enemyId":31014},{"time":6.5,"route":1,"enemyId":31014},{"time":6.5167,"route":3,"enemyId":31014},{"time":7,"route":5,"enemyId":31001},{"time":8,"route":4,"enemyId":31014},{"time":9,"route":5,"enemyId":31014},{"time":9,"route":1,"enemyId":31014},{"time":10,"route":1,"enemyId":31014},{"time":10.0167,"route":3,"enemyId":31014},{"time":11,"route":2,"enemyId":31013}],"hpRate":0.8414,"attackRate":1.0364,"ironRate":4,"supply":40},{"spawns":[{"time":0,"route":1,"enemyId":31013},{"time":1,"route":1,"enemyId":31013},{"time":1.0167,"route":3,"enemyId":31013},{"time":2,"route":2,"enemyId":31001},{"time":4,"route":4,"enemyId":31014},{"time":4.0167,"route":5,"enemyId":31013},{"time":4.0333,"route":6,"enemyId":31014},{"time":5,"route":1,"enemyId":31014},{"time":5.5,"route":4,"enemyId":31014},{"time":5.5167,"route":6,"enemyId":31014},{"time":6,"route":1,"enemyId":31014},{"time":6.0167,"route":3,"enemyId":31014},{"time":7,"route":2,"enemyId":31013}],"hpRate":0.4462,"attackRate":1.0584,"ironRate":4,"supply":40},{"spawns":[{"time":0,"route":2,"enemyId":31013},{"time":1,"route":2,"enemyId":31014},{"time":2,"route":1,"enemyId":31013},{"time":4,"route":5,"enemyId":31001},{"time":5,"route":2,"enemyId":31001},{"time":5,"route":4,"enemyId":31001},{"time":5.0167,"route":6,"enemyId":31001},{"time":6,"route":1,"enemyId":31001},{"time":6,"route":5,"enemyId":31014},{"time":6.0167,"route":3,"enemyId":31001},{"time":7,"route":2,"enemyId":31014},{"time":7,"route":5,"enemyId":31001},{"time":8,"route":2,"enemyId":31001}],"hpRate":0.8159,"attackRate":1.0805,"ironRate":4,"supply":50},{"spawns":[{"time":0,"route":1,"enemyId":31014},{"time":0.0167,"route":3,"enemyId":31014},{"time":1,"route":1,"enemyId":31014},{"time":1.0167,"route":2,"enemyId":31013},{"time":1.0333,"route":3,"enemyId":31014},{"time":2,"route":1,"enemyId":31014},{"time":2.0167,"route":3,"enemyId":31014},{"time":4,"route":5,"enemyId":31001},{"time":5,"route":6,"enemyId":31001},{"time":6,"route":1,"enemyId":31013},{"time":6,"route":5,"enemyId":31013},{"time":7,"route":1,"enemyId":31013},{"time":7,"route":6,"enemyId":31001},{"time":7.0167,"route":3,"enemyId":31013},{"time":8,"route":2,"enemyId":31001},{"time":11,"route":1,"enemyId":31014},{"time":11.0167,"route":2,"enemyId":31001},{"time":11.0333,"route":3,"enemyId":31014},{"time":12.5,"route":1,"enemyId":31014},{"time":12.5167,"route":3,"enemyId":31014}],"hpRate":1.5298,"attackRate":1.1025,"ironRate":4,"supply":50}]];
export const LEVELS = [{"name":"桃园守卫","subtitle":"黄巾来袭 · 守住村口"},{"name":"长坂鏖战","subtitle":"敌军压境 · 以少胜多"},{"name":"虎牢决战","subtitle":"决战虎牢 · 一夫当关"}].map((meta,i)=>({...meta,...GEOMETRY[i],path:GEOMETRY[i].paths[1],waves:WAVE_SCHEDULES[i]}));

const ENEMY_TYPES = {
  infantry:{sourceId:31013,name:'黄巾刀兵',hp:60,speed:105.46875,damage:15,interval:1.2,gold:1,leak:1,armor:0,magicArmor:0},
  spearman:{sourceId:31001,name:'长枪兵',hp:80,speed:70.3125,damage:10,interval:1.2,gold:1,leak:1,armor:0,magicArmor:0},
  heavy:{sourceId:31006,name:'重甲兵',hp:60,speed:70.3125,damage:10,interval:1.2,gold:1,leak:1,armor:0.7,magicArmor:0},
  fast:{sourceId:31014,name:'疾行兵',hp:84,speed:140.625,damage:20,interval:1.2,gold:1,leak:1,armor:0.3,magicArmor:0.3},
};
const ENEMY_IDS = {31013:'infantry',31001:'spearman',31006:'heavy',31014:'fast'};
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
const success = (message,extra={}) => ({ok:true,message,...extra});
const failure = message => ({ok:false,message});

export class GameEngine {
  constructor({level=0,onEvent=()=>{}}={}) {
    this.levelIndex = clamp(Math.floor(Number(level)||0),0,LEVELS.length-1);
    this.config = LEVELS[this.levelIndex];
    this.onEvent = typeof onEvent==='function' ? onEvent : ()=>{};
    this.nextId = 1;
    this.waveTime = 0;
    this.spawnQueue = [];
    this.paths = this.config.paths||[this.config.path];
    this.routeLengths = this.paths.map(path=>path.slice(1).map((p,i)=>dist(p,path[i])));
    this.routeTotalLengths = this.routeLengths.map(parts=>parts.reduce((sum,n)=>sum+n,0));
    this.pathLengths = this.routeLengths[0];
    this.pathLength = this.pathLengths.reduce((sum,n)=>sum+n,0);
    this.state = {level:this.levelIndex,levelConfig:this.config,life:20,maxLife:20,gold:this.config.startingGold,
      wave:0,totalWaves:this.config.waves.length,status:'ready',paused:false,speed:1,time:0,kills:0,
      enemies:[],towers:[],projectiles:[],effects:[],soldiers:[],remainingToSpawn:0,nextWaveIn:0,
      skills:{fire:{cooldown:0,maxCooldown:26},reinforcements:{cooldown:0,maxCooldown:30}}};
  }

  getSnapshot() { return this.state; }
  _id(prefix) { return `${prefix}-${this.nextId++}`; }
  _event(type,data={}) { this.onEvent({type,...data}); }
  _active() { return this.state.status!=='lost' && this.state.status!=='won'; }
  _effect(type,x,y,extra={}) {
    const ttl = extra.ttl ?? 0.45;
    this.state.effects.push({id:this._id('fx'),type,x,y,ttl,maxTtl:ttl,age:0,radius:extra.radius??24,...extra});
  }

  startWave() {
    const s = this.state;
    if(!this._active()) return failure('本关已结束，请重新挑战或前往下一关');
    if(s.paused) return failure('请先继续游戏');
    if(s.status==='running') return failure('敌军正在进攻');
    const wave = this.config.waves[s.wave];
    if(!wave) return failure('所有波次已完成');
    const skipped=s.status==='between'?s.nextWaveIn:0;
    const bonus=s.status==='between'?Math.floor(skipped*this.config.waves[s.wave-1].supply/10):0;
    s.gold+=bonus;
    for(const skill of Object.values(s.skills)) skill.cooldown=Math.max(0,skill.cooldown-skipped);
    s.nextWaveIn=0;
    s.wave++;
    s.status='running';
    this.waveTime=0;
    this.spawnQueue=wave.spawns.map(spawn=>({at:spawn.time,type:ENEMY_IDS[spawn.enemyId],routeIndex:spawn.route-1}));
    this.spawnQueue.sort((a,b)=>a.at-b.at);
    s.remainingToSpawn=this.spawnQueue.length;
    this._event('wave',{wave:s.wave,totalWaves:s.totalWaves,bonus});
    return success(`第 ${s.wave} 波敌军来袭`);
  }

  build(slotIndex,type) {
    const s=this.state, spec=TOWER_TYPES[type], slot=this.config.slots[slotIndex];
    if(!this._active()) return failure('本关已结束');
    if(!Number.isInteger(slotIndex)||!slot) return failure('请选择有效的建塔位置');
    if(!spec) return failure('没有这种防御塔');
    if(s.towers.some(t=>t.slotIndex===slotIndex)) return failure('这里已经建有防御塔');
    if(s.gold<spec.cost) return failure(`陨铁不足，还差 ${spec.cost-s.gold}`);
    s.gold-=spec.cost;
    const tower={id:this._id('tower'),slotIndex,type,name:spec.name,x:slot.x,y:slot.y,level:1,
      range:spec.range,damage:spec.damage,interval:spec.interval,cooldown:0,target:null,spent:spec.cost,
      hp:1,maxHp:1,respawns:[]};
    s.towers.push(tower);
    if(type==='barracks') {
      const rally=this._nearestPath(slot.x,slot.y);
      tower.rallyX=rally.x; tower.rallyY=rally.y;
      this._spawnSoldier(tower,0); this._spawnSoldier(tower,1); this._spawnSoldier(tower,2);
    }
    this._effect('upgrade',slot.x,slot.y,{radius:50,ttl:0.65});
    this._event('build',{towerId:tower.id,slotIndex,towerType:type});
    return success(`已建造${spec.name}`,{tower});
  }

  upgrade(slotIndex) {
    const s=this.state,tower=s.towers.find(t=>t.slotIndex===slotIndex);
    if(!this._active()) return failure('本关已结束');
    if(!tower) return failure('请先建造防御塔');
    if(tower.level>=3) return failure('已经升至最高等级');
    const spec=TOWER_TYPES[tower.type],cost=spec.upgradeCost[tower.level-1];
    if(s.gold<cost) return failure(`陨铁不足，还差 ${cost-s.gold}`);
    s.gold-=cost;tower.spent+=cost;tower.level++;
    tower.damage=Math.round(spec.damage*(1+(tower.level-1)*0.62));
    tower.range=spec.range+(tower.level-1)*15;
    tower.interval=spec.interval*(1-(tower.level-1)*0.08);
    for(const soldier of s.soldiers.filter(v=>v.towerId===tower.id)) {
      soldier.level=tower.level;soldier.damage=tower.damage;
      const maxHp=95+(tower.level-1)*60;
      soldier.hp+=maxHp-soldier.maxHp;soldier.maxHp=maxHp;
    }
    this._effect('upgrade',tower.x,tower.y,{radius:65,ttl:0.8});
    this._event('upgrade',{towerId:tower.id,level:tower.level});
    return success(`${spec.name}已升至 ${tower.level} 级`,{tower});
  }

  sell(slotIndex) {
    const s=this.state,tower=s.towers.find(t=>t.slotIndex===slotIndex);
    if(!this._active()) return failure('本关已结束');
    if(!tower) return failure('这里还没有防御塔');
    const refund=Math.floor(tower.spent*0.7);
    s.gold+=refund;s.towers=s.towers.filter(t=>t.id!==tower.id);
    s.soldiers=s.soldiers.filter(v=>v.towerId!==tower.id);
    for(const enemy of s.enemies) if(!s.soldiers.some(v=>v.id===enemy.blockedBy)) enemy.blockedBy=null;
    this._event('sell',{slotIndex,refund});
    return success(`已拆除，返还 ${refund} 陨铁`,{refund});
  }

  castSkill(type,x,y) {
    type=({rally:'reinforcements',support:'reinforcements',reinforcement:'reinforcements'}[type]||type);
    const s=this.state,skill=s.skills[type];
    if(!skill) return failure('没有这种技能');
    if(s.status!=='running') return failure('敌军进攻时才能使用技能');
    if(s.paused) return failure('请先继续游戏');
    if(skill.cooldown>0) return failure(`技能冷却中，还需 ${Math.ceil(skill.cooldown)} 秒`);
    if(!Number.isFinite(x)||!Number.isFinite(y)) return failure('请在战场上选择施放位置');
    x=clamp(x,0,750);y=clamp(y,0,1334);
    skill.cooldown=skill.maxCooldown;
    if(type==='fire') {
      this._effect('fire',x,y,{radius:150,ttl:3.2,tick:0,damage:35});
      for(const enemy of s.enemies) if(dist(enemy,{x,y})<=150) this._damage(enemy,110,'fire');
    } else {
      const rally=this._nearestPath(x,y);
      for(let i=0;i<3;i++) this._spawnSoldier(null,i,rally);
      this._effect('upgrade',rally.x,rally.y,{radius:65,ttl:0.75});
    }
    this._event('skill',{skill:type,x,y});
    return success(type==='fire'?'闪电风暴！':'士兵已抵达！');
  }

  setSpeed(speed) {
    if(![1,1.5,2,2.5,3].includes(Number(speed))) return failure('支持 1、1.5、2、2.5 和 3 倍速度');
    this.state.speed=Number(speed);return success(`${speed} 倍速度`,{speed:Number(speed)});
  }
  togglePause() {
    if(!this._active()) return failure('本关已结束');
    this.state.paused=!this.state.paused;return success(this.state.paused?'游戏已暂停':'游戏已继续',{paused:this.state.paused});
  }

  update(dt) {
    if(!Number.isFinite(dt)||dt<=0||this.state.paused) return;
    let remaining=Math.min(dt,5)*this.state.speed;
    while(remaining>1e-8) {const step=Math.min(remaining,0.04);this._step(step);remaining-=step;}
  }

  _step(dt) {
    const s=this.state;
    for(const fx of s.effects) {
      fx.ttl-=dt;fx.age+=dt;
      if(fx.type==='fire'&&s.status==='running') {
        fx.tick+=dt;
        while(fx.tick>=0.55) {
          fx.tick-=0.55;
          for(const enemy of s.enemies) if(dist(enemy,fx)<=fx.radius) this._damage(enemy,fx.damage,'fire');
        }
      }
    }
    s.effects=s.effects.filter(fx=>fx.ttl>0);
    if(!this._active()) return;
    s.time+=dt;
    for(const skill of Object.values(s.skills)) skill.cooldown=Math.max(0,skill.cooldown-dt);
    for(const tower of s.towers) {
      for(const respawn of tower.respawns) respawn.time-=dt;
      const due=tower.respawns.filter(r=>r.time<=0);
      tower.respawns=tower.respawns.filter(r=>r.time>0);
      for(const r of due) this._spawnSoldier(tower,r.index);
    }
    this._updateSoldiers(dt);
    s.soldiers=s.soldiers.filter(soldier=>soldier.hp>0);
    if(s.status==='running') {
      this.waveTime+=dt;
      while(this.spawnQueue.length && this.spawnQueue[0].at<=this.waveTime) this._spawnEnemy(this.spawnQueue.shift());
      s.remainingToSpawn=this.spawnQueue.length;
      this._updateEnemies(dt);
      this._updateTowers(dt);
      this._updateProjectiles(dt);
      s.enemies=s.enemies.filter(enemy=>enemy.hp>0&&!enemy.escaped);
      s.soldiers=s.soldiers.filter(soldier=>soldier.hp>0);
      if(s.life<=0) {
        s.life=0;s.status='lost';s.projectiles=[];
        this._event('lost',{wave:s.wave,kills:s.kills});
      } else if(!this.spawnQueue.length&&!s.enemies.length) {
        s.projectiles=[];
        if(s.wave===s.totalWaves) {
          s.status='won';this._event('won',{life:s.life,kills:s.kills,stars:s.life>=18?3:s.life>=15?2:1});
        } else {
          s.status='between';s.nextWaveIn=10;
          this._event('waveComplete',{wave:s.wave,bonus:0,countdown:10});
        }
      }
    } else {
      for(const soldier of s.soldiers) if(!soldier.temporary) soldier.hp=Math.min(soldier.maxHp,soldier.hp+dt*12);
      if(s.status==='between') {
        s.nextWaveIn=Math.max(0,s.nextWaveIn-dt);
        if(s.nextWaveIn<=0) this.startWave();
      }
    }
  }

  _spawnEnemy({type,routeIndex}) {
    const spec=ENEMY_TYPES[type],wave=this.config.waves[this.state.wave-1];
    const start=this.paths[routeIndex][0],hp=Math.round(spec.hp*wave.hpRate);
    this.state.enemies.push({id:this._id('enemy'),type,sourceId:spec.sourceId,name:spec.name,x:start.x,y:start.y,hp,maxHp:hp,
      level:this.state.wave,routeIndex,progress:0,speed:spec.speed,damage:Math.round(spec.damage*wave.attackRate),
      interval:spec.interval,cooldown:0,gold:Math.round(spec.gold*wave.ironRate),leak:spec.leak,armor:spec.armor,magicArmor:spec.magicArmor,
      slow:0,slowFactor:1,blockedBy:null,target:null,facing:1,moving:true,age:0});
  }

  _spawnSoldier(tower,index,rally) {
    rally=rally||{x:tower.rallyX,y:tower.rallyY};
    const level=tower?.level||2,hp=tower?95+(level-1)*60:155;
    const x=rally.x+(index%2?-15:15),y=rally.y+(index===2?20:0);
    this.state.soldiers.push({id:this._id('soldier'),type:tower?'soldier':'reinforcement',towerId:tower?.id||null,index,
      x,y,rallyX:x,rallyY:y,hp,maxHp:hp,level,damage:tower?.damage||20,interval:tower?.interval||0.7,
      cooldown:0,target:null,temporary:!tower,lifetime:tower?null:20,facing:1,moving:false});
  }

  _updateSoldiers(dt) {
    const s=this.state;
    for(const soldier of s.soldiers) {
      if(soldier.hp<=0) continue;
      soldier.moving=false;
      if(soldier.temporary) {
        soldier.lifetime-=dt;
        if(soldier.lifetime<=0) {this._killSoldier(soldier);continue;}
      }
      soldier.cooldown=Math.max(0,soldier.cooldown-dt);
      let enemy=s.enemies.find(e=>e.id===soldier.target&&e.hp>0&&!e.escaped);
      if(!enemy||dist(enemy,{x:soldier.rallyX,y:soldier.rallyY})>150) {
        if(enemy?.blockedBy===soldier.id) enemy.blockedBy=null;
        enemy=s.enemies.filter(e=>e.hp>0&&!e.escaped&&!e.blockedBy&&dist(e,{x:soldier.rallyX,y:soldier.rallyY})<115)
          .sort((a,b)=>dist(a,soldier)-dist(b,soldier))[0];
        soldier.target=enemy?.id||null;
        if(enemy) enemy.blockedBy=soldier.id;
      }
      const target=enemy||{x:soldier.rallyX,y:soldier.rallyY};
      const d=dist(soldier,target),stop=enemy?22:2;
      if(d>stop) {
        soldier.moving=true;
        const amount=Math.min(d-stop,dt*105);
        soldier.x+=(target.x-soldier.x)/d*amount;soldier.y+=(target.y-soldier.y)/d*amount;
        soldier.facing=target.x>=soldier.x?1:-1;
      }
      if(enemy&&dist(soldier,enemy)<34&&soldier.cooldown<=0) {
        this._damage(enemy,soldier.damage,'melee');soldier.cooldown=soldier.interval;
        this._effect('slash',enemy.x,enemy.y,{radius:20,ttl:0.18});
      }
    }
  }

  _updateEnemies(dt) {
    const s=this.state;
    for(const enemy of s.enemies) {
      if(enemy.hp<=0||enemy.escaped) continue;
      enemy.age+=dt;enemy.cooldown=Math.max(0,enemy.cooldown-dt);
      enemy.slow=Math.max(0,enemy.slow-dt);
      const soldier=s.soldiers.find(v=>v.id===enemy.blockedBy&&v.hp>0);
      if(!soldier) enemy.blockedBy=null;
      if(soldier&&dist(enemy,soldier)<42) {
        enemy.moving=false;
        enemy.target=soldier.id;
        if(enemy.cooldown<=0) {
          soldier.hp-=enemy.damage;enemy.cooldown=enemy.interval;
          this._effect('hit',soldier.x,soldier.y,{radius:15,ttl:0.14});
          if(soldier.hp<=0) this._killSoldier(soldier);
        }
      } else {
        enemy.moving=true;
        enemy.target=null;
        enemy.progress+=enemy.speed*(enemy.slow>0?enemy.slowFactor:1)*dt;
        const p=this._pathPoint(enemy.progress,enemy.routeIndex);
        enemy.facing=p.x>=enemy.x?1:-1;enemy.x=p.x;enemy.y=p.y;
        if(enemy.progress>=this.routeTotalLengths[enemy.routeIndex]) {
          enemy.escaped=true;s.life=Math.max(0,s.life-enemy.leak);
          this._event('leak',{enemyId:enemy.id,damage:enemy.leak,life:s.life});
        }
      }
    }
  }

  _killSoldier(soldier) {
    if(soldier.dead) return;
    soldier.dead=true;soldier.hp=0;
    const tower=this.state.towers.find(t=>t.id===soldier.towerId);
    if(tower) tower.respawns.push({index:soldier.index,time:7.5-(tower.level-1)});
    for(const e of this.state.enemies) if(e.blockedBy===soldier.id) e.blockedBy=null;
    this._effect('death',soldier.x,soldier.y,{radius:20,ttl:0.4,spriteType:'soldier'+(soldier.level>1?'-'+soldier.level:''),facing:soldier.facing});
  }

  _updateTowers(dt) {
    const s=this.state;
    for(const tower of s.towers) {
      if(tower.type==='barracks') continue;
      tower.cooldown=Math.max(0,tower.cooldown-dt);
      const target=s.enemies.filter(e=>e.hp>0&&!e.escaped&&dist(e,tower)<=tower.range)
        .sort((a,b)=>b.progress-a.progress)[0];
      tower.target=target?.id||null;
      if(!target||tower.cooldown>0) continue;
      const projectileType={archer:'arrow',mage:'magic',cannon:'shell'}[tower.type];
      s.projectiles.push({id:this._id('projectile'),type:projectileType,ownerId:tower.id,
        x:tower.x,y:tower.y-35,startX:tower.x,startY:tower.y-35,targetId:target.id,target:target.id,
        targetX:target.x,targetY:target.y,speed:tower.type==='cannon'?340:510,damage:tower.damage,
        splash:tower.type==='cannon'?78+(tower.level-1)*10:0,slow:tower.type==='mage'?1.7+(tower.level-1)*0.3:0,
        level:tower.level,age:0});
      tower.cooldown=tower.interval;
      this._event('attack',{towerId:tower.id,towerType:tower.type,x:tower.x,y:tower.y});
    }
  }

  _updateProjectiles(dt) {
    const s=this.state;
    for(const p of s.projectiles) {
      p.age+=dt;
      const target=s.enemies.find(e=>e.id===p.targetId&&e.hp>0&&!e.escaped);
      if(target) {p.targetX=target.x;p.targetY=target.y;}
      const dx=p.targetX-p.x,dy=p.targetY-p.y,d=Math.hypot(dx,dy),step=p.speed*dt;
      if(d<=step||p.age>3) {
        p.done=true;
        if(p.splash) {
          this._effect('explosion',p.targetX,p.targetY,{radius:p.splash,ttl:0.45});
          for(const enemy of s.enemies) if(dist(enemy,{x:p.targetX,y:p.targetY})<=p.splash) this._damage(enemy,p.damage,'cannon');
        } else if(target) {
          this._damage(target,p.damage,p.type);
          if(p.slow) {target.slow=p.slow;target.slowFactor=0.52;}
          this._effect('hit',target.x,target.y,{radius:p.type==='magic'?28:16,ttl:0.22,element:p.type});
        }
      } else {p.x+=dx/d*step;p.y+=dy/d*step;}
    }
    s.projectiles=s.projectiles.filter(p=>!p.done);
  }

  _damage(enemy,amount,kind) {
    if(enemy.hp<=0||enemy.escaped) return;
    const damage=Math.max(1,Math.round(amount*(1-(['magic','fire'].includes(kind)?enemy.magicArmor:enemy.armor))));
    enemy.hp=Math.max(0,enemy.hp-damage);
    if(enemy.hp===0) {
      this.state.kills++;this.state.gold+=enemy.gold;
      this._effect('death',enemy.x,enemy.y,{radius:enemy.type==='boss'?48:26,ttl:0.5,gold:enemy.gold,spriteType:enemy.type,facing:enemy.facing});
      this._event('kill',{enemyId:enemy.id,enemyType:enemy.type,gold:enemy.gold,x:enemy.x,y:enemy.y});
    }
  }

  _pathPoint(distance,routeIndex=0) {
    const path=this.paths[routeIndex],lengths=this.routeLengths[routeIndex];
    for(let i=0;i<lengths.length;i++) {
      const length=lengths[i];
      if(distance<=length) {
        const a=path[i],b=path[i+1],t=clamp(distance/length,0,1);
        return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
      }
      distance-=length;
    }
    return {...path[path.length-1]};
  }

  _nearestPath(x,y) {
    let nearest=null,best=Infinity;
    for(const path of this.paths) for(let i=0;i<path.length-1;i++) {
      const a=path[i],b=path[i+1],dx=b.x-a.x,dy=b.y-a.y;
      const t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1);
      const p={x:a.x+t*dx,y:a.y+t*dy};
      const d=dist(p,{x,y});if(d<best) {best=d;nearest=p;}
    }
    return nearest;
  }
}
