import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { extraerOperacionConIA, type OperacionExtraida } from '../../lib/aiExtract'
import PreviewExtraccion from './PreviewExtraccion'

type Props = {
  onConfirmar: (data: OperacionExtraida, meta: { modelo: string; prompt: string }) => void
  onCancelar: () => void
}

const EJEMPLOS = [
  'carge 50 esquejes C7 COCO hoy',
  'cosechamos 120 plantas de la 15 en flora 2 ayer',
  'trimming 4.2kg camada 11 sistema RDWC',
]

/**
 * Input de texto libre + boton "Interpretar con IA". Llama a la Edge Function ai-extract-operacion,
 * muestra el preview con campos editables y delega la confirmacion al ChatOperacion parent.
 */
export default function InputLibreAI({ onConfirmar, onCancelar }: Props) {
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [preview, setPreview] = useState<{
    extraccion: OperacionExtraida
    modelo: string
    prompt: string
    followUpMessage?: string
    camposFaltantes?: string[]
  } | null>(null)

  async function interpretar() {
    if (!texto.trim()) return
    setCargando(true)
    setPreview(null)
    const res = await extraerOperacionConIA(texto)
    setCargando(false)
    if (!res.ok) {
      toast.error(res.error, { description: res.detalle })
      return
    }
    if (res.data.extraccion.confianza < 0.3) {
      toast.warning('La IA no entendio bien — revisa los campos antes de confirmar', { duration: 4000 })
    }
    setPreview({
      extraccion: res.data.extraccion,
      modelo: res.data.modelo_usado,
      prompt: texto.trim(),
      followUpMessage: res.data.follow_up_message,
      camposFaltantes: res.data.campos_faltantes,
    })
  }

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-700 dark:text-primary-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-display font-semibold text-surface-900 dark:text-white">
              Cargar por texto libre (IA)
            </h4>
            <p className="text-[11px] text-surface-500 dark:text-surface-400">
              Describi la operacion en una frase — la IA extrae los campos, vos revisas y confirmas.
            </p>
          </div>
        </div>

        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="ej: carge 50 esquejes C7 COCO hoy"
          rows={2}
          maxLength={2000}
          disabled={cargando}
          className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 resize-none"
          onKeyDown={e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') interpretar()
          }}
        />

        <div className="flex items-center gap-2 flex-wrap">
          {EJEMPLOS.map(ej => (
            <button
              key={ej}
              type="button"
              onClick={() => setTexto(ej)}
              disabled={cargando}
              className="text-[10px] text-surface-500 dark:text-surface-400 hover:text-primary-700 dark:hover:text-primary-400 italic"
            >
              "{ej}"
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={interpretar}
            disabled={cargando || texto.trim().length < 3}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold"
          >
            {cargando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Interpretando con IA...</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Interpretar con IA</>
            )}
          </button>
          <button
            onClick={onCancelar}
            disabled={cargando}
            className="inline-flex items-center gap-2 px-3 py-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-lg text-sm font-medium"
          >
            Volver
          </button>
        </div>
      </div>

      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PreviewExtraccion
              extraccion={preview.extraccion}
              modelo={preview.modelo}
              promptOriginal={preview.prompt}
              followUpMessage={preview.followUpMessage}
              camposFaltantesIa={preview.camposFaltantes}
              onConfirmar={onConfirmar}
              onDescartar={() => setPreview(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
