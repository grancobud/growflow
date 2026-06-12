import { useState, useEffect } from 'react'

// Default: DARK. Ignora prefers-color-scheme del SO (pedido explicito Gaston).
// Usuario puede alternar via toggle en Header/Landing - preferencia queda en localStorage.
export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('canntrace-dark-mode')
    if (saved !== null) return saved === 'true'
    return true // default dark
  })

  useEffect(() => {
    localStorage.setItem('canntrace-dark-mode', String(dark))
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [dark])

  return { dark, setDark, toggle: () => setDark(d => !d) }
}
