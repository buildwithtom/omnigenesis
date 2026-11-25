export const clamp = (x: number) => Math.max(0, Math.min(1, x))
export const ease = (x: number) => { const u = clamp(x); return u * u * (3 - 2 * u) }
export interface Frame { index: number; local: number; mix: number }
export function makeTimeline(entries: readonly {weight: number; id?: string}[]) {
  if (!entries.length || entries.some(e => !Number.isFinite(e.weight) || e.weight <= 0)) {
    throw new Error('Every timeline chapter needs a positive finite weight.')
  }
  const total = entries.reduce((sum, e) => sum + e.weight, 0)
  let accumulated = 0
  const starts = entries.map(e => { const start = accumulated / total; accumulated += e.weight; return start })
  const ends = [...starts.slice(1), 1]
  function at(index: number, local = 0) {
    return starts[index] + (ends[index] - starts[index]) * clamp(local)
  }
  function evaluate(progress: number, frame: Frame = { index: 0, local: 0, mix: 0 }) {
    const p = clamp(progress)
    let index = starts.length - 1
    while (index > 0 && starts[index] > p) index--
    frame.index = index
    frame.local = clamp((p - starts[index]) / (ends[index] - starts[index]))
    const blendStart = entries[index].id === 'unknown' ? .025 : .72
    frame.mix = index + 1 < starts.length ? ease((frame.local - blendStart) / (1 - blendStart)) : 0
    return frame
  }
  return { starts, ends, total, at, evaluate }
}
export function damp(current: number, target: number, dt: number) {
  const delta = target - current
  const gap = Math.abs(delta)
  if (gap < .000025) return target
  // Large flings pass through each scene at a bounded speed. Near the native
  // scroll position, join an exponential tail with the same initial velocity.
  const speed = .018
  const rate = 6
  const tail = speed / rate
  const cruiseTime = Math.max(0, (gap - tail) / speed)
  if (dt <= cruiseTime) return current + Math.sign(delta) * speed * dt
  const remaining = Math.min(gap, tail) * Math.exp(-rate * (dt - cruiseTime))
  return target - Math.sign(delta) * remaining
}
