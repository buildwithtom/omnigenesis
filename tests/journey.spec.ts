import { expect, test, type Page } from '@playwright/test'
import { chapters } from '../src/content/chapters'
import { makeTimeline } from '../src/engine/timeline'
const earth = chapters.length - 1
const milkyWay = chapters.findIndex(c=>c.id==='milky-way')
const solar = chapters.findIndex(c=>c.id==='solar-system')
const scene = (p:Page,n:number)=>expect(p.locator('#stage')).toHaveAttribute('data-scene',chapters[n].id)
const panel = (p:Page)=>p.getByRole('dialog')
const openIndex=async(p:Page)=>{await p.getByRole('button',{name:'Index',exact:true}).click()}
const go=async(p:Page,n:number)=>{
  await openIndex(p)
  await panel(p).getByRole('button',{name:'Chapters'}).click()
  await p.locator('.chapter-link').nth(n).click()
  await scene(p,n)
}
const evidence=async(p:Page)=>{await openIndex(p);await panel(p).getByRole('button',{name:'Evidence',exact:true}).click()}
test('the instrument visits each scene and opens its sources',async({page})=>{
  const errors:string[]=[];page.on('pageerror',err=>errors.push(err.message))
  await page.goto('/')
  await expect(page.locator('#cosmos')).toHaveAttribute('data-renderer','webgl')
  expect((await page.locator('#stage').innerText()).trim()).toBe('')
  await expect(page.locator('.mouse-wheel')).toBeVisible()
  await page.locator('#begin').evaluate(button=>button.addEventListener('click',()=>performance.mark('journey-start'),{once:true}))
  await page.getByRole('button',{name:'Begin the journey'}).click()
  await expect(page.getByRole('heading',{level:1})).toHaveText('Space itself expands.')
  const arrival = await page.locator('.caption').evaluate(async caption=>{
    while(Number(getComputedStyle(caption).opacity)<.9) await new Promise(requestAnimationFrame)
    return Math.round(performance.measure('first-readable-line','journey-start').duration)
  })
  console.log('First caption at 90% opacity (ms)',arrival)
  for(let i=1;i<chapters.length;i++)await go(page,i)
  await evidence(page)
  await expect(panel(page).getByText('Isotopic dating')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.keyboard.press('End')
  await expect(page.getByText('Act II — The Living Earth',{exact:true})).toBeVisible()
  await page.keyboard.press('Home')
  await expect(page.locator('#stage')).toHaveClass(/opening/)
  expect(errors).toEqual([])
})
test('native scroll, reversals, reload, resize and keyboard focus',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/')
  const start=await page.evaluate(()=>scrollY)
  await page.mouse.wheel(0,125);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(start)
  for(const delta of [500,800,-320,1200,-260])await page.mouse.wheel(0,delta)
  await go(page,6)
  const position=await page.evaluate(()=>scrollY)
  await openIndex(page);await page.keyboard.press('Escape')
  await expect(page.getByRole('button',{name:'Index',exact:true})).toBeFocused()
  expect(await page.evaluate(()=>scrollY)).toBe(position)
  await page.reload();await scene(page,6)
  await page.setViewportSize({width:1024,height:680});await scene(page,6)
  await page.keyboard.press('ArrowRight');await scene(page,7)
  await page.keyboard.press('ArrowLeft');await scene(page,6)
  await openIndex(page);await page.mouse.click(40,170);await expect(panel(page)).not.toBeVisible()
})
test('index pages, bottom settings, switches and quality slider',async({page},info)=>{
  await page.setViewportSize({width:390,height:844})
  await page.goto('/')
  await openIndex(page)
  await page.screenshot({path:info.outputPath('index-mobile.png')})
  await panel(page).getByRole('button',{name:'Chapters'}).click()
  await expect(page.locator('.chapter-link')).toHaveCount(chapters.length)
  await page.screenshot({path:info.outputPath('chapters-mobile.png')})
  await panel(page).getByRole('button',{name:'Back to index'}).click()
  await expect(panel(page).getByRole('button',{name:'Chapters'})).toBeFocused()
  await panel(page).getByRole('button',{name:'Settings'}).click()
  const sound = panel(page).getByRole('switch',{name:'Ambient sound'})
  await expect(sound).toBeChecked()
  await sound.uncheck()
  const autoplay = panel(page).getByRole('switch',{name:'Autoplay'})
  await expect(autoplay).toBeChecked()
  await autoplay.uncheck()
  await panel(page).getByRole('switch',{name:'Reduced motion'}).check()
  await expect(autoplay).toBeDisabled()
  const slider = page.getByRole('slider',{name:'Visual quality'})
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveAttribute('aria-valuetext','Low')
  await page.screenshot({path:info.outputPath('settings-mobile.png')})
  await page.reload()
  await page.getByRole('button',{name:'Settings',exact:true}).click()
  await expect(slider).toHaveValue('1')
  await expect(sound).not.toBeChecked()
  await panel(page).getByRole('switch',{name:'Reduced motion'}).uncheck()
  await expect(autoplay).toBeEnabled()
  await expect(autoplay).not.toBeChecked()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button',{name:'Settings'})).toBeFocused()
})
test('idle playback waits, yields to input, and pauses inside the index',async({page})=>{
  await page.clock.install()
  await page.goto('/')
  await expect(page.locator('#begin')).toBeVisible()
  await page.clock.fastForward(40_000)
  expect(await page.evaluate(()=>scrollY)).toBe(0)
  await openIndex(page)
  await page.clock.fastForward(60_000)
  expect(await page.evaluate(()=>scrollY)).toBe(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('#menu-trigger')).toHaveAttribute('aria-expanded','false')
  await page.clock.fastForward(40_000)
  expect(await page.evaluate(()=>scrollY)).toBe(0)
  await page.clock.fastForward(5_100)
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(100)
  await page.mouse.move(80,80)
  const stopped = await page.evaluate(()=>scrollY)
  await page.clock.fastForward(20_000)
  expect(await page.evaluate(()=>scrollY)).toBe(stopped)
})
test('reduced-motion mobile layouts, end state and rotation',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/');await go(page,7)
  await page.setViewportSize({width:844,height:390});await scene(page,7)
  await page.setViewportSize({width:390,height:844});await page.keyboard.press('End')
  await expect(page.locator('#conclusion')).toBeVisible()
  const collision=await page.evaluate(()=>{
    const caption=document.querySelector('.caption')!.getBoundingClientRect()
    return caption.bottom>innerHeight || caption.top<0
  })
  expect(collision).toBe(false)
})
test('text journey survives a missing shader module and unavailable WebGL',async({page})=>{
  await page.route('**/src/engine/renderer.ts*',route=>route.abort())
  await page.goto('/');await expect(page.locator('#cosmos')).toHaveAttribute('data-renderer','fallback')
  await go(page,5);await evidence(page)
  await expect(panel(page).getByText('Structure formation model')).toBeVisible()
  await page.unrouteAll()
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext=function(type:string,...args:unknown[]){
      if(type.includes('webgl'))return null
      return Reflect.apply(original,this,[type,...args])
    } as typeof original
  })
  await page.reload();await expect(page.locator('#cosmos')).toHaveAttribute('data-renderer','fallback')
  await go(page,earth)
})
test('context restoration reconstructs the active scene',async({page})=>{
  await page.goto('/');await expect(page.locator('#cosmos')).toHaveAttribute('data-renderer','webgl');await go(page,8)
  await page.evaluate(()=>{
    const gl=document.querySelector('canvas')!.getContext('webgl')!
    const extension=gl.getExtension('WEBGL_lose_context')!
    extension.loseContext();setTimeout(()=>extension.restoreContext(),250)
  })
  await expect(page.locator('#cosmos')).toHaveAttribute('data-renderer','fallback')
  await expect(page.locator('#cosmos')).toHaveAttribute('data-renderer','webgl')
  await scene(page,8)
})
test('capture the instrument and measure a traversal',async({page},info)=>{
  await page.goto('/?diagnostics=1');await expect(page.locator('#cosmos')).toHaveAttribute('data-renderer','webgl')
  await page.evaluate(()=>document.fonts.ready)
  await page.locator('#diagnostics').evaluate(el=>el.hidden=true)
  await page.screenshot({path:info.outputPath('opening.png')})
  await page.setViewportSize({width:390,height:844})
  await page.screenshot({path:info.outputPath('opening-mobile.png')})
  await page.setViewportSize({width:1280,height:800})
  await go(page,earth);await expect(page.locator('.caption')).toHaveCSS('opacity','1')
  await page.screenshot({path:info.outputPath('earth.png')})
  await go(page,4)
  const sample=await page.evaluate(async()=>{
    const gl=document.querySelector('canvas')!.getContext('webgl')!
    const extension=gl.getExtension('WEBGL_debug_renderer_info')
    const renderer=extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    const times:number[]=[]
    const height=document.documentElement.scrollHeight-innerHeight
    const start=scrollY
    let previous=0
    for(let i=0;i<181;i++){
      scrollTo(0,start+height*.04*i/180)
      const t=await new Promise<number>(r=>requestAnimationFrame(r))
      if(previous)times.push(t-previous)
      previous=t
    }
    times.sort((a,b)=>a-b)
    return {renderer,samples:times.length,medianMs:times[90],p95Ms:times[171],diagnostic:document.querySelector('#diagnostics')!.textContent}
  })
  console.log('Traversal sample',JSON.stringify(sample))
})
test('touch swipes and layouts on a compact phone',async({browser,browserName})=>{
  test.skip(browserName !== 'chromium', 'Native swipe injection uses the Chromium DevTools protocol.')
  const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:360,height:640},reducedMotion:'reduce'})
  const page=await context.newPage()
  try {
    await page.goto('http://127.0.0.1:5173')
    await expect(page.locator('#stage')).toHaveClass(/opening/)
    const cdp=await context.newCDPSession(page)
    async function swipe(start:number,delta:number,hold=false) {
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:start}]})
      for(let step=1;step<=5;step++){
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y:start+delta*step/5}]})
        await page.evaluate(()=>new Promise(requestAnimationFrame))
      }
      if(hold) await page.evaluate(async()=>{for(let i=0;i<12;i++)await new Promise(requestAnimationFrame)})
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
    }
    await swipe(450,-210,true)
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(150)
    await scene(page,0)
    await expect(page.locator('#begin')).toBeVisible()
    expect(await page.locator('#begin').evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThan(.5)
    await swipe(500,-350);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(100)
    await swipe(180,330)
    for(const i of [0,3,4,6,8,milkyWay,solar,earth]){
      await go(page,i)
      if(i===earth)await page.keyboard.press('End')
      const bounds=await page.evaluate(()=>{
        const box=document.querySelector('.caption')!.getBoundingClientRect()
        return {bottom:box.bottom,limit:innerHeight}
      })
      expect(bounds.bottom,'Chapter '+i+' caption exceeds the viewport').toBeLessThanOrEqual(bounds.limit)
    }
  }finally{await context.close()}
})
test('opening the index stops an in-flight journey transition',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Begin the journey'}).click()
  await openIndex(page)
  const position=await page.evaluate(()=>scrollY)
  await page.evaluate(async()=>{for(let i=0;i<12;i++)await new Promise(requestAnimationFrame)})
  expect(await page.evaluate(()=>scrollY)).toBe(position)
  await page.keyboard.press('Escape')
  expect(await page.evaluate(()=>scrollY)).toBe(position)
})
test('reduced motion reconstructs a still galaxy field after visiting Earth',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/');await expect(page.locator('#cosmos')).toHaveAttribute('data-renderer','webgl')
  const field={x:800,y:260,width:360,height:300}
  await go(page,7)
  const first=await page.screenshot({clip:field})
  await go(page,earth);await go(page,7)
  expect(await page.screenshot({clip:field})).toEqual(first)
})

