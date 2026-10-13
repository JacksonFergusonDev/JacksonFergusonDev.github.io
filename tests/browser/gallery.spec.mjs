import { expect, expectAccessible, loadVisibleImages, test } from './fixtures.mjs';

test('the photo viewer opens, pages by keyboard and button, and returns focus', async ({
  page,
}) => {
  await page.goto('/trips/semaphore-2026/');
  await page.locator('[data-gallery-image]').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.viewer-position')).toHaveText('1 / 15');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.viewer-position')).toHaveText('2 / 15');
  await page.getByRole('button', { name: 'Previous photo' }).click();
  await expect(page.locator('.viewer-position')).toHaveText('1 / 15');
  await page.locator('.viewer-photo').evaluate((el) => el.decode());
  await page.screenshot({ path: test.info().outputPath('gallery-desktop.png') });
  await expectAccessible(page);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('[data-gallery-image]').first()).toBeFocused();
});

test('the trips index renders every thumbnail', async ({ page }) => {
  await page.goto('/trips/');
  await loadVisibleImages(page);
  await page.screenshot({ path: test.info().outputPath('trips-desktop.png'), fullPage: true });
});
