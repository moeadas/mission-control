import { test, expect } from '@playwright/test'

test('root entry flow reaches an auth or app surface without console errors', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('/', { waitUntil: 'networkidle' })

  await expect(page).toHaveURL(/\/(dashboard|login)?$/)
  await expect(page.locator('body')).toContainText(/Mission Control|Loading Mission Control|Sign in|Login/i)

  const meaningfulErrors = consoleErrors.filter(
    (message) =>
      !/favicon|Failed to load resource: the server responded with a status of 404/i.test(message)
  )
  expect(meaningfulErrors).toEqual([])
})

test('login page renders branding and primary auth CTA', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'networkidle' })

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator('body')).toContainText(/Mission Control|Sign in|Continue/i)
  await expect(page.locator('button, a').filter({ hasText: /google|sign in|continue/i }).first()).toBeVisible()
})

test('dashboard route resolves to login or dashboard without generic error shell', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'networkidle' })

  await expect(page).toHaveURL(/\/(dashboard|login)(\?.*)?$/)
  await expect(page.locator('body')).not.toContainText(/This page couldn’t load/i)
  await expect(page.locator('body')).toContainText(/Mission Control|Loading Mission Control|Sign in|Command Center/i)
})