test('a luminous cloud moves at rest and lettering yields to dust on scroll',async({page},info)=>{
  await page.goto('/')
  await go(page,6)
  const caption=page.locator('.caption')
  expect(Number(await caption.evaluate(el=>getComputedStyle(el).opacity))).toBeLessThan(.4)
  await expect(caption).toHaveCSS('opacity','1')
  const field={x:660,y:280,width:430,height:260}
  const first=await page.screenshot({clip:field})
  await page.evaluate(async()=>{for(let i=0;i<20;i++)await new Promise(requestAnimationFrame)})
  const later=await page.screenshot({clip:field})
  expect(first.equals(later)).toBe(false)
  await page.screenshot({path:info.outputPath('cosmic-dawn.png')})
  await page.mouse.wheel(0,115)
  await expect(page.locator('#letter-dust')).toBeVisible()
  await expect.poll(()=>page.locator('#letter-dust').evaluate(canvas=>{
    const c=canvas as HTMLCanvasElement
    const data=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data
    for(let i=3;i<data.length;i+=4)if(data[i]>20)return true
    return false
  })).toBe(true)
  await page.screenshot({path:info.outputPath('dispersal.png')})
  await expect(page.locator('#letter-dust')).toBeHidden()
  await expect(caption).toHaveCSS('opacity','1')
  await expect(page.locator('#chapter-heading')).toHaveCSS('mask-image','none')
  await page.mouse.wheel(0,-75)
  await expect(page.locator('#letter-dust')).toBeVisible()
})

