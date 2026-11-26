import { test, expect } from '@playwright/test';

test('fullscreen is available at first load, toggles the page and follows external exits', async ({page}) => {
  await page.goto('/');
  const button=page.getByRole('button',{name:'Enter fullscreen',exact:true});
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute('aria-pressed','false');
  const bounds=await button.boundingBox();
  expect(bounds.y).toBeLessThan(60);
  await button.click();
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===document.documentElement)).toBe(true);
  const exit=page.getByRole('button',{name:'Exit fullscreen',exact:true});
  await expect(exit).toHaveAttribute('aria-pressed','true');
  await exit.click();
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(exit).toBeVisible();
  await page.evaluate(()=>document.exitFullscreen());
  await expect(button).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#fullscreen-status')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('blocked fullscreen gives recovery without changing the carousel or workspace links',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(Element.prototype,'requestFullscreen',{configurable:true,value:async()=>{throw new DOMException('Blocked','NotAllowedError');}});
  });
  await page.goto('/');
  const button=page.getByRole('button',{name:'Enter fullscreen',exact:true});
  await button.click();
  await expect(page.locator('#fullscreen-status')).toContainText('could not change fullscreen');
  await expect(button).toBeEnabled();
  await expect(button).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('.ring-card')).toHaveCount(8);
  await expect(page.getByRole('link',{name:'Open workspace',exact:true})).toHaveAttribute('href','/workspace#overview');
});

test('unsupported browsers retain a visible fullscreen option with an explanation',async({page})=>{
  await page.addInitScript(()=>{
    for(const name of ['requestFullscreen','webkitRequestFullscreen'])
      Object.defineProperty(Element.prototype,name,{configurable:true,value:undefined});
  });
  await page.goto('/');
  const button=page.getByRole('button',{name:'Enter fullscreen',exact:true});
  await button.click();
  await expect(page.locator('#fullscreen-status')).toContainText('not supported');
  await expect(button).toBeEnabled();
});

test('workspace entry preserves the fullscreen document, allows routes and retains an exit control',async({page})=>{
  for(const [label,route] of [['Open workspace','overview'],['Explore directory','directory']]) {
    await page.goto('/');
    await page.getByRole('button',{name:'Enter fullscreen',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===document.documentElement)).toBe(true);
    await page.evaluate(()=>window.__sameFullscreenDocument=true);
    await page.getByRole('link',{name:label,exact:true}).click();
    await expect(page).toHaveURL(new RegExp(`/workspace#${route}$`));
    await expect(page.locator('#breadcrumb')).toHaveText(route==='overview'?'Overview':'Facility directory');
    await expect(page.locator('body')).toHaveAttribute('data-ready','true');
    expect(await page.evaluate(()=>window.__sameFullscreenDocument)).toBe(true);
    expect(await page.evaluate(()=>document.fullscreenElement===document.documentElement)).toBe(true);
    await expect(page.locator('.galaxy-background')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Exit fullscreen',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    if(route==='overview'){
      await page.evaluate(()=>{location.hash='analysis';});
      await expect(page.locator('#record-form')).toBeVisible();
      expect(await page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);
    }
    await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);
    await expect(page.locator('#main h1')).toBeVisible();
    await page.goBack();
    if(route==='overview') await page.goBack();
    await expect(page.locator('.landing-shell')).toBeVisible();
  }
});

test('a failed workspace load leaves fullscreen and landing navigation available for retry',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Enter fullscreen',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);
  await page.route('**/workspace',route=>route.abort());
  await page.getByRole('link',{name:'Open workspace',exact:true}).click();
  await expect(page.locator('#fullscreen-status')).toContainText('workspace could not be loaded');
  await expect(page.locator('.landing-shell')).toBeVisible();
  expect(await page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);
  await page.unroute('**/workspace');
  await page.getByRole('link',{name:'Open workspace',exact:true}).click();
  await expect(page).toHaveURL(/\/workspace#overview$/);
  await expect(page.locator('#breadcrumb')).toHaveText('Overview');
  expect(await page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);
});
