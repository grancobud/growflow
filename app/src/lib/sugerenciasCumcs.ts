// Hook + helpers compartidos para sugerencias de campos CUMCS desde la BD.
// Usado por ChatGuiado, ChatAgent, FormularioOperacion / CamposCumcs.
// Fuentes:
//   - lotes.codigo_lote (catalogo maestro de lotes)
//   - registros_condiciones_ambientales (CM-RE-0101/0102 historico)
//   - registros_trazabilidad (G02 historico, codigos PM/CL/etc)
//   - operaciones.datos_extra (cualquier valor cargado por chat/form/agente)
//   - variedades.nombre

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/** Normaliza un ID de lote tipo "25 pm 6" -> "25.PM6". Tokens letras + digits adyacentes se pegan. */
export function formatearIdLote(raw: string): string {
  const tokens = raw.trim().toUpperCase().split(/[\s.]+/).filter(Boolean)
  if (tokens.length === 0) return raw.trim()
  const out: string[] = []
  let i = 0
  while (i < tokens.length) {
    const cur = tokens[i]
    const next = tokens[i + 1]
    if (next && /^[A-Z]+$/.test(cur) && /^\d+$/.test(next)) { out.push(cur + next); i += 2 }
    else { out.push(cur); i++ }
  }
  return out.join('.')
}

/** True si dos id de lote matchean tras normalizacion + lowercase. */
export function mismoIdLote(a: string, b: string): boolean {
  return formatearIdLote(a).toLowerCase() === formatearIdLote(b).toLowerCase()
}

export type Sugerencias = Record<string, string[]>

/**
 * Carga sugerencias desde la BD para un CM-RE dado.
 * Llave = nombre del campo (ej "id_lote", "variedad", "responsable").
 * Valor = array de strings unicos (max 50 c/u).
 */
export async function cargarSugerencias(codigo: string): Promise<Sugerencias> {
  const sug: Record<string, Set<string>> = {}
  const add = (k: string, v: unknown) => {
    if (v === null || v === undefined) return
    const s = String(v).trim()
    if (!s) return
    ;(sug[k] ??= new Set()).add(s)
  }

  try {
    // 1. Catalogo maestro de lotes (PMs)
    const { data: lotes } = await supabase
      .from('lotes')
      .select('codigo_lote')
      .ilike('codigo_lote', '%PM%')
      .order('creado_en', { ascending: false })
      .limit(50)
    if (lotes) {
      for (const l of lotes as Array<{ codigo_lote: string }>) {
        if (!l.codigo_lote) continue
        const f = formatearIdLote(l.codigo_lote)
        add('id_lote', f); add('id_planta_madre', f); add('codigo_id', f)
      }
    }

    // 2. Variedades del catalogo maestro
    const { data: vars } = await supabase.from('variedades').select('nombre').limit(20)
    if (vars) for (const v of vars as Array<{ nombre: string }>) if (v.nombre) add('variedad', v.nombre)

    // 3. Tabla CUMCS-especifica (G01: condiciones ambientales)
    if (['CM-RE-0101', 'CM-RE-0102', 'CM-RE-0103', 'CM-RE-0104', 'CM-RE-0105'].includes(codigo)) {
      const { data: regs } = await supabase
        .from('registros_condiciones_ambientales')
        .select('*')
        .order('creado_en', { ascending: false })
        .limit(100)
      if (regs) for (const r of regs as Array<Record<string, unknown>>) {
        for (const [k, v] of Object.entries(r)) {
          if (['id', 'creado_en', 'creado_por', 'organizacion_id', 'datos_extra'].includes(k)) continue
          add(k, v)
          if (k === 'id_lote_texto') {
            const f = formatearIdLote(String(v ?? ''))
            if (f) { add('id_lote', f); add('id_planta_madre', f) }
          }
        }
      }
    }

    // 4. Tabla CUMCS-especifica (G02: trazabilidad)
    if (['CM-RE-0201', 'CM-RE-0202', 'CM-RE-0203', 'CM-RE-0204'].includes(codigo)) {
      const { data: regs } = await supabase
        .from('registros_trazabilidad')
        .select('*')
        .order('creado_en', { ascending: false })
        .limit(100)
      if (regs) for (const r of regs as Array<Record<string, unknown>>) {
        for (const [k, v] of Object.entries(r)) {
          if (['id', 'creado_en', 'creado_por', 'organizacion_id', 'datos_extra'].includes(k)) continue
          add(k, v)
        }
      }
    }

    // 5. Operaciones historicas (cualquier campo en datos_extra)
    const { data: ops } = await supabase
      .from('operaciones')
      .select('datos_extra, responsable')
      .not('datos_extra', 'is', null)
      .order('creado_en', { ascending: false })
      .limit(200)
    if (ops) {
      for (const o of ops as Array<{ datos_extra?: Record<string, unknown>; responsable?: string }>) {
        if (o.responsable) add('responsable', o.responsable)
        const de = o.datos_extra ?? {}
        for (const [k, v] of Object.entries(de)) {
          add(k, v)
          if (['id_lote', 'codigo_id', 'id_planta_madre'].includes(k) && typeof v === 'string') {
            const f = formatearIdLote(v)
            add('id_lote', f); add('id_planta_madre', f); add('codigo_id', f)
          }
        }
      }
    }
  } catch { /* silencioso, sugerencias son opcionales */ }

  const final: Sugerencias = {}
  for (const [k, set] of Object.entries(sug)) final[k] = [...set].slice(0, 50)
  return final
}

/** Hook React para usar sugerencias en componentes. */
export function useSugerencias(codigo: string | null | undefined) {
  const [sugerencias, setSugerencias] = useState<Sugerencias>({})
  useEffect(() => {
    if (!codigo) { setSugerencias({}); return }
    let cancel = false
    void cargarSugerencias(codigo).then(s => { if (!cancel) setSugerencias(s) })
    return () => { cancel = true }
  }, [codigo])
  return sugerencias
}

/** Verifica si un valor (normalizado) ya existe en la lista de sugerencias del campo. */
export function existeEnSugerencias(sugerencias: Sugerencias, campo: string, valor: string): boolean {
  const lista = sugerencias[campo] ?? []
  if (campo === 'id_lote' || campo === 'id_planta_madre' || campo === 'codigo_id') {
    return lista.some(s => mismoIdLote(s, valor))
  }
  return lista.some(s => s.toLowerCase() === valor.toLowerCase())
}
