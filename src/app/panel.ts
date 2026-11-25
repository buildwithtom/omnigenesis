import { chapters } from '../content/chapters'
import { sources } from '../content/sources'
import type { Quality } from '../engine/quality'

export type View = 'Chapters' | 'Settings' | 'References' | 'About' | 'Evidence' | 'Reading'
interface Actions {
  index(): number
  jump(i:number):void
  sound():boolean
  audioUnavailable():boolean
  toggleSound(): Promise<void>
  motion():boolean
  toggleMotion():void
  quality():Quality
  setQuality(q:Quality):void
}
const pad = (n:number) => String(n).padStart(2,'0')
function reference(id:string) {
  const s=sources[id]
  return `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title}</a><span class="source-date">${s.published ? 'Published '+s.published+' · ' : ''}Checked ${s.verified}</span></li>`
}
export class Instrument {
  private dialog = document.querySelector<HTMLDialogElement>('#instrument')!
  private content = document.querySelector<HTMLElement>('#panel-content')!
  private trigger = document.querySelector<HTMLElement>('#menu-trigger')!
  private opener: HTMLElement | null = null
  private page:View='Chapters'
  constructor(private actions:Actions){
    this.trigger.addEventListener('click',()=>this.open('Chapters',this.trigger))
    document.querySelector('#dismiss')!.addEventListener('click',()=>this.dialog.close())
    this.dialog.addEventListener('click', e=>{
      if(e.target===this.dialog) {
        const r=this.dialog.getBoundingClientRect()
        if(e.clientX < r.left || e.clientX > r.right || e.clientY<r.top || e.clientY>r.bottom)this.dialog.close()
      }
    })
    this.dialog.addEventListener('close',()=>{
      document.documentElement.style.overflow=''
      this.trigger.setAttribute('aria-expanded','false')
      this.opener?.focus({preventScroll:true})
    })
    this.content.addEventListener('click',e=>{void this.activate(e)})
    this.content.addEventListener('change',e=>{
      if(e.target instanceof HTMLSelectElement && e.target.id==='quality')this.actions.setQuality(e.target.value as Quality)
    })
  }
  get isOpen(){return this.dialog.open}
  open(page:View,opener:HTMLElement) {
    this.opener = opener
    window.scrollTo({top:window.scrollY,behavior:'instant'})
    this.draw(page); this.dialog.showModal()
    document.documentElement.style.overflow='hidden'
    this.trigger.setAttribute('aria-expanded','true')
    document.querySelector<HTMLElement>('#dismiss')!.focus({preventScroll:true})
  }
  private async activate(e:Event) {
    const b=(e.target as Element).closest<HTMLButtonElement>('button')
    if(!b)return
    if(b.dataset.view){this.draw(b.dataset.view as View,true);return}
    if(b.dataset.jump!==undefined){
      this.dialog.close()
      this.actions.jump(Number(b.dataset.jump))
      return
    }
    if(b.dataset.setting==='sound') await this.actions.toggleSound()
    if(b.dataset.setting==='motion') this.actions.toggleMotion()
    if(b.dataset.setting){
      this.draw('Settings')
      this.content.querySelector<HTMLElement>('[data-setting="'+b.dataset.setting+'"]')?.focus()
    }
  }
  private draw(page:View, focus=false){
    this.page=page
    const a=this.actions, index=a.index(), c=chapters[index]
    const nav=(['Chapters','Settings','References','About'] as const).map(v=>`<button data-view="${v}" ${this.page===v?'aria-current="page"':''}>${v}</button>`).join('')
    let body='', heading:string=page
    switch(page){
      case 'Chapters':
        heading='Chapter index'
        body=chapters.map((c,i)=>`<button class="chapter-link" data-jump="${i}" ${i===index?'aria-current="step"':''}><span>${pad(i)}</span>${c.title}</button>`).join('')+
          '<button class="panel-action" data-jump="0">Restart journey</button><button class="panel-action" data-view="Reading">Open reading mode</button>'
        break
      case 'Settings':
        body=`<div class="setting"><span>Ambient sound</span><button data-setting="sound" aria-pressed="${a.sound()}" ${a.audioUnavailable()?'disabled':''}>${a.audioUnavailable()?'Unavailable':a.sound()?'On':'Off'}</button></div>
        <div class="setting"><span>Reduced motion</span><button data-setting="motion" aria-pressed="${a.motion()}">${a.motion()?'On':'Off'}</button></div>
        <label class="setting" for="quality">Visual quality<select id="quality">${['Auto','High','Balanced','Low'].map(q=>`<option ${a.quality()===q?'selected':''}>${q}</option>`).join('')}</select></label>
        <button class="panel-action" data-view="Reading">Open reading mode</button>
        <p class="prose">The optional electronic score is artistic accompaniment.</p>`
        break
      case 'Evidence':
        heading=c.title
        body=`<div class="prose"><span class="micro">Chapter ${pad(index)} / ${c.time}</span><h3>${c.narrative}</h3><p>${c.description}</p><span class="micro">${c.evidenceType}</span><p>${c.uncertainty}</p><h3>Sources</h3><ul>${c.sources.map(reference).join('')}</ul></div>`
        break
      case 'References':
        heading='Scientific references'
        body=`<div class="prose"><p>Each chapter’s evidence notes connect its interpretation to the observations and models behind it.</p><ul>${Object.keys(sources).map(reference).join('')}</ul></div>`
        break
      case 'Reading':
        heading='From the Unknown to Earth'
        body=`<div class="prose"><p>Act I in eleven chapters. Time intervals are approximate and some epochs overlap.</p>${chapters.map((c,i)=>`<section class="reading-section"><span class="micro">Chapter ${pad(i)} / ${c.time}</span><h3>${c.title}</h3><p><em>${c.narrative}</em></p><p>${c.description}</p><p>${c.uncertainty}</p><button class="panel-action" data-jump="${i}">Visit this epoch</button></section>`).join('')}<p>This is where the next chapter begins.</p><h3>Act II — The Living Earth</h3><p>Forthcoming.</p></div>`
        break
      case 'About':
        heading='About OmniGenesis'
        body='<div class="prose"><p><em>Scroll through the history of existence.</em></p><p>Act I follows the universe from the limits of our knowledge to the formation of Earth. Scroll either way to travel in time, or choose an epoch from the chapter index.</p><h3>Reading the instrument</h3><p>The engraved point is symbolic. Each later scene is a procedural artistic interpretation. The ruler follows a non-linear chronology, giving even the earliest fractions of a second room to unfold.</p><p>Use the left and right arrow keys to move between chapters. Page Up, Page Down, Home and End also work.</p><button class="panel-action" data-view="Reading">Open reading mode</button></div>'
    }
    this.content.innerHTML=`<h2 id="panel-title" tabindex="-1">${heading}</h2><div class="tab-row" role="group" aria-label="Index views">${nav}</div>${body}`
    this.dialog.scrollTop=0
    if(focus)this.content.querySelector<HTMLElement>('h2')!.focus({preventScroll:true})
  }
}
