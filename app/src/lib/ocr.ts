// OCR de credenciales REPROCANN: renderiza el PDF a imagen en el navegador (pdf.js)
// y la manda a un webhook local (n8n -> Ollama qwen3-vl) que devuelve los campos.
// 100% local: la lectura la hace tu GPU, nada va a la nube.

/**
 * PDF.JS ENTRA TARDE, NO AL ARRANCAR.
 *
 * Estaba importado arriba, y ademas el worker se creaba en el momento en que se
 * cargaba este modulo. Con eso el chunk `pdf-libs` —811 KB, el mas grande de
 * todos— quedaba enganchado al arranque: se descargaba al abrir la app aunque
 * nadie fuera a leer una credencial. En un telefono con datos moviles eso es
 * casi un tercio de la carga inicial para una pantalla que la mayoria no abre.
 *
 * SE MEMORIZA LA PROMESA, no el modulo. Si se guardara el modulo, dos llamadas
 * al mismo tiempo —que es lo normal al subir varios archivos— arrancarian dos
 * importaciones y crearian DOS workers.
 */
// Build LEGACY de pdfjs, no el moderno. Desde la 5.6 el moderno usa
// Map.getOrInsertComputed, que Chrome 141 y muchos telefonos todavia no traen:
// leer una credencial en PDF tiraba «getOrInsertComputed is not a function».
// El legacy trae los polyfills y la misma API.
let pdfjsCargando: Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> | null = null

function cargarPdfjs() {
  if (!pdfjsCargando) {
    pdfjsCargando = (async () => {
      const [lib, { default: PdfWorker }] = await Promise.all([
        import('pdfjs-dist/legacy/build/pdf.mjs'),
        import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker'),
      ])
      lib.GlobalWorkerOptions.workerPort = new PdfWorker()
      return lib
    })()
  }
  return pdfjsCargando
}

const OCR_URL = import.meta.env.VITE_OCR_WEBHOOK_URL || ''

export interface DatosCredencial {
  nombre_completo?: string
  dni?: string
  fecha_nacimiento?: string
  telefono?: string
  email?: string
  localidad?: string
  provincia?: string
  domicilio?: string
  reprocann_nro?: string
  reprocann_estado?: string
  reprocann_emision?: string
  reprocann_vencimiento?: string
  modalidad?: string
  plantas_habilitadas?: number | string
  m2_habilitados?: number | string
  patologia?: string
  medico_tratante?: string
  matricula_medico?: string
}

export const OCR_DISPONIBLE = !!OCR_URL

// Renderiza la primera pagina del PDF a un PNG base64 (sin el prefijo data:).
async function pdfAImagen(file: File, escala = 2.5): Promise<string> {
  const buf = await file.arrayBuffer()
  const pdfjsLib = await cargarPdfjs()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: escala })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!
  await page.render({ canvas, canvasContext: ctx, viewport }).promise
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')
}

/**
 * LAS DOS FALLAS QUE VE EL USUARIO.
 *
 * El lector vive en la PC de casa (túnel → n8n → Ollama) y se cae seguido.
 * Antes cualquier falla terminaba en «OCR HTTP 502», que no le dice a quien
 * carga qué hacer. Ahora hay dos: «no disponible» (el lector no se pudo usar:
 * cargá a mano) y «no reconocido» (contestó, pero no sacó nada del PDF:
 * revisá el archivo). El mensaje va en el error, así la pantalla no decide
 * textos. Spec: openspec/changes/ocr-errores-claros.
 */
export const MENSAJE_NO_DISPONIBLE = 'El lector de credenciales no está disponible, cargá a mano'
export const MENSAJE_NO_RECONOCIDO = 'No se reconocieron datos en el PDF. Revisá que sea la credencial REPROCANN o cargá a mano.'

export type TipoFallaLector = 'no_disponible' | 'no_reconocido'