test('a fast fling leaves time to see the transparency scene and can be reversed',async({page},info)=>{
  await page.goto('/')
  await go(page,4)
  await expect(page.locator('.caption')).toHaveCSS('opacity','1')
  await page.screenshot({path:info.outputPath('last-scattering.png')})
  const start=await page.evaluate(()=>scrollY)
  await page.mouse.wheel(0,9000)
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(start+1000)
  await page.evaluate(async()=>{for(let i=0;i<25;i++)await new Promise(requestAnimationFrame)})
  await scene(page,4)
  await page.mouse.wheel(0,-180)
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeLessThan(start+1000)
  await scene(page,4)
  await page.keyboard.press('End')
  await scene(page,earth)
  await page.keyboard.press('Home')
  await expect(page.locator('#begin')).toBeVisible()
  await page.emulateMedia({reducedMotion:'reduce'})
  await expect(page.locator('.mouse-wheel')).toHaveCSS('animation-name','none')
})

test('a nudge preserves the line, and a pause in the blend restores its evidence', async({page})=>{
  await page.goto('/')
  await go(page,4)
  const caption = page.locator('.caption')
  await expect(caption).toHaveCSS('opacity','1')
  await page.mouse.wheel(0,24)
  await page.evaluate(async()=>{for(let i=0;i<12;i++)await new Promise(requestAnimationFrame)})
  await expect(page.locator('#letter-dust')).toBeHidden()
  await expect(page.locator('#caption-link')).toHaveCSS('mask-image','none')
  const distance = await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight)
  const parked = Math.round(makeTimeline(chapters).at(4,.79)*distance)
  await page.evaluate(y=>scrollTo(0,y),parked)
  await expect(page.locator('#letter-dust')).toBeVisible()
  await expect(page.locator('#letter-dust')).toBeHidden()
  await expect(caption).toHaveCSS('opacity','1')
  await page.locator('#caption-link').click()
  await expect(panel(page).getByRole('heading',{level:2})).toHaveText(chapters[4].title)
})

