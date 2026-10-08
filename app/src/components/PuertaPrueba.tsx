// La puerta de GrowFlow Demo: el sitio de prueba de 15 días.
//
// Solo existe si el build tiene VITE_PRUEBA_URL (el proyecto growflow-demo de
// Cloudflare Pages). En la instalación real esa variable no está y main.tsx
// renderiza la app directo, sin pasar por acá.
//
// Cada persona entra con su link personal (?prueba=<token>) que le manda el
// bot de Instagram. El Worker growflow-pruebas arranca los 15 días en el
// primer uso, cuenta las visitas y dice cuándo venció. Lo que la persona carga
// queda en SU navegador (modo demo, localStorage): no hay base ni datos reales.
//
// Sin conexión se deja entrar hasta la fecha de vencimiento ya conocida: la
// demo funciona offline y cortarla por un corte de red sería peor que nada.
import { useEffect, useState, type ReactNode } from 'react'
import { EMBLEMA, NOMBRE_APP } from '../lib/marca'

const URL_PRUEBA = (import.meta.env.VITE_PRUEBA_URL || '').replace(/\/$/, '')
const CLAVE = 'growflow_prueba'
const DM = 'https://ig.me/m/growithdata'

type Guardado = { token: string; vence?: string | null; nombre?: string }
type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'activa'; dias: number; nombre?: string }
  | { tipo: 'sin_link' }
  | { tipo: 'vencida' }
  | { tipo: 'invalida' }

function leerGuardado(): Guardado | null {
  try {
    const v = localStorage.getItem(CLAVE)
    return v ? (JSON.parse(v) as Guardado) : null
  } catch {
    return null
  }
}

function guardar(g: Guardado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(g))
  } catch {
    /* sin localStorage: la puerta vuelve a preguntar en cada visita */
  }
}

function tokenInicial(): string | null {
  const desdeLink = new URLSearchParams(window.location.search).get('prueba')
  if (desdeLink) {
    // Se saca del URL para que no quede a la vista ni se comparta copiando la barra.
    const u = new URL(window.location.href)
    u.searchParams.delete('prueba')
    window.history.replaceState(null, '', u.pathname + u.search + u.hash)
    const previo = leerGuardado()
    if (previo?.token !== desdeLink) guardar({ token: desdeLink })
    return desdeLink
  }
  return leerGuardado()?.token ?? null
}

const diasHasta = (iso?: string | null) =>
  iso ? Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86400000)) : 0

export default function PuertaPrueba({ children }: { children: ReactNode }) {
  // Se lee una sola vez al montar: el token sale del link (y se borra de la
  // barra) o de lo guardado en una visita anterior.
  const [token] = useState(tokenInicial)
  const [estado, setEstado] = useState<Estado>(token ? { tipo: 'cargando' } : { tipo: 'sin_link' })

  useEffect(() => {
    if (!token) return
    fetch(`${URL_PRUEBA}/check?t=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d: { estado: string; vence?: string; nombre?: string; dias_restantes?: number }) => {
        if (d.estado === 'activa') {
          guardar({ token, vence: d.vence, nombre: d.nombre })
          setEstado({ tipo: 'activa', dias: d.dias_restantes ?? diasHasta(d.vence), nombre: d.nombre })
        } else if (d.estado === 'vencida' || d.estado === 'bloqueada') {
          setEstado({ tipo: 'vencida' })
        } else {
          setEstado({ tipo: 'invalida' })
        }
      })
      .catch(() => {
        const g = leerGuardado()
        const dias = diasHasta(g?.vence)
        setEstado(g?.vence && dias > 0 ? { tipo: 'activa', dias, nombre: g.nombre } : { tipo: 'sin_link' })
      })
  }, [token])

  if (estado.tipo === 'activa')
    return (
      <>
        {children}
        <a
          href={DM}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-3 left-3 sm:left-auto sm:right-3 z-[9999] rounded-full border border-[#404d20] bg-[#0a0a0f]/90 px-3 py-1.5 text-[11px] font-medium text-[#bef264] shadow-lg backdrop-blur"
        >
          Prueba gratis · {estado.dias === 1 ? 'queda 1 día' : `quedan ${estado.dias} días`}
        </a>
      </>
    )

  const textos = {
    cargando: { t: 'Abriendo GrowFlow…', s: '' },
    sin_link: { t: 'Probá GrowFlow gratis 15 días', s: 'Pedí tu acceso personal por mensaje a @growithdata y te mandamos el link al instante.' },
    vencida: { t: 'Tu prueba de 15 días terminó', s: '¡Gracias por probar GrowFlow! Escribinos y te contamos cómo seguir con tu cultivo.' },
    invalida: { t: 'Este link no es válido', s: 'Pedí tu acceso personal por mensaje a @growithdata.' },
  }[estado.tipo]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-6 text-center text-[#ececf1]">
      <img src={EMBLEMA} alt={NOMBRE_APP} className="mb-8 h-20 w-20" />
      <h1 className="max-w-md text-2xl font-semibold tracking-tight">{textos.t}</h1>
      {textos.s && <p className="mt-3 max-w-sm text-sm text-[#8a8a9c]">{textos.s}</p>}
      {estado.tipo !== 'cargando' && (
        <a
          href={DM}
          target="_blank"
          rel="noreferrer"
          className="mt-8 min-h-[44px] rounded-full bg-[#bef264] px-6 py-3 text-sm font-semibold text-[#0a0a0f]"
        >
          Escribir a @growithdata
        </a>
      )}
    </div>
  )
}
