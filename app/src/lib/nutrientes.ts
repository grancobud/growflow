// Motor de cálculo de nutrientes (tipo HydroBuddy, en TS puro)
// Dado un perfil objetivo en ppm + sales disponibles → gramos/L de cada sal.
// Solver: non-negative least squares por updates multiplicativos (estable, x>=0).

import { supabase } from './supabase'

export type ElementKey =
  | 'N' | 'P' | 'K' | 'Ca' | 'Mg' | 'S'
  | 'Fe' | 'Mn' | 'Zn' | 'Cu' | 'B' | 'Mo' | 'Cl' | 'Na'

export const ELEMENTOS: { key: ElementKey; label: string; grupo: 'macro' | 'micro' | 'otro' }[] = [
  { key: 'N', label: 'Nitrógeno', grupo: 'macro' },
  { key: 'P', label: 'Fósforo', grupo: 'macro' },
  { key: 'K', label: 'Potasio', grupo: 'macro' },
  { key: 'Ca', label: 'Calcio', grupo: 'macro' },
  { key: 'Mg', label: 'Magnesio', grupo: 'macro' },
  { key: 'S', label: 'Azufre', grupo: 'macro' },
  { key: 'Fe', label: 'Hierro', grupo: 'micro' },
  { key: 'Mn', label: 'Manganeso', grupo: 'micro' },
  { key: 'Zn', label: 'Zinc', grupo: 'micro' },
  { key: 'Cu', label: 'Cobre', grupo: 'micro' },
  { key: 'B', label: 'Boro', grupo: 'micro' },
  { key: 'Mo', label: 'Molibdeno', grupo: 'micro' },
  { key: 'Cl', label: 'Cloro', grupo: 'otro' },
  { key: 'Na', label: 'Sodio', grupo: 'otro' },
]

export interface Sal {
  id: string
  nombre: string
  formula?: string
  // fracción elemental (0-1) de cada elemento
  comp: Partial<Record<ElementKey, number>>
  // bidón sugerido: A = calcio, B = sulfatos/fosfatos, C = micros
  bidon: 'A' | 'B' | 'C'
  nota?: string
}

