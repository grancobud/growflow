// La puerta de GrowFlow Demo: el sitio de prueba de 15 días.
//
// Solo existe si el build tiene VITE_PRUEBA_URL (el proyecto growflow-demo de
// Cloudflare Pages). En la instalación real esa variable no está y main.tsx
// renderiza la app directo, sin pasar por acá.
//
// Cada persona entra con su código personal, que le manda el bot de Instagram
// (o con el link ?prueba=<código>). El Worker growflow-pruebas arranca los 15
// días en el primer uso, cuenta las visitas y dice cuándo venció. Lo que la
// persona carga queda en SU navegador (modo demo, localStorage): no hay base ni
// datos reales.
//
// Sin conexión se deja entrar hasta la fecha de vencimiento ya conocida: la
// demo funciona offline y cortarla por un corte de red sería peor que nada.
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { EMBLEMA, NOMBRE_APP } from '../lib/marca'
import { useDialogo } from '../lib/useDialogo'

const URL_PRUEBA = (import.meta.env.VITE_PRUEBA_URL || '').replace(/\/$/, '')
const CLAVE = 'growflow_prueba'
const DM = 'https://ig.me/m/growithdata'

type Guardado = { token: string; vence?: string | null; nombre?: string }
type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'activa'; dias: number; nombre?: string; vence?: string | null }
  | { tipo: 'sin_link' }
  | { tipo: 'vencida' }
  | { tipo: 'invalida' }

// Lo mismo que explica el bot de Instagram (conocimiento-bot/growflow.md):
// si cambia una condición, cambiarla en los dos lados.
const COMO_FUNCIONA = [
  'Pedí tu código escribiendo «quiero probar» por mensaje a @growithdata.',
  'Entrá acá, escribí el código y listo: no hace falta crear una cuenta.',
  'Los 15 días corren desde la primera vez que usás el código.',
  'La app arranca vacía para que cargues tu propio cultivo.',
]

const CONDICIONES = [
  'Es gratis, sin tarjeta y sin compromiso de contratar.',
  'Un código por persona. Es personal: no lo compartas.',
  'Lo que cargás queda guardado solo en este navegador y en este dispositivo. GrowFlow no lo ve ni lo guarda.',
  'Usá siempre el mismo celular o la misma PC. Si borrás los datos de navegación, usás una ventana de incógnito o cambiás de dispositivo, la app aparece vacía (el código sigue valiendo).',
  'No cargues datos reales de pacientes: para probar, usá datos de ejemplo.',
  'Algunas funciones se activan solo en la instalación completa: sensores en vivo, varios usuarios con sus permisos y el asistente con inteligencia artificial.',
  'Al terminar los 15 días el acceso se cierra. Para seguir, escribinos y te contamos cómo es la instalación propia, con tu base de datos.',
  'Para hacer el seguimiento de la prueba registramos tu nombre, tu usuario de Instagram y cuándo usás el código.',
]

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

const fechaCorta = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) : ''

function Lista({ titulo, items, numerada = false }: { titulo: string; items: string[]; numerada?: boolean }) {
  const Etiqueta = numerada ? 'ol' : 'ul'
  return (
    <div>
      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.15em] text-[#a3e635]">{titulo}</h3>
      <Etiqueta className="space-y-2 text-[13px] leading-snug text-[#d4d4dd]">
        {items.map((t, i) => (
          <li key={t} className="flex gap-2.5">
            <span className="mt-[1px] w-4 flex-none text-[#bef264]">{numerada ? `${i + 1}.` : '·'}</span>
            <span>{t}</span>
          </li>
        ))}
      </Etiqueta>
    </div>
  )
}

