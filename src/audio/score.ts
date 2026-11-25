// Non-diegetic accompaniment. An explicit user gesture opens the audio graph.
export class Score {
  private ctx?: AudioContext
  private master?: GainNode
  private tones: OscillatorNode[] = []
  private last = -1
  enabled = false
  async toggle() {
    if (!this.ctx) {
      const Audio = window.AudioContext || (window as typeof window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext
      if (!Audio) throw Error('Web Audio unavailable')
      this.ctx = new Audio()
      this.master = this.ctx.createGain(); this.master.gain.value = 0
      this.master.connect(this.ctx.destination)
      for (const [i, frequency] of [49,73.42,123.47].entries()) {
        const tone = this.ctx.createOscillator(), voice = this.ctx.createGain()
        tone.type = 'sine'; tone.frequency.value = frequency; voice.gain.value = .50 / (i+1)
        tone.connect(voice); voice.connect(this.master); tone.start(); this.tones.push(tone)
      }
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    this.enabled = !this.enabled
    this.last = -1
    return this.enabled
  }
  update(progress:number) {
    if (!this.ctx || !this.master || progress === this.last) return
    this.last = progress
    const t=this.ctx.currentTime, amount = .016 + .045*Math.sin(Math.PI*progress)**2
    this.master.gain.setTargetAtTime(this.enabled && !document.hidden ? amount : 0,t,.20)
    this.tones.forEach((tone,i)=>tone.frequency.setTargetAtTime([49,73.42,123.47][i]*(1+.31*progress),t,.28))
  }
  visibility(progress:number){this.last=-1;this.update(progress)}
  dispose(){this.tones.forEach(tone=>tone.stop());void this.ctx?.close()}
}
