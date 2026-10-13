import { expect, test } from '@playwright/test';

test('old hash links redirect to the new URLs', async ({ page }) => {
  await page.goto('/#/about');
  await expect(page).toHaveURL(/\/about$/);
  await page.goto('/recipes#/sindhi-biryani');
  await expect(page).toHaveURL(/\/recipes\/sindhi-biryani$/);
  await page.goto('/#/privacy');
  await expect(page).toHaveURL(/\/privacy$/);
});

test('theme toggle persists across pages without flashing', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('[data-theme-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('/about');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('language switch goes to the alternate URL', async ({ page }) => {
  await page.goto('/products/farah');
  await page.locator('[data-lang-switch="ar"]').click();
  await expect(page).toHaveURL(/\/ar\/products\/farah$/);
  await page.locator('[data-lang-switch="en"]').click();
  await expect(page).toHaveURL(/\/products\/farah$/);
});

test('quote drawer: opens from a product, traps focus, closes on Escape', async ({ page }) => {
  await page.goto('/products/khayber');
  const trigger = page.locator('.pp-hero [data-quote-add="khayber"]');
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-product="khayber"] [aria-pressed="true"]')).toHaveCount(1);
  for (let i = 0; i < 25; i++) await page.keyboard.press('Tab');
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('quote drawer validates and submits (simulated)', async ({ page }) => {
  await page.goto('/');
  await page.locator('.hero [data-quote-open]').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /send inquiry/i }).click();
  await expect(dialog.locator('.field__error')).toHaveCount(3);
  await dialog.getByLabel(/your name/i).fill('Test Buyer');
  await dialog.getByLabel(/phone/i).fill('+966 50 000 0000');
  await dialog.locator('[data-product="farah"] .qd__pick').click();
  await page.waitForTimeout(3100); // minimum fill time (bot guard)
  await dialog.getByRole('button', { name: /send inquiry/i }).click();
  await expect(dialog.getByText(/inquiry sent/i)).toBeVisible({ timeout: 5000 });
});

test('drawer selection carries into the full quote form', async ({ page }) => {
  await page.goto('/products/dhoqan');
  await page.locator('.pp-hero [data-quote-add="dhoqan"]').click();
  await page
    .getByRole('dialog')
    .getByLabel(/your name/i)
    .fill('Carry Over');
  await page
    .getByRole('dialog')
    .getByRole('link', { name: /full quote form/i })
    .click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByLabel(/full name/i)).toHaveValue('Carry Over');
  await expect(page.getByLabel('Product 1')).toHaveValue('dhoqan');
});

test('recipe filters and search narrow the list', async ({ page }) => {
  await page.goto('/recipes');
  await page.locator('[data-rx-toggle]').click();
  await page.locator('[data-rx-filter="region"][data-value="Saudi"]').click();
  await expect(page.locator('[data-rx-count]')).toHaveText('10 of 30');
  await expect(page).toHaveURL(/region=Saudi/);
  await page.locator('[data-rx-q]').fill('kabsa');
  await expect(page.locator('[data-rx-count]')).not.toHaveText('10 of 30');
  await expect(page.locator('[data-recipe][data-region="Saudi"]:visible').first()).toBeVisible();
  await expect(page.locator('[data-recipe]:not([data-region="Saudi"]):visible')).toHaveCount(0);
});

test('servings scaler doubles quantities', async ({ page }) => {
  await page.goto('/recipes/chicken-kabsa');
  const first = page.locator('[data-qty]').first();
  await expect(first).toHaveText(/^1 whole chicken/);
  for (let i = 0; i < 6; i++) await page.locator('[data-serve="1"]').click();
  await expect(page.locator('[data-serves]')).toHaveText('12');
  await expect(first).toHaveText(/^2 whole chicken/);
});

test('mobile menu opens, focuses first link, closes on Escape @mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/');
  const btn = page.locator('[data-menu-toggle]');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#mobile-menu a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await expect(btn).toBeFocused();
});

test('trading account form shows errors and keeps a session draft', async ({ page }) => {
  await page.goto('/trading-account');
  await page.getByRole('button', { name: /submit application/i }).click();
  await expect(page.locator('.qf__errsum')).toBeVisible();
  await page.getByLabel(/company name/i).fill('Draft Co');
  await page.waitForFunction(() => sessionStorage.getItem('mx-trade-draft')?.includes('Draft Co'));
  await page.reload();
  await expect(page.getByLabel(/company name/i)).toHaveValue('Draft Co');
  expect(await page.evaluate(() => localStorage.getItem('mx-trade-draft'))).toBeNull();
});
