import { expect, openMap, test } from './fixtures';

// Phase 8: what the visitor sees when something cannot work — no blank page, no silent failure.

test('a device without WebGL gets a calm message and «try again», not a blank page', async ({ page, errors }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    // No WebGL, as on some old or locked-down phones; 2D drawing still works.
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return /webgl/i.test(type) ? null : (get as any).call(this, type, ...rest);
    } as typeof get;
  });
  await page.addInitScript(() => localStorage.setItem('lang', 'ar'));
  await page.goto('map.html');
  const card = page.locator('.map-error');
  await expect(card).toBeVisible();
  await expect(card).toContainText('تعذّر عرض الخريطة على هذا الجهاز');
  await expect(card.getByRole('button', { name: 'إعادة المحاولة' })).toBeVisible();
  // MapLibre reports the missing WebGL itself; nothing else may fail.
  errors.splice(0, errors.length, ...errors.filter((e) => !/webgl|WebGL/i.test(e)));
});

test('in English the message is English', async ({ page, errors }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = function () {
      return null;
    } as never;
  });
  await page.addInitScript(() => localStorage.setItem('lang', 'en'));
  await page.goto('map.html');
  await expect(page.locator('.map-error')).toContainText('The map could not be shown on this device');
  errors.splice(0, errors.length, ...errors.filter((e) => !/webgl|WebGL|canvas/i.test(e)));
});

test('no route to a place is said, and the button stops waiting', async ({ page, context, errors: _ }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 24.4685, longitude: 39.6084, accuracy: 15 });
  await openMap(page, 'ar', '?poi=204');
  await expect(page.locator('.pc-title')).toContainText('204', { timeout: 15_000 });
  // A planner that finds nothing (as it could for a place cut off from every road and walkway).
  await page.evaluate(() => ((window as any).__trip.planner = async () => []));
  const button = page.locator('.pc-actions .btn-block');
  await button.click();
  await expect(page.locator('.toast')).toContainText('لم نجد طريقاً إلى هذا المكان من موقعك');
  await expect(button).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.route-card')).toHaveCount(0);
});
