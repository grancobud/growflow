// Guía de RIEGO del clon de Growcast — sección propia.
// Estructura inicial (válvulas, bomba, sensores, crop steering, ESPHome).
// Se va completando con las indicaciones de Gastón.

import { useEffect, useState } from 'react'
import { Boxes, Gauge, FileCode, ListChecks, Star } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { instalacionesService, type ItemInstalacion } from '../../lib/instalaciones'

const fmt = (n: number | null | undefined) => n != null ? '$' + Number(n).toLocaleString('es-AR') : '—'

const card = 'rounded-xl bg-[#111119] border border-[#1f1f2b] p-4 sm:p-5'

function Seccion({ icon: Icon, titulo, sub, children }: { icon: LucideIcon; titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className={card}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#7dd3fc]/10 border border-[#7dd3fc]/30 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[#7dd3fc]" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="font-display font-semibold text-[14px] text-[#ececf1]">{titulo}</h2>
          {sub && <p className="text-[11px] text-[#5c5c6b] mt-0.5">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

// Lista dinámica: solo los insumos que Gastón cargó en la pestaña "Insumos"
// (sistema Riego), con su descripción y precio. La estrella marca lo elegido
// para comprar (favorito), igual que la estrella de proveedores.
function ComponentesReales() {
  const [items, setItems] = useState<ItemInstalacion[]>([])
  const [cargando, setCargando] = useState(true)

  async function cargar() {
    try {
      const its = await instalacionesService.getItems()
      setItems(its.filter(i => i.sistema === 'Riego'))
    } catch { /* demo/offline: queda vacío */ }
    finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [])

  async function toggleFav(it: ItemInstalacion) {
    setItems(xs => xs.map(x => x.id === it.id ? { ...x, favorito: !x.favorito } : x))
    try { await instalacionesService.actualizarItem(it.id, { favorito: !it.favorito }) }
    catch { cargar() }
  }

  // favoritos primero, después por nombre
  const ordenados = [...items].sort((a, b) =>
    (Number(b.favorito) - Number(a.favorito)) || a.nombre.localeCompare(b.nombre))

  return (
    <Seccion icon={Boxes} titulo="Componentes del riego" sub="Los insumos que cargaste en la pestaña Insumos">
      {cargando ? (
        <p className="text-[12px] text-[#5c5c6b] py-3">Cargando…</p>
      ) : ordenados.length === 0 ? (
        <p className="text-[12px] text-[#5c5c6b] py-3">
          Todavía no cargaste insumos. Andá a la pestaña <b className="text-[#7dd3fc]">Insumos</b> y agregá los tuyos:
          ahí aparecen acá con su descripción y precio, y los marcás con la estrella.
        </p>
      ) : (
        <div className="space-y-1.5">
          {ordenados.map(it => {
            const desc = [it.marca, it.modelo, it.specs].filter(Boolean).join(' · ')
            return (
              <div key={it.id} className="flex items-center gap-3 bg-[#15151d] border border-[#1f1f2b] rounded-lg px-3 py-2">
                <button title={it.favorito ? 'Quitar de elegidos' : 'Marcar como elegido'} onClick={() => toggleFav(it)} className="flex-shrink-0">
                  <Star className="w-4 h-4" fill={it.favorito ? '#facc15' : 'none'} stroke={it.favorito ? '#facc15' : '#5c5c6b'} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-[#ececf1] truncate">{it.nombre}</p>
                  {desc && <p className="text-[10.5px] text-[#5c5c6b] truncate">{desc}</p>}
                </div>
                <span className="text-[12px] font-mono font-bold text-[#d9f99d] flex-shrink-0">
                  {fmt(it.precio)}{it.unidad ? <span className="text-[10px] text-[#5c5c6b]"> /{it.unidad}</span> : null}
                </span>
              </div>
            )
          })}
        </div>
      )}
      <p className="text-[11px] text-[#5c5c6b] mt-2">Válvulas 220V = relé directo; la bomba = contactor (ver Hardware DIY). La estrella marca lo que ya elegiste comprar.</p>
    </Seccion>
  )
}

export default function GuiaRiego() {
  return (
    <div className="space-y-4 max-w-[1100px]">
      {/* Intro */}
      <div className={card}>
        <p className="text-[13px] text-[#d4d4dd] leading-relaxed">
          Sección de <b className="text-[#7dd3fc]">riego</b> del controlador propio — válvulas por cama, bomba, sensores de sustrato y el motor de
          <b> crop steering (P0/P1/P2)</b> como el de Growcast. Todo controlado por el ESP32 + ESPHome, integrado al Hardware DIY.
        </p>
        <p className="text-[11px] text-[#5c5c6b] mt-2 border-t border-[#1f1f2b] pt-2">🚧 Estructura inicial — se va completando con el detalle real de tu instalación.</p>
      </div>

      {/* Componentes reales cargados en Insumos */}
      <ComponentesReales />

      {/* Crop steering */}
      <Seccion icon={Gauge} titulo="Cómo riega — crop steering (P0/P1/P2)" sub="El método de Growcast: por fases, no un timer">
        <div className="space-y-2">
          {[
            { f: 'P0 — Dryback', c: '#f0a35e', d: 'Al prender las luces, NO riega por X tiempo (deja secar el sustrato). Estimula raíces.' },
            { f: 'P1 — Rampa (cargar)', c: '#a3e635', d: 'Shots frecuentes y cortos hasta llegar a capacidad de campo (ON/OFF/repeticiones).' },
            { f: 'P2 — Mantenimiento', c: '#7dd3fc', d: 'Shots espaciados durante el día para mantener la humedad objetivo.' },
            { f: 'Dryback por sensor', c: '#a78bfa', d: 'Con sensor de sustrato: riega cuando la humedad cae X% del objetivo (targetHumidity + dryback%).' },
          ].map((p, i) => (
            <div key={i} className="rounded-lg bg-[#101016] border border-[#1f1f2b] p-3">
              <p className="font-display font-semibold text-[12px]" style={{ color: p.c }}>{p.f}</p>
              <p className="text-[12px] text-[#d4d4dd] mt-0.5">{p.d}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#5c5c6b] mt-2">Sincronizado con el fotoperiodo (arranca cuando prenden las luces). No hay timer físico: el ciclado está dentro de cada fase.</p>
      </Seccion>

      {/* ESPHome */}
      <Seccion icon={FileCode} titulo="ESPHome — script de riego por fases" sub="Listo para copiar; ajustá los tiempos a tu cultivo">
        <pre className="text-[10.5px] font-mono bg-[#0a0a0f] border border-[#1f1f2b] rounded-lg p-3 overflow-x-auto text-[#7dd3fc] leading-relaxed">{`switch:
  - platform: gpio
    pin: GPIO25
    id: valvula_cama1
    name: "Riego cama 1"

script:
  - id: ciclo_riego
    then:
      - delay: 2h                 # P0: dryback (deja secar al prender luces)
      - repeat:                   # P1: cargar el sustrato
          count: 6
          then:
            - switch.turn_on: valvula_cama1
            - delay: 30s          # riego de 30 s
            - switch.turn_off: valvula_cama1
            - delay: 15min        # espera entre shots
      - repeat:                   # P2: mantenimiento
          count: 4
          then:
            - switch.turn_on: valvula_cama1
            - delay: 30s
            - switch.turn_off: valvula_cama1
            - delay: 2h

time:
  - platform: sntp
    on_time:
      - hours: 7                  # cuando prenden las luces...
        then: { script.execute: ciclo_riego }   # ...arranca el riego del día`}</pre>
        <p className="text-[11px] text-[#5c5c6b] mt-2">Para varias camas: una válvula (switch) por cama, y el script las riega en secuencia o en paralelo según prefieras. Para dryback real, se lee el sensor de humedad en vez de tiempos fijos.</p>
      </Seccion>

      {/* Pendiente */}
      <Seccion icon={ListChecks} titulo="Por definir (lo vamos armando)" sub="Decime los datos y completo esta sección">
        <ul className="space-y-1.5 text-[12px] text-[#d4d4dd]">
          <li>• Cuántas camas y el diámetro del caño de cada una (tamaño de válvula).</li>
          <li>• Tipo de riego: por horario (P0/P1/P2) o por sensor de humedad (dryback).</li>
          <li>• Bomba: modelo/potencia (para el contactor y el interlock de tanque).</li>
          <li>• ¿Fertirriego? (dosificadoras + EC/pH) o agua/nutriente ya mezclado.</li>
          <li>• Tiempos reales de tu cultivo (duración de P0, shots de P1/P2, dryback %).</li>
        </ul>
      </Seccion>

      <p className="text-[10.5px] text-[#5c5c6b] px-1 pb-4">
        Sección de riego del proyecto growcast-diy. Se integra con el Hardware DIY (mismo ESP32/ESPHome). Documentación completa en el repo: <span className="font-mono">growcast-diy/</span>.
      </p>
    </div>
  )
}