export class ErrorLectorCredencial extends Error {
  readonly tipo: TipoFallaLector
  /** Lo técnico (status, mensaje de fetch), para la consola: el usuario ve `message`. */
  readonly detalle?: string
  constructor(tipo: TipoFallaLector, detalle?: string) {
    super(tipo === 'no_disponible' ? MENSAJE_NO_DISPONIBLE : MENSAJE_NO_RECONOCIDO)
    this.name = 'ErrorLectorCredencial'
    this.tipo = tipo
    this.detalle = detalle
  }
}

/** Ollama con un modelo de visión puede tardar, pero no un minuto. */
export const TIMEOUT_LECTOR_MS = 60_000

/**
 * 404: el webhook no existe (workflow apagado). 408/429: el servidor pide que
 * vuelvas después. Ninguno es culpa del PDF. El resto de los 4xx sí: el lector
 * contestó y rechazó lo que le mandaron.
 */
const STATUS_NO_DISPONIBLE = new Set([404, 408, 429])

const CAMPOS_CREDENCIAL: (keyof DatosCredencial)[] = [
  'nombre_completo', 'dni', 'fecha_nacimiento', 'telefono', 'email', 'localidad', 'provincia',
  'domicilio', 'reprocann_nro', 'reprocann_estado', 'reprocann_emision', 'reprocann_vencimiento',
  'modalidad', 'plantas_habilitadas', 'm2_habilitados', 'patologia', 'medico_tratante', 'matricula_medico',
]

const tieneValor = (v: unknown) => v != null && String(v).trim() !== ''

/**
 * La llamada al lector, separada del render del PDF para poder testearla sin
 * navegador: recibe la imagen ya en base64, y el fetch es inyectable.
 */
export async function enviarAlLector(
  imagen: string,
  { url = OCR_URL, fetch: hacerFetch = fetch, timeoutMs = TIMEOUT_LECTOR_MS }:
    { url?: string; fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<DatosCredencial> {
  if (!url) throw new ErrorLectorCredencial('no_disponible', 'VITE_OCR_WEBHOOK_URL sin configurar')
  const corte = new AbortController()
  const reloj = setTimeout(() => corte.abort(), timeoutMs)
  let res: Response
  try {
    res = await hacerFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imagen }),
      signal: corte.signal,
    })
  } catch (err) {
    // Sin red, CORS, DNS o el timeout de arriba: en todos, el lector no se pudo usar.
    throw new ErrorLectorCredencial('no_disponible', (err as Error)?.message)
  } finally {
    clearTimeout(reloj)
  }
  if (!res.ok) {
    const tipo = res.status >= 500 || STATUS_NO_DISPONIBLE.has(res.status) ? 'no_disponible' : 'no_reconocido'
    throw new ErrorLectorCredencial(tipo, `HTTP ${res.status}`)
  }
  let json: unknown
  try { json = await res.json() } catch {
    throw new ErrorLectorCredencial('no_reconocido', 'respuesta no JSON')
  }
  const crudo = (json as { datos?: unknown })?.datos ?? json
  const datos = (crudo && typeof crudo === 'object' ? crudo : {}) as DatosCredencial
  if (!CAMPOS_CREDENCIAL.some(c => tieneValor(datos[c]))) {
    throw new ErrorLectorCredencial('no_reconocido', 'ningún campo reconocido')
  }
  return datos
}

export async function leerCredencial(file: File): Promise<DatosCredencial> {
  if (!OCR_URL) throw new ErrorLectorCredencial('no_disponible', 'VITE_OCR_WEBHOOK_URL sin configurar')
  let imagen: string
  try { imagen = await pdfAImagen(file) } catch (err) {
    // pdf.js no pudo abrirlo: PDF roto, con contraseña, o no es un PDF de verdad.
    throw new ErrorLectorCredencial('no_reconocido', (err as Error)?.message)
  }
  return enviarAlLector(imagen)
}
