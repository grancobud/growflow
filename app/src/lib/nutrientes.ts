// ============================================================================
// Motor de cálculo de nutrientes — port completo de HydroBuddy a TS, en español.
// Modelo de 16 nutrientes (igual que HydroBuddy), base de sales real, solver
// NNLS, soluciones madre A/B, ratios, EC, costos y persistencia.
// Inspirado en HydroBuddy (Daniel Fernández, scienceinhydroponics.com).
// ============================================================================

import { supabase } from './supabase'

// 16 elementos, mismo orden y separación NO3/NH4 que HydroBuddy.
export type ElementKey =
  | 'NO3' | 'NH4' | 'P' | 'K' | 'Mg' | 'Ca' | 'S'
  | 'Fe' | 'Zn' | 'B' | 'Cu' | 'Mo' | 'Mn' | 'Na' | 'Si' | 'Cl'

export const ELEMENTOS: { key: ElementKey; label: string; grupo: 'macro' | 'micro' | 'otro' }[] = [
  { key: 'NO3', label: 'N (NO₃⁻) nítrico', grupo: 'macro' },
  { key: 'NH4', label: 'N (NH₄⁺) amoniacal', grupo: 'macro' },
  { key: 'P', label: 'Fósforo', grupo: 'macro' },
  { key: 'K', label: 'Potasio', grupo: 'macro' },
  { key: 'Mg', label: 'Magnesio', grupo: 'macro' },
  { key: 'Ca', label: 'Calcio', grupo: 'macro' },
  { key: 'S', label: 'Azufre', grupo: 'macro' },
  { key: 'Fe', label: 'Hierro', grupo: 'micro' },
  { key: 'Zn', label: 'Zinc', grupo: 'micro' },
  { key: 'B', label: 'Boro', grupo: 'micro' },
  { key: 'Cu', label: 'Cobre', grupo: 'micro' },
  { key: 'Mo', label: 'Molibdeno', grupo: 'micro' },
  { key: 'Mn', label: 'Manganeso', grupo: 'micro' },
  { key: 'Na', label: 'Sodio', grupo: 'otro' },
  { key: 'Si', label: 'Silicio', grupo: 'otro' },
  { key: 'Cl', label: 'Cloro', grupo: 'otro' },
]

export const N_TOTAL_KEYS: ElementKey[] = ['NO3', 'NH4']
export function nTotal(p: Partial<Record<ElementKey, number>>): number {
  return (p.NO3 ?? 0) + (p.NH4 ?? 0)
}

export type Bidon = 'A' | 'B' | 'C'

export interface Sal {
  id: string
  nombre: string
  formula?: string
  comp: Partial<Record<ElementKey, number>> // fracción elemental (0-1)
  bidon: Bidon
  liquido?: boolean       // concentrado líquido (composición %W/V)
  densidad?: number       // g/mL (si líquido)
  costoKg?: number        // costo por kg (o por L si líquido), ARS
  nota?: string
  custom?: boolean
}

