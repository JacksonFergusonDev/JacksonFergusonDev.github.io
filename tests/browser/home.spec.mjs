import { expect, expectHeroFillsViewport, loadVisibleImages, test } from './fixtures.mjs';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('fonts, images, and the hero render from the production build', async ({ page }) => {
  for (const font of [
    '400 16px "DM Sans"',
    '400 16px "JetBrains Mono"',
    '400 16px "New Computer Modern"',
    'italic 400 16px "New Computer Modern"',
    '700 16px "New Computer Modern"',
  ]) {
    const loaded = await page.evaluate(async (descriptor) => {
      try {
        return (await document.fonts.load(descriptor)).some((face) => face.status === 'loaded');
      } catch {
        return false;
      }
    }, font);
    expect(loaded, `${font} must load from the production build`).toBe(true);
  }
  await loadVisibleImages(page);
  await expectHeroFillsViewport(page, 'Hero divider should align with the viewport edge');
  await page.screenshot({
    path: test.info().outputPath('home-desktop.png'),
    fullPage: true,
    scale: 'css',
  });
});

test('the motion toggle starts paused under reduced motion', async ({ page }) => {
  // The visible label is the button's whole name.
  await page.getByRole('button', { name: 'Play motion', exact: true }).click();
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await page.getByRole('button', { name: 'Play motion', exact: true }).waitFor();
});

test('the field survives a lost WebGL context', async ({ page }) => {
  // A GPU reset or a phone reclaiming memory drops the context; house-style's
  // runField asks for it back, and the scene rebuilds its shaders and buffers.
  const motion = page.getByRole('button', { name: 'Play motion', exact: true });
  await motion.waitFor();
  const restored = await page.evaluate(async () => {
    const canvas = document.querySelector('#data-canvas');
    const lose = canvas.getContext('webgl').getExtension('WEBGL_lose_context');
    if (!lose) return 'unsupported';
    const event = (name) =>
      new Promise((resolve) => canvas.addEventListener(name, resolve, { once: true }));
    // restoreContext() does nothing until the loss has been delivered and its
    // listeners, runField's among them, have finished.
    const lost = event('webglcontextlost');
    lose.loseContext();
    await lost;
    await new Promise((resolve) => setTimeout(resolve));
    const back = event('webglcontextrestored');
    lose.restoreContext();
    await back;
    return canvas.getContext('webgl').isContextLost() ? 'lost' : 'restored';
  });
  test.skip(restored === 'unsupported', 'This engine has no WEBGL_lose_context');
  expect(restored).toBe('restored');
  // The button still drives the field, and nothing logged an error.
  await motion.click();
  await page.getByRole('button', { name: 'Pause motion', exact: true }).waitFor();
});

test('resumes open as PDFs in a new tab', async ({ page }) => {
  for (const [name, file] of [
    ['Software Development', 'Jackson-Ferguson-Software-Resume.pdf'],
    ['Hardware–Software Systems', 'Jackson-Ferguson-Hardware-Software-Resume.pdf'],
  ]) {
    const link = page.getByRole('link', {
      name: `View ${name} resume (PDF, opens in a new tab)`,
    });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAttribute('href', `/resumes/${file}`);
    await expect(link).not.toHaveAttribute('download');
  }
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page
      .getByRole('link', { name: 'View Software Development resume (PDF, opens in a new tab)' })
      .click(),
  ]);
  await popup.close();
});

test.describe('without WebGL', () => {
  // Older devices, blocked GPUs, and some privacy settings get no WebGL context.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return /webgl/.test(type) ? null : getContext.call(this, type, ...args);
      };
    });
    await page.goto('/');
  });

  test('the hero stays static, with no motion toggle and no errors', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Jackson Ferguson.' })).toBeVisible();
    await expect(page.locator('.motion-toggle')).toBeHidden();
  });
});
