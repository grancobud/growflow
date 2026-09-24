import { defineConfig, devices } from '@playwright/test'

/**
 * Tests end-to-end de GrowFlow.
 *
 * OJO CON EL `baseURL`: apuntaba a `growflow-panacea.pages.dev`, que es OTRO producto.
 * Es un resto del fork y hacia que toda la suite corriera contra un sitio ajeno.
 *
 *   npm run test:e2e         contra el sitio publicado (solo /login y /sumate:
 *                            el resto pide sesion)
 *   npm run test:e2e:local   contra el dev server, que corre en MODO DEMO y
 *                            auto-loguea — es la unica forma de revisar las
 *                            diez pantallas sin poner una contrasena en ningun
 *                            archivo. Levantar `panacea-dev` antes (puerto 5199).
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
