import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {resolve,extname} from 'node:path'

// Serve the exact production output at a project subpath, like GitHub Pages.
test('static production build runs under a subdirectory',async({page})=>{
  const mime:Record<string,string>={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff'}
  const missing:string[]=[]
  const base='http://127.0.0.1:5173/exhibits/omnigenesis/'
  await page.route(base+'**',async route=>{
    const url=new URL(route.request().url())
    const name=url.pathname.slice(new URL(base).pathname.length)||'index.html'
    try{
      const body=await readFile(resolve('dist',name))
      await route.fulfill({body,contentType:mime[extname(name)]||'application/octet-stream'})
    }catch{missing.push(name);await route.fulfill({status:404})}
  })
  await page.goto(base+'?diagnostics=1')
  await expect(page.locator('#cosmos')).toHaveAttribute('data-renderer','webgl')
  await page.getByRole('button',{name:'Index',exact:true}).click()
  await page.locator('.chapter-link').last().click()
  await expect(page.locator('#stage')).toHaveAttribute('data-scene','earth')
  await expect(page.locator('#diagnostics')).toHaveCount(0)
  expect(missing).toEqual([])
})
