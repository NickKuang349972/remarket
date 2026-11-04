import { expect, test } from '@playwright/test';

test.describe('ReMarket app shell', () => {
  test('renders the app title and bottom tab bar', async ({ page }) => {
    await page.goto('/');

    // 首頁工具列標題
    const title = page.locator('ion-title', { hasText: 'ReMarket' });
    await expect(title).toBeVisible();
    await expect(title).toContainText('ReMarket');

    // 底部 Tab Bar
    await expect(page.locator('ion-tab-bar')).toBeVisible();
    await expect(page.locator('ion-tab-button')).toHaveCount(4);
  });
});
