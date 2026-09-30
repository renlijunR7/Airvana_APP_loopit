// Original SVG redraws of the fifteen visible character arrangements in the demo.
// These are not extracted Loopit assets.
export const characters = [
  ['桃桃', '#e87cb8', '#cc57a0', 'oval', 'glasses', '#f6c378', '#eda75f'],
  ['小芽', '#82ce66', '#55af46', 'cactus', 'freckles', '#eac366', '#dfad51'],
  ['布丁', '#f6a2a5', '#e18495', 'dome', 'smile', '#8acbe1', '#71b7dd'],
  ['阿蓝', '#52a9cf', '#348abf', 'fur', 'sleepy', '#71cbb1', '#8caddf'],
  ['心心', '#c1a7e7', '#a38ad0', 'square', 'hearts', '#8ab9e5', '#aa97df'],
  ['酷酷', '#6dc4c4', '#4aaaae', 'wide', 'shades', '#659bcc', '#6ac4b3'],
  ['莓莓', '#d293ce', '#b673b6', 'cat', 'smile', '#f6ba79', '#ed9e8e'],
  ['博士', '#6587c5', '#456bac', 'round', 'glasses', '#83c8c9', '#7fb7df'],
  ['水滴', '#69c5e8', '#3da6d5', 'drop', 'smile', '#f2bf83', '#e7b165'],
  ['小狐', '#e28ebe', '#bd6d9f', 'fox', 'smile', '#66b9b6', '#5ac2a5'],
  ['芒芒', '#f4ca66', '#e9ab49', 'crown', 'smile', '#6abbcf', '#7dc6dc'],
  ['啵啵', '#d76ba9', '#b8488c', 'round', 'tuft', '#da8dc1', '#91c4a7'],
  ['毛毛', '#eeaa71', '#d38a57', 'furbox', 'smile', '#93c8a0', '#67b49c'],
  ['困困', '#bcbce4', '#9999cf', 'drop', 'sleepy', '#8bafe0', '#ae9fdb'],
  ['牙牙', '#8dd2c7', '#63b9aa', 'fur', 'teeth', '#a0d3b9', '#69bdb5'],
];

