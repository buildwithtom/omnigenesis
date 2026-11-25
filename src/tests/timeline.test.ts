import { describe, expect, it } from 'vitest'
import { chapters } from '../content/chapters'
import { sources } from '../content/sources'
import { makeTimeline, damp } from '../engine/timeline'

const timeline = makeTimeline(chapters)
describe('weighted timeline', () => {
  it('validates pacing and supports a standalone chapter',()=>{
    expect(()=>makeTimeline([])).toThrow()
    expect(()=>makeTimeline([{weight:0}])).toThrow()
    expect(makeTimeline([{weight:2}]).evaluate(.5)).toEqual({index:0,local:.5,mix:0})
  })
  it('clamps endpoints and keeps Earth at the end',()=>{
    expect(timeline.evaluate(-1)).toEqual({index:0,local:0,mix:0})
    expect(timeline.evaluate(1.1)).toEqual({index:10,local:1,mix:0})
  })
  it('reconstructs both sides of every boundary',()=>{
    for(let i=0;i<chapters.length;i++){
      const p=timeline.starts[i]
      expect(timeline.evaluate(p)).toEqual({index:i,local:0,mix:0})
      if(i){const prior=timeline.evaluate(p-1e-9);expect(prior.index).toBe(i-1);expect(prior.mix).toBeCloseTo(1)}
    }
  })
  it('produces identical states after direction changes or jumps',()=>{
    const path=[.99,.1,.5,1,.05,.77,.001,0,.99]
    const expected=path.map(x=>timeline.evaluate(x))
    const frame=timeline.evaluate(0)
    for(const p of [...path].reverse())timeline.evaluate(p,frame)
    path.forEach((p,i)=>expect(timeline.evaluate(p,frame)).toEqual(expected[i]))
  })
  it('limits fling speed in both directions and eases to the native position',()=>{
    expect(damp(.1,.9,.01)).toBeCloseTo(.10018,10)
    expect(damp(.9,.1,.01)).toBeCloseTo(.89982,10)
    expect(damp(.101,.1005,.1)).toBeGreaterThan(.1005)
    expect(damp(damp(.1,.104,.06),.104,.06)).toBeCloseTo(damp(.1,.104,.12),12)
    expect(damp(damp(0,.1,.02),.1,.02)).toBeCloseTo(damp(0,.1,.04),12)
    expect(damp(.19999,.2,.016)).toBe(.2)
  })
})
describe('scientific content',()=>{
  it('has stable IDs, ordered epochs and independently traceable citations',()=>{
    expect(new Set(chapters.map(c=>c.id)).size).toBe(chapters.length)
    expect(chapters.map(c=>c.age)).toEqual(chapters.map(c=>c.age).sort((a,b)=>a-b))
    for(const c of chapters){
      expect(c.weight).toBeGreaterThan(0)
      expect(c.uncertainty).toBeTruthy()
      expect(c.sources.length).toBeGreaterThan(0)
      for(const id of c.sources){expect(sources[id].url).toMatch(/^https:/);expect(sources[id].verified).toMatch(/^\d{4}-\d{2}-\d{2}$/)}
    }
  })
})
