// Registro del service worker con prompt de actualizacion via sonner.
// vite.config.ts usa registerType 'prompt' con skipWaiting: false: el SW nuevo
// espera hasta que el usuario toca "Recargar" en el toast de onNeedRefresh.
// /sw.js, /index.html y /manifest.webmanifest van con no-cache (public/_headers),
// que es lo que evita quedar clavado en una version vieja.

import { registerSW } from 'virtual:pwa-register'
import { toast } from 'sonner'

export function setupPWA() {
  // En dev SW queda desactivado (devOptions.enabled = false en vite.config.ts)
  if (import.meta.env.DEV) return

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast('Nueva version disponible', {
        description: 'Recarga para aplicar cambios',
        duration: Infinity,
        action: {
          label: 'Recargar',
          onClick: () => updateSW(true),
        },
      })
    },
    onOfflineReady() {
      toast.success('App lista para uso offline', {
        description: 'Los datos pesados quedaran en cache',
      })
    },
    onRegisterError(error) {
      console.error('SW registration error:', error)
    },
  })
}
