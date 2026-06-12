import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Trash2, Info } from 'lucide-react'

type Variant = 'default' | 'destructive' | 'warning'

interface ConfirmOptions {
  titulo: string
  descripcion?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: Variant
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmCtx = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmCtx)
  if (!fn) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>')
  return fn
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const cerrar = (valor: boolean) => {
    setOpen(false)
    resolverRef.current?.(valor)
    resolverRef.current = null
    setTimeout(() => setOpts(null), 200)
  }

  const variant = opts?.variant ?? 'default'
  const Icon = variant === 'destructive' ? Trash2 : variant === 'warning' ? AlertTriangle : Info
  const iconBg =
    variant === 'destructive'
      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
      : variant === 'warning'
      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
      : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
  const confirmBtn =
    variant === 'destructive'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 text-white'
      : 'bg-primary-700 hover:bg-primary-800 text-white'

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {open && opts && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-titulo"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => e.target === e.currentTarget && cerrar(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cerrar(false)
            if (e.key === 'Enter') cerrar(true)
          }}
        >
          <div className="bg-white dark:bg-surface-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 flex gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="confirm-titulo" className="text-base font-semibold text-surface-900 dark:text-surface-100">
                  {opts.titulo}
                </h3>
                {opts.descripcion && (
                  <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">{opts.descripcion}</p>
                )}
              </div>
            </div>
            <div className="px-5 py-3 bg-surface-50 dark:bg-surface-800/50 flex justify-end gap-2">
              <button
                onClick={() => cerrar(false)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg text-surface-700 dark:text-surface-300 hover:bg-surface-200/60 dark:hover:bg-surface-700/60 transition-colors"
              >
                {opts.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                onClick={() => cerrar(true)}
                autoFocus
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${confirmBtn}`}
              >
                {opts.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  )
}
