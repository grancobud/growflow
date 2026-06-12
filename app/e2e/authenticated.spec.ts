import { test, expect } from '@playwright/test'

/**
 * Tests con login real. Usa admin@canntrace.com que esta en produccion.
 * Cada test hace login fresh para aislar estado.
 *
 * IMPORTANT: estos tests pegan a la BD real - no crean/modifican datos destructivos,
 * solo leen. Si agregas algun test que escribe, asegurate de limpiar despues.
 */

const ADMIN_EMAIL = 'admin@canntrace.com'
const ADMIN_PASS = 'CannTrace2026!'

async function login(page: any) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL)
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS)
  await page.getByRole('button', { name: /ingresar|entrar|login/i }).first().click()
  // Esperar a que cargue el panel (header visible)
  await expect(page.getByText(/Panel de Control|CannTrace/i).first()).toBeVisible({ timeout: 15_000 })
}

test.describe('Flows autenticados', () => {
  // Solo chromium - skip mobile safari para estos tests que son pesados
  test.skip(({ browserName }) => browserName !== 'chromium', 'solo chromium')

  test('login + panel + kpis visibles', async ({ page }) => {
    await login(page)
    await expect(page.getByText(/LOTES ACTIVOS|ALERTAS/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('navegar a stock muestra lotes', async ({ page }) => {
    await login(page)
    await page.goto('/stock', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    // Debe haber al menos un lote con codigo (font-mono tabular)
    const codigos = page.locator('.font-mono').filter({ hasText: /CL|ALM|COS|FLO/ })
    await expect(codigos.first()).toBeVisible({ timeout: 10_000 })
  })

  test('trazabilidad muestra cadenas de camadas', async ({ page }) => {
    await login(page)
    await page.goto('/trazabilidad', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    // Al menos una camada C7 visible
    await expect(page.getByText(/C7|C9|C11/).first()).toBeVisible({ timeout: 10_000 })
  })

  test('coa parser accesible con empty state', async ({ page }) => {
    await login(page)
    await page.goto('/coa-parser', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Sin CoA|subir PDF|Certificado de analisis/i).first()).toBeVisible()
  })

  test('sidebar semaforo visible', async ({ page }) => {
    await login(page)
    // Semaforo es un link a /alertas con aria-label que empieza con "Estado operacional"
    const semaforo = page.getByLabel(/Estado operacional/i)
    await expect(semaforo).toBeVisible({ timeout: 10_000 })
  })

  test('cmdk global search abre con Ctrl+K', async ({ page }) => {
    await login(page)
    await page.keyboard.press('Control+K')
    await expect(page.getByPlaceholder(/Buscar lotes/i)).toBeVisible({ timeout: 5_000 })
    await page.keyboard.press('Escape')
  })

  test('nueva operacion tab switcher funciona', async ({ page }) => {
    await login(page)
    await page.goto('/operacion', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    // Click en chat rapido
    await page.getByRole('button', { name: /Chat rapido/i }).click()
    await expect(page.getByText(/Por que area|Hola/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test('etiquetas QR carga sin crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await login(page)
    await page.goto('/etiquetas', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    // No error de "Element type is invalid" (el bug de react-qr-code)
    const criticos = errors.filter(e => e.includes('Element type is invalid'))
    expect(criticos, 'No debe haber error React#130').toHaveLength(0)
    // Al menos un SVG de QR visible
    await expect(page.locator('svg').first()).toBeVisible()
  })

  test('alertas page carga con categorias', async ({ page }) => {
    await login(page)
    await page.goto('/alertas', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    // Debe mostrar al menos una categoria de alerta
    await expect(page.getByText(/alerta|evento|cuarentena|NC/i).first()).toBeVisible({ timeout: 10_000 })
  })

  // ============ P2.6: Agent IA (multi-step) ============
  test('tab agent IA carga con grilla de grupos CUMCS', async ({ page }) => {
    await login(page)
    await page.goto('/operacion', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    // Abrir tab "Agente IA"
    await page.getByRole('button', { name: /Agente IA/i }).click()

    // Deberia aparecer la grilla con los 10 grupos G01-G10
    await expect(page.getByText(/¿Que tipo de registro/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Cond\. ambientales/i)).toBeVisible()
    await expect(page.getByText(/Trazabilidad/i).first()).toBeVisible()
    await expect(page.getByText(/Cosecha/i).first()).toBeVisible()

    // Click en un grupo abre la sub-lista de CUMCS
    await page.getByText(/Cond\. ambientales/i).click()
    await expect(page.getByText(/CM-RE-0105/i).first()).toBeVisible({ timeout: 5_000 })

    // Click en CUMCS especifico abre el chat + preview
    await page.getByText(/CM-RE-0105/i).first().click()
    await expect(page.getByPlaceholder(/Escribi tu mensaje/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/Preview/i).first()).toBeVisible()
  })
})