test('one fling lands in the adjacent chapter and replay shows its development again', async({page})=>{
  await page.goto('/')
  await go(page,5)
  const distance = await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight)
  const landing = Math.round(makeTimeline(chapters).at(6,.38)*distance)
  for(let i=0;i<4;i++){
    await page.mouse.wheel(0,3600)
    await page.evaluate(()=>new Promise(requestAnimationFrame))
  }
  await expect.poll(()=>page.evaluate(y=>Math.abs(scrollY-y),landing)).toBeLessThanOrEqual(1)
  await expect(page.locator('#stage')).toHaveAttribute('data-scene','cosmic-dawn',{timeout:8000})
  await page.locator('#caption-link').click()
  await panel(page).getByRole('button',{name:'Replay this chapter'}).click()
  const phase = ()=>page.locator('#cosmos').evaluate(canvas=>{
    const gl = (canvas as HTMLCanvasElement).getContext('webgl')!
    const program = gl.getParameter(gl.CURRENT_PROGRAM)
    return Number(gl.getUniform(program,gl.getUniformLocation(program,'local')))
  })
  await expect.poll(phase).toBeLessThan(.18)
  await expect.poll(phase,{timeout:8000}).toBeGreaterThan(.65)
  await scene(page,6)
  await expect(page.locator('.caption')).toHaveCSS('opacity','1')
})

