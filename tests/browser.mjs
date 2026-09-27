import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = process.env.SITE_URL || 'http://127.0.0.1:4322';
const browser = await chromium.launch();
const report = [];
async function loadVisibleImages(page) {
  for (const image of await page.locator('main img:not(.viewer-photo)').all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(async (el) => {
      await el.decode();
    });
    assert.ok(await image.evaluate((el) => el.naturalWidth > 0));
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}
await fs.mkdir('test-results', { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const route of [
    '/',
    '/trips/',
    '/trips/semaphore-2026/',
    '/creative/',
    '/creative/blender/',
    '/creative/python/',
    '/creative/events/',
  ]) {
    const response = await page.goto(base + route);
    assert.equal(response.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    report.push({
      route,
      violations: accessibility.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    });
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `${route} overflows desktop`,
    );
  }
  await page.goto(base + '/');
  await loadVisibleImages(page);
  assert.ok(
    Math.abs(
      (await page.locator('.hero').evaluate((element) => element.getBoundingClientRect().bottom)) -
        (await page.evaluate(() => innerHeight)),
    ) <= 1,
    'Hero divider should align with the viewport edge',
  );
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  assert.equal(
    await page
      .getByRole('button', { name: 'Play background animation' })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.getByRole('button', { name: 'Play background animation' }).click();
  await page.getByRole('button', { name: 'Pause background animation' }).click();
  const resumeLink = page.getByRole('link', {
    name: 'Download Software Development resume (PDF)',
  });
  assert.equal(await resumeLink.getAttribute('target'), '_blank');
  assert.equal(await resumeLink.getAttribute('rel'), 'noopener noreferrer');
  assert.equal(
    await resumeLink.getAttribute('href'),
    '/resumes/Jackson-Ferguson-Software-Resume.pdf',
  );
  assert.equal(await resumeLink.getAttribute('download'), null);
  const [resumePopup] = await Promise.all([page.waitForEvent('popup'), resumeLink.click()]);
  assert.ok(resumePopup);
  await resumePopup.close();
  const hwResumeLink = page.getByRole('link', {
    name: 'Download Hardware–Software Systems resume (PDF)',
  });
  assert.equal(await hwResumeLink.getAttribute('target'), '_blank');
  assert.equal(await hwResumeLink.getAttribute('rel'), 'noopener noreferrer');
  assert.equal(
    await hwResumeLink.getAttribute('href'),
    '/resumes/Jackson-Ferguson-Hardware-Software-Resume.pdf',
  );
  assert.equal(await hwResumeLink.getAttribute('download'), null);
  for (const width of [320, 390, 560, 600, 768, 820, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of [
      '/',
      '/trips/',
      '/trips/semaphore-2026/',
      '/creative/',
      '/creative/blender/',
      '/creative/python/',
      '/creative/events/',
    ]) {
      await page.goto(base + route);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        `${route} overflows ${width}px`,
      );
      await page.evaluate(() => document.fonts.ready);
      const clippedLinks = await page.locator('.site-header a').evaluateAll((links) =>
        links
          .filter((link) => {
            const r = link.getBoundingClientRect();
            const header = link.closest('header').getBoundingClientRect();
            return r.width > 0 && (r.left < 0 || r.right > innerWidth || r.bottom > header.bottom);
          })
          .map((link) => link.textContent.trim()),
      );
      assert.deepEqual(clippedLinks, [], `Header links clipped at ${width}px on ${route}`);
      if (route === '/') {
        for (const manager of ['brew', 'uv']) {
          await page.locator(`[data-pm="${manager}"]`).click();
          if (width <= 800) {
            assert.equal(
              await page
                .locator('#protostar-install-cmd')
                .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
              true,
              `${manager} command must fit at ${width}px`,
            );
            assert.equal((await page.locator('.protostar-copy').innerText()).trim(), 'Copy');
          }
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        assert.ok(
          Math.abs(
            (await page
              .locator('.hero')
              .evaluate((element) => element.getBoundingClientRect().bottom)) -
              (await page.evaluate(() => innerHeight)),
          ) <= 1,
          `Hero divider should align with the viewport edge at ${width}px`,
        );
      }
      if (width === 390) await loadVisibleImages(page);
      if (width === 390)
        await page.screenshot({
          path: `test-results/${route === '/' ? 'home' : route.split('/').filter(Boolean).join('-')}-mobile.png`,
          fullPage: true,
        });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + '/trips/semaphore-2026/');
  await page.locator('[data-gallery-image]').first().click();
  assert.equal(await page.getByRole('dialog').isVisible(), true);
  assert.equal(await page.locator('.viewer-position').textContent(), '1 / 15');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('.viewer-position').textContent(), '2 / 15');
  await page.getByRole('button', { name: 'Previous photo' }).click();
  assert.equal(await page.locator('.viewer-position').textContent(), '1 / 15');
  await page.locator('.viewer-photo').evaluate(async (el) => el.decode());
  await page.screenshot({ path: 'test-results/gallery-desktop.png' });
  const modalAccessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  report.push({
    route: 'gallery modal',
    violations: modalAccessibility.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  });
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').isVisible(), false);
  assert.equal(
    await page
      .locator('[data-gallery-image]')
      .first()
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.goto(base + '/trips/');
  await loadVisibleImages(page);
  await page.screenshot({ path: 'test-results/trips-desktop.png', fullPage: true });
  await fs.writeFile('test-results/accessibility.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ errors, report }, null, 2));
  assert.deepEqual(errors, []);
  assert.equal(
    report.reduce((n, r) => n + r.violations.length, 0),
    0,
    'Accessibility violations; see test-results/accessibility.json',
  );
  const nojs = await browser.newPage({ javaScriptEnabled: false });
  await nojs.goto(base + '/');
  assert.equal(await nojs.getByRole('heading', { name: 'Jackson Ferguson.' }).isVisible(), true);
  await nojs.goto(base + '/trips/semaphore-2026/');
  assert.equal(await nojs.locator('[data-gallery-image]').count(), 15);
  await nojs.close();

  // Check actual content edges so section padding cannot trigger an early reveal.
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    const revealPage = await browser.newPage({ viewport, reducedMotion: 'no-preference' });
    await revealPage.goto(base + '/');
    await revealPage.evaluate(() => document.fonts.ready);
    for (const selector of [
      '#about .section-marker',
      '.projects-head .section-marker',
      '.flagship',
      '.audio-card',
      '.data-science-card',
      '.project-pair',
      '.other-projects',
      '.beyond-section .section-marker',
      '.contact-head',
    ]) {
      const content = revealPage.locator(selector);
      const target = content.locator(
        'xpath=ancestor-or-self::*[contains(concat(" ", normalize-space(@class), " "), " landing-reveal ")][1]',
      );
      const boundary = await revealPage.evaluate(
        () =>
          new Promise((resolve) => {
            const observer = new IntersectionObserver(
              ([entry]) => {
                resolve(entry.rootBounds.bottom);
                observer.disconnect();
              },
              { rootMargin: '0px 0px -10% 0px' },
            );
            observer.observe(document.body);
          }),
      );
      await content.evaluate((el, boundary) => {
        window.scrollTo({
          top: window.scrollY + el.getBoundingClientRect().top - boundary - 30,
          behavior: 'instant',
        });
      }, boundary);
      await revealPage.waitForTimeout(150);
      await expect(
        target,
        `${selector} should remain hidden at ${viewport.width}px`,
      ).not.toHaveClass(/\bis-visible\b/);
      await revealPage.evaluate(() => window.scrollBy({ top: 40, behavior: 'instant' }));
      await expect(target, `${selector} should reveal at ${viewport.width}px`).toHaveClass(
        /\bis-visible\b/,
      );
    }
    await revealPage.close();
  }

  const motionPage = await browser.newPage();
  await motionPage.goto(base + '/');
  for (const element of await motionPage.locator('.landing-reveal').all()) {
    const transition = await element.evaluate((el) => window.getComputedStyle(el).transition);
    assert.ok(
      transition.includes('opacity') && transition.includes('transform'),
      `Landing reveal element (${await element.evaluate((el) => el.className)}) missing reveal transitions: ${transition}`,
    );
  }
  const initialDemoText = (await motionPage.locator('#protostar-demo').textContent()) || '';
  assert.ok(
    !initialDemoText.includes('protostar init'),
    'Protostar demo should be paused on the initial frame before scrolling down into view',
  );
  await motionPage.locator('.flagship').scrollIntoViewIfNeeded();
  await motionPage.waitForFunction(
    () => document.querySelector('#protostar-demo')?.textContent?.includes('protostar init'),
    { timeout: 4000 },
  );
  const playingText = (await motionPage.locator('#protostar-demo').textContent()) || '';
  assert.ok(
    playingText.includes('protostar init'),
    'Protostar demo should begin typing after reveal animation completes',
  );
  await motionPage.close();

  console.log(
    'Passed navigation, resume tab opening, responsive widths, reduced motion, gallery keyboard behavior, and no-JavaScript checks.',
  );
} finally {
  await browser.close();
}
