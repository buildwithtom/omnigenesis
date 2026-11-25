// Original polar graticule. The nested contours describe a symbolic coordinate
// surface around an origin, independently of the physical cosmic scenes.
const TAU = Math.PI * 2
const n = (v: number) => v.toFixed(2)
function polar(radius: number, angle: number) {
  return [300 + radius * Math.cos(angle), 300 + radius * Math.sin(angle)]
}
function line(x1: number, y1: number, x2: number, y2: number, attrs = '') {
  return `<path d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}" ${attrs}/>`
}
export function engraving() {
  const strokes: string[] = []
  const ticks: string[] = []
  for (let k = 0; k < 124; k++) {
    const u = k / 123
    const segments: string[] = []
    for (let j = 0; j <= 256; j++) {
      const a = j / 256 * TAU
      const twist = a + 2.2 * u
      const outer = 181 + 11 * Math.cos(3*a + 1.4) + 8 * Math.sin(2*a - 1)
      const inner = 60 + 11 * Math.cos(a + 0.6)
      const r = inner + (outer-inner)*u + 20 * Math.sin(3*twist + 0.45) * Math.sin(Math.PI*u) + 7*Math.sin(5*a-4*u)*Math.sin(Math.PI*u)
      const x = 300 + r * Math.cos(a) + 9*Math.sin(2*a+u*4)*Math.sin(Math.PI*u)
      const y = 300 + r * Math.sin(a) * (0.90 + 0.06*u)
      segments.push(`${j ? 'L' : 'M'}${n(x)} ${n(y)}`)
    }
    strokes.push(`<path d="${segments.join('')}Z" stroke-opacity="${n(0.19+0.35*Math.pow(Math.sin(u*22+0.4),2))}" stroke-width="${n(0.46+0.31*Math.pow(u,2))}"/>`)
  }
  for (let j = 0; j < 240; j++) {
    const a = TAU*j/240
    const [x1,y1] = polar(j % 20 === 0 ? 207 : 211, a)
    const [x2,y2] = polar(j % 5 === 0 ? 218 : 214, a)
    ticks.push(line(x1,y1,x2,y2,`opacity="${j%5===0 ? '.66' : '.32'}"`))
  }
  return `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" focusable="false">
    <defs>
      <radialGradient id="aura"><stop stop-color="#e5ca76" stop-opacity=".32"/><stop offset=".08" stop-color="#c8a35a" stop-opacity=".16"/><stop offset=".45" stop-color="#947949" stop-opacity=".04"/><stop offset="1" stop-color="#69583b" stop-opacity="0"/></radialGradient>
      <linearGradient id="copper" x1="0" y1="1" x2=".85" y2="0" gradientUnits="objectBoundingBox"><stop stop-color="#a99972"/><stop offset=".27" stop-color="#d9c69d"/><stop offset=".50" stop-color="#655d49"/><stop offset=".74" stop-color="#aa9974"/><stop offset="1" stop-color="#e4d1a8"/></linearGradient>
      <radialGradient id="glint"><stop stop-color="#fff9d7"/><stop offset=".12" stop-color="#ffe6a4"/><stop offset=".28" stop-color="#dfb567" stop-opacity=".48"/><stop offset="1" stop-color="#a58141" stop-opacity="0"/></radialGradient>
    </defs>
    <g fill="none" stroke="#958971" stroke-width=".7">
      <circle cx="300" cy="300" r="226" opacity=".24" stroke-dasharray="1 5"/>
      <circle cx="300" cy="300" r="210" opacity=".48"/>
      <circle cx="300" cy="300" r="200" opacity=".25"/>
      <circle cx="300" cy="300" r="44" opacity=".32" stroke-dasharray="1 5"/>
      ${ticks.join('')}
      <path d="M37 300H563M300 40V560" opacity=".28" stroke-dasharray="3 5"/>
      <path d="M100 100l400 400M100 500l400-400" opacity=".16" stroke-dasharray="2 6"/>
      <g stroke="#cdb791" opacity=".75"><path d="M43 295v10m-5-5h10M557 295v10m-5-5h10M295 58h10m-5-5v10M295 542h10m-5-5v10"/></g>
    </g>
    <circle cx="300" cy="300" r="150" fill="url(#aura)"/>
    <g fill="none" stroke="url(#copper)">${strokes.join('')}</g>
    <g stroke="#ae986d" fill="none" opacity=".54" stroke-width=".8"><path d="M274 300h52M300 283v34"/><circle cx="300" cy="300" r="15" stroke-dasharray="1 4"/></g>
    <circle cx="300" cy="300" r="23" fill="url(#glint)"/><circle cx="300" cy="300" r="2.1" fill="#fff4cc"/>
    <g fill="#8e8777" font-family="monospace" font-size="8" letter-spacing="1.3" text-anchor="middle"><text x="300" y="40">0°</text><text x="578" y="303">90°</text><text x="300" y="565">180°</text><text x="19" y="303">270°</text></g>
  </svg>`
}
