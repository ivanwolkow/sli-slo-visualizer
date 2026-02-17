import { expect, test } from '@playwright/test';

test('simulation starts and metrics update', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'SLI / SLO Visualizer' })).toBeVisible();

  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('RUNNING')).toBeVisible();

  const firstMetricCard = page.locator('.metric-card').first();
  await expect(firstMetricCard).toBeVisible();

  await expect(firstMetricCard.locator('dd').first()).not.toHaveText('N/A', {
    timeout: 7000
  });

  await expect(page.getByText('00:01')).toBeVisible({ timeout: 7000 });
});
