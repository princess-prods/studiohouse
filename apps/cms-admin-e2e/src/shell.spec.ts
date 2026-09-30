import { expect, test } from '@playwright/test';

test.describe('CMS shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('opens on the dashboard in the Studiohouse theme', async ({ page }) => {
    await expect(page).toHaveTitle('Studiohouse');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Dashboard',
    );
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'studiohouse',
    );
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('shows the main navigation', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main' });
    for (const label of [
      'Dashboard',
      'Brands',
      'Content',
      'Talent',
      'Settings',
    ]) {
      await expect(nav.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('renders brand previews in their own theme', async ({ page }) => {
    const previews = page.locator('article[data-theme="princess-productions"]');
    await expect(previews).toHaveCount(2);
    await expect(previews.first()).toContainText('Princess Productions');
    await expect(previews.nth(1)).toContainText('Devinella');
  });

  test('toggles between dark and light schemes', async ({ page }) => {
    const html = page.locator('html');
    const toggle = page.getByRole('button', {
      name: 'Toggle light or dark scheme',
    });
    await toggle.click();
    await expect(html).not.toHaveClass(/dark/);
    await toggle.click();
    await expect(html).toHaveClass(/dark/);
  });
});
