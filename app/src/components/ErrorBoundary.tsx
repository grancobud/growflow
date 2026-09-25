import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

const RELOAD_FLAG = 'canntrace_chunkboundary_reloaded_at'
const RELOAD_COOLDOWN_MS = 10_000

function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported|error loading dynamically imported|Importing a module script failed/i.test(msg)
}

function shouldAutoReload(): boolean {
  try {
    const last = sessionStorage.getItem(RELOAD_FLAG)
    if (!last) return true
    return Date.now() - parseInt(last) > RELOAD_COOLDOWN_MS
  } catch { return true }
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    // Si es ChunkLoadError y no reloadeamos recientemente, recargar automaticamente.
    // Esto es el cinturon de seguridad por si lazyWithRetry no intercepto el error
    // (caso: chunks que no usaron lazyWithRetry, o errores en render de chunk viejo).
    if (isChunkLoadError(error) && shouldAutoReload()) {
      try { sessionStorage.setItem(RELOAD_FLAG, String(Date.now())) } catch { /* ok */ }
      console.warn('[ErrorBoundary] ChunkLoadError detectado, recargando index.html...')
      window.location.reload()
    }
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('App crash:', error, info)
  }

  handleReload = () => {
    try { sessionStorage.removeItem(RELOAD_FLAG) } catch { /* ok */ }
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      const esChunk = isChunkLoadError(this.state.error)
      return (
        <div style={{ padding: '1rem', fontFamily: 'system-ui, sans-serif', background: '#0a0a0f', color: '#d4d4dd', minHeight: '100vh' }}>
          {/* Paleta de la app y contraste AA: el titulo rojo #ef4444 sobre #1e293b daba
              3.9:1 y el boton blanco sobre lima 1.5:1 (revision de diseno). Una
              actualizacion no es un error, asi que va en verde y no en rojo. */}
          <div style={{ maxWidth: 720, margin: '2rem auto', background: '#101016', borderRadius: 16, padding: '1.5rem', border: `1px solid ${esChunk ? '#404d20' : '#5a2a26'}` }}>
            <h1 style={{ color: esChunk ? '#bef264' : '#ff8a7a', margin: 0, fontSize: 20 }}>
              {esChunk ? 'Actualización disponible' : 'Error en la app'}
            </h1>
            <p style={{ marginTop: '1rem', lineHeight: 1.5 }}>
              {esChunk
                ? 'GrowFlow se actualizó mientras estabas en la página. Refrescá para traer la versión nueva.'
                : String(this.state.error.message || this.state.error)}
            </p>
            {!esChunk && (
              <pre style={{ background: '#0a0a0f', color: '#a6a6b5', padding: '1rem', borderRadius: 8, fontSize: 11, overflow: 'auto', maxHeight: 300, marginTop: '1rem' }}>
                {this.state.error.stack}
              </pre>
            )}
            <button onClick={this.handleReload}
              style={{ marginTop: '1rem', background: '#a3e635', color: '#0a0a0f', fontWeight: 600, border: 'none', padding: '.5rem 1.25rem', minHeight: 44, borderRadius: 10, cursor: 'pointer' }}>
              {esChunk ? 'Refrescar ahora' : 'Volver al inicio'}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