// Base de sales. Composición en fracción elemental (no óxido).
export const SALES: Sal[] = [
  { id: 'cano3', nombre: 'Nitrato de calcio (Calcinit)', formula: 'Ca(NO₃)₂·4H₂O', bidon: 'A',
    comp: { Ca: 0.19, N: 0.155 }, nota: 'Caballo de batalla del calcio. Trae N nítrico.' },
  { id: 'kno3', nombre: 'Nitrato de potasio', formula: 'KNO₃', bidon: 'B',
    comp: { K: 0.387, N: 0.139 } },
  { id: 'mkp', nombre: 'Fosfato monopotásico (MKP)', formula: 'KH₂PO₄', bidon: 'B',
    comp: { P: 0.228, K: 0.287 }, nota: 'Corazón del finish. Cero N.' },
  { id: 'map', nombre: 'Fosfato monoamónico (MAP)', formula: 'NH₄H₂PO₄', bidon: 'B',
    comp: { N: 0.122, P: 0.269 } },
  { id: 'k2so4', nombre: 'Sulfato de potasio', formula: 'K₂SO₄', bidon: 'B',
    comp: { K: 0.449, S: 0.184 } },
  { id: 'epsom', nombre: 'Sulfato de magnesio (Epsom)', formula: 'MgSO₄·7H₂O', bidon: 'B',
    comp: { Mg: 0.098, S: 0.130 } },
  { id: 'yeso', nombre: 'Yeso (sulfato de calcio)', formula: 'CaSO₄·2H₂O', bidon: 'A',
    comp: { Ca: 0.233, S: 0.186 }, nota: 'Poco soluble: usar en seco, dosis baja.' },
  { id: 'khco3', nombre: 'Bicarbonato de potasio', formula: 'KHCO₃', bidon: 'B',
    comp: { K: 0.391 }, nota: 'Buffer de pH (sube). Aporta K sin S ni N.' },
  { id: 'nh4no3', nombre: 'Nitrato de amonio', formula: 'NH₄NO₃', bidon: 'B',
    comp: { N: 0.35 } },
  { id: 'amsulf', nombre: 'Sulfato de amonio', formula: '(NH₄)₂SO₄', bidon: 'B',
    comp: { N: 0.212, S: 0.242 } },
  { id: 'cacl2', nombre: 'Cloruro de calcio', formula: 'CaCl₂·2H₂O', bidon: 'A',
    comp: { Ca: 0.273, Cl: 0.482 }, nota: 'Mete cloro. Es lo que usa Athena Fade.' },
  { id: 'cagluc', nombre: 'Gluconato de calcio', formula: 'C₁₂H₂₂CaO₁₄', bidon: 'A',
    comp: { Ca: 0.089 }, nota: 'Calcio LIMPIO: sin N, sin Cl. Quelante suave fiel al Ca.' },
  { id: 'caedta', nombre: 'Quelato de calcio (EDTA)', formula: 'Ca-EDTA', bidon: 'A',
    comp: { Ca: 0.097 }, nota: 'Ca quelatado, sin N ni Cl. Para foliar/corrección.' },
  { id: 'calact', nombre: 'Lactato de calcio', formula: 'C₆H₁₀CaO₆', bidon: 'A',
    comp: { Ca: 0.13 }, nota: 'Ca limpio soluble, fácil de conseguir.' },
  // Compuestas
  { id: 'masterblend', nombre: 'Masterblend 4-18-38', bidon: 'B',
    comp: { N: 0.04, P: 0.0785, K: 0.315, Mg: 0.015, S: 0.03, Fe: 0.004, Mn: 0.002, Zn: 0.0005, Cu: 0.0005, B: 0.002, Mo: 0.0001 },
    nota: 'Base completa con micros quelatados adentro.' },
  // Micros
  { id: 'mnso4', nombre: 'Sulfato de manganeso', formula: 'MnSO₄·H₂O', bidon: 'C',
    comp: { Mn: 0.325, S: 0.19 } },
  { id: 'znso4', nombre: 'Sulfato de zinc', formula: 'ZnSO₄·7H₂O', bidon: 'C',
    comp: { Zn: 0.227, S: 0.11 } },
  { id: 'cuso4', nombre: 'Sulfato de cobre', formula: 'CuSO₄·5H₂O', bidon: 'C',
    comp: { Cu: 0.255, S: 0.128 } },
  { id: 'feedta', nombre: 'Quelato de hierro (EDTA)', formula: 'Fe-EDTA', bidon: 'C',
    comp: { Fe: 0.13 } },
  { id: 'feeddha', nombre: 'Quelato de hierro (EDDHA)', formula: 'Fe-EDDHA', bidon: 'C',
    comp: { Fe: 0.06 }, nota: 'El rojo. Aguanta pH alto.' },
  { id: 'boric', nombre: 'Ácido bórico', formula: 'H₃BO₃', bidon: 'C',
    comp: { B: 0.175 } },
  { id: 'namolib', nombre: 'Molibdato de sodio', formula: 'Na₂MoO₄·2H₂O', bidon: 'C',
    comp: { Mo: 0.397, Na: 0.19 } },
]

export type Perfil = Partial<Record<ElementKey, number>> // ppm objetivo

export interface PresetPerfil { id: string; nombre: string; desc: string; perfil: Perfil }

// Perfiles objetivo (ppm). Derivados de la charla coco/RO.
export const PRESETS: PresetPerfil[] = [
  { id: 'veg', nombre: 'Vegetativo (coco)', desc: 'EC ~1.4', perfil: { N: 150, P: 50, K: 180, Ca: 150, Mg: 50, S: 70, Fe: 2, Mn: 0.5, Zn: 0.2, B: 0.4 } },
  { id: 'flora', nombre: 'Floración (coco)', desc: 'EC ~2.0', perfil: { N: 140, P: 55, K: 200, Ca: 170, Mg: 55, S: 80, Fe: 2, Mn: 0.5, Zn: 0.2, B: 0.4 } },
  { id: 'finish', nombre: 'Finalización (clon Finis)', desc: '0-15-25, sin N', perfil: { N: 0, P: 60, K: 187, Ca: 98, S: 114 } },
  { id: 'finishlimpio', nombre: 'Finish Ca limpio', desc: 'PK + Ca quelatado bajo', perfil: { P: 60, K: 187, Ca: 30, S: 90 } },
]

export interface ResultadoSal { sal: Sal; gramosPorL: number }
export interface Resultado {
  dosis: ResultadoSal[]
  ppmLogrado: Record<ElementKey, number>
  ppmObjetivo: Perfil
}

