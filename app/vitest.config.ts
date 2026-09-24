// Config de vitest, separada de la de Vite.
//
// Existe por una razón concreta: sin `include`, vitest levanta también los
// specs de `e2e/`, que son de Playwright, y falla con
// "Playwright Test did not expect test.describe() to be called here". Son dos
// corredores distintos sobre el mismo repo y hay que decirle a cada uno qué
// mirar.
//
//   npm test        -> unitarios (funciones puras de lib/)
//   npm run test:e2e -> Playwright (navegador de verdad)
//
// No se toca `vite.config.ts` para no arrastrar los plugins de build —react,
// tailwind, PWA— a cada corrida de tests: son irrelevantes para funciones puras
// y sólo agregan segundos.

import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    environment: 'node',
  },
})
