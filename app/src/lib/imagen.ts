// Redimensionado de imágenes en el cliente, antes de guardarlas como data URI.
// Sin esto una foto de celular entra tal cual a Postgres: llegamos a tener filas
// de 829 kB en insumos_faltantes, y el listado bajaba ~4,7 MB.

const LADO_FOTO = 1024   // foto de la ficha
const LADO_THUMB = 128   // miniatura de la lista (se muestra a 44px; 128 cubre retina)

function escalar(ancho: number, alto: number, lado: number): [number, number] {
  if (ancho <= lado && alto <= lado) return [ancho, alto]
  const k = lado / Math.max(ancho, alto)
  return [Math.round(ancho * k), Math.round(alto * k)]
}

function cargar(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')) }
    img.src = url
  })
}

function aDataUrl(img: HTMLImageElement, lado: number, calidad: number): string {
  const [w, h] = escalar(img.naturalWidth, img.naturalHeight, lado)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas no disponible')
  // Fondo blanco: los PNG con transparencia quedarían negros al pasar a JPEG.
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', calidad)
}

/** Devuelve la foto redimensionada y su miniatura, ambas como data URI JPEG. */
export async function procesarImagen(file: File): Promise<{ imagen: string; thumb: string }> {
  const img = await cargar(file)
  return {
    imagen: aDataUrl(img, LADO_FOTO, 0.82),
    thumb: aDataUrl(img, LADO_THUMB, 0.7),
  }
}

/** Genera sólo la miniatura a partir de un data URI ya guardado (para backfill). */
export function thumbDesdeDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(aDataUrl(img, LADO_THUMB, 0.7))
    img.onerror = () => reject(new Error('No se pudo leer la imagen'))
    img.src = dataUrl
  })
}
