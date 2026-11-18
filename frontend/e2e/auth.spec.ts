import { test, expect } from '@playwright/test';

test.describe('Authentication and Landing Flow', () => {
  test('should load the landing page successfully and render major elements', async ({ page }) => {
    await page.goto('/');

    const title = page.locator('h1');
    await expect(title).toBeVisible();
    await expect(title).toContainText('Latihan terarah.');

    const ctaLink = page.getByRole('link', { name: 'Coba paket gratis' });
    await expect(ctaLink).toBeVisible();

    const membershipLink = page.getByRole('link', { name: 'Lihat keanggotaan' });
    await expect(membershipLink).toBeVisible();
  });

  test('should navigate to login page and render form controls', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveURL(/\/login/);

    const heading = page.locator('h1', { hasText: 'Masuk ke ruang latihan.' });
    await expect(heading).toBeVisible();

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.getByRole('button', { name: 'Masuk', exact: true });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });
});
