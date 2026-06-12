import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Edit3, Sparkles, AlertTriangle, MessageCircle } from 'lucide-react'
import {
  TIPOS_OPERACION_AI, CAMADAS_AI, SISTEMAS_AI,
  type OperacionExtraida, type TipoOperacionAI, type CamadaAI, type SistemaAI,
} from '../../lib/aiExtract'
import { ETIQUETAS_OPERACION } from '../../types'

type PreviewProps = {
  extraccion: OperacionExtraida
  modelo: string
  promptOriginal: string
  /** Mensaje de seguimiento generado por la IA cuando hay gaps. Opcional. */
  followUpMessage?: string
  /** Campos detectados como faltantes por la IA (backend). Opcional. */
  camposFaltantesIa?: string[]
  onConfirmar: (data: OperacionExtraida, meta: { modelo: string; prompt: string }) => void
  onDescartar: () => void
}

/**
 * Card que muestra la extraccion de la IA con campos editables.
 * Valida que los campos criticos (tipo_operacion, cantidad, camada) esten completos antes de confirmar.
 */
export default function PreviewExtraccion({
  extraccion,
  modelo,
  promptOriginal,
  followUpMessage,
  camposFaltantesIa,
  onConfirmar,
  onDescartar,
}: PreviewProps) {
  const [editada, setEditada] = useState<OperacionExtraida>(extraccion)

  const setCampo = <K extends keyof OperacionExtraida>(k: K, v: OperacionExtraida[K]) => {
    setEditada(prev => ({ ...prev, [k]: v }))
  }

  const faltan: string[] = []
  if (!editada.tipo_operacion) faltan.push('tipo de operacion')
  if (editada.cantidad === null || editada.cantidad <= 0) faltan.push('cantidad')
  if (!editada.camada) faltan.push('camada')

  // La IA backend puede proveer la lista tambien; la usamos solo para mostrar badge en el bubble.
  void camposFaltantesIa

  const confianzaColor = editada.confianza >= 0.7
    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30'
    : editada.confianza >= 0.4
    ? 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30'
    : 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
      className="bg-white dark:bg-surface-900 border border-primary-300 dark:border-primary-700/50 rounded-xl p-4 shadow-sm space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-700 dark:text-primary-400" />
          <h4 className="text-sm font-display font-bold text-surface-900 dark:text-white">
            Preview IA
          </h4>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${confianzaColor}`}>
            {Math.round(editada.confianza * 100)}% confianza
          </span>
        </div>
        <button
          onClick={onDescartar}
          className="p-1 text-surface-400 hover:text-red-600 rounded"
          aria-label="Descartar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] text-surface-500 dark:text-surface-400 italic">
          "{promptOriginal}"
        </p>
        <p className="text-[10px] text-surface-400 dark:text-surface-500 font-mono flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          via {modelo}
        </p>
      </div>

      {followUpMessage && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
          className="flex items-start gap-2 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 rounded-lg p-2.5"
        >
          <MessageCircle className="w-4 h-4 text-primary-700 dark:text-primary-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-primary-900 dark:text-primary-100 leading-relaxed">
            {followUpMessage}
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tipo operacion" required>
          <select
            value={editada.tipo_operacion ?? ''}
            onChange={e => setCampo('tipo_operacion', (e.target.value || null) as TipoOperacionAI | null)}
            className="w-full px-2 py-1.5 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          >
            <option value="">— elegir —</option>
            {TIPOS_OPERACION_AI.map(t => (
              <option key={t} value={t}>{ETIQUETAS_OPERACION[t as keyof typeof ETIQUETAS_OPERACION] || t}</option>
            ))}
          </select>
        </Field>

        <Field label="Cantidad" required>
          <input
            type="number"
            min={0}
            value={editada.cantidad ?? ''}
            onChange={e => setCampo('cantidad', e.target.value ? parseFloat(e.target.value) : null)}
            className="w-full px-2 py-1.5 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-md text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
        </Field>

        <Field label="Camada" required>
          <select
            value={editada.camada ?? ''}
            onChange={e => setCampo('camada', (e.target.value || null) as CamadaAI | null)}
            className="w-full px-2 py-1.5 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          >
            <option value="">— elegir —</option>
            {CAMADAS_AI.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Sistema">
          <select
            value={editada.sistema ?? ''}
            onChange={e => setCampo('sistema', (e.target.value || null) as SistemaAI | null)}
            className="w-full px-2 py-1.5 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          >
            <option value="">— elegir —</option>
            {SISTEMAS_AI.map(s => (
              <option key={s} value={s}>{s} {s === 'RDWC' ? '(Flora 2 / SFL2)' : '(Flora 1 / SFL1)'}</option>
            ))}
          </select>
        </Field>

        <Field label="Fecha">
          <input
            type="date"
            value={editada.fecha?.slice(0, 10) ?? ''}
            onChange={e => setCampo('fecha', e.target.value || null)}
            className="w-full px-2 py-1.5 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
        </Field>

        <Field label="Codigo lote (opcional)">
          <input
            type="text"
            value={editada.id_lote ?? ''}
            onChange={e => setCampo('id_lote', e.target.value || null)}
            placeholder="ej: CL7, ALM-C7-RDWC"
            className="w-full px-2 py-1.5 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
        </Field>
      </div>

      <Field label="Observaciones">
        <textarea
          rows={2}
          value={editada.observaciones ?? ''}
          onChange={e => setCampo('observaciones', e.target.value || null)}
          className="w-full px-2 py-1.5 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none"
        />
      </Field>

      {faltan.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Falta: {faltan.join(', ')}. Completalo arriba antes de confirmar.
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onConfirmar(editada, { modelo, prompt: promptOriginal })}
          disabled={faltan.length > 0}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-4 h-4" /> Confirmar y cargar
        </button>
        <button
          onClick={onDescartar}
          className="inline-flex items-center gap-2 px-3 py-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-lg text-sm font-medium"
        >
          <Edit3 className="w-4 h-4" /> Manual
        </button>
      </div>
    </motion.div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-surface-600 dark:text-surface-400">
        {label}
        {required && <span className="text-red-600 dark:text-red-400 ml-1">*</span>}
      </span>
      {children}
    </label>
  )
}
