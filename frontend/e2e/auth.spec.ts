import { test, expect } from '@playwright/test';

test.describe('Authentication and Landing Flow', () => {
  test('should load the landing page successfully and render major elements', async ({ page }) => {
    // Navigate to the landing page
    await page.goto('/');

    // Validate that the main title exists and contains expected text
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    await expect(title).toContainText('Lolos CPNS');

    // Validate that CTA button exists
    const ctaButton = page.locator('button', { hasText: 'Coba Tryout Gratis' });
    await expect(ctaButton).toBeVisible();

    // Verify catalog link is visible
    const catalogButton = page.locator('button', { hasText: 'Lihat Katalog Soal' });
    await expect(catalogButton).toBeVisible();
  });

  test('should navigate to login page and render form controls', async ({ page }) => {
    // Navigate directly to the login page
    await page.goto('/login');

    // Confirm that we are on the login page URL
    await expect(page).toHaveURL(/\/login/);

    // Verify the page title (h3 CardTitle "Welcome Back")
    const cardTitle = page.locator('h3', { hasText: 'Welcome Back' });
    await expect(cardTitle).toBeVisible();

    // Verify input fields for login
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button', { hasText: 'Sign In' });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });
});
