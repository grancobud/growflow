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
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
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
  const [token, setToken] = useState(tokenInicial)
  const [estado, setEstado] = useState<Estado>(token ? { tipo: 'cargando' } : { tipo: 'sin_link' })
  const [codigo, setCodigo] = useState('')

  // El bot de Instagram manda un CÓDIGO, no un link: mandar links por DM desde
  // la cuenta hace que Instagram cierre la sesión del bot (pasó el 08/10/2026).
  const usarCodigo = (e: FormEvent) => {
    e.preventDefault()
    const c = codigo.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!c) return
    guardar({ token: c })
    setEstado({ tipo: 'cargando' })
    setToken(c)
  }

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
    sin_link: { t: 'Probá GrowFlow gratis 15 días', s: 'Escribí «quiero probar» por mensaje a @growithdata y te mandamos tu código al instante.' },
    vencida: { t: 'Tu prueba de 15 días terminó', s: '¡Gracias por probar GrowFlow! Escribinos y te contamos cómo seguir con tu cultivo.' },
    invalida: { t: 'Ese código no es válido', s: 'Revisalo, o pedí el tuyo por mensaje a @growithdata.' },
  }[estado.tipo]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-6 text-center text-[#ececf1]">
      <img src={EMBLEMA} alt={NOMBRE_APP} className="mb-8 h-20 w-20" />
      <h1 className="max-w-md text-2xl font-semibold tracking-tight">{textos.t}</h1>
      {textos.s && <p className="mt-3 max-w-sm text-sm text-[#8a8a9c]">{textos.s}</p>}
      {(estado.tipo === 'sin_link' || estado.tipo === 'invalida') && (
        <form onSubmit={usarCodigo} className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Tu código"
            aria-label="Código de prueba"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="min-h-[44px] rounded-xl border border-[#1f1f2b] bg-[#101016] px-4 text-center font-mono text-lg tracking-widest text-[#ececf1] outline-none focus:border-[#a3e635]"
          />
          <button type="submit" className="min-h-[44px] rounded-full bg-[#bef264] px-6 text-sm font-semibold text-[#0a0a0f]">
            Entrar
          </button>
        </form>
      )}
      {estado.tipo !== 'cargando' && (
        <a
          href={DM}
          target="_blank"
          rel="noreferrer"
          className="mt-6 min-h-[44px] px-6 py-3 text-sm font-medium text-[#bef264] underline-offset-4 hover:underline"
        >
          Escribir a @growithdata
        </a>
      )}
    </div>
  )
}