// Base de sales por defecto (composición elemental W/W, fracción).
// Replica el set de HydroBuddy + agregados útiles para coco/cannabis.
export const SALES_DEFECTO: Sal[] = [
  // --- Calcio / nitratos (bidón A) ---
  { id: 'cano3_ag', nombre: 'Nitrato de calcio (agrícola CN-9)', formula: 'Ca(NO₃)₂·NH₄·H₂O', bidon: 'A',
    comp: { Ca: 0.19, NO3: 0.144, NH4: 0.011 }, nota: 'Calcinit/YaraLiva. Caballo de batalla del Ca.' },
  { id: 'cano3_puro', nombre: 'Nitrato de calcio (puro anhidro)', formula: 'Ca(NO₃)₂', bidon: 'A',
    comp: { Ca: 0.244, NO3: 0.17 } },
  { id: 'cacl2', nombre: 'Cloruro de calcio', formula: 'CaCl₂·2H₂O', bidon: 'A',
    comp: { Ca: 0.273, Cl: 0.482 }, nota: 'Ca sin N. Mete cloro (es lo que usa Athena Fade).' },
  { id: 'yeso', nombre: 'Yeso (sulfato de calcio)', formula: 'CaSO₄·2H₂O', bidon: 'A',
    comp: { Ca: 0.233, S: 0.186 }, nota: 'Poco soluble: usar en seco.' },
  { id: 'caco3', nombre: 'Carbonato de calcio', formula: 'CaCO₃', bidon: 'A',
    comp: { Ca: 0.40 }, nota: 'Buffer de pH, casi insoluble.' },
  { id: 'cagluc', nombre: 'Gluconato de calcio', formula: 'C₁₂H₂₂CaO₁₄', bidon: 'A',
    comp: { Ca: 0.089 }, nota: 'Ca LIMPIO: sin N ni Cl. Quelante suave fiel al Ca.' },
  { id: 'caedta', nombre: 'Quelato de calcio (EDTA)', formula: 'Ca-EDTA', bidon: 'A',
    comp: { Ca: 0.097 }, nota: 'Ca quelatado, foliar/corrección.' },
  { id: 'calact', nombre: 'Lactato de calcio', formula: 'C₆H₁₀CaO₆', bidon: 'A',
    comp: { Ca: 0.13 }, nota: 'Ca limpio soluble.' },

  // --- Nitrógeno / potasio ---
  { id: 'kno3', nombre: 'Nitrato de potasio', formula: 'KNO₃', bidon: 'B',
    comp: { K: 0.387, NO3: 0.139 } },
  { id: 'mgno3', nombre: 'Nitrato de magnesio', formula: 'Mg(NO₃)₂·6H₂O', bidon: 'B',
    comp: { Mg: 0.094, NO3: 0.109 } },
  { id: 'nh4no3', nombre: 'Nitrato de amonio', formula: 'NH₄NO₃', bidon: 'B',
    comp: { NO3: 0.175, NH4: 0.175 } },
  { id: 'amsulf', nombre: 'Sulfato de amonio', formula: '(NH₄)₂SO₄', bidon: 'B',
    comp: { NH4: 0.212, S: 0.242 } },
  { id: 'urea', nombre: 'Urea', formula: 'CO(NH₂)₂', bidon: 'B',
    comp: { NH4: 0.466 }, nota: 'N amídico (se asimila como NH4).' },
  { id: 'kcl', nombre: 'Cloruro de potasio', formula: 'KCl', bidon: 'B',
    comp: { K: 0.524, Cl: 0.476 } },
  { id: 'khco3', nombre: 'Bicarbonato de potasio', formula: 'KHCO₃', bidon: 'B',
    comp: { K: 0.391 }, nota: 'Buffer de pH (sube). K sin S ni N.' },
  { id: 'k2co3', nombre: 'Carbonato de potasio', formula: 'K₂CO₃', bidon: 'B',
    comp: { K: 0.566 }, nota: 'Sube pH fuerte.' },
  { id: 'koh', nombre: 'Hidróxido de potasio', formula: 'KOH', bidon: 'B',
    comp: { K: 0.697 }, nota: 'Base para subir pH.' },

  // --- Fósforo ---
  { id: 'mkp', nombre: 'Fosfato monopotásico (MKP)', formula: 'KH₂PO₄', bidon: 'B',
    comp: { P: 0.228, K: 0.287 }, nota: 'Corazón del finish. Cero N.' },
  { id: 'map', nombre: 'Fosfato monoamónico (MAP)', formula: 'NH₄H₂PO₄', bidon: 'B',
    comp: { NH4: 0.122, P: 0.269 } },
  { id: 'dap', nombre: 'Fosfato diamónico (DAP)', formula: '(NH₄)₂HPO₄', bidon: 'B',
    comp: { NH4: 0.212, P: 0.233 } },
  { id: 'h3po4', nombre: 'Ácido fosfórico (75%)', formula: 'H₃PO₄', bidon: 'B', liquido: true, densidad: 1.57,
    comp: { P: 0.237 }, nota: 'Líquido. Baja pH y aporta P.' },

  // --- Azufre / magnesio ---
  { id: 'k2so4', nombre: 'Sulfato de potasio', formula: 'K₂SO₄', bidon: 'B',
    comp: { K: 0.449, S: 0.184 } },
  { id: 'epsom', nombre: 'Sulfato de magnesio (Epsom)', formula: 'MgSO₄·7H₂O', bidon: 'B',
    comp: { Mg: 0.098, S: 0.130 } },
  { id: 'mgo', nombre: 'Óxido de magnesio', formula: 'MgO', bidon: 'B',
    comp: { Mg: 0.603 }, nota: 'Muy concentrado, baja solubilidad.' },

  // --- Micros: hierro ---
  { id: 'feso4', nombre: 'Sulfato de hierro', formula: 'FeSO₄·7H₂O', bidon: 'C',
    comp: { Fe: 0.201, S: 0.115 }, nota: 'Se oxida; usar con pH bajo.' },
  { id: 'feedta', nombre: 'Quelato de hierro (EDTA)', formula: 'Fe-EDTA', bidon: 'C',
    comp: { Fe: 0.13 }, nota: 'Aguanta hasta pH ~6.5.' },
  { id: 'fedtpa', nombre: 'Quelato de hierro (DTPA)', formula: 'Fe-DTPA', bidon: 'C',
    comp: { Fe: 0.11 }, nota: 'Aguanta hasta pH ~7.' },
  { id: 'feeddha', nombre: 'Quelato de hierro (EDDHA)', formula: 'Fe-EDDHA', bidon: 'C',
    comp: { Fe: 0.06 }, nota: 'El rojo. Aguanta pH alto.' },
  // --- Micros: resto ---
  { id: 'mnso4', nombre: 'Sulfato de manganeso', formula: 'MnSO₄·H₂O', bidon: 'C',
    comp: { Mn: 0.325, S: 0.19 } },
  { id: 'mnedta', nombre: 'Quelato de manganeso (EDTA)', formula: 'Mn-EDTA', bidon: 'C',
    comp: { Mn: 0.13 } },
  { id: 'znso4', nombre: 'Sulfato de zinc', formula: 'ZnSO₄·7H₂O', bidon: 'C',
    comp: { Zn: 0.227, S: 0.11 } },
  { id: 'znedta', nombre: 'Quelato de zinc (EDTA)', formula: 'Zn-EDTA', bidon: 'C',
    comp: { Zn: 0.14 } },
  { id: 'cuso4', nombre: 'Sulfato de cobre', formula: 'CuSO₄·5H₂O', bidon: 'C',
    comp: { Cu: 0.255, S: 0.128 } },
  { id: 'cuedta', nombre: 'Quelato de cobre (EDTA)', formula: 'Cu-EDTA', bidon: 'C',
    comp: { Cu: 0.13 } },
  { id: 'boric', nombre: 'Ácido bórico', formula: 'H₃BO₃', bidon: 'C',
    comp: { B: 0.175 } },
  { id: 'solubor', nombre: 'Solubor', formula: 'Na₂B₈O₁₃·4H₂O', bidon: 'C',
    comp: { B: 0.205, Na: 0.06 } },
  { id: 'borax', nombre: 'Bórax', formula: 'Na₂B₄O₇·10H₂O', bidon: 'C',
    comp: { B: 0.113, Na: 0.121 } },
  { id: 'namolib', nombre: 'Molibdato de sodio', formula: 'Na₂MoO₄·2H₂O', bidon: 'C',
    comp: { Mo: 0.397, Na: 0.19 } },
  { id: 'amolib', nombre: 'Molibdato de amonio', formula: '(NH₄)₆Mo₇O₂₄', bidon: 'C',
    comp: { Mo: 0.54, NH4: 0.057 } },
  { id: 'ksilic', nombre: 'Silicato de potasio', formula: 'K₂SiO₃', bidon: 'C',
    comp: { Si: 0.18, K: 0.20 }, nota: 'Aporta Si. Sube pH; va en bidón aparte.' },

  // --- Compuestas ---
  { id: 'masterblend', nombre: 'Masterblend 4-18-38', bidon: 'B',
    comp: { NO3: 0.038, NH4: 0.002, P: 0.0785, K: 0.315, Mg: 0.015, S: 0.03, Fe: 0.004, Mn: 0.002, Zn: 0.0005, Cu: 0.0005, B: 0.002, Mo: 0.0001 },
    nota: 'Base completa con micros quelatados adentro.' },
]

