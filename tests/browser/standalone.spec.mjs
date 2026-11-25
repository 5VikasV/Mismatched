import {test,expect} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const url=pathToFileURL(resolve('index.html')).href;

test('standalone desk stays uncluttered and supports real reviewed inputs',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await expect(page.getByRole('heading',{name:/Good material deserves/})).toBeVisible();
 await expect(page.locator('.stat').first()).toContainText('40');await expect(page.locator('.stat').last()).toContainText('0');
 await page.screenshot({path:info.outputPath('standalone-overview.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.locator('button[data-view="facilities"]').click();await expect(page.locator('.facility')).toHaveCount(8);
 await page.locator('#facility-state').selectOption('Rajasthan');await expect(page.locator('main')).toContainText('10 matching records');
 await page.locator('#facility-search').fill('no-matching-supplier');await expect(page.locator('.facility')).toHaveCount(0);
 await page.locator('button[data-view="materials"]').click();await expect(page.locator('.empty')).toContainText('No sample stock');
 const add=async(title,quantity,price)=>{
  await page.locator('[data-action="new-record"]').click();
  const dialog=page.locator('#record-dialog');await expect(dialog).toBeVisible();
  for(const [name,value]of Object.entries({title,company:'User-entered supplier',material:'PP',grade:'PP-H',quantityKg:quantity,pricePerKg:price}))await dialog.locator(`[name="${name}"]`).fill(String(value));
  await dialog.locator('[name="condition"]').selectOption('Clean');await dialog.locator('[name="confirmed"]').check();await dialog.getByRole('button',{name:'Save record'}).click();await expect(dialog).not.toBeVisible();
 };
 await add('Reviewed lot A',120,42);await add('Reviewed lot B',180,44);await add('Reviewed lot C',200,43);
 await expect(page.locator('tbody tr')).toHaveCount(3);await page.reload();await expect(page.locator('tbody tr')).toHaveCount(3);
 await page.locator('button[data-view="planner"]').click();
 for(const [name,value]of Object.entries({material:'PP',grade:'PP-H',quantityKg:500,comparisonPrice:75,transportCost:1200,feePercent:2}))await page.locator(`#planner-form [name="${name}"]`).fill(String(value));
 await page.getByRole('button',{name:'Calculate estimate'}).click();await expect(page.locator('.cost-row.total')).toContainText('23,191.20');await expect(page.locator('.cost-row.savings')).toContainText('14,308.80');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export estimate CSV'}).click();expect((await download).suggestedFilename()).toContain('.csv');
 await page.screenshot({path:info.outputPath('standalone-planner.png'),fullPage:true});
 await page.locator('[data-action="select-none"]').click();await expect(page.locator('.result-qty')).toContainText('0 / 500');await expect(page.locator('.cost-row.savings')).toHaveCount(0);
 await page.locator('button[data-view="sources"]').click();await expect(page.getByRole('heading',{name:'Your planning records'})).toBeVisible();await expect(page.locator('main')).toContainText('89.1%');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.goto(url+'#__proto__');await expect(page.getByRole('heading',{name:/Good material deserves/})).toBeVisible();
 expect(errors).toEqual([]);
});
