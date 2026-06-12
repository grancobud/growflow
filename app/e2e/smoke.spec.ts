import { test, expect } from '@playwright/test'

/**
 * Smoke tests - happy paths que NO deben romperse nunca.
 * Corren contra https://canntrace.pages.dev por defecto (o E2E_BASE_URL).
 */

test.describe('Landing publica', () => {
  test('carga landing con compliance badges', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /Trazabilidad/i }).first()).toBeVisible()
    await expect(page.getByText(/GAMP5/).first()).toBeVisible()
    await expect(page.getByText(/ANMAT/).first()).toBeVisible()
  })

  test('nav a login funciona', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: /Ingresar/i }).first().click()
    await expect(page).toHaveURL(/\/login/)
    // El heading de login puede ser variable, al menos verificamos que llego a la ruta
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Rutas publicas', () => {
  test('pitch deck carga', async ({ page }) => {
    await page.goto('/pitch', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/CannTrace|Trazabilidad/i).first()).toBeVisible()
  })

  test('terminos y privacidad cargan', async ({ page }) => {
    await page.goto('/terminos', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading').first()).toBeVisible()
    await page.goto('/privacidad', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('CoA publico de ejemplo carga con hash', async ({ page }) => {
    await page.goto('/traza/CL7', { waitUntil: 'domcontentloaded' })
    // La pagina debe mostrar informacion del lote
    await expect(page.getByText(/CL7|camada|esqueje/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('404 muestra pagina amable', async ({ page }) => {
    await page.goto('/pagina-que-no-existe', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /404|no encontrad/i })).toBeVisible()
  })

  test('docs publicos accesibles', async ({ page }) => {
    await page.goto('/docs', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('contacto form visible', async ({ page }) => {
    await page.goto('/contacto', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading').first()).toBeVisible()
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible()
  })
})

test.describe('Health checks', () => {
  test('sin errores de consola criticos en landing', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000) // deja que React termine de montar
    // Filtrar warnings conocidos que no rompen la app
    const criticos = errors.filter(e =>
      !e.includes('Failed to load resource') &&
      !e.includes('Service Worker') &&
      !e.toLowerCase().includes('favicon')
    )
    expect(criticos, `Errores criticos: ${criticos.join('\n')}`).toHaveLength(0)
  })

  test('HTML tiene meta SEO', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const description = await page.locator('meta[name="description"]').getAttribute('content')
    expect(description, 'meta description').toBeTruthy()
    expect(description!.length).toBeGreaterThan(30)
    const og = await page.locator('meta[property="og:title"]').getAttribute('content')
    expect(og).toBeTruthy()
  })
})