export type Perfil = Partial<Record<ElementKey, number>> // ppm objetivo

export interface PresetPerfil { id: string; nombre: string; desc: string; perfil: Perfil }

export const PRESETS: PresetPerfil[] = [
  { id: 'plantula', nombre: 'Plántula/clon', desc: 'EC ~0.6', perfil: { NO3: 70, NH4: 5, P: 30, K: 90, Ca: 80, Mg: 30, S: 40, Fe: 1.5, Mn: 0.3, Zn: 0.15, B: 0.3, Cu: 0.05, Mo: 0.05 } },
  { id: 'veg', nombre: 'Vegetativo (coco)', desc: 'EC ~1.4', perfil: { NO3: 140, NH4: 15, P: 50, K: 180, Ca: 150, Mg: 50, S: 70, Fe: 2, Mn: 0.5, Zn: 0.2, B: 0.4, Cu: 0.08, Mo: 0.05 } },
  { id: 'flora', nombre: 'Floración (coco)', desc: 'EC ~2.0', perfil: { NO3: 125, NH4: 15, P: 55, K: 200, Ca: 170, Mg: 55, S: 80, Fe: 2, Mn: 0.5, Zn: 0.2, B: 0.4, Cu: 0.08, Mo: 0.05 } },
  { id: 'finish', nombre: 'Finalización (clon Finis)', desc: '0-15-25, sin N', perfil: { P: 60, K: 187, Ca: 98, S: 114 } },
  { id: 'finishlimpio', nombre: 'Finish Ca limpio', desc: 'PK + Ca quelatado bajo', perfil: { P: 60, K: 187, Ca: 30, S: 90 } },
]

