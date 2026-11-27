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
const captionLink = el<HTMLButtonElement>('caption-link')
const sound = el<HTMLButtonElement>('sound')
const timeline = makeTimeline(chapters)
const score = new Score()
const quality = new QualityControl()
const caption = new Caption(document.querySelector('.caption')!, captionLink, el<HTMLCanvasElement>('letter-dust'))
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')

function readSetting(key: string) {
  try { return localStorage.getItem('omni-' + key) } catch { return null }
}
function saveSetting(key: string, value: string) {
  try { localStorage.setItem('omni-' + key, value) } catch { /* Private browsing. */ }
}
let reduced = readSetting('motion') === null ? motionPreference.matches : readSetting('motion') === 'true'
let autoplay = readSetting('autoplay') !== 'false'
score.enabled = readSetting('sound') !== 'false'
const savedQuality = readSetting('quality')
if (savedQuality && ['High','Balanced','Low','Auto'].includes(savedQuality)) quality.mode = savedQuality as Quality

let renderer: CosmosRenderer | undefined
let target = 0, rendered = 0, distance = 1
let lastTime = 0, ambient = 0, lastInput = -Infinity
let request = 0, dirty = true, failedAudio = false
let currentIndex = -1, ending = false
let gestureStart = 0, direction = 0, flingOrigin = -1
let released = false
const frame = {index:0, local:0, mix:0}
history.scrollRestoration = 'manual'
const savedPosition = Number.isFinite(history.state?.omniProgress) ? clamp(history.state.omniProgress) : 0
function rememberPosition() {
  history.replaceState({...history.state, omniProgress:clamp(scrollY / distance)}, '')
}

function entryPoint(index: number) {
  return chapters[index].entry ?? (index === 0 ? 0 : .38)
}
function jump(index: number, local = entryPoint(index), interpolate = false) {
  direction = 0
  if (interpolate && index !== currentIndex && !reduced) caption.depart()
  window.scrollTo({top: Math.round(timeline.at(index, local) * distance), behavior:'instant'})
  target = clamp(scrollY / distance)
  if (!interpolate || reduced) rendered = target
  rememberPosition()
  invalidate()
}
function replay(index: number) {
  rendered = timeline.at(index)
  currentIndex = -1 // Re-enter even when the same sentence is already on screen.
  jump(index, reduced ? entryPoint(index) : .69, true)
}
function next() {
  if (currentIndex >= chapters.length - 1) jump(currentIndex, 1, true)
  else jump(currentIndex + 1, undefined, true)
}
function syncSound() {
  sound.disabled = failedAudio
  sound.setAttribute('aria-pressed', String(!failedAudio && score.enabled))
  sound.title = failedAudio ? 'Sound unavailable' : score.enabled ? 'Mute soundtrack' : 'Play soundtrack'
}
function startSound() {
  if (failedAudio || !score.enabled || score.playing) return
  void score.start().then(() => score.visibility(rendered)).catch(error => {
    if (error?.name === 'NotAllowedError') return // Retry on the next user activation.
    failedAudio = true
    syncSound()
  })
}
function toggleSound() {
  score.enabled = !score.enabled
  saveSetting('sound', String(score.enabled))
  score.visibility(rendered)
  syncSound()
  if (score.enabled) startSound()
}
const instrument = new Instrument({
  index: () => Math.max(0, currentIndex), jump: i => jump(i), replay,
  sound: () => score.enabled && !failedAudio, audioUnavailable: () => failedAudio, toggleSound,
  motion: () => reduced,
  toggleMotion: () => { reduced = !reduced; saveSetting('motion', String(reduced)); resetIdle(); invalidate() },
  autoplay: () => autoplay,
  toggleAutoplay: () => { autoplay = !autoplay; saveSetting('autoplay', String(autoplay)); resetIdle() },
  quality: () => quality.mode,
  setQuality: q => { quality.mode = q; saveSetting('quality',q); renderer?.resize(quality.active); invalidate() },
})
let idleTimer: number | undefined
let autoAdvancing = false
function armAutoplay(delay: number) {
  window.clearTimeout(idleTimer)
  if (!autoplay || reduced || instrument.isOpen || document.hidden) return
  idleTimer = window.setTimeout(() => {
    if (instrument.isOpen || document.hidden || ending) return
    autoAdvancing = true
    next()
  }, delay)
}
function resetIdle(stopAtVisible = true) {
  if (autoAdvancing && stopAtVisible && rendered !== target) {
    window.scrollTo({top:Math.round(rendered * distance), behavior:'instant'})
    target = rendered = clamp(scrollY / distance)
    invalidate()
  }
  autoAdvancing = false
  armAutoplay(45_000)
}
el<HTMLDialogElement>('instrument').addEventListener('close', () => { resetIdle(); invalidate() })
for (const event of ['wheel','pointerdown','pointermove','keydown','click']) {
  window.addEventListener(event, () => resetIdle(), {capture:true, passive:true})
}
syncSound()
startSound()
for (const event of ['pointerup','click','keydown','touchend']) {
  window.addEventListener(event, startSound, {passive:true})
}
begin.addEventListener('click', next)
sound.addEventListener('click', () => { void toggleSound() })
captionLink.addEventListener('click', () => instrument.open('Evidence', captionLink))
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
  if (readSetting('motion') === null) { reduced = motionPreference.matches; resetIdle(); invalidate() }
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
    captionLink.disabled = done
    if (!done) captionLink.setAttribute('aria-label', chapter.narrative + ' Read evidence.')
    else captionLink.removeAttribute('aria-label')
    caption.setText(index === 0 ? '' : done ? 'Act II — The Living Earth' : chapter.narrative)
    el('announce').textContent = chapter.title + '. ' + chapter.time + '. ' + chapter.description
  }
  begin.hidden = index !== 0
  if (index === 0) {
    origin.style.opacity = String(1 - mix)
    begin.style.opacity = String(1 - .65 * ease((local - .77) / .23))
  }
  stage.dataset.reduced = String(reduced)
  score.update(rendered)
}

