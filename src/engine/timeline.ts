export const clamp = (x: number) => Math.max(0, Math.min(1, x))
export const ease = (x: number) => { const u = clamp(x); return u * u * (3 - 2 * u) }
export interface Frame { index: number; local: number; mix: number }
export function makeTimeline(entries: readonly {weight: number}[]) {
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
    frame.mix = index + 1 < starts.length ? ease((frame.local - .78) / .22) : 0
    return frame
  }
  return { starts, ends, total, at, evaluate }
}
export function damp(current: number, target: number, dt: number) {
  const delta = target - current
  if (Math.abs(delta) > .12 || Math.abs(delta) < .000025) return target
  return current + delta * (1 - Math.exp(-14 * dt))
}
