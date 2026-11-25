import './styles/main.css'
import { chapters } from './content/chapters'
import { Score } from './audio/score'
import { Instrument } from './app/panel'
import { clamp, damp, ease, makeTimeline } from './engine/timeline'
import { QualityControl, type Quality } from './engine/quality'
import type { CosmosRenderer } from './engine/renderer'
import { Caption } from './visuals/caption'

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const stage = el('stage')
const canvas = el<HTMLCanvasElement>('cosmos')
const origin = el('origin')
const begin = el<HTMLButtonElement>('begin')
const conclusion = el('conclusion')
const timeline = makeTimeline(chapters)
const score = new Score()
const quality = new QualityControl()
const caption = new Caption(document.querySelector('.caption')!, el('chapter-heading'), el<HTMLCanvasElement>('letter-dust'))
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')

function readSetting(key: string) {
  try { return localStorage.getItem('omni-' + key) } catch { return null }
}
function saveSetting(key: string, value: string) {
  try { localStorage.setItem('omni-' + key, value) } catch { /* Private browsing. */ }
}
let reduced = readSetting('motion') === null ? motionPreference.matches : readSetting('motion') === 'true'
const savedQuality = readSetting('quality')
if (savedQuality && ['High','Balanced','Low','Auto'].includes(savedQuality)) quality.mode = savedQuality as Quality

let renderer: CosmosRenderer | undefined
let target = 0, rendered = 0, distance = 1
let lastTime = 0, ambient = 0, lastInput = -Infinity
let request = 0, dirty = true, failedAudio = false
let currentIndex = -1, ending = false, edge = 0
const frame = {index:0, local:0, mix:0}
history.scrollRestoration = 'manual'
const savedPosition = Number.isFinite(history.state?.omniProgress) ? clamp(history.state.omniProgress) : 0
function rememberPosition() {
  history.replaceState({...history.state, omniProgress:clamp(scrollY / distance)}, '')
}