const bodyPaths = {
  oval: 'M15 74C11 52 30 37 58 38C83 33 105 48 106 71C109 89 91 100 61 100C33 102 15 92 15 74Z',
  cactus: 'M27 93Q10 93 14 70L19 55Q22 48 29 54L34 65L34 43Q36 21 52 29Q62 32 62 54L64 62L68 37Q73 17 86 29Q97 41 86 65Q101 59 105 69L105 86Q104 100 90 100L41 100Z',
  dome: 'M18 94Q15 86 21 65Q30 32 59 31Q87 30 97 61Q105 81 101 98Q63 110 18 94Z',
  square: 'M25 99Q16 88 22 66L22 36Q33 35 38 29Q52 35 59 29Q70 35 81 30L93 35Q104 47 99 68L100 94Q85 103 68 99Q42 105 25 99Z',
  wide: 'M17 50Q23 36 39 43Q58 36 79 42Q102 37 105 51L105 89Q94 100 73 98Q40 103 16 92Z',
  cat: 'M25 57L23 22Q39 25 49 44Q67 37 78 43L97 24L94 61Q106 78 96 92Q70 109 42 99Q13 95 25 57Z',
  fox: 'M17 40L16 20L44 38Q59 30 77 38L101 19L101 57Q107 76 89 87L63 103L34 89Q15 81 20 61Z',
  round: 'M21 68Q18 39 45 32Q69 21 87 39Q105 48 102 74Q100 100 68 102Q39 107 24 90Z',
  drop: 'M49 35Q36 24 46 17Q60 10 65 29Q65 33 73 40Q99 56 100 81Q100 102 65 103Q24 107 21 89Q17 67 38 46Z',
  crown: 'M24 63Q9 51 17 40Q24 28 38 41Q34 21 49 22Q59 22 62 35Q74 13 87 26Q93 36 83 44Q106 38 108 54Q109 65 99 70Q105 98 71 101Q33 108 23 87Z',
  fur: 'M21 49L16 40L30 43L28 30L42 36L48 24L56 34L70 24L74 35L87 30L87 43L101 38L97 52L108 55L101 69L109 77L99 82L102 94L88 94L85 104L73 99L62 108L53 99L39 104L34 96L19 98L23 87L12 81L21 71L12 62L23 57Z',
  furbox: 'M20 37L32 40L39 31L46 38L55 28L63 38L77 32L83 41L98 35L96 49L104 59L99 68L107 80L96 85L100 99L85 97L74 104L62 99L49 106L41 98L25 102L26 90L16 83L22 70L14 59L23 50Z',
};
const eyes = type => {
  if (type === 'glasses') return '<g fill="none" stroke="#fff4ec" stroke-width="4"><circle cx="41" cy="60" r="12"/><circle cx="78" cy="60" r="12"/><path d="M53 58q6-4 13 0M25 56l-8-2m77 2 8-2"/></g><g fill="#343446"><ellipse cx="42" cy="61" rx="2.7" ry="4"/><ellipse cx="78" cy="61" rx="2.7" ry="4"/></g>';
  if (type === 'hearts') return '<path d="M42 55C33 43 24 58 42 68C60 56 49 43 42 55M80 55C70 43 61 58 80 68C98 56 87 43 80 55" fill="#292739"/>';
  if (type === 'shades') return '<path d="M21 50h36v9q-3 15-17 10Q23 68 21 50M63 50h36q-2 18-16 19Q64 72 63 59ZM55 53h10" fill="#282736"/><path d="m29 53 6 10m37-10 6 10" stroke="#fff" stroke-width="2" opacity=".13"/>';
  if (type === 'sleepy') return '<g stroke="#3c3b50" fill="none" stroke-width="2.8" stroke-linecap="round"><path d="M34 59q8 7 15 0M70 59q8 7 15 0"/></g>';
  return '<ellipse cx="43" cy="58" rx="3.1" ry="4.2" fill="#323341"/><ellipse cx="77" cy="58" rx="3.1" ry="4.2" fill="#323341"/>';
};
export function creatureSVG(index) {
  const [, color, dark, shape, type] = characters[index];
  const faceExtras = type === 'freckles' ? '<g fill="#308a79" opacity=".8"><circle cx="33" cy="68" r="1.6"/><circle cx="39" cy="71" r="1.3"/><circle cx="29" cy="73" r="1.2"/><circle cx="83" cy="69" r="1.3"/><circle cx="88" cy="72" r="1.4"/></g>' : '';
  const mouth = type === 'teeth' ? '<g class="mouth-smile"><rect x="27" y="68" width="65" height="24" rx="6" fill="#fff6e9" stroke="#397467" stroke-width="1.5"/><path d="M28 80h63m-51-11v21m13-21v21m13-21v21m13-21v21" stroke="#487b6f" stroke-width="1.2"/><path d="M51 97v2m8-1v3m8-4v2" stroke="#487b6f" stroke-width="2" stroke-linecap="round"/></g>' : '<path class="mouth-smile" d="M53 77q7 6 14 0" fill="none" stroke="#653b58" stroke-width="2.6" stroke-linecap="round"/>';
  return `<svg class="creature" viewBox="0 0 120 120" aria-hidden="true"><defs><clipPath id="body-clip-${index}"><path d="${bodyPaths[shape]}"/></clipPath></defs><g class="sprite">
    <path d="${bodyPaths[shape]}" fill="${color}"/>
    <g clip-path="url(#body-clip-${index})"><path d="M9 89Q53 106 95 77L119 113H7Z" fill="${dark}" opacity=".23"/>${shape === 'fox' ? `<path d="m11 35 49 18 48-17-29 43-19 19-23-15Z" fill="${dark}" opacity=".4"/>` : ''}</g>
    ${type === 'tuft' ? '<path d="M50 34Q33 24 43 19L57 25Q51 9 64 15L68 26Q78 14 84 23L74 36" fill="#5caaba"/>' : ''}
    <g class="eyes">${eyes(type)}</g>${faceExtras}
    <g class="sleep-eyes" fill="none" stroke="#444052" stroke-width="2.8" stroke-linecap="round"><path d="M36 59q7 6 14 0M70 59q7 6 14 0"/></g>
    ${mouth}<g class="mouth-open"><ellipse cx="60" cy="80" rx="11" ry="14" fill="#51364c"/><ellipse cx="60" cy="87" rx="7" ry="4.5" fill="#ec91ac"/><path d="M55 68h10" stroke="#fff4e4" stroke-width="3" stroke-linecap="round"/></g>
  </g><text class="zzz" x="87" y="26">z<tspan dx="1" dy="-8" font-size="10">z</tspan></text></svg>`;
}
