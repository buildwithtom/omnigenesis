import './styles/main.css'
import { chapters } from './content/chapters'
import { Score } from './audio/score'
import { Instrument } from './app/panel'
import { clamp, damp, ease, makeTimeline } from './engine/timeline'
import { QualityControl, type Quality } from './engine/quality'
import type { CosmosRenderer } from './engine/renderer'
import { engraving } from './visuals/engraving'

const el = <T extends HTMLElement=HTMLElement>(id:string) => document.getElementById(id) as T
const stage=el('stage'), chart=el('engraving'), heading=el('chapter-heading'), copy=el('chapter-copy')
const primary=el('primary'), primaryLabel=el('primary-label'), legend=el('figure-title')
const sound=el<HTMLButtonElement>('sound'), ruler=el('ruler'), space=el('scroll-space')
const timeline=makeTimeline(chapters), score=new Score(), quality=new QualityControl()
const format=(i:number)=>String(i).padStart(2,'0')
const figures:Record<string,string>={
  unknown:'Symbolic origin', inflation:'Expansion field', energy:'Primordial plasma',
  nucleosynthesis:'Nuclear clustering', recombination:'Temperature fluctuations',
  'dark-ages':'Neutral gas', 'cosmic-dawn':'Stellar ignition',galaxies:'Early galaxies',
  'cosmic-web':'Cosmic filaments','solar-system':'Accretion disk',earth:'Early Earth',
}
function readSetting(key:string){try{return localStorage.getItem('omni-'+key)}catch{return null}}
function saveSetting(key:string,value:string){try{localStorage.setItem('omni-'+key,value)}catch{/* Storage can be disabled. */}}
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)')
let reduced=readSetting('motion')===null ? motionPreference.matches : readSetting('motion')==='true'
const savedQuality=readSetting('quality')
if(savedQuality && ['High','Balanced','Low','Auto'].includes(savedQuality)) quality.mode=savedQuality as Quality
let target=0, rendered=0, distance=1, lastTime=0, request=0, dirty=true, failedAudio=false
let currentIndex=-1, currentIntro=false, ending=false, lastPercent=-1, lastRender=0
let renderer:CosmosRenderer|undefined
const frame={index:0,local:0,mix:0}
// A WebKit reload may try to restore the native offset before the scroll range
// has been laid out. Restore into that range on this specific history entry.
history.scrollRestoration='manual'
const savedPosition=Number.isFinite(history.state?.omniProgress) ? clamp(history.state.omniProgress) : 0
function rememberPosition(){history.replaceState({...history.state,omniProgress:clamp(scrollY/distance)},'')}
chart.innerHTML=engraving()
const stops=chapters.map((c,i)=>{
  const b=document.createElement('button')
  b.className='stop'; b.dataset.tip=format(i)+' · '+c.title
  b.setAttribute('aria-label','Jump to chapter '+format(i)+', '+c.title)
  b.style.left=timeline.starts[i]*100+'%'
  b.addEventListener('click',()=>jump(i));ruler.append(b)
  return b
})
function jump(index:number,local=.08,interpolate=false) {
  const progress=timeline.at(index,index===0 && local===.08 ? 0 : local)
  window.scrollTo({top:Math.round(progress*distance),behavior:'instant'})
  target=clamp(scrollY/distance)
  if(!interpolate || reduced)rendered=target
  rememberPosition();invalidate()
}
function next(){
  if(currentIntro){jump(0,.52,true);return}
  if(currentIndex===chapters.length-1){jump(currentIndex,1,true);return}
  jump(currentIndex+1,.08,true)
}
async function toggleSound(){
  if(failedAudio)return
  try{
    await score.toggle()
    sound.setAttribute('aria-pressed',String(score.enabled))
    sound.querySelector('span')!.textContent=score.enabled?'Sound on':'Sound off'
    score.update(rendered)
  }catch{failedAudio=true;sound.disabled=true;sound.querySelector('span')!.textContent='Sound unavailable'}
}
const instrument=new Instrument({
  index:()=>Math.max(0,currentIndex),jump:i=>jump(i),sound:()=>score.enabled,
  audioUnavailable:()=>failedAudio,toggleSound,motion:()=>reduced,
  toggleMotion:()=>{reduced=!reduced; saveSetting('motion',String(reduced));invalidate()},
  quality:()=>quality.mode,setQuality:q=>{quality.mode=q;saveSetting('quality',q);renderer?.resize(quality.active);invalidate()},
})
primary.addEventListener('click',()=>{if(currentIntro)next();else instrument.open('Evidence',primary)})
el('scroll-cue').addEventListener('click',()=>{if(ending)instrument.open('Chapters',el('scroll-cue'));else next()})
sound.addEventListener('click',()=>{void toggleSound()})
window.addEventListener('keydown',e=>{
  if(instrument.isOpen || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)return
  if(e.key==='Home'){e.preventDefault();jump(0,0);return}
  if(e.key==='End'){e.preventDefault();jump(chapters.length-1,1);return}
  if(e.key==='ArrowRight'){e.preventDefault();next()}
  if(e.key==='ArrowLeft'){
    e.preventDefault()
    if(currentIndex===0)jump(0,0,true)
    else jump(currentIndex-1,.08,true)
  }
})
motionPreference.addEventListener('change',()=>{if(readSetting('motion')===null){reduced=motionPreference.matches;invalidate()}})
let diagnostic:HTMLElement|undefined
if(import.meta.env.DEV && new URLSearchParams(location.search).has('diagnostics')){
  diagnostic=document.createElement('output');diagnostic.id='diagnostics';stage.append(diagnostic)
}
function textState(index:number,intro:boolean){
  const c=chapters[index]
  stage.classList.toggle('opening',intro)
  if(intro){heading.innerHTML='Everything began<br><em>somewhere.</em>';copy.textContent='Or perhaps somewhere began with everything.'}
  else{heading.textContent=c.narrative;copy.textContent=c.description}
  heading.classList.toggle('long',!intro && c.narrative.length>36)
  primaryLabel.textContent=intro?'Begin the journey':'Evidence & notes'
  primary.querySelector('span')!.textContent=intro?'↓':'+'
  legend.textContent=figures[c.id] ?? c.title
  el('figure-number').textContent='Fig. '+format(index)
  el('epoch-title').textContent=c.title;el('epoch-id').textContent=format(index)
  el('announce').textContent='Chapter '+format(index)+'. '+c.title+'. '+c.time+'. '+c.description
  const label=document.querySelector<HTMLElement>('.act-label')!
  label.innerHTML=intro?'<span class="rule"></span>Act I <b>/</b> From the Unknown to Earth':'<span class="rule"></span>'+c.time
  stops.forEach((b,i)=>i===index?b.setAttribute('aria-current','step'):b.removeAttribute('aria-current'))
  stage.dataset.scene=c.id
}
function update() {
  timeline.evaluate(rendered,frame)
  const {index,local,mix}=frame
  const intro=index===0 && local<.36
  if(index!==currentIndex || intro!==currentIntro){textState(index,intro);currentIndex=index;currentIntro=intro}
  const done=index===chapters.length-1 && local>=.70
  if(done!==ending){
    ending=done; stage.classList.toggle('ending',done)
    el('conclusion').hidden=!done
    copy.hidden=done
    if(done)heading.textContent='This is where the next chapter begins.'
    else if(!intro)heading.textContent=chapters[index].narrative
    el('scroll-cue').innerHTML=done?'Revisit chapters':'<i aria-hidden="true"></i>Scroll to explore'
  }
  // Authored typography dissolves on both sides of the opening and epoch boundaries.
  let opacity=1
  if(index===0 && local>.22 && local<.47)opacity=intro ? 1-ease((local-.22)/.14) : ease((local-.36)/.11)
  if(index>0 && local<.08) opacity=ease(local/.08)
  if(index<chapters.length-1 && local>.88) opacity=1-ease((local-.88)/.12)
  stage.style.setProperty('--caption-opacity',String(reduced?1:opacity))
  chart.style.opacity=index===0?String(1-mix):'0'
  chart.style.visibility=index===0?'visible':'hidden'
  if(index===0)chart.style.transform=reduced?'none':'scale('+(1+.10*local+.17*mix)+') rotate('+(-5*local)+'deg)'
  const percent=Math.round(rendered*100)
  if(percent!==lastPercent){el('percent').textContent=percent+'% traversed';lastPercent=percent}
  ruler.style.setProperty('--position',rendered*100+'%')
  renderer?.render(frame,reduced)
  score.update(rendered)
}
function tick(time:number){
  request=0
  const dt=lastTime ? Math.max(.001,(time-lastTime)/1000) : 1/60
  const interval=(time-lastRender)/1000
  if(lastRender && interval<.25 && rendered!==target && frame.index>0 && renderer && quality.sample(interval)) renderer.resize(quality.active)
  lastRender=time
  const previous=rendered
  rendered=reduced ? target : damp(rendered,target,Math.min(.08,dt))
  if(previous!==rendered || dirty){dirty=false;update()}
  if(diagnostic)diagnostic.textContent=(interval>0 && interval<.25 ? `${(interval*1000).toFixed(1)} ms · ${Math.round(1/interval)} fps` : "Idle") + ` · ${renderer?.draws??0} draws · ${quality.active}`
  if(rendered!==target && !document.hidden){lastTime=time;request=requestAnimationFrame(tick)}
  else lastTime=0
}
function schedule(){if(!request && !document.hidden)request=requestAnimationFrame(tick)}
function invalidate(){dirty=true;schedule()}
function resize(first=false){
  // A stable scroll distance survives mobile toolbar resizing, while the trailing
  // viewport-height segment lets the native document still reach exactly 100%.
  if(first){
    const existing=history.state?.omniDistance
    distance=Number.isFinite(existing) && existing>0 ? existing : Math.round(Math.max(520,innerHeight)*timeline.total*1.65)
    history.replaceState({...history.state,omniDistance:distance},'')
  }
  space.style.height=(distance+document.documentElement.clientHeight)+'px'
  target=clamp(scrollY/distance);if(first)rendered=target
  renderer?.resize(quality.active);invalidate()
}
resize(true)
if(savedPosition>0){
  window.scrollTo({top:Math.round(distance*savedPosition),behavior:'instant'})
  target=rendered=clamp(scrollY/distance)
}
update()
const overture=el('overture')
function reveal(){overture.remove()}
if(target>0 || reduced)reveal()
else{
  overture.addEventListener('animationend',event=>{if(event.animationName==='opening-dissolve')reveal()})
  for(const event of ['pointerdown','keydown','scroll'])window.addEventListener(event,reveal,{once:true,passive:true})
}
window.addEventListener('resize',()=>resize())
window.addEventListener('scroll',()=>{target=clamp(scrollY/distance);schedule()},{passive:true})
window.addEventListener('scrollend',rememberPosition)
window.addEventListener('pageshow',()=>{target=clamp(scrollY/distance);rendered=target;invalidate()})
document.addEventListener('visibilitychange',()=>{
  score.visibility(rendered)
  if(document.hidden){cancelAnimationFrame(request);request=0;lastTime=0}else invalidate()
})
// The opening instrument paints before the GPU program and chapter fields load.
requestAnimationFrame(()=>requestAnimationFrame(async()=>{
  try {
    const {CosmosRenderer}=await import('./engine/renderer')
    renderer=new CosmosRenderer(el<HTMLCanvasElement>('cosmos'),chapters.map(c=>c.id),invalidate)
    renderer.resize(quality.active)
  }catch{el('cosmos').hidden=true;el('cosmos').dataset.renderer='fallback'}
  invalidate()
}))
window.addEventListener('pagehide',e=>{rememberPosition();if(!e.persisted){renderer?.dispose();score.dispose()}})
