import { expect, test } from '@playwright/test'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

test.describe('authenticated Iris flow', () => {
  test.skip(!email || !password, 'E2E_EMAIL and E2E_PASSWORD are required for authenticated flow coverage.')

  test('signed-in user can reach dashboard and complete Iris briefing intake', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })

    await page.getByLabel(/email/i).fill(email!)
    await page.getByLabel(/password/i).fill(password!)
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)
    await expect(page.locator('body')).toContainText(/Command Center|Mission Control/i)

    await page.getByRole('button', { name: /open iris chat/i }).click()
  await expect(page.getByRole('heading', { name: /chat with iris/i })).toBeVisible()

    const chatInput = page.getByPlaceholder(/message iris/i)
    await chatInput.fill('Create a content calendar for Victory Genomics focused on equine karyotyping.')
    await chatInput.press('Enter')

    await expect(page.getByText(/Awareness/i)).toBeVisible()
    await page.getByRole('button', { name: /^Awareness$/i }).click()

    await expect(page.getByText(/Instagram \+ LinkedIn/i)).toBeVisible()
    await page.getByRole('button', { name: /Instagram \+ LinkedIn/i }).click()

    await expect(page.getByText(/30 days/i)).toBeVisible()
    await page.getByRole('button', { name: /^30 days$/i }).click()

    await expect(page.getByText(/3x per week/i)).toBeVisible()
    await page.getByRole('button', { name: /^3x per week$/i }).click()

    await expect(page.getByText(/Perfect\. I have enough to start this now\./i)).toBeVisible({ timeout: 15000 })
    await expect(page.locator('body')).toContainText(/Content Calendar: a content calendar for Victory Genomics focused on equine karyotyping/i, {
      timeout: 15000,
    })
  })
})
