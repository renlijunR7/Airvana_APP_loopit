export const SCENE_THEMES = Object.freeze({
  vegas: {
    id: 'vegas', name: '拉斯维加斯', english: 'LAS VEGAS NIGHTS', icon: '♠',
    description: '霓虹流光 · 金色立柱 · 都市夜场',
    headline: '霓虹之下，\n好戏开场。', intro: '走进灯火璀璨的拉斯维加斯风格牌厅。',
    felt: '#175745', background: '#170d24', fog: '#201021', density: .019,
    sky: '#dbbfef', ground: '#292038', ambient: 1.55,
    key: '#ffe0b2', keyIntensity: 135, fill: '#b8c9ff', fillIntensity: 1.65,
    rim: '#fd728c', rimIntensity: 2, exposure: 1.35,
    wood: '#302126', brass: '#d3a458', black: '#1d2025',
  },
  beach: {
    id: 'beach', name: '海滩假日', english: 'SUNSET BEACH', icon: '☀',
    description: '落日海面 · 棕榈沙滩 · 海边木平台',
    headline: '海风正好，\n来玩一局。', intro: '在棕榈树和落日海风之间，轻松入座。',
    felt: '#197f84', background: '#c6dbe5', fog: '#d3dce0', density: .005,
    sky: '#e6f7ff', ground: '#b5a77a', ambient: 2.1,
    key: '#fff0cf', keyIntensity: 95, fill: '#c1e9ff', fillIntensity: 1.9,
    rim: '#ffc68c', rimIntensity: 2.2, exposure: 1.12,
    wood: '#92715a', brass: '#c7a676', black: '#3e504b',
  },
  gala: {
    id: 'gala', name: '年会聚会', english: 'ANNUAL CELEBRATION', icon: '✦',
    description: '年度舞台 · 金色气球 · 欢聚时刻',
    headline: '欢聚此刻，\n精彩同桌。', intro: '在年度盛典的灯光里，与朋友般的对手同桌。',
    felt: '#4c326f', background: '#211629', fog: '#32203d', density: .014,
    sky: '#ffe4df', ground: '#432f37', ambient: 1.65,
    key: '#ffe9cd', keyIntensity: 125, fill: '#d8d0ff', fillIntensity: 1.8,
    rim: '#ffaf80', rimIntensity: 2, exposure: 1.3,
    wood: '#48262e', brass: '#d9b573', black: '#292137',
  },
});

// Previous releases saved palette names instead of full environments.
export function getSceneTheme(name) {
  return SCENE_THEMES[name] || SCENE_THEMES.vegas;
}
