import { expect, test, type Page } from '@playwright/test'
import { chapters } from '../src/content/chapters'
const scene = (p:Page,n:number)=>expect(p.locator('#stage')).toHaveAttribute('data-scene',chapters[n].id)
const panel = (p:Page)=>p.getByRole('dialog')
const openIndex=async(p:Page)=>{await p.getByRole('button',{name:'Index',exact:true}).click()}
const go=async(p:Page,n:number)=>{
  await openIndex(p)
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
  await page.getByRole('button',{name:'Begin the journey'}).click()
  await expect(page.getByRole('heading',{level:1})).toHaveText('Space itself expands.')
  for(let i=1;i<11;i++)await go(page,i)
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
test('sound, reading mode and persistent quality preferences',async({page})=>{
  await page.goto('/');await openIndex(page);await panel(page).getByRole('button',{name:'Settings'}).click()
  const sound=panel(page).locator('[data-setting=sound]')
  await expect(sound).toHaveAttribute('aria-pressed','false')
  await sound.click();await expect(sound).toHaveAttribute('aria-pressed','true')
  await sound.click();await expect(sound).toHaveAttribute('aria-pressed','false')
  await panel(page).locator('[data-setting=motion]').click()
  await panel(page).getByLabel('Visual quality').selectOption('Low')
  await panel(page).getByRole('button',{name:'Open reading mode'}).click()
  await expect(panel(page).locator('.reading-section')).toHaveCount(11)
  await panel(page).getByRole('button',{name:'Visit this epoch'}).nth(7).click()
  await scene(page,7)
  await evidence(page)
  await expect(panel(page).getByText(/On January 28, 2026/)).toBeVisible()
  await page.reload();await openIndex(page);await panel(page).getByRole('button',{name:'Settings'}).click()
  await expect(panel(page).getByLabel('Visual quality')).toHaveValue('Low')
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
  await go(page,10)
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
  await go(page,10);await expect(page.locator('.caption')).toHaveCSS('opacity','1')
  await page.screenshot({path:info.outputPath('earth.png')})
  await page.emulateMedia({reducedMotion:'reduce'})
  const sample=await page.evaluate(async()=>{
    const gl=document.querySelector('canvas')!.getContext('webgl')!
    const extension=gl.getExtension('WEBGL_debug_renderer_info')
    const renderer=extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    const times:number[]=[]
    const height=document.documentElement.scrollHeight-innerHeight
    let previous=0
    for(let i=0;i<181;i++){
      scrollTo(0,height*(.10+.89*i/180))
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
    async function swipe(start:number,delta:number) {
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:start}]})
      for(let step=1;step<=5;step++){
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y:start+delta*step/5}]})
        await page.evaluate(()=>new Promise(requestAnimationFrame))
      }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
    }
    await swipe(500,-350);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(100)
    await swipe(180,330)
    for(const i of [0,3,4,6,8,9,10]){
      await go(page,i)
      if(i===10)await page.keyboard.press('End')
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
  await go(page,10);await go(page,7)
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
  await scene(page,10)
  await page.keyboard.press('Home')
  await expect(page.locator('#begin')).toBeVisible()
  await page.emulateMedia({reducedMotion:'reduce'})
  await expect(page.locator('.mouse-wheel')).toHaveCSS('animation-name','none')
})
