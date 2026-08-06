import { supabase } from './supabase'
import type { ElementKey, Perfil } from './nutrientes'

/** Ficha técnica de un fertilizante comercial: qué declara la etiqueta, de qué
 *  sales sale, y el PDF/foto de respaldo. Es lo que permite clonar la marca
 *  sabiendo el origen de cada elemento. */
export interface FichaComercial {
  id: string
  marca: string
  producto: string
  linea?: string | null
  forma: 'liquido' | 'polvo'
  densidad?: number | null
  npk?: string | null
  dosis_ml_l?: number | null
  /** % p/p tal cual lo declara el envase (no ppm). */
  composicion: Record<string, number>
  sales_origen: string[]
  /** id en SALES_DEFECTO si el producto ya está cargado como clonable. */
  sal_id?: string | null
  verificado: boolean
  nota?: string | null
  pdf_path?: string | null
  pdf_nombre?: string | null
  pdf_tam?: number | null
  /** Precio del ENVASE entero, no el $/L. El $/L se deriva con envase_cant. */
  precio_envase?: number | null
  envase_cant?: number | null
  envase_unidad?: 'L' | 'ml' | 'kg' | 'g' | null
  /** De dónde salió el precio, para poder auditarlo después. */
  precio_fuente?: string | null
  creado_en?: string
}

/**
 * Precio por litro (líquidos) o por kilo (polvos) del producto comercial.
 * null si todavía no se le cargó el precio o el tamaño del envase.
 */
export function precioPorUnidadBase(f: FichaComercial): number | null {
  if (f.precio_envase == null || !f.envase_cant) return null
  const factor = f.envase_unidad === 'ml' || f.envase_unidad === 'g' ? 1000 : 1
  return (f.precio_envase * factor) / f.envase_cant
}

export type FichaNueva = Omit<FichaComercial, 'id' | 'creado_en'>

const TABLA = 'fichas_comerciales'
const BUCKET = 'fichas'
export const PDF_MAX_MB = 15

export const fichasService = {
  async listar(): Promise<FichaComercial[]> {
    const { data, error } = await supabase
      .from(TABLA).select('*').order('marca').order('producto')
    if (error) throw error
    return (data ?? []) as FichaComercial[]
  },

  async crear(f: FichaNueva): Promise<FichaComercial> {
    const { data, error } = await supabase.from(TABLA).insert(f).select().single()
    if (error) throw error
    return data as FichaComercial
  },

  async actualizar(id: string, campos: Partial<FichaNueva>): Promise<void> {
    const { error } = await supabase.from(TABLA).update(campos).eq('id', id)
    if (error) throw error
  },

  async borrar(f: FichaComercial): Promise<void> {
    // El archivo primero: si queda huérfano nadie lo vuelve a encontrar.
    if (f.pdf_path) await this.borrarArchivo(f.pdf_path).catch(() => {})
    const { error } = await supabase.from(TABLA).delete().eq('id', f.id)
    if (error) throw error
  },

  /** Sube el PDF/foto y devuelve la ruta dentro del bucket. */
  async subirArchivo(file: File, marca: string, producto: string): Promise<string> {
    // NFD parte los acentos en letra + tilde suelta, y el filtro de [^a-z0-9] se
    // lleva las tildes junto con el resto: "Química" -> "quimica".
    const limpio = (s: string) => s.toLowerCase().normalize('NFD')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
    // Sufijo aleatorio: dos fichas del mismo producto no se pisan el archivo.
    const path = `${limpio(marca)}/${limpio(producto)}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
    if (error) throw error
    return path
  },

  async borrarArchivo(path: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) throw error
  },

  /** URL temporal para ver el PDF: el bucket es privado, no hay link permanente. */
  async urlDe(path: string, segundos = 3600): Promise<string> {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, segundos)
    if (error) throw error
    return data.signedUrl
  },
}

/**
 * Pasa la ficha (% p/p de la etiqueta) al perfil en ppm que entiende la
 * calculadora, para la dosis que se le pase.
 *
 * Líquido: ppm = % × 10 × mL/L × densidad. Polvo: ppm = % × 10 × g/L.
 * (el ×10 es porque 1% de 1 g/L son 10 mg/L = 10 ppm)
 */
export function perfilDesdeFicha(f: FichaComercial, dosis: number): Perfil {
  const factor = f.forma === 'liquido' ? dosis * (f.densidad ?? 1) * 10 : dosis * 10
  const p: Perfil = {}
  for (const [k, v] of Object.entries(f.composicion)) {
    if (v > 0) p[k as ElementKey] = +(v * factor).toFixed(4)
  }
  return p
}

/** Suma de lo declarado, para ver de un vistazo cuánto del envase es agua. */
export function totalDeclarado(f: FichaComercial): number {
  return +Object.values(f.composicion).reduce((a, b) => a + (b || 0), 0).toFixed(3)
}

// ---------------------------------------------------------------------------
// Comprar el comercial vs. hacerlo con sales.
// ---------------------------------------------------------------------------

export interface ComparacionComercial {
  /** Litros de riego que rinde UN envase del comercial, a su dosis de etiqueta. */
  rindeL: number | null
  /** Lo que cuesta un litro de riego comprando el producto. */
  comercialPorLitro: number | null
  /**
   * Cuántas veces concentrada tiene que quedar tu solución madre para que
   * reemplace al comercial litro por litro: se usa a la misma dosis y sale la
   * misma concentración en el tanque.
   */
  factorEquivalente: number | null
}

/**
 * Tamaño del envase pasado a la unidad de la dosis: mL para los líquidos
 * (dosis en mL/L) y g para los polvos (dosis en g/L).
 */
export function envaseEnUnidadDeDosis(f: FichaComercial): number | null {
  if (!f.envase_cant) return null
  switch (f.envase_unidad) {
    case 'L': return f.envase_cant * 1000   // L  -> mL
    case 'ml': return f.envase_cant
    case 'kg': return f.envase_cant * 1000  // kg -> g
    case 'g': return f.envase_cant
    default: return null
  }
}

/**
 * Cuánto rinde y cuánto sale el comercial. Devuelve null en lo que no se pueda
 * calcular (falta precio, envase o dosis) en vez de inventar un número.
 */
export function compararComercial(f: FichaComercial): ComparacionComercial {
  const dosis = f.dosis_ml_l ?? null
  const envase = envaseEnUnidadDeDosis(f)
  // A dosis d (mL/L o g/L), 1 L del producto alcanza para 1000/d litros de
  // riego; ése es justo el factor de concentración que iguala al comercial.
  const factorEquivalente = dosis && dosis > 0 ? +(1000 / dosis).toFixed(1) : null
  if (!dosis || dosis <= 0 || envase == null) {
    return { rindeL: null, comercialPorLitro: null, factorEquivalente }
  }
  const rindeL = envase / dosis
  const comercialPorLitro = f.precio_envase != null && rindeL > 0
    ? f.precio_envase / rindeL
    : null
  return { rindeL: +rindeL.toFixed(1), comercialPorLitro, factorEquivalente }
}
