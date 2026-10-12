import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export { expect };

export const routes = [
  '/',
  '/trips/',
  '/trips/semaphore-2026/',
  '/creative/',
  '/creative/blender/',
  '/creative/python/',
  '/creative/events/',
];

// Screenshot names: '/' is home, '/trips/semaphore-2026/' is trips-semaphore-2026.
export const routeName = (route) =>
  route === '/' ? 'home' : route.split('/').filter(Boolean).join('-');

export const test = base.extend({
  // An uncaught exception on the page fails the test that triggered it.
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await use(page);
    expect(errors, 'Uncaught page errors').toEqual([]);
  },
});

export async function expectAccessible(page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  const summary = violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary, 'Accessibility violations').toEqual([]);
}

export async function expectNoHorizontalOverflow(page, message) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    message,
  ).toBe(false);
}

export async function expectHeroFillsViewport(page, message) {
  const [bottom, height] = await page.evaluate(() => [
    document.querySelector('.hero').getBoundingClientRect().bottom,
    innerHeight,
  ]);
  expect(Math.abs(bottom - height), message).toBeLessThanOrEqual(1);
}

// Decodes every content image so a missing or corrupt file fails rather than rendering blank.
export async function loadVisibleImages(page) {
  for (const image of await page.locator('main img:not(.viewer-photo)').all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((el) => el.decode());
    expect(await image.evaluate((el) => el.naturalWidth)).toBeGreaterThan(0);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}
