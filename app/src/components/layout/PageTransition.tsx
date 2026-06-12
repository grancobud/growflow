import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Page transition wrapper.
 * Envuelve Outlet en AnimatePresence para animar cambios de ruta.
 * Fade + subtle y-offset clinical-refined (no bounce).
 */
export default function PageTransition() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
        className="flex-1 flex flex-col overflow-hidden min-w-0"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}
