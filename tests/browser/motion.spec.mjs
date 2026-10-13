import { expect, expectStaticHeroWithoutWebGL, onlyIn, test } from './fixtures.mjs';

test.use({ reducedMotion: 'no-preference' });

test('returning home keeps hero text hidden until the reveal script runs', async ({ page }) => {
  onlyIn(['chromium'], 'Holds scripts mid-navigation, which only Chromium times reliably');
  await page.goto('/');
  await page.waitForFunction(() => document.body.classList.contains('landing-intro-complete'));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  let releaseScripts;
  let notifyBlocked;
  const scriptsReleased = new Promise((resolve) => {
    releaseScripts = resolve;
  });
  const scriptBlocked = new Promise((resolve) => {
    notifyBlocked = resolve;
  });
  await page.route('**/*.js', async (route) => {
    notifyBlocked();
    await scriptsReleased;
    await route.continue();
  });
  try {
    await page.getByRole('link', { name: 'Jackson Ferguson home' }).click({ noWaitAfter: true });
    await scriptBlocked;
    await page.locator('[data-text-reveal]').first().waitFor({ state: 'attached' });
    expect(
      await page
        .locator('[data-text-reveal]')
        .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).visibility)),
      'Hero text must stay hidden until the sweep is prepared, even with delayed scripts',
    ).toEqual(['hidden', 'hidden', 'hidden']);
  } finally {
    releaseScripts();
  }
  await page.waitForFunction(() => document.body.classList.contains('landing-text-ready'));
  await expect(page.locator('[data-text-reveal="lines"]')).toBeVisible();
});

// Check actual content edges so section padding cannot trigger an early reveal.
for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test('sections reveal when their content reaches the boundary', async ({ page }) => {
      onlyIn(
        ['chromium'],
        'Scrolls to within 40px of the observer boundary, too tight across engines',
      );
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      for (const selector of [
        '#about .hs-section-marker',
        '.projects-head .hs-section-marker',
        '.flagship',
        '.audio-card',
        '.data-science-card',
        '.project-pair',
        '.other-projects',
        '.beyond-section .hs-section-marker',
        '.contact-head',
      ]) {
        const content = page.locator(selector);
        const target = content.locator(
          'xpath=ancestor-or-self::*[contains(concat(" ", normalize-space(@class), " "), " landing-reveal ")][1]',
        );
        const boundary = await page.evaluate(
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
        await page.waitForTimeout(150);
        await expect(
          target,
          `${selector} should remain hidden at ${viewport.width}px`,
        ).not.toHaveClass(/\bis-visible\b/);
        await page.evaluate(() => window.scrollBy({ top: 40, behavior: 'instant' }));
        await expect(target, `${selector} should reveal at ${viewport.width}px`).toHaveClass(
          /\bis-visible\b/,
        );
      }
    });
  });
}

test('landing reveals transition opacity and transform', async ({ page }) => {
  await page.goto('/');
  for (const element of await page.locator('.landing-reveal').all()) {
    const transition = await element.evaluate((el) => window.getComputedStyle(el).transition);
    expect(
      transition.includes('opacity') && transition.includes('transform'),
      `Landing reveal element (${await element.evaluate((el) => el.className)}) missing reveal transitions: ${transition}`,
    ).toBe(true);
  }
});

test('the Protostar demo waits until it scrolls into view', async ({ page }) => {
  await page.goto('/');
  expect(
    (await page.locator('#protostar-demo').textContent()) || '',
    'Protostar demo should be paused on the initial frame before scrolling down into view',
  ).not.toContain('protostar init');
  await page.locator('.flagship').scrollIntoViewIfNeeded();
  await expect(
    page.locator('#protostar-demo'),
    'Protostar demo should begin typing after reveal animation completes',
  ).toContainText('protostar init', { timeout: 10_000 });
});

test('the Protostar player is ready on a #projects deep link', async ({ page }) => {
  await page.goto('/#projects');
  await expect(
    page.locator('#protostar-demo .ap-term canvas'),
    'Protostar player should be ready when the projects deep link finishes loading',
  ).toHaveCount(1);
});

test('the hero canvas draws, and stops drawing while offscreen', async ({ page }) => {
  await page.addInitScript(() => {
    // Count WebGL draw calls; the hero canvas is the page's only WebGL context.
    window.heroDraws = 0;
    const drawArrays = WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays = function (...args) {
      window.heroDraws += 1;
      return drawArrays.apply(this, args);
    };
    // Keep the last frame readable so the test can inspect its pixels.
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, options) {
      return getContext.call(this, type, { ...options, preserveDrawingBuffer: true });
    };
  });
  const draws = () => page.evaluate(() => window.heroDraws);
  await page.goto('/');
  if (await expectStaticHeroWithoutWebGL(page)) return;
  await expect.poll(draws, { message: 'The hero should animate on load' }).toBeGreaterThan(0);
  const animating = await draws();
  await expect.poll(draws).toBeGreaterThan(animating);

  // A shader that compiles but outputs nothing throws no error, so read the frame itself.
  const painted = await page.evaluate(() => {
    const source = document.querySelector('#data-canvas');
    const copy = document.createElement('canvas');
    copy.width = source.width;
    copy.height = source.height;
    const context = copy.getContext('2d');
    context.drawImage(source, 0, 0);
    const { data } = context.getImageData(0, 0, copy.width, copy.height);
    let opaque = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 20) opaque += 1;
    return opaque / (copy.width * copy.height);
  });
  expect(painted, 'The canvas should draw visible strands').toBeGreaterThan(0.02);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  const offscreen = await draws();
  await page.waitForTimeout(700);
  expect(await draws(), 'The canvas must not draw while scrolled out of view').toBe(offscreen);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect
    .poll(draws, { message: 'The canvas should resume in view' })
    .toBeGreaterThan(offscreen);
});
