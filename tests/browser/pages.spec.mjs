import {
  expect,
  expectAccessible,
  expectNoHorizontalOverflow,
  expectSoundLayout,
  loadVisibleImages,
  routes,
  test,
} from './fixtures.mjs';

for (const route of routes) {
  test(`${route} loads accessibly with every image, one h1, and a sound layout`, async ({
    page,
  }) => {
    const response = await page.goto(route);
    expect(response.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    await expectAccessible(page);
    await expect(page.locator('h1')).toHaveCount(1);
    // Lazy images load only when scrolled to; decoding each one requests and checks it.
    await loadVisibleImages(page);
    await expectNoHorizontalOverflow(page, `${route} overflows desktop`);
    await expectSoundLayout(page, `${route} layout at desktop width`);
    // Multi-column grids must not collapse to a single column on a desktop screen.
    const collapsed = await page
      .locator('main :is(.thumb-grid, .about-grid, .flagship-grid, .resume-grid)')
      .evaluateAll((grids) =>
        grids
          .filter((grid) => {
            const lefts = [...grid.children].map((child) => child.getBoundingClientRect().left);
            return lefts.length > 1 && new Set(lefts.map(Math.round)).size < 2;
          })
          .map((grid) => grid.className),
      );
    expect(collapsed, `${route} has grids collapsed to one column`).toEqual([]);
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