function tick(now: number) {
  request = 0
  const interval = lastTime ? (now - lastTime) / 1000 : 1 / 60
  const dt = Math.min(.08, interval)
  const changed = rendered !== target || dirty
  if (changed) {
    const leavingOpening = rendered < timeline.starts[1] && target >= timeline.starts[1]
    rendered = reduced ? target : damp(rendered, target, dt, leavingOpening ? .026 : .018)
    updatePosition()
  }
  if (autoAdvancing && rendered === target) {
    autoAdvancing = false
    if (!ending) armAutoplay(12_000)
  }
  const animate = !reduced && !instrument.isOpen && canvas.dataset.renderer === 'webgl' && (frame.index > 0 || frame.mix > 0)
  if (animate) {
    ambient += dt
    if (lastTime && quality.sample(interval)) renderer?.resize(quality.active)
  }
  if (animate || changed) renderer?.render(frame, reduced, ambient)
  const travelling = now - lastInput < 230 || Math.abs(target-rendered) > .001
  if (travelling && released && !reduced &&
      ((direction > 0 && frame.local > .72) || (direction < 0 && frame.local < .25))) caption.depart()
  const lettering = caption.advance(instrument.isOpen ? 0 : dt, travelling, reduced)
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
window.addEventListener('touchstart', () => { direction = 0 }, {passive:true})
window.addEventListener('scroll', () => {
  const now = performance.now()
  let position = clamp(scrollY / distance)
  const change = position - target
  if (change === 0) return // Includes the event from our own scroll correction.
  resetIdle(false)
  const sign = Math.sign(change)
  const pending = target - rendered
  if (now - lastInput > 230 || sign !== direction) {
    direction = sign
    flingOrigin = -1
    gestureStart = target
    released = false
  }
  if (!reduced && Math.abs(pending) > .008 && change * pending < 0) {
    gestureStart = rendered
    position = clamp(rendered + change)
  }
  // Once input runs a second ahead of the image, keep this stroke's momentum
  // in the adjacent chapter. A continuous slow scroll can cross any boundary.
  if (flingOrigin < 0 && Math.abs(position - rendered) > .018) flingOrigin = frame.index
  const neighbour = flingOrigin + sign
  if (flingOrigin >= 0 && neighbour >= 0 && neighbour < chapters.length) {
    const landing = timeline.at(neighbour, entryPoint(neighbour))
    position = sign > 0 ? Math.min(position, landing) : Math.max(position, landing)
  }
  const pixels = Math.round(position * distance)
  if (Math.abs(scrollY - pixels) >= 1) window.scrollTo({top:pixels, behavior:'instant'})
  position = clamp(scrollY / distance)
  if (!released && !reduced && Math.abs(position - gestureStart) * distance >= 64) {
    caption.depart()
    released = true
  }
  lastInput = now
  target = position
  schedule()
}, {passive:true})
window.addEventListener('scrollend', rememberPosition)
window.addEventListener('pageshow', () => { target = clamp(scrollY / distance); rendered = target; resetIdle(); invalidate() })
document.addEventListener('visibilitychange', () => {
  resetIdle()
  score.visibility(rendered)
  if (document.hidden) { cancelAnimationFrame(request); request = 0; lastTime = 0 }
  else { startSound(); invalidate() }
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
  window.clearTimeout(idleTimer)
  rememberPosition()
  if (!e.persisted) { renderer?.dispose(); score.dispose() }
})
