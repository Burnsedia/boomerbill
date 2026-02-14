import { test, expect } from '@playwright/test'

test('can log a session and see it on dashboard and log', async ({ page }) => {
  await page.goto('/app')

  await page.getByRole('button', { name: 'Settings' }).click()

  const boomerInput = page.getByPlaceholder('Enter boomer name...')
  await boomerInput.fill('Test Boomer')
  await boomerInput.press('Enter')

  await page.getByRole('button', { name: 'Session' }).click()

  await page.getByRole('combobox').selectOption({ label: 'Test Boomer' })
  await page.getByRole('button', { name: /WiFi Issues/ }).click()

  await page.getByRole('button', { name: 'Start' }).click()
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: /^Stop$/ }).click()

  await page.getByRole('button', { name: 'Log' }).click()
  await expect(page.getByText('Test Boomer')).toBeVisible()
  await expect(page.getByText('WiFi Issues')).toBeVisible()

  await page.getByRole('button', { name: 'Dashboard' }).click()
  await expect(page.getByText('Total Damage')).toBeVisible()
  const totalDamage = page.getByText('Total Damage').locator('..')
  await expect(totalDamage.locator('.stat-value')).not.toHaveText('$0.00')
})
