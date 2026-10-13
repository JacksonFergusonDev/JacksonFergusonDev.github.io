import {
  expect,
  expectHeroFillsViewport,
  expectNoHorizontalOverflow,
  loadVisibleImages,
  routeName,
  routes,
  test,
} from './fixtures.mjs';

for (const width of [320, 390, 560, 600, 768, 820, 1024]) {
  test.describe(`${width}px wide`, () => {
    test.use({ viewport: { width, height: 844 } });

    for (const route of routes) {
      test(`${route} fits without overflow or clipped navigation`, async ({ page }) => {
        await page.goto(route);
        await expectNoHorizontalOverflow(page, `${route} overflows ${width}px`);
        await page.evaluate(() => document.fonts.ready);
        const clippedLinks = await page.locator('.site-header a').evaluateAll((links) =>
          links
            .filter((link) => {
              const r = link.getBoundingClientRect();
              const header = link.closest('header').getBoundingClientRect();
              return (
                r.width > 0 && (r.left < 0 || r.right > innerWidth || r.bottom > header.bottom)
              );
            })
            .map((link) => link.textContent.trim()),
        );
        expect(clippedLinks, `Header links clipped at ${width}px on ${route}`).toEqual([]);

        if (route === '/') {
          for (const manager of ['brew', 'uv']) {
            await page.locator(`.hs-install-tab:text-is("${manager}")`).click();
            if (width <= 800) {
              expect(
                await page
                  .locator('#protostar-install code')
                  .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
                `${manager} command must fit at ${width}px`,
              ).toBe(true);
              expect((await page.locator('.hs-install-copy').innerText()).trim()).toBe('Copy');
            }
          }
          await page.evaluate(() => window.scrollTo(0, 0));
          await expectHeroFillsViewport(
            page,
            `Hero divider should align with the viewport edge at ${width}px`,
          );
        }

        if (width === 390) {
          await loadVisibleImages(page);
          await page.screenshot({
            path: test.info().outputPath(`${routeName(route)}-mobile.png`),
            fullPage: true,
          });
        }
      });
    }
  });
}