export interface ResultadoSal { sal: Sal; gramosPorL: number }
export interface Resultado {
  dosis: ResultadoSal[]
  ppmLogrado: Record<ElementKey, number>
  ppmObjetivo: Perfil
}

/** NNLS por updates multiplicativos: minimiza ||A x - b||² con x>=0. */
function nnls(A: number[][], b: number[], iters = 1000): number[] {
  const m = A.length
  const n = A[0]?.length ?? 0
  if (n === 0) return []
  const x = new Array(n).fill(1e-3)
  const Atb = new Array(n).fill(0)
  for (let j = 0; j < n; j++) for (let i = 0; i < m; i++) Atb[j] += A[i][j] * b[i]
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
      if (num <= 0) { x[j] = 0; continue }
      x[j] = x[j] * (num / (denom + eps))
    }
  }
  return x.map(v => (v < 1e-4 ? 0 : v))
}

/** Calcula gramos/L de cada sal para acercarse al perfil objetivo. */
export function calcularReceta(perfil: Perfil, salesDisp: Sal[], agua: Perfil = {}): Resultado {
  const elems = ELEMENTOS.map(e => e.key).filter(k => (perfil[k] ?? 0) > 0)
  const b = elems.map(k => Math.max(0, (perfil[k] ?? 0) - (agua[k] ?? 0)))
  const A = elems.map(k => salesDisp.map(s => (s.comp[k] ?? 0) * 1000))
  const scale = b.map(v => (v > 0 ? 1 / v : 1))
  const As = A.map((fila, i) => fila.map(v => v * scale[i]))
  const bs = b.map((v, i) => v * scale[i])
  const x = nnls(As, bs)
  const dosis: ResultadoSal[] = salesDisp
    .map((sal, j) => ({ sal, gramosPorL: +(x[j] ?? 0).toFixed(4) }))
    .filter(d => d.gramosPorL > 0)
    .sort((a, b2) => b2.gramosPorL - a.gramosPorL)
  const ppmLogrado = {} as Record<ElementKey, number>
  for (const e of ELEMENTOS) {
    let s = agua[e.key] ?? 0
    for (const d of dosis) s += (d.sal.comp[e.key] ?? 0) * d.gramosPorL * 1000
    ppmLogrado[e.key] = +s.toFixed(2)
  }
  return { dosis, ppmLogrado, ppmObjetivo: perfil }
}

