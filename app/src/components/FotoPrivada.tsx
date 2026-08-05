import { useState, useEffect } from 'react'
import { urlDeFoto } from '../lib/archivos'

/**
 * <img> para una foto guardada en el bucket privado `fotos`.
 *
 * En la base se guarda el path, no una URL que se pueda abrir: hay que pedir
 * una URL firmada antes de poder mostrarla. Esto encapsula esa vuelta para que
 * cada pantalla no repita el useEffect. Mientras resuelve deja un hueco del
 * mismo tamaño, así la lista no salta cuando entra la imagen.
 */
export function FotoPrivada({ valor, className, alt = '', onClick }: {
  valor: string
  className?: string
  alt?: string
  onClick?: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [falló, setFalló] = useState(false)
  useEffect(() => {
    let vigente = true
    urlDeFoto(valor)
      .then(u => { if (vigente) setUrl(u || null) })
      .catch(() => { if (vigente) setFalló(true) })
    return () => { vigente = false }
  }, [valor])

  if (falló) return <div className={`${className ?? ''} bg-[#1a1a24]`} title="No se pudo cargar la foto" />
  if (!url) return <div className={`${className ?? ''} bg-[#15151d] animate-pulse`} />
  return <img src={url} alt={alt} loading="lazy" onClick={onClick} className={className} />
}
