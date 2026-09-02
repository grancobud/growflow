import { defineConfig, devices } from '@playwright/test'

/**
 * Tests end-to-end.
 *
 * OJO CON EL `baseURL`: apuntaba a `canntrace.pages.dev`, que es OTRO producto
 * —un resto del fork— y hacia que toda la suite corriera contra un sitio ajeno.
 * Se corrigio el 02/09/2026, portando el mismo arreglo que ya se habia hecho en
 * la instalacion de Aguara.
 *
 *   npm run test:e2e         contra el sitio publicado
 *   npm run revision:diseno  la revision de diseno contra el dev server, que
 *                            corre en MODO DEMO y auto-loguea: es la unica
 *                            forma de revisar las pantallas de adentro sin
 *                            poner una contrasena en ningun archivo. Levantar
 *                            `growflow-dev` antes (puerto 5173).
 *
 * Abre el HTML report con: `npx playwright show-report`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://growflow-5vs.pages.dev',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
})
