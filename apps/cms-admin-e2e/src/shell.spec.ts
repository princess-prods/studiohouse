import { expect, test } from '@playwright/test';

/**
 * The signed-in flow needs a Managed Auth account on the linked Neon branch.
 * Locally, `.env.local` supplies E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD (create
 * the account once through the sign-up form). Without them, only the
 * unauthenticated tests run, which is what CI does today.
 */
const email = process.env['E2E_OWNER_EMAIL'];
const password = process.env['E2E_OWNER_PASSWORD'];
const hasAccount = Boolean(email && password);

test.describe('signed out', () => {
  test('redirects to sign-in and remembers where you were going', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-in\?returnTo=%2F$/);
    await expect(page).toHaveTitle('Studiohouse');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Welcome back',
    );
    await expect(page.locator('aside')).toHaveCount(0);
  });

  test('sign-in page wears the Studiohouse theme, dark by default', async ({
    page,
  }) => {
    await page.goto('/sign-in');
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'studiohouse',
    );
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('can switch to the sign-up form', async ({ page }) => {
    await page.goto('/sign-in');
    await page
      .getByRole('button', { name: 'Need an account? Sign up' })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Create your account',
    );
    await expect(page.getByLabel('Name')).toBeVisible();
  });
});

test.describe('signed in', () => {
  test.skip(!hasAccount, 'E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(email ?? '');
    await page.getByLabel('Password').fill(password ?? '');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('shows the shell, navigation and brand previews', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Dashboard',
    );
    const nav = page.getByRole('navigation', { name: 'Main' });
    for (const label of ['Dashboard', 'Brands', 'Content', 'Talent']) {
      await expect(nav.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.locator('article[data-theme]').first()).toBeVisible();
  });

  test('keeps the session across a reload and signs out', async ({ page }) => {
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Dashboard',
    );
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-in\?returnTo=%2F$/);
  });

  test('creates, edits and deletes a brand with a theme', async ({ page }) => {
    const stamp = Date.now().toString(36);
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByText('Brands')
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Brands');

    await page.getByRole('button', { name: 'New brand' }).click();
    await page.getByLabel('Name').fill(`E2E ${stamp}`);
    await expect(page.getByLabel('Slug')).toHaveValue(`e2e-${stamp}`);
    await page.getByRole('button', { name: 'Create brand' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      `E2E ${stamp}`,
    );

    const themePicker = page.getByRole('combobox', {
      name: 'Theme',
      exact: true,
    });
    await themePicker.selectOption('__new__');
    await page.getByLabel('Theme name').fill(`Theme ${stamp}`);
    await page.getByRole('button', { name: 'Create theme' }).click();
    await expect(themePicker).not.toHaveValue('__new__');
    await expect(
      page.getByRole('button', { name: 'Save theme' }),
    ).toBeVisible();

    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Delete brand' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Brands');
    await expect(page.getByText(`E2E ${stamp}`)).toHaveCount(0);
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