function ModalPrueba({ dias, vence, onCerrar }: { dias: number; vence?: string | null; onCerrar: () => void }) {
  const refDialogo = useDialogo(onCerrar)
  return (
    <div ref={refDialogo} className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-[#1f1f2b] bg-[#0d0d12] sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-[#1f1f2b] bg-[#0d0d12] px-4 py-3">
          <h2 className="font-display text-[15px] font-bold text-[#ececf1]">Tu prueba gratis de 15 días</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="min-h-[44px] min-w-[44px] p-1 text-[#8a8a9c] hover:text-[#ececf1] sm:min-h-0 sm:min-w-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-5 p-4">
          <div className="rounded-xl border border-[#404d20] bg-[#a3e635]/[0.06] px-4 py-3 text-[13px] text-[#ececf1]">
            {dias === 1 ? 'Te queda 1 día' : `Te quedan ${dias} días`}
            {vence ? <span className="text-[#8a8a9c]"> · vence el {fechaCorta(vence)}</span> : null}
          </div>
          <Lista titulo="Condiciones" items={CONDICIONES} />
        </div>
        <div className="flex flex-wrap justify-end gap-2 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <a href={DM} target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center rounded-lg bg-[#bef264] px-4 text-[13px] font-semibold text-[#0a0a0f] sm:min-h-[36px]">
            Escribir a @growithdata
          </a>
          <button onClick={onCerrar} className="min-h-[44px] rounded-lg border border-[#2a2a38] px-4 text-[13px] text-[#d4d4dd] hover:bg-[#1f1f2b] sm:min-h-[36px]">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PuertaPrueba({ children }: { children: ReactNode }) {
  // Se lee una sola vez al montar: el token sale del link (y se borra de la
  // barra) o de lo guardado en una visita anterior.
  const [token, setToken] = useState(tokenInicial)
  const [estado, setEstado] = useState<Estado>(token ? { tipo: 'cargando' } : { tipo: 'sin_link' })
  const [codigo, setCodigo] = useState('')
  const [verInfo, setVerInfo] = useState(false)

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
          setEstado({ tipo: 'activa', dias: d.dias_restantes ?? diasHasta(d.vence), nombre: d.nombre, vence: d.vence })
        } else if (d.estado === 'vencida' || d.estado === 'bloqueada') {
          setEstado({ tipo: 'vencida' })
        } else {
          setEstado({ tipo: 'invalida' })
        }
      })
      .catch(() => {
        const g = leerGuardado()
        const dias = diasHasta(g?.vence)
        setEstado(g?.vence && dias > 0 ? { tipo: 'activa', dias, nombre: g.nombre, vence: g.vence } : { tipo: 'sin_link' })
      })
  }, [token])

  if (estado.tipo === 'activa')
    return (
      <>
        {children}
        <button
          onClick={() => setVerInfo(true)}
          className="fixed bottom-3 left-3 z-[9999] rounded-full border border-[#404d20] bg-[#0a0a0f]/90 px-3 py-1.5 text-[11px] font-medium text-[#bef264] shadow-lg backdrop-blur sm:left-auto sm:right-3"
        >
          Prueba gratis · {estado.dias === 1 ? 'queda 1 día' : `quedan ${estado.dias} días`}
        </button>
        {verInfo && <ModalPrueba dias={estado.dias} vence={estado.vence} onCerrar={() => setVerInfo(false)} />}
      </>
    )

  const textos = {
    cargando: { t: 'Abriendo GrowFlow…', s: '' },
    sin_link: { t: 'Probá GrowFlow gratis 15 días', s: 'El sistema de gestión para cultivos de cannabis medicinal y asociaciones, hecho en Chaco.' },
    vencida: { t: 'Tu prueba de 15 días terminó', s: '¡Gracias por probar GrowFlow! Escribinos y te contamos cómo seguir con tu cultivo.' },
    invalida: { t: 'Ese código no es válido', s: 'Revisalo, o pedí el tuyo por mensaje a @growithdata.' },
  }[estado.tipo]
  const pideCodigo = estado.tipo === 'sin_link' || estado.tipo === 'invalida'

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-6 py-12 text-[#ececf1]">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <img src={EMBLEMA} alt={NOMBRE_APP} className="mb-8 h-20 w-20" />
        <h1 className="text-2xl font-semibold tracking-tight">{textos.t}</h1>
        {textos.s && <p className="mt-3 max-w-sm text-sm text-[#8a8a9c]">{textos.s}</p>}
        {pideCodigo && (
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
            {pideCodigo ? '¿No tenés código? Pedilo a @growithdata' : 'Escribir a @growithdata'}
          </a>
        )}
      </div>
      {pideCodigo && (
        <div className="mx-auto mt-10 max-w-md space-y-6 rounded-2xl border border-[#1f1f2b] bg-[#0d0d12] p-5 text-left">
          <Lista titulo="Cómo funciona" items={COMO_FUNCIONA} numerada />
          <Lista titulo="Condiciones" items={CONDICIONES} />
        </div>
      )}
    </div>
  )
}
