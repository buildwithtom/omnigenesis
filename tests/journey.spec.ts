import { expect, test, type Page } from '@playwright/test'
const panel = (p:Page)=>p.getByRole('dialog')
const openIndex=async(p:Page)=>{await p.getByRole('button',{name:'Index',exact:true}).click()}
const go=async(p:Page,n:number)=>{
  await openIndex(p)
  await p.locator('.chapter-link').nth(n).click()
  await expect(p.locator('#epoch-id')).toHaveText(String(n).padStart(2,'0'))
}
test('the instrument visits each scene and opens its sources',async({page})=>{
  const errors:string[]=[];page.on('pageerror',err=>errors.push(err.message))
  await page.goto('/')
  await expect(page.locator('#cosmos')).toHaveAttribute('data-renderer','webgl')
  await expect(page.getByRole('heading',{level:1})).toHaveText('Everything begansomewhere.')
  await page.getByRole('button',{name:'Begin the journey'}).click()
  await expect(page.getByRole('heading',{level:1})).toHaveText(/At the edge/)
  for(let i=1;i<11;i++)await go(page,i)
  await page.getByRole('button',{name:'Evidence & notes'}).click()
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
  await page.reload();await expect(page.locator('#epoch-id')).toHaveText('06')
  await page.setViewportSize({width:1024,height:680});await expect(page.locator('#epoch-id')).toHaveText('06')
  await page.keyboard.press('ArrowRight');await expect(page.locator('#epoch-id')).toHaveText('07')
  await page.keyboard.press('ArrowLeft');await expect(page.locator('#epoch-id')).toHaveText('06')
  await openIndex(page);await page.mouse.click(40,170);await expect(panel(page)).not.toBeVisible()
})
test('sound, reading mode and persistent quality preferences',async({page})=>{
  await page.goto('/');await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','false')
  await page.locator('#sound').click();await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','true')
  await openIndex(page);await panel(page).getByRole('button',{name:'Settings'}).click()
  await panel(page).locator('[data-setting=sound]').click();await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','false')
  await panel(page).locator('[data-setting=motion]').click()
  await panel(page).getByLabel('Visual quality').selectOption('Low')
  await panel(page).getByRole('button',{name:'Open reading mode'}).click()
  await expect(panel(page).locator('.reading-section')).toHaveCount(11)
  await panel(page).getByRole('button',{name:'Visit this epoch'}).nth(7).click()
  await expect(page.locator('#epoch-id')).toHaveText('07')
  await page.getByRole('button',{name:'Evidence & notes'}).click()
  await expect(panel(page).getByText(/On January 28, 2026/)).toBeVisible()
  await page.reload();await openIndex(page);await panel(page).getByRole('button',{name:'Settings'}).click()
  await expect(panel(page).getByLabel('Visual quality')).toHaveValue('Low')
})
test('reduced-motion mobile layouts, end state and rotation',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/');await go(page,7)
  await page.setViewportSize({width:844,height:390});await expect(page.locator('#epoch-id')).toHaveText('07')
  await page.setViewportSize({width:390,height:844});await page.keyboard.press('End')
  await expect(page.locator('#conclusion')).toBeVisible()
  const collision=await page.evaluate(()=>{
    const caption=document.querySelector('.caption')!.getBoundingClientRect()
    const floor=document.querySelector('.floor')!.getBoundingClientRect()
    return caption.bottom>floor.top
  })
  expect(collision).toBe(false)
})
test('text journey survives a missing shader module and unavailable WebGL',async({page})=>{
  await page.route('**/src/engine/renderer.ts*',route=>route.abort())
  await page.goto('/');await expect(page.locator('#cosmos')).toHaveAttribute('data-renderer','fallback')
  await go(page,5);await page.getByRole('button',{name:'Evidence & notes'}).click()
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
  await expect(page.locator('#epoch-id')).toHaveText('08')
})
test('capture the instrument and measure a traversal',async({page},info)=>{
  await page.goto('/?diagnostics=1');await expect(page.locator('#cosmos')).toHaveAttribute('data-renderer','webgl')
  await page.evaluate(()=>document.fonts.ready)
  await expect(page.locator('#overture')).toHaveCount(0)
  await page.locator('#diagnostics').evaluate(el=>el.hidden=true)
  await page.screenshot({path:info.outputPath('opening.png')})
  await page.setViewportSize({width:390,height:844})
  await page.screenshot({path:info.outputPath('opening-mobile.png')})
  await page.setViewportSize({width:1280,height:800})
  await go(page,10);await page.keyboard.press('End');await expect(page.locator('#conclusion')).toBeVisible()
  await page.screenshot({path:info.outputPath('earth.png')})
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
        const floor=document.querySelector('.floor-meta')!.getBoundingClientRect()
        return {bottom:box.bottom,limit:floor.top}
      })
      expect(bounds.bottom,'Chapter '+i+' caption overlaps the timeline').toBeLessThanOrEqual(bounds.limit)
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
test('the same galaxy field is reconstructed after visiting Earth',async({page})=>{
  await page.goto('/');await expect(page.locator('#cosmos')).toHaveAttribute('data-renderer','webgl')
  const field={x:800,y:260,width:360,height:300}
  await go(page,7)
  const first=await page.screenshot({clip:field})
  await go(page,10);await go(page,7)
  expect(await page.screenshot({clip:field})).toEqual(first)
})