/** Cálculo directo: dadas las dosis (g/L) → ppm resultante (modo "agregar por peso"). */
export function ppmDesdeDosis(dosis: ResultadoSal[], agua: Perfil = {}): Record<ElementKey, number> {
  const out = {} as Record<ElementKey, number>
  for (const e of ELEMENTOS) {
    let s = agua[e.key] ?? 0
    for (const d of dosis) s += (d.sal.comp[e.key] ?? 0) * d.gramosPorL * 1000
    out[e.key] = +s.toFixed(2)
  }
  return out
}

/** EC aproximada (mS/cm) a partir de ppm totales (escala 500). */
export function ecAprox(ppm: Record<ElementKey, number>): number {
  const total = Object.values(ppm).reduce((a, b) => a + b, 0)
  return +(total / 640).toFixed(2)
}

/** Ratios nutricionales clave (relaciones de masa). */
export interface Ratios { [k: string]: number }
export function calcularRatios(ppm: Record<ElementKey, number>): Ratios {
  const N = nTotal(ppm)
  const r = (a: number, b: number) => (b > 0 ? +(a / b).toFixed(2) : 0)
  return {
    'N:K': r(N, ppm.K ?? 0),
    'K:Ca': r(ppm.K ?? 0, ppm.Ca ?? 0),
    'Ca:Mg': r(ppm.Ca ?? 0, ppm.Mg ?? 0),
    'K:Mg': r(ppm.K ?? 0, ppm.Mg ?? 0),
    'NO3:NH4': r(ppm.NO3 ?? 0, ppm.NH4 ?? 0),
    'N:P:K': 0, // se muestra aparte
  }
}

// --- Soluciones madre (concentrados A/B/C) ---
export interface BidonConcentrado {
  bidon: Bidon
  volumenL: number
  items: { sal: Sal; gramos: number; mlSiLiquido?: number }[]
  advertencia: string | null
}

/**
 * Reparte la receta (g/L finales) en bidones concentrados.
 * @param factor cuántas veces concentrado (ej. 100 = stock 100x)
 * @param volumenBidonL litros de cada bidón concentrado
 */
export function calcularConcentrados(dosis: ResultadoSal[], factor: number, volumenBidonL: number): BidonConcentrado[] {
  const grupos: Record<Bidon, BidonConcentrado> = {
    A: { bidon: 'A', volumenL: volumenBidonL, items: [], advertencia: null },
    B: { bidon: 'B', volumenL: volumenBidonL, items: [], advertencia: null },
    C: { bidon: 'C', volumenL: volumenBidonL, items: [], advertencia: null },
  }
  for (const d of dosis) {
    // g totales en el bidón = g/L final * factor * (volumen final que rinde el bidón)
    // un bidón de volumenBidonL a factor X rinde volumenBidonL*factor litros finales.
    const gramos = d.gramosPorL * factor * volumenBidonL
    const item: { sal: Sal; gramos: number; mlSiLiquido?: number } = { sal: d.sal, gramos: +gramos.toFixed(1) }
    if (d.sal.liquido && d.sal.densidad) item.mlSiLiquido = +(gramos / d.sal.densidad).toFixed(1)
    grupos[d.sal.bidon].items.push(item)
  }
  // advertencia Ca + sulfato/fosfato en el mismo bidón
  for (const g of Object.values(grupos)) {
    const hayCa = g.items.some(i => (i.sal.comp.Ca ?? 0) > 0)
    const hayS = g.items.some(i => (i.sal.comp.S ?? 0) > 0)
    const hayP = g.items.some(i => (i.sal.comp.P ?? 0) > 0)
    if (hayCa && (hayS || hayP)) {
      g.advertencia = 'Calcio + sulfato/fosfato en el mismo bidón → precipita. Separá el calcio.'
    }
  }
  return Object.values(grupos).filter(g => g.items.length > 0)
}

