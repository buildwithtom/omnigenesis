export const presets = {
  Low: {dpr: .70, pixels: 600_000, detail: 0},
  Balanced: {dpr: 1.1, pixels: 1_500_000, detail: 1},
  High: {dpr: 1.6, pixels: 3_000_000, detail: 2},
} as const
export type Level = keyof typeof presets
export type Quality = Level | 'Auto'
const levels: Level[] = ['Low', 'Balanced', 'High']
export class QualityControl {
  mode: Quality = 'Auto'
  private level = matchMedia('(pointer:coarse)').matches ? 0 : 1
  private elapsed = 0
  private frames = 0
  private headroom = 0
  get active(): Level { return this.mode === 'Auto' ? levels[this.level] : this.mode }
  sample(seconds: number) {
    if (this.mode !== 'Auto') return false
    this.elapsed += Math.min(.25, seconds)
    this.frames++
    if (this.elapsed < 2) return false
    const ms = this.elapsed * 1000 / this.frames
    const before = this.level
    this.headroom = ms < 17.8 ? this.headroom + 1 : 0
    if (ms > 24 && this.level > 0) this.level--
    if (this.headroom >= 5 && this.level < 2) { this.level++; this.headroom = 0 }
    this.elapsed = this.frames = 0
    return before !== this.level
  }
}
