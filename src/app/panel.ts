import { chapters } from '../content/chapters'
import { sources } from '../content/sources'
import type { Quality } from '../engine/quality'

type View = 'Index' | 'Chapters' | 'Settings' | 'References' | 'About' | 'Evidence'
interface Actions {
  index(): number
  jump(index: number): void
  replay(index: number): void
  sound(): boolean
  audioUnavailable(): boolean
  toggleSound(): void
  motion(): boolean
  toggleMotion(): void
  autoplay(): boolean
  toggleAutoplay(): void
  quality(): Quality
  setQuality(quality: Quality): void
}
const qualityStops: Quality[] = ['Auto', 'Low', 'Balanced', 'High']
const pad = (n: number) => String(n).padStart(2, '0')

function reference(id: string) {
  const source = sources[id]
  return `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title}</a><span class="source-date">${source.published ? 'Published '+source.published+' · ' : ''}Checked ${source.verified}</span></li>`
}

function setting(key: string, label: string, checked: boolean, detail = '', disabled = false) {
  return `<label class="setting"><span>${label}${detail ? '<small>'+detail+'</small>' : ''}</span><input type="checkbox" role="switch" aria-label="${label}" data-setting="${key}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}></label>`
}

export class Instrument {
  private dialog = document.querySelector<HTMLDialogElement>('#instrument')!
  private content = document.querySelector<HTMLElement>('#panel-content')!
  private trigger = document.querySelector<HTMLButtonElement>('#menu-trigger')!
  private settings = document.querySelector<HTMLButtonElement>('#settings-trigger')!
  private back = document.querySelector<HTMLButtonElement>('#panel-back')!
  private opener: HTMLElement | null = null
  private page: View = 'Index'

  constructor(private actions: Actions) {
    this.trigger.addEventListener('click', () => this.open('Index', this.trigger))
    this.settings.addEventListener('click', () => this.open('Settings', this.settings))
    this.back.addEventListener('click', () => {
      const previous = this.page
      this.draw('Index')
      this.content.querySelector<HTMLElement>(`[data-view="${previous}"]`)?.focus()
    })
    document.querySelector('#dismiss')!.addEventListener('click', () => this.dialog.close())
    this.dialog.addEventListener('click', e => {
      if (e.target !== this.dialog) return
      const r = this.dialog.getBoundingClientRect()
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) this.dialog.close()
    })
    this.dialog.addEventListener('close', () => {
      document.documentElement.style.overflow = ''
      this.settings.setAttribute('aria-expanded', 'false')
      this.trigger.setAttribute('aria-expanded', 'false')
      this.opener?.focus({preventScroll:true})
    })
    this.content.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLButtonElement>('button')
      if (!b) return
      if (b.dataset.view) {
        this.draw(b.dataset.view as View)
        this.content.querySelector<HTMLElement>('h2')!.focus({preventScroll:true})
      } else if (b.dataset.replay !== undefined) {
        this.opener = this.trigger
        this.dialog.close()
        this.actions.replay(Number(b.dataset.replay))
      } else if (b.dataset.jump !== undefined) {
        this.dialog.close()
        this.actions.jump(Number(b.dataset.jump))
      }
    })
    this.content.addEventListener('change', e => {
      const key = (e.target as HTMLInputElement).dataset.setting
      if (!key) return
      if (key === 'sound') this.actions.toggleSound()
      if (key === 'motion') this.actions.toggleMotion()
      if (key === 'autoplay') this.actions.toggleAutoplay()
      this.draw('Settings')
      this.content.querySelector<HTMLElement>(`[data-setting="${key}"]`)?.focus({preventScroll:true})
    })
    this.content.addEventListener('input', e => {
      const slider = e.target as HTMLInputElement
      if (slider.id !== 'quality') return
      const quality = qualityStops[slider.valueAsNumber]
      this.actions.setQuality(quality)
      slider.setAttribute('aria-valuetext', quality)
      this.content.querySelector('output')!.value = quality
    })
  }

  get isOpen() { return this.dialog.open }
  open(page: View, opener: HTMLElement) {
    this.opener = opener
    window.scrollTo({top:window.scrollY, behavior:'instant'})
    this.draw(page)
    this.dialog.showModal()
    document.documentElement.style.overflow = 'hidden'
    if (opener.hasAttribute('aria-expanded')) opener.setAttribute('aria-expanded', 'true')
    document.querySelector<HTMLElement>('#dismiss')!.focus({preventScroll:true})
  }

  private draw(page: View) {
    this.page = page
    const a = this.actions, index = a.index(), c = chapters[index]
    this.back.hidden = page === 'Index'
    document.querySelector<HTMLElement>('#act-label')!.hidden = !this.back.hidden
    let body = '', heading: string = page
    switch (page) {
      case 'Index':
        body = '<nav aria-label="Index sections">' + ['Chapters','Evidence','References','About'].map(v =>
          `<button class="menu-link" data-view="${v}">${v}</button>`).join('') +
          '</nav><footer><button data-view="Settings" class="gear-button" aria-label="Settings" title="Settings"><svg aria-hidden="true" viewBox="0 0 24 24"><use href="#gear"/></svg></button></footer>'
        break
      case 'Chapters':
        body = chapters.map((chapter,i) => `<button class="chapter-link" data-jump="${i}" ${i===index?'aria-current="step"':''}><span>${pad(i)}</span>${chapter.title}</button>`).join('')
        break
      case 'Settings':
        body = setting('sound','Ambient sound',a.sound(),a.audioUnavailable()?'Audio unavailable':'',a.audioUnavailable()) +
          setting('motion','Reduced motion',a.motion()) +
          setting('autoplay','Autoplay',a.autoplay() && !a.motion(),a.motion()?'Paused while reduced motion is on.':'After 45 seconds of quiet.',a.motion()) +
          `<div class="quality-setting"><label for="quality">Visual quality</label><output for="quality">${a.quality()}</output><input id="quality" type="range" min="0" max="3" step="1" value="${qualityStops.indexOf(a.quality())}" aria-valuetext="${a.quality()}"><div class="range-labels" aria-hidden="true"><span>Auto</span><span>High</span></div></div>`
        break
      case 'Evidence':
        heading = c.title
        body = `<div class="prose"><span class="micro">Chapter ${pad(index)} / ${c.time}</span><p>${c.description}</p><span class="micro">${c.evidenceType}</span><p>${c.uncertainty}</p><button class="panel-action" data-replay="${index}">Replay this chapter</button><h3>Sources</h3><ul>${c.sources.map(reference).join('')}</ul></div>`
        break
      case 'References':
        heading = 'Scientific references'
        body = `<div class="prose"><ul>${Object.keys(sources).map(reference).join('')}</ul></div>`
        break
      case 'About':
        heading = 'About OmniGenesis'
        body = '<div class="prose"><p>Act I begins in darkness and ends on a young Earth. The images are interpretations, and the music is an original score.</p><p>Scroll either way. Select a line to read its evidence, or use the arrow keys to change chapters.</p><p>Time runs unevenly here. The first seconds take as much room as some of the next billion years.</p></div>'
    }
    this.content.innerHTML = `<h2 id="panel-title" tabindex="-1">${heading}</h2>${body}`
    this.dialog.scrollTop = 0
  }
}
