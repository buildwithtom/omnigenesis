import { clamp, ease } from '../engine/timeline'

interface Grain {
  x: number
  y: number
  seed: number
  size: number
}

const headroom = 110

// Sample the laid-out glyphs once. Each grain starts on the letter that sheds it.
export class Caption {
  private grains: Grain[] = []
  private context: CanvasRenderingContext2D | null
  private stale = true
  private width = 1
  private age = 0
  private release = -1
  private opacity = 0
  private lastWind = -1
  private lastOpacity = -1

  constructor(private container: HTMLElement, private heading: HTMLElement, private canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d')
  }

  setText(text: string) {
    this.heading.textContent = text
    this.container.hidden = !text
    this.age = 0
    this.release = -1
    this.opacity = 0
    this.lastOpacity = -1
    this.invalidate()
  }

  invalidate() {
    this.stale = true
    this.lastWind = -1
  }

  depart() {
    if (this.opacity > .12 && this.release < 0) this.release = 0
  }

  private sample() {
    const node = this.heading.firstChild
    if (!node || !this.context) return
    const bounds = this.heading.getBoundingClientRect()
    this.width = Math.max(1, Math.ceil(bounds.width))
    const height = Math.max(1, Math.ceil(bounds.height))
    const stamp = document.createElement('canvas')
    stamp.width = this.width
    stamp.height = height
    const ink = stamp.getContext('2d', { willReadFrequently: true })
    if (!ink) return
    const css = getComputedStyle(this.heading)
    ink.font = css.fontSize + ' ' + css.fontFamily
    ink.fillStyle = 'white'
    const metrics = ink.measureText('Mg')
    const range = document.createRange()
    for (const word of (node.textContent || '').matchAll(/\S+/g)) {
      range.setStart(node, word.index!)
      range.setEnd(node, word.index! + word[0].length)
      const box = range.getBoundingClientRect()
      const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(css.fontSize) * .8
      const descent = metrics.fontBoundingBoxDescent ?? parseFloat(css.fontSize) * .2
      const baseline = box.top - bounds.top + (box.height - ascent - descent) / 2 + ascent
      ink.fillText(word[0], box.left - bounds.left, baseline)
    }
    const pixels = ink.getImageData(0, 0, this.width, height).data
    this.grains.length = 0
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < this.width; x += 2) {
        if (pixels[(y * this.width + x) * 4 + 3] < 68) continue
        const hash = Math.sin(x * 19.37 + y * 79.13) * 43758.545
        const seed = hash - Math.floor(hash)
        this.grains.push({ x, y, seed, size: .36 + seed * .52 })
      }
    }
    const dpr = Math.min(2, devicePixelRatio)
    const w = this.width + 185, h = height + headroom + 12
    this.canvas.width = Math.ceil(w * dpr)
    this.canvas.height = Math.ceil(h * dpr)
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.stale = false
  }

  private scatter(wind: number) {
    if (wind === this.lastWind) return
    this.lastWind = wind
    const ctx = this.context
    const active = wind > 0 && wind < 1 && !!ctx
    this.canvas.hidden = !active
    const front = ease(wind) * 1.62 - .14
    this.heading.style.maskImage = wind === 0 ? '' :
      `linear-gradient(90deg, transparent ${(front - .15) * 100}%, black ${front * 100}%)`
    if (!active || !ctx) return
    if (this.stale) this.sample()
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.fillStyle = '#e6dcca'
    for (const grain of this.grains) {
      const age = (front - grain.x / this.width + .06 * grain.seed) / .48
      if (age <= 0 || age >= 1) continue
      const drift = age * age * (2 - age)
      // Neighbouring specks ride the same soft current, with a little slip.
      const current = grain.x * .008 + grain.y * .014 + age * 2.4
      const x = grain.x + drift * (62 + 84 * grain.seed + 12 * Math.cos(current))
      const y = headroom + grain.y + drift * (15 * Math.sin(current) - 24 - 38 * grain.seed)
      ctx.globalAlpha = ease(age / .20) * (1 - ease((age - .18) / .82)) * (.52 + grain.seed * .38)
      ctx.fillRect(x, y, grain.size, grain.size)
    }
    ctx.globalAlpha = 1
  }

  advance(dt: number, travelling: boolean, reduced: boolean) {
    if (this.container.hidden) return false
    this.age += dt
    if (reduced) {
      this.release = -1
      this.opacity = 1
    } else if (this.release >= 0) {
      this.release = Math.min(1, this.release + dt / 1.75)
      if (this.release === 1 && !travelling) {
        this.release = -1
        this.age = 0
        this.opacity = 0
      }
    } else {
      this.opacity = ease((this.age - .26) / .95)
    }
    if (this.opacity !== this.lastOpacity) {
      this.container.style.opacity = String(this.opacity)
      this.lastOpacity = this.opacity
    }
    const dispersal = reduced ? 0 : clamp(this.release)
    this.container.inert = this.opacity < .04 || dispersal > .8
    this.scatter(dispersal)
    return !reduced && (this.opacity < 1 || this.release >= 0)
  }
}
