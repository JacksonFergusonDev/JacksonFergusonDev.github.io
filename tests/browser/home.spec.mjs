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
  await page.screenshot({ path: test.info().outputPath('home-desktop.png'), fullPage: true });
});

test('the motion toggle starts paused under reduced motion', async ({ page }) => {
  // The visible label is the button's whole name.
  await page.getByRole('button', { name: 'Play motion', exact: true }).click();
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await page.getByRole('button', { name: 'Play motion', exact: true }).waitFor();
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