test('uninterrupted small scrolls can pass the adjacent landing', async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/')
  await go(page,5)
  const reached = await page.evaluate(async()=>{
    const start = scrollY
    for(let i=0;i<70;i++){
      scrollBy(0,60)
      await new Promise(requestAnimationFrame)
    }
    return scrollY - start
  })
  expect(reached).toBe(4200)
  await scene(page,7)
})

test('captions open their own evidence and the waveform shares the menu setting', async({page},info)=>{
  await page.goto('/')
  const wave=page.getByRole('button',{name:'Soundtrack'})
  await expect(wave).toHaveAttribute('aria-pressed','true')
  await wave.click()
  await openIndex(page)
  await panel(page).getByRole('button',{name:'Settings'}).click()
  const sound=panel(page).getByRole('switch',{name:'Ambient sound'})
  await expect(sound).not.toBeChecked()
  await sound.check()
  await page.keyboard.press('Escape')
  await expect(wave).toHaveAttribute('aria-pressed','true')
  for(const index of [1,milkyWay,solar]){
    await go(page,index)
    await expect(page.locator('.caption')).toHaveCSS('opacity','1')
    if(index>=milkyWay)await page.screenshot({path:info.outputPath(chapters[index].id+'.png')})
    await page.locator('#caption-link').click()
    await expect(panel(page).getByRole('heading',{level:2})).toHaveText(chapters[index].title)
    await expect(panel(page).getByText(chapters[index].description)).toBeVisible()
    if(index===milkyWay)await page.screenshot({path:info.outputPath('milky-way-evidence.png')})
    await page.keyboard.press('Escape')
    await expect(page.locator('#caption-link')).toBeFocused()
    await scene(page,index)
  }
})

test('the score produces a low signal and fades when switched off',async({page})=>{
  await page.addInitScript(()=>{
    const connect=AudioNode.prototype.connect
    AudioNode.prototype.connect=function(this:AudioNode,destination:AudioNode,...ports:unknown[]){
      if(destination instanceof AudioDestinationNode){
        const meter=this.context.createAnalyser()
        meter.fftSize=2048
        Reflect.apply(connect,this,[meter])
        Object.assign(window,{scorePeak:()=>{
          const data=new Float32Array(meter.fftSize)
          meter.getFloatTimeDomainData(data)
          return data.reduce((peak,v)=>Math.max(peak,Math.abs(v)),0)
        }})
      }
      return Reflect.apply(connect,this,[destination,...ports])
    } as typeof connect
  })
  await page.goto('/')
  const waveform=page.getByRole('button',{name:'Soundtrack'})
  await page.getByRole('button',{name:'Begin the journey'}).click()
  const peak=()=>page.evaluate(()=>(window as Window & {scorePeak?:()=>number}).scorePeak?.() ?? 0)
  await expect.poll(peak).toBeGreaterThan(.002)
  expect(await peak()).toBeLessThan(.08)
  await waveform.click()
  await expect.poll(peak).toBeLessThan(.0005)
})

test('scroll moves through the Milky Way arm into the solar system',async({page})=>{
  await page.goto('/')
  await go(page,milkyWay)
  const total=chapters.reduce((sum,c)=>sum+c.weight,0)
  const distance=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight)
  await page.mouse.wheel(0,distance*chapters[milkyWay].weight/total)
  await scene(page,milkyWay)
  await expect(page.locator('#stage')).toHaveAttribute('data-scene','solar-system',{timeout:15000})
  await expect(page.locator('#chapter-heading')).toContainText(chapters[solar].narrative)
})