/** Costo de un lote: precio por litro final de solución. */
export function calcularCosto(dosis: ResultadoSal[]): { porLitro: number; detalle: { sal: Sal; costo: number }[] } {
  const detalle = dosis.map(d => {
    const costoKg = d.sal.costoKg ?? 0
    const costo = (d.gramosPorL / 1000) * costoKg // ARS por litro
    return { sal: d.sal, costo: +costo.toFixed(2) }
  })
  const porLitro = +detalle.reduce((a, b) => a + b.costo, 0).toFixed(2)
  return { porLitro, detalle }
}

// ---------------------------------------------------------------------------
// Persistencia: perfiles guardados + sustancias personalizadas (Supabase/demo).
// ---------------------------------------------------------------------------

export interface PerfilGuardado {
  id: string
  user_id: string | null
  nombre: string
  perfil: Perfil
  agua: Perfil
  sales: string[]
  creado_en: string
}

export const perfilesNutrientesService = {
  async list(): Promise<PerfilGuardado[]> {
    const { data, error } = await supabase
      .from('perfiles_nutrientes').select('*').order('creado_en', { ascending: false })
    if (error) throw error
    return (data ?? []) as unknown as PerfilGuardado[]
  },
  async crear(p: { nombre: string; perfil: Perfil; agua: Perfil; sales: string[] }): Promise<PerfilGuardado> {
    const { data: u } = await supabase.auth.getUser()
    const payload = { ...p, user_id: u?.user?.id ?? null }
    const { data, error } = await supabase.from('perfiles_nutrientes').insert(payload).select().single()
    if (error) throw error
    return data as unknown as PerfilGuardado
  },
  async eliminar(id: string): Promise<void> {
    const { error } = await supabase.from('perfiles_nutrientes').delete().eq('id', id)
    if (error) throw error
  },
}

export interface SustanciaCustom {
  id: string
  user_id: string | null
  nombre: string
  formula: string | null
  comp: Partial<Record<ElementKey, number>>
  bidon: Bidon
  liquido: boolean
  densidad: number | null
  costo_kg: number | null
  creado_en: string
}

export const sustanciasService = {
  async list(): Promise<Sal[]> {
    const { data, error } = await supabase
      .from('sustancias_nutrientes').select('*').order('creado_en', { ascending: false })
    if (error) throw error
    return ((data ?? []) as unknown as SustanciaCustom[]).map(s => ({
      id: s.id, nombre: s.nombre, formula: s.formula ?? undefined, comp: s.comp ?? {},
      bidon: s.bidon, liquido: s.liquido, densidad: s.densidad ?? undefined,
      costoKg: s.costo_kg ?? undefined, custom: true,
    }))
  },
  async crear(s: { nombre: string; formula?: string; comp: Partial<Record<ElementKey, number>>; bidon: Bidon; liquido: boolean; densidad?: number | null; costo_kg?: number | null }): Promise<void> {
    const { data: u } = await supabase.auth.getUser()
    const payload = {
      nombre: s.nombre, formula: s.formula ?? null, comp: s.comp, bidon: s.bidon,
      liquido: s.liquido, densidad: s.densidad ?? null, costo_kg: s.costo_kg ?? null,
      user_id: u?.user?.id ?? null,
    }
    const { error } = await supabase.from('sustancias_nutrientes').insert(payload)
    if (error) throw error
  },
  async eliminar(id: string): Promise<void> {
    const { error } = await supabase.from('sustancias_nutrientes').delete().eq('id', id)
    if (error) throw error
  },
}
