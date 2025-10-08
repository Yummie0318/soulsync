import { test, expect } from '@playwright/test';

test('SoulSyncAI — AI Drawing Page >> fast interaction', async ({ page }) => {
  // Short overall timeout
  test.setTimeout(20000);

  await page.goto('https://www.soulsyncai.site/en/login/ai-drawing', {
    waitUntil: 'commit', // ⏩ load as soon as navigation starts
  });

  // Wait very briefly for toolbar
  const buttons = page.locator('div.flex.justify-center button');
  await buttons.first().waitFor({ timeout: 3000 });

  // Draw → erase → clear quickly before redirect
  const canvas = page.locator('canvas');
  const color = page.locator('input[type="color"]');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');

  await color.fill('#00ff00');
  await buttons.nth(0).click(); // pencil
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 80);
  await page.mouse.up();

  await buttons.nth(1).click(); // eraser
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 60);
  await page.mouse.up();

  // 🧠 Guard: if redirect started, skip clear step
  if (page.url().includes('/ai-drawing')) {
    await buttons.nth(2).click(); // delete
  }

  await expect(canvas).toBeVisible();
});