/** NNLS por updates multiplicativos: minimiza ||A x - b||² con x>=0. */
function nnls(A: number[][], b: number[], iters = 800): number[] {
  const m = A.length          // elementos
  const n = A[0]?.length ?? 0 // sales
  if (n === 0) return []
  // x inicial positivo
  const x = new Array(n).fill(1e-3)
  // Atb = Aᵀb
  const Atb = new Array(n).fill(0)
  for (let j = 0; j < n; j++) for (let i = 0; i < m; i++) Atb[j] += A[i][j] * b[i]
  // AtA = AᵀA
  const AtA: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let j = 0; j < n; j++)
    for (let k = 0; k < n; k++) {
      let s = 0
      for (let i = 0; i < m; i++) s += A[i][j] * A[i][k]
      AtA[j][k] = s
    }
  const eps = 1e-9
  for (let it = 0; it < iters; it++) {
    for (let j = 0; j < n; j++) {
      let denom = 0
      for (let k = 0; k < n; k++) denom += AtA[j][k] * x[k]
      const num = Atb[j]
      if (num <= 0) { x[j] = 0; continue } // sin contribución útil
      x[j] = x[j] * (num / (denom + eps))
    }
  }
  return x.map(v => (v < 1e-4 ? 0 : v))
}

/**
 * Calcula gramos/L de cada sal para acercarse al perfil objetivo.
 * @param perfil ppm objetivo por elemento
 * @param salesDisp sales disponibles
 * @param agua ppm que ya aporta el agua (se descuenta)
 */
export function calcularReceta(perfil: Perfil, salesDisp: Sal[], agua: Perfil = {}): Resultado {
  // elementos a balancear = los del objetivo con valor > 0
  const elems = ELEMENTOS.map(e => e.key).filter(k => (perfil[k] ?? 0) > 0)
  // peso: micros mucho más chicos → normalizar para que importen
  const b = elems.map(k => Math.max(0, (perfil[k] ?? 0) - (agua[k] ?? 0)))
  // matriz A: ppm que da 1 g/L de cada sal = frac * 1000
  const A = elems.map(k => salesDisp.map(s => (s.comp[k] ?? 0) * 1000))
  // escalado por elemento (para que micros pesen): dividir fila por target
  const scale = b.map(v => (v > 0 ? 1 / v : 1))
  const As = A.map((fila, i) => fila.map(v => v * scale[i]))
  const bs = b.map((v, i) => v * scale[i])
  const x = nnls(As, bs)
  const dosis: ResultadoSal[] = salesDisp
    .map((sal, j) => ({ sal, gramosPorL: +(x[j] ?? 0).toFixed(4) }))
    .filter(d => d.gramosPorL > 0)
    .sort((a, b2) => b2.gramosPorL - a.gramosPorL)
  // ppm logrado
  const ppmLogrado = {} as Record<ElementKey, number>
  for (const e of ELEMENTOS) {
    let s = agua[e.key] ?? 0
    for (const d of dosis) s += (d.sal.comp[e.key] ?? 0) * d.gramosPorL * 1000
    ppmLogrado[e.key] = +s.toFixed(1)
  }
  return { dosis, ppmLogrado, ppmObjetivo: perfil }
}

/** EC aproximada (mS/cm) a partir de ppm totales (escala 500). */
export function ecAprox(ppm: Record<ElementKey, number>): number {
  const total = Object.values(ppm).reduce((a, b) => a + b, 0)
  return +(total / 640).toFixed(2) // factor 500/640 aprox
}

// ---------------------------------------------------------------------------
// Persistencia de perfiles guardados (Supabase real o demo/localStorage).
// ---------------------------------------------------------------------------

export interface PerfilGuardado {
  id: string
  user_id: string | null
  nombre: string
  perfil: Perfil
  agua: Perfil
  sales: string[] // ids de sales activas
  creado_en: string
}

export const perfilesNutrientesService = {
  async list(): Promise<PerfilGuardado[]> {
    const { data, error } = await supabase
      .from('perfiles_nutrientes')
      .select('*')
      .order('creado_en', { ascending: false })
    if (error) throw error
    return (data ?? []) as unknown as PerfilGuardado[]
  },
  async crear(p: { nombre: string; perfil: Perfil; agua: Perfil; sales: string[] }): Promise<PerfilGuardado> {
    const { data: u } = await supabase.auth.getUser()
    const payload = { ...p, user_id: u?.user?.id ?? null }
    const { data, error } = await supabase
      .from('perfiles_nutrientes')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as unknown as PerfilGuardado
  },
  async eliminar(id: string): Promise<void> {
    const { error } = await supabase.from('perfiles_nutrientes').delete().eq('id', id)
    if (error) throw error
  },
}
