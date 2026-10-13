import { expect, expectAccessible, expectNoHorizontalOverflow, routes, test } from './fixtures.mjs';

for (const route of routes) {
  test(`${route} loads accessibly with one h1 and no overflow`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    await expectAccessible(page);
    await expect(page.locator('h1')).toHaveCount(1);
    await expectNoHorizontalOverflow(page, `${route} overflows desktop`);
  });
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the hero and gallery still render', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Jackson Ferguson.' })).toBeVisible();
    await page.goto('/trips/semaphore-2026/');
    await expect(page.locator('[data-gallery-image]')).toHaveCount(15);
  });
});
