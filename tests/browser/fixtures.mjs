import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync } from 'node:fs';

export { expect };

// Every built page, so a new trip or collection is tested without editing this list.
export const routes = readdirSync('dist', { recursive: true })
  .filter((file) => file.endsWith('.html'))
  .map((file) => `/${file.replaceAll('\\', '/').replace(/index\.html$/, '')}`)
  .sort();

// Screenshot names: '/' is home, '/trips/semaphore-2026/' is trips-semaphore-2026.
export const routeName = (route) =>
  route === '/' ? 'home' : route.split('/').filter(Boolean).join('-');

// Phone projects are named *-mobile; the rest run at a desktop size.
export const isMobileProject = () => test.info().project.name.endsWith('-mobile');

// Skips the current test outside the named projects, for checks whose result does not depend
// on the engine (axe) or whose timing is only reliable in one engine.
export function onlyIn(projects, reason) {
  test.skip(!projects.includes(test.info().project.name), reason);
}

export const test = base.extend({
  // An uncaught exception, a console error, or a failed request fails the test that caused it.
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (error) => {
      // A ResizeObserver whose callback changes layout defers the rest to the next frame, and
      // WebKit reports that as an error; nothing is lost.
      if (!error.message.startsWith('ResizeObserver loop'))
        errors.push(`uncaught: ${error.message}`);
    });
    page.on('console', (message) => {
      // Firefox logs a font download cancelled by the test ending (NS_BINDING_ABORTED) as an
      // error; a font that is actually missing still fails through its HTTP status.
      if (message.type() === 'error' && !message.text().includes('status=2152398850'))
        errors.push(`console: ${message.text()}`);
    });
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
    });
    page.on('requestfailed', (request) => {
      const reason = request.failure()?.errorText ?? '';
      // Navigating away cancels requests still in flight; that is not a broken resource.
      if (!/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(reason))
        errors.push(`failed: ${request.url()} (${reason})`);
    });
    await use(page);
    expect(errors, 'Page errors and failed requests').toEqual([]);
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
    // Firefox rejects decode() on a lazy image whose request has not started, so wait for it.
    await image.evaluate(
      (el) =>
        el.complete ||
        new Promise((resolve) => {
          el.addEventListener('load', resolve, { once: true });
          el.addEventListener('error', resolve, { once: true });
        }),
    );
    expect(await image.evaluate((el) => el.naturalWidth), 'Image failed to load').toBeGreaterThan(
      0,
    );
    await image.evaluate((el) => el.decode());
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

// Breakage that renders without errors: text covered by another element or pushed off-screen,
// overlapping cards, stretched images, and text drawn in a fallback font.
export async function expectSoundLayout(page, message) {
  const problems = await page.evaluate(async () => {
    const found = [];
    const describe = (el) =>
      `<${el.tagName.toLowerCase()}${el.className ? ` class="${el.className}"` : ''}> "${el.textContent.trim().slice(0, 40)}"`;
    const shown = (el) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.opacity !== '0';
    };

    const text = [...document.querySelectorAll('main :is(h1, h2, h3, h4, p)')].filter(
      (el) => shown(el) && el.textContent.trim() && !el.closest('dialog, [hidden]'),
    );
    for (const el of text) {
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      if (r.left < -1 || r.right > innerWidth + 1) found.push(`off-screen: ${describe(el)}`);
      // Hit testing skips text under `pointer-events: none` (the hero copy), so restore it.
      const pointerEvents = el.style.pointerEvents;
      el.style.pointerEvents = 'auto';
      // Decorative layers such as the hero canvas are masked to transparency where text sits.
      const hit = document
        .elementsFromPoint(
          Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1),
          r.top + r.height / 2,
        )
        .find((candidate) => !candidate.closest('[aria-hidden="true"]'));
      el.style.pointerEvents = pointerEvents;
      if (hit && !el.contains(hit)) {
        found.push(`covered: ${describe(el)} is under ${describe(hit)}`);
      }
    }
    window.scrollTo(0, 0);

    const cards = [
      ...document.querySelectorAll('.project-card, .thumb-card, .blender-card, .gallery-item'),
    ].filter(shown);
    for (const [i, a] of cards.entries()) {
      for (const b of cards.slice(i + 1)) {
        if (a.contains(b) || b.contains(a)) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const overlapX = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const overlapY = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (overlapX > 1 && overlapY > 1) {
          found.push(`overlap: ${describe(a)} and ${describe(b)}`);
        }
      }
    }

    for (const img of document.querySelectorAll('main img')) {
      if (!shown(img) || !img.naturalWidth || getComputedStyle(img).objectFit !== 'fill') continue;
      const rendered = img.clientWidth / img.clientHeight;
      const natural = img.naturalWidth / img.naturalHeight;
      if (Math.abs(rendered / natural - 1) > 0.02) found.push(`stretched: ${img.currentSrc}`);
    }

    await document.fonts.ready;
    const loadedFamilies = new Set(
      [...document.fonts]
        .filter((f) => f.status === 'loaded')
        .map((f) => f.family.replace(/"/g, '')),
    );
    const generic = new Set(['serif', 'sans-serif', 'monospace', 'system-ui', 'ui-monospace']);
    for (const el of [...text, ...document.querySelectorAll('main code')].filter(shown)) {
      const family = getComputedStyle(el).fontFamily.split(',')[0].trim().replace(/"/g, '');
      // A generic family such as monospace is a deliberate choice, not a missing web font.
      if (generic.has(family)) continue;
      if (!loadedFamilies.has(family)) found.push(`fallback font: ${describe(el)} wants ${family}`);
    }
    return [...new Set(found)];
  });
  expect(problems, message).toEqual([]);
}