function jump(index: number, local = index === 0 ? 0 : .38, interpolate = false) {
  window.scrollTo({top: Math.round(timeline.at(index, local) * distance), behavior:'instant'})
  target = clamp(scrollY / distance)
  if (!interpolate || reduced) rendered = target
  rememberPosition()
  invalidate()
}
function next() {
  if (currentIndex >= chapters.length - 1) jump(currentIndex, 1, true)
  else jump(currentIndex + 1, .38, true)
}
async function toggleSound() {
  if (failedAudio) return
  try { await score.toggle(); score.update(rendered) }
  catch { failedAudio = true }
}
const instrument = new Instrument({
  index: () => Math.max(0, currentIndex), jump: i => jump(i),
  sound: () => score.enabled, audioUnavailable: () => failedAudio, toggleSound,
  motion: () => reduced,
  toggleMotion: () => { reduced = !reduced; saveSetting('motion', String(reduced)); invalidate() },
  quality: () => quality.mode,
  setQuality: q => { quality.mode = q; saveSetting('quality',q); renderer?.resize(quality.active); invalidate() },
})
el<HTMLDialogElement>('instrument').addEventListener('close', invalidate)
begin.addEventListener('click', next)
window.addEventListener('keydown', e => {
  if (instrument.isOpen || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
  switch (e.key) {
    case 'Home': e.preventDefault(); jump(0); break
    case 'End': e.preventDefault(); jump(chapters.length - 1, 1); break
    case 'ArrowRight': e.preventDefault(); next(); break
    case 'ArrowLeft': e.preventDefault(); jump(Math.max(0,currentIndex - 1)); break
  }
})
motionPreference.addEventListener('change', () => {
  if (readSetting('motion') === null) { reduced = motionPreference.matches; invalidate() }
})
document.fonts.ready.then(() => { caption.invalidate(); invalidate() })

let diagnostic: HTMLElement | undefined
if (import.meta.env.DEV && new URLSearchParams(location.search).has('diagnostics')) {
  diagnostic = document.createElement('output')
  diagnostic.id = 'diagnostics'
  stage.append(diagnostic)
}

function updatePosition() {
  timeline.evaluate(rendered, frame)
  const {index, local, mix} = frame
  const chapter = chapters[index]
  const done = index === chapters.length - 1 && local >= .91
  if (index !== currentIndex || done !== ending) {
    currentIndex = index
    ending = done
    stage.dataset.scene = chapter.id
    stage.classList.toggle('opening', index === 0)
    origin.hidden = index !== 0
    conclusion.hidden = !done
    caption.setText(index === 0 ? '' : done ? 'Act II — The Living Earth' : chapter.narrative)
    el('announce').textContent = chapter.title + '. ' + chapter.time + '. ' + chapter.description
  }
  begin.hidden = index !== 0 || local > .30
  if (index === 0) {
    origin.style.opacity = String(1 - mix)
    begin.style.opacity = String(1 - ease(local / .3))
  }
  // Clear the typography before the next image takes over the viewport.
  edge = ending ? 0 : ease((local - .65) / (index === chapters.length - 1 ? .26 : .27))
  stage.dataset.reduced = String(reduced)
  score.update(rendered)
}

function tick(now: number) {
  request = 0
  const interval = lastTime ? (now - lastTime) / 1000 : 1 / 60
  const dt = Math.min(.08, interval)
  const changed = rendered !== target || dirty
  if (changed) {
    rendered = reduced ? target : damp(rendered, target, dt)
    updatePosition()
  }
  const animate = !reduced && !instrument.isOpen && canvas.dataset.renderer === 'webgl' && (frame.index > 0 || frame.mix > 0)
  if (animate) {
    ambient += dt
    if (lastTime && quality.sample(interval)) renderer?.resize(quality.active)
  }
  if (animate || changed) renderer?.render(frame, reduced, ambient)
  const lettering = caption.advance(instrument.isOpen ? 0 : dt, edge, now - lastInput < 230 || Math.abs(target-rendered) > .001, reduced)
  dirty = false
  if (diagnostic) diagnostic.textContent = `${(interval*1000).toFixed(1)} ms · ${Math.round(1/interval)} fps · ${renderer?.draws ?? 0} draws · ${quality.active}`
  if (!document.hidden && !instrument.isOpen && (rendered !== target || animate || lettering)) {
    lastTime = now
    schedule()
  } else lastTime = 0
}
function schedule() {
  if (!request && !document.hidden) request = requestAnimationFrame(tick)
}
function invalidate() { dirty = true; schedule() }

function resize(first = false) {
  if (first) {
    const existing = history.state?.omniPacing === 2 ? history.state.omniDistance : 0
    distance = Number.isFinite(existing) && existing > 0 ? existing : Math.round(Math.max(520,innerHeight)*timeline.total*2.2)
    history.replaceState({...history.state,omniDistance:distance,omniPacing:2},'')
  }
  el('scroll-space').style.setProperty('--journey-distance', distance + 'px')
  target = clamp(scrollY / distance)
  if (first) rendered = target
  caption.invalidate()
  renderer?.resize(quality.active)
  invalidate()
}
resize(true)
if (savedPosition > 0) {
  window.scrollTo({top:Math.round(distance * savedPosition),behavior:'instant'})
  target = rendered = clamp(scrollY / distance)
}
updatePosition()
window.addEventListener('resize', () => resize())
window.addEventListener('scroll', () => {
  const now = performance.now()
  let position = clamp(scrollY / distance)
  const change = position - target
  const pending = target - rendered
  // A deliberate reversal cancels accumulated fling distance at the visible
  // scene, so the visitor never has to scroll back through a queue first.
  if (!reduced && Math.abs(pending) > .008 && change * pending < 0 && Math.abs(change) > .0001) {
    window.scrollTo({top:Math.round(clamp(rendered + change) * distance), behavior:'instant'})
    position = clamp(scrollY / distance)
  }
  if (Math.abs(position - target) > .00001 && now - lastInput > 180 && !reduced) caption.depart()
  lastInput = now
  target = position
  schedule()
}, {passive:true})
window.addEventListener('scrollend', rememberPosition)
window.addEventListener('pageshow', () => { target = clamp(scrollY / distance); rendered = target; invalidate() })
document.addEventListener('visibilitychange', () => {
  score.visibility(rendered)
  if (document.hidden) { cancelAnimationFrame(request); request = 0; lastTime = 0 }
  else invalidate()
})
requestAnimationFrame(() => requestAnimationFrame(async () => {
  try {
    const {CosmosRenderer} = await import('./engine/renderer')
    renderer = new CosmosRenderer(canvas, chapters.map(c => c.id), invalidate)
    renderer.resize(quality.active)
  } catch {
    canvas.hidden = true
    canvas.dataset.renderer = 'fallback'
  }
  invalidate()
}))
window.addEventListener('pagehide', e => {
  rememberPosition()
  if (!e.persisted) { renderer?.dispose(); score.dispose() }
})
