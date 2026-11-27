// A quiet D-minor/add-nine score. All notes are synthesized locally.
function makePhrase(ctx: AudioContext) {
  const rate = 22050
  const buffer = ctx.createBuffer(1, rate * 40, rate)
  const samples = buffer.getChannelData(0)
  const notes = [
    [0, 50, 8], [4.5, 57, 7], [9, 64, 8], [14, 60, 7],
    [20, 53, 9], [24.5, 57, 8], [30, 62, 8], [35, 52, 9],
  ]
  for (const [start, midi, duration] of notes) {
    const hz = 440 * 2 ** ((midi - 69) / 12)
    const offset = Math.round(start * rate)
    for (let i = 0; i < duration * rate; i++) {
      const t = i / rate
      const attack = 1 - Math.exp(-t * 1.8)
      const release = Math.min(1, (duration - t) / 2)
      const phase = Math.PI * 2 * hz * t
      const note = Math.sin(phase) + .20*Math.sin(phase*2.001) + .07*Math.sin(phase*3.)
      samples[(offset+i)%samples.length] += .19*note*attack*attack*Math.exp(-t*.38)*release*release
    }
  }
  return buffer
}

export class Score {
  private ctx?: AudioContext
  private master?: GainNode
  private phrase?: AudioBufferSourceNode
  private tones: OscillatorNode[] = []
  private last = -1
  enabled = true
  get playing() { return this.enabled && !!this.master && this.ctx?.state === 'running' }

  private init(ctx: AudioContext) {
    const master = this.master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    for (const [i,hz] of [73.416,110,164.814].entries()) {
      const tone = ctx.createOscillator(), voice = ctx.createGain()
      tone.frequency.value = hz
      voice.gain.value = .22 / (i+1)
      tone.connect(voice).connect(master)
      tone.start()
      this.tones.push(tone)
    }
    const phrase = this.phrase = ctx.createBufferSource()
    phrase.buffer = makePhrase(ctx)
    phrase.loop = true
    phrase.connect(master)
    const echo = ctx.createDelay(2), tail = ctx.createGain()
    echo.delayTime.value = 1.24
    tail.gain.value = .18
    phrase.connect(echo).connect(tail).connect(master)
    phrase.start()
  }

  async start() {
    if (!this.enabled || document.hidden) return
    if (!this.ctx) {
      const Audio = window.AudioContext || (window as typeof window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext
      if (!Audio) throw Error('Web Audio unavailable')
      this.ctx = new Audio()
    }
    if (this.ctx.state !== 'running') await this.ctx.resume()
    if (!this.master && this.enabled && this.ctx.state === 'running') this.init(this.ctx)
  }

  update(progress: number) {
    if (!this.ctx || !this.master || progress === this.last) return
    this.last = progress
    const t = this.ctx.currentTime
    const level = .030 + .024*Math.sin(Math.PI*progress)**2
    this.master.gain.setTargetAtTime(this.enabled && !document.hidden ? level : 0,t,.27)
    // Small detuning gives the sustained fifth air without changing key.
    this.tones.forEach((tone,i)=>tone.detune.setTargetAtTime((i-1)*progress*2,t,.8))
  }
  visibility(progress:number){this.last=-1;this.update(progress)}
  dispose(){this.phrase?.stop();this.tones.forEach(tone=>tone.stop());void this.ctx?.close()}
}
